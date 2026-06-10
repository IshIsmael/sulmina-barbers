'use strict';

const express = require('express');
const { ObjectId } = require('mongodb');

const { getBySlug, groupByCategory } = require('../data/services');
const {
  SHOP, BARBERS, BARBER_COUNT, OPENING_HOURS,
  SLOT_GRANULARITY_MINUTES, BOOKING_LOOKAHEAD_DAYS,
  getBarberById
} = require('../config/shop');

const { listAvailableSlots } = require('../lib/availability');
const { findByDayRange, insertBookingAtomic, BookingConflictError } = require('../lib/bookings');
const {
  shopDateKey, parseDateKey, shopTime, shopDateLong,
  shopWeekdayShort, shopDayNum, shopMonthShort,
  buildDateStrip, groupSlotsByDaypart, formatWeekRange
} = require('../lib/format');
const { getDb } = require('../lib/mongo');
const email = require('../lib/email');
const { pageMeta } = require('../lib/seo');

const router = express.Router();

// ---- Helpers --------------------------------------------------------------

function dayRangeFromKey(key) {
  const { year, month, day } = parseDateKey(key);
  const windowStart = new Date(Date.UTC(year, month - 1, day - 1, 0, 0, 0));
  const windowEnd   = new Date(Date.UTC(year, month - 1, day + 1, 23, 59, 59));
  return { windowStart, windowEnd };
}

function parseBarberFilter(raw) {
  if (raw === undefined || raw === null || raw === '' || raw === 'any') return 'any';
  const n = Number(raw);
  if (Number.isInteger(n) && getBarberById(n)) return n;
  return 'any';
}

function step(n) {
  const labels = ['Service', 'Barber', 'Time', 'Details'];
  return {
    current: n,
    total: 4,
    items: labels.map((label, i) => ({
      label,
      index: i + 1,
      state: i + 1 < n ? 'done' : (i + 1 === n ? 'current' : 'upcoming')
    }))
  };
}

function barberLabelFor(barberChosen) {
  if (barberChosen === 'any') return 'Any available';
  const b = getBarberById(Number(barberChosen));
  return b ? b.name : 'Any available';
}

function clampDateKey(candidate, todayKey) {
  if (typeof candidate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return todayKey;
  const { year, month, day } = parseDateKey(candidate);
  const cand = Date.UTC(year, month - 1, day);
  const todayParts = parseDateKey(todayKey);
  const todayUtc = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);
  const maxUtc = todayUtc + BOOKING_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000;
  if (cand < todayUtc) return todayKey;
  if (cand > maxUtc)   return shopDateKey(new Date(maxUtc));
  return candidate;
}

function shiftDateKey(key, days, todayKey) {
  const { year, month, day } = parseDateKey(key);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return clampDateKey(shopDateKey(shifted), todayKey);
}

/**
 * First day after `fromKey` (within the booking lookahead) with at least
 * one free slot for the service/barber. One bookings query covers the
 * whole window; availability is then computed per day in memory.
 * Returns { key, label } or null.
 */
async function findNextOpenDay(service, barberFilter, fromKey, todayKey, now) {
  const from = parseDateKey(fromKey);
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const today = parseDateKey(todayKey);
  const maxUtc = Date.UTC(today.year, today.month - 1, today.day)
    + BOOKING_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000;
  if (fromUtc >= maxUtc) return null;

  const bookings = await findByDayRange(
    new Date(fromUtc),
    new Date(maxUtc + 2 * 24 * 60 * 60 * 1000)
  );

  for (let utc = fromUtc + 24 * 60 * 60 * 1000; utc <= maxUtc; utc += 24 * 60 * 60 * 1000) {
    const dayAnchor = new Date(utc + 12 * 60 * 60 * 1000);
    const perBarber = listAvailableSlots({
      date: dayAnchor, service, bookings,
      barberCount: BARBER_COUNT,
      openingHours: OPENING_HOURS,
      timezone: SHOP.timezone,
      granularityMinutes: SLOT_GRANULARITY_MINUTES,
      now
    });
    const hasSlot = barberFilter === 'any'
      ? perBarber.some(b => b.startTimes.length > 0)
      : perBarber.some(b => b.barberId === barberFilter && b.startTimes.length > 0);
    if (hasSlot) {
      return {
        key: shopDateKey(dayAnchor),
        label: `${shopWeekdayShort(dayAnchor)} ${shopDayNum(dayAnchor)} ${shopMonthShort(dayAnchor)}`
      };
    }
  }
  return null;
}

async function computeTimeView(req) {
  const service = getBySlug(req.query.service);
  if (!service) return null;

  const now = new Date();
  const todayKey = shopDateKey(now);

  const barberFilter = parseBarberFilter(req.query.barber);
  const dateKey = clampDateKey(req.query.date, todayKey);
  const weekStart = clampDateKey(req.query.weekStart || dateKey, todayKey);

  const ws = parseDateKey(weekStart);
  const stripAnchor = new Date(Date.UTC(ws.year, ws.month - 1, ws.day, 12));
  const strip = buildDateStrip(stripAnchor, 7).map(d => ({
    ...d,
    isSelected: d.key === dateKey,
    isToday: d.key === todayKey
  }));

  const weekRangeLabel = formatWeekRange(strip[0].date, strip[strip.length - 1].date);

  const prevWeekStart = shiftDateKey(weekStart, -7, todayKey);
  const nextWeekStart = shiftDateKey(weekStart,  7, todayKey);
  const canGoPrev = prevWeekStart !== weekStart;
  const canGoNext = nextWeekStart !== weekStart;

  const { windowStart, windowEnd } = dayRangeFromKey(dateKey);
  const bookings = await findByDayRange(windowStart, windowEnd);

  const { year, month, day } = parseDateKey(dateKey);
  const dayAnchor = new Date(Date.UTC(year, month - 1, day, 12, 0));

  const perBarber = listAvailableSlots({
    date: dayAnchor, service, bookings,
    barberCount: BARBER_COUNT,
    openingHours: OPENING_HOURS,
    timezone: SHOP.timezone,
    granularityMinutes: SLOT_GRANULARITY_MINUTES,
    now
  });

  const anyStartsMs = new Set();
  for (const b of perBarber) for (const t of b.startTimes) anyStartsMs.add(t.getTime());

  let slotsForFilter;
  if (barberFilter === 'any') {
    slotsForFilter = Array.from(anyStartsMs).sort((a, b) => a - b).map(ms => new Date(ms));
  } else {
    const entry = perBarber.find(b => b.barberId === barberFilter);
    slotsForFilter = entry ? entry.startTimes.slice() : [];
  }

  const availableSet = new Set(slotsForFilter.map(d => d.getTime()));

  let decorated = [];
  if (barberFilter === 'any') {
    decorated = slotsForFilter.map(d => ({
      iso: d.toISOString(), label: shopTime(d), status: 'free', date: d
    }));
  } else {
    const all = Array.from(anyStartsMs).sort((a, b) => a - b);
    decorated = all.map(ms => {
      const d = new Date(ms);
      return {
        iso: d.toISOString(), label: shopTime(d),
        status: availableSet.has(ms) ? 'free' : 'busy',
        date: d
      };
    });
  }

  const groups = groupSlotsByDaypart(decorated);

  const barberTabs = [
    { value: 'any', label: 'Any', isActive: barberFilter === 'any' },
    ...BARBERS.map(b => ({
      value: String(b.id), label: b.name, isActive: barberFilter === b.id
    }))
  ];

  const totalSlotCount = decorated.filter(d => d.status === 'free').length;

  // Day fully booked → offer a one-tap jump to the next day with space.
  const nextOpen = totalSlotCount === 0
    ? await findNextOpenDay(service, barberFilter, dateKey, todayKey, now)
    : null;

  return {
    service, strip, weekStart, weekRangeLabel,
    prevWeekStart: canGoPrev ? prevWeekStart : null,
    nextWeekStart: canGoNext ? nextWeekStart : null,
    dateKey,
    dateLong: shopDateLong(dayAnchor),
    groups,
    totalSlotCount,
    nextOpen,
    barberTabs, barberFilter,
    barberFilterParam: barberFilter === 'any' ? 'any' : String(barberFilter)
  };
}

// ---- Step 1 · service ------------------------------------------------------
router.get('/', (req, res) => {
  if (typeof req.query.service === 'string') {
    const svc = getBySlug(req.query.service);
    if (svc) return res.redirect(`/book/barber?service=${encodeURIComponent(svc.slug)}`);
  }
  const meta = pageMeta('book');
  res.render('booking/select-service', {
    title: meta.title, meta, groups: groupByCategory(), step: step(1)
  });
});

// ---- Step 2 · barber -------------------------------------------------------
router.get('/barber', (req, res) => {
  const service = getBySlug(req.query.service);
  if (!service) return res.redirect('/book');
  const meta = pageMeta('book', { title: 'Choose your barber · Sulmina', noindex: true });
  res.render('booking/select-barber', {
    title: meta.title, meta,
    service, barbers: BARBERS, step: step(2)
  });
});

// ---- Step 3 · time ---------------------------------------------------------
router.get('/time', async (req, res, next) => {
  try {
    const view = await computeTimeView(req);
    if (!view) return res.redirect('/book');
    const meta = pageMeta('book', {
      title: `Pick a time — ${view.service.name} · Sulmina`,
      description: `Book a ${view.service.name.toLowerCase()} at Sulmina Barber Shop, Southgate N14.`,
      noindex: true
    });
    res.render('booking/select-time', {
      title: meta.title, meta,
      step: step(3), ...view
    });
  } catch (err) { next(err); }
});

router.get('/time/slots', async (req, res, next) => {
  try {
    const view = await computeTimeView(req);
    if (!view) return res.status(404).send('');
    res.render('booking/_time-grid', { step: step(3), ...view });
  } catch (err) { next(err); }
});

router.get('/details', (req, res) => {
  const service = getBySlug(req.query.service);
  const slotIso = typeof req.query.slot === 'string' ? req.query.slot : null;
  if (!service || !slotIso) return res.redirect('/book');

  const slotDate = new Date(slotIso);
  if (Number.isNaN(slotDate.getTime())) return res.redirect('/book');

  const barberFilter = parseBarberFilter(req.query.barber);
  const barberChosen = barberFilter === 'any' ? 'any' : String(barberFilter);

  const meta = pageMeta('book', { title: 'Your details · Sulmina', noindex: true });
  res.render('booking/details', {
    title: meta.title, meta,
    service, slotIso, barberChosen,
    barberLabel: barberLabelFor(barberChosen),
    slotLabel: shopTime(slotDate),
    slotDateLong: shopDateLong(slotDate),
    step: step(4), errors: null,
    form: { name: '', email: '', phone: '', notes: '' }
  });
});

router.post('/confirm', async (req, res, next) => {
  try {
    const { service: slug, slot: slotIso } = req.body;
    const service = getBySlug(slug);
    if (!service || typeof slotIso !== 'string') return res.redirect('/book');

    const slotDate = new Date(slotIso);
    if (Number.isNaN(slotDate.getTime())) return res.redirect('/book');

    const barberFilter = parseBarberFilter(req.body.barber);

    const form = {
      name:  (req.body.name  || '').trim(),
      email: (req.body.email || '').trim(),
      phone: (req.body.phone || '').trim(),
      notes: (req.body.notes || '').trim()
    };
    const errors = {};
    if (!form.name) errors.name = 'Your name is required.';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'A valid email is required for your confirmation.';
    }
    if (!form.phone) errors.phone = 'A contact number is required.';

    if (Object.keys(errors).length) {
      const meta = pageMeta('book', { title: 'Your details · Sulmina', noindex: true });
      const barberChosen = barberFilter === 'any' ? 'any' : String(barberFilter);
      return res.status(400).render('booking/details', {
        title: meta.title, meta,
        service, slotIso,
        barberChosen,
        barberLabel: barberLabelFor(barberChosen),
        slotLabel: shopTime(slotDate),
        slotDateLong: shopDateLong(slotDate),
        step: step(4), errors, form
      });
    }

    const candidates = barberFilter === 'any' ? BARBERS.map(b => b.id) : [barberFilter];

    let inserted = null;
    let lastReason = null;
    for (const barberId of candidates) {
      try {
        inserted = await insertBookingAtomic({
          barberId, service, startAt: slotDate, customer: form
        });
        break;
      } catch (err) {
        if (err instanceof BookingConflictError) {
          lastReason = err.reason;
          continue;
        }
        throw err;
      }
    }

    if (!inserted) {
      return res.redirect(
        `/book/conflict?service=${encodeURIComponent(service.slug)}`
        + `&date=${encodeURIComponent(shopDateKey(slotDate))}`
        + `&barber=${encodeURIComponent(barberFilter === 'any' ? 'any' : String(barberFilter))}`
        + `&reason=${encodeURIComponent(lastReason || 'slot unavailable')}`
      );
    }

    if (email.isConfigured()) {
      try {
        await email.sendBookingEmails(inserted);
        console.log(`[email] sent confirmations for booking ${inserted._id}`);
      } catch (mailErr) {
        console.error(
          `[email] FAILED to send confirmations for booking ${inserted._id}:`,
          mailErr.message
        );
      }
    } else {
      console.warn(
        `[email] SKIPPED for booking ${inserted._id} — SMTP not configured. ` +
        `Set SMTP_USER, SMTP_PASS, MAIL_FROM, SHOP_EMAIL in .env.`
      );
    }

    res.redirect(`/book/confirmed/${inserted._id.toHexString()}`);
  } catch (err) { next(err); }
});

router.get('/conflict', (req, res) => {
  const service = getBySlug(req.query.service);
  if (!service) return res.redirect('/book');
  const barber = typeof req.query.barber === 'string' ? req.query.barber : 'any';
  const meta = pageMeta('book', { title: 'Slot taken · Sulmina', noindex: true });
  res.render('booking/conflict', {
    title: meta.title, meta,
    service,
    dateKey: typeof req.query.date === 'string' ? req.query.date : '',
    barber,
    reason: typeof req.query.reason === 'string' ? req.query.reason : ''
  });
});

router.get('/confirmed/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.redirect('/book');
    const booking = await getDb().collection('bookings').findOne({ _id: new ObjectId(id) });
    if (!booking) return res.redirect('/book');

    const barber = getBarberById(booking.barberId);
    const meta = pageMeta('book', { title: 'Booked · Sulmina', noindex: true });
    res.render('booking/confirmation', {
      title: meta.title, meta,
      booking,
      barberName: barber ? barber.name : `Barber ${booking.barberId}`,
      slotLabel: shopTime(booking.startAt),
      slotDateLong: shopDateLong(booking.startAt)
    });
  } catch (err) { next(err); }
});

router.get('/_preview/:id', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).send('');
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(404).send('booking id invalid');
    const booking = await getDb().collection('bookings').findOne({ _id: new ObjectId(id) });
    if (!booking) return res.status(404).send('booking not found');

    const role = req.query.role === 'shop' ? 'shop' : 'customer';
    const template = role === 'shop' ? 'shop-notification' : 'customer-confirmation';

    const locals = email.buildLocals(booking);
    const rendered = await email.renderEmail(template, locals);
    res.type('html').send(rendered.html);
  } catch (err) { next(err); }
});

module.exports = router;
