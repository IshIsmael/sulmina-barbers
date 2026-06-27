'use strict';

const path = require('node:path');
const express = require('express');

const { SERVICES, groupByCategory, getBySlug } = require('../src/data/services');
const {
  SHOP,
  HOURS_DISPLAY,
  BARBERS,
  BARBER_COUNT,
  OPENING_HOURS,
  SLOT_GRANULARITY_MINUTES,
  BOOKING_LOOKAHEAD_DAYS
} = require('../src/config/shop');
const { listImages } = require('../src/lib/gallery');
const { listAvailableSlots } = require('../src/lib/availability');
const {
  shopDateLong,
  shopDateKey,
  shopTime,
  buildDateStrip,
  groupSlotsByDaypart,
  formatWeekRange,
  parseDateKey
} = require('../src/lib/format');
const { pageMeta, buildLocalBusinessJsonLd, buildServiceListJsonLd } = require('../src/lib/seo');

const app = express();
const service = getBySlug('skin-fade') || SERVICES[0];

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  res.locals.shop = SHOP;
  res.locals.hours = HOURS_DISPLAY;
  res.locals.currentPath = req.path;
  next();
});

function step(current) {
  const labels = ['Service', 'Barber', 'Time', 'Details'];
  return {
    current,
    total: 4,
    items: labels.map((label, i) => ({
      label,
      index: i + 1,
      state: i + 1 < current ? 'done' : (i + 1 === current ? 'current' : 'upcoming')
    }))
  };
}

function isDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateFromKey(key, hour = 12, minute = 0) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

function addDays(key, days) {
  const { year, month, day } = parseDateKey(key);
  return shopDateKey(new Date(Date.UTC(year, month - 1, day + days, 12)));
}

function clampDateKey(candidate, todayKey) {
  if (!isDateKey(candidate)) return todayKey;
  const candidateParts = parseDateKey(candidate);
  const todayParts = parseDateKey(todayKey);
  const candidateUtc = Date.UTC(candidateParts.year, candidateParts.month - 1, candidateParts.day);
  const todayUtc = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);
  const maxUtc = todayUtc + BOOKING_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000;
  if (candidateUtc < todayUtc) return todayKey;
  if (candidateUtc > maxUtc) return shopDateKey(new Date(maxUtc));
  return candidate;
}

function normalizeBarber(raw) {
  if (raw === undefined || raw === null || raw === '' || raw === 'any') return 'any';
  const id = Number(raw);
  return BARBERS.some(barber => barber.id === id) ? String(id) : 'any';
}

function timeView(overrides = {}) {
  const now = new Date();
  const todayKey = shopDateKey(now);
  const selectedService = getBySlug(overrides.service) || service;
  const barberFilterParam = normalizeBarber(overrides.barber);
  const dateKey = clampDateKey(overrides.date, todayKey);
  const weekStart = clampDateKey(overrides.weekStart || dateKey, todayKey);
  const previewNow = dateFromKey(dateKey, 0, 0);

  const strip = buildDateStrip(dateFromKey(weekStart), 7).map(d => ({
    ...d,
    isSelected: d.key === dateKey,
    isToday: d.key === todayKey
  }));

  const perBarber = listAvailableSlots({
    date: dateFromKey(dateKey),
    service: selectedService,
    bookings: [],
    barberCount: BARBER_COUNT,
    openingHours: OPENING_HOURS,
    timezone: SHOP.timezone,
    granularityMinutes: SLOT_GRANULARITY_MINUTES,
    now: previewNow
  });

  let freeSlots;
  if (barberFilterParam === 'any') {
    const starts = new Set();
    perBarber.forEach(barber => barber.startTimes.forEach(start => starts.add(start.getTime())));
    freeSlots = Array.from(starts).sort((a, b) => a - b).map(ms => new Date(ms));
  } else {
    const barber = perBarber.find(entry => String(entry.barberId) === barberFilterParam);
    freeSlots = barber ? barber.startTimes : [];
  }

  const decorated = freeSlots.map(slot => ({
    iso: slot.toISOString(),
    label: shopTime(slot),
    status: 'free',
    date: slot
  }));
  const groups = groupSlotsByDaypart(decorated);
  const selectedSlotIso = typeof overrides.slot === 'string'
    && decorated.some(slot => slot.iso === overrides.slot)
    ? overrides.slot
    : null;
  const selectedSlot = selectedSlotIso
    ? decorated.find(slot => slot.iso === selectedSlotIso)
    : null;

  const prevWeekStart = clampDateKey(addDays(weekStart, -7), todayKey);
  const nextWeekStart = clampDateKey(addDays(weekStart, 7), todayKey);

  return {
    service: selectedService,
    step: step(3),
    strip,
    weekStart,
    weekRangeLabel: formatWeekRange(strip[0].date, strip[strip.length - 1].date),
    prevWeekStart: prevWeekStart === weekStart ? null : prevWeekStart,
    nextWeekStart: nextWeekStart === weekStart ? null : nextWeekStart,
    dateKey,
    dateLong: shopDateLong(dateFromKey(dateKey)),
    groups,
    totalSlotCount: decorated.length,
    nextOpen: null,
    barberTabs: [
      { value: 'any', label: 'Any', isActive: barberFilterParam === 'any' },
      ...BARBERS.map(b => ({ value: String(b.id), label: b.name, isActive: barberFilterParam === String(b.id) }))
    ],
    barberFilter: barberFilterParam === 'any' ? 'any' : Number(barberFilterParam),
    barberFilterParam,
    barberLabel: barberFilterParam === 'any'
      ? 'Any available'
      : (BARBERS.find(b => String(b.id) === barberFilterParam)?.name || 'Any available'),
    selectedSlotIso,
    selectedSlotLabel: selectedSlot ? selectedSlot.label : null,
    selectedSlotDateLong: selectedSlot ? shopDateLong(selectedSlot.date) : null
  };
}

app.get('/', (req, res) => {
  const meta = pageMeta('home');
  res.render('home', {
    title: meta.title,
    meta,
    jsonLd: [buildLocalBusinessJsonLd(), buildServiceListJsonLd()],
    loadElfsight: true,
    highlights: SERVICES.filter(s => ['full-service', 'haircut', 'haircut-beard', 'skin-fade'].includes(s.slug)),
    todayHours: '09:00 - 20:00',
    todayLabel: 'Monday - Thursday'
  });
});

app.get('/services', (req, res) => {
  const meta = pageMeta('services');
  res.render('services', { title: meta.title, meta, jsonLd: buildServiceListJsonLd(), groups: groupByCategory() });
});

app.get('/about', (req, res) => {
  const meta = pageMeta('about');
  res.render('about', { title: meta.title, meta });
});

app.get('/gallery', (req, res) => {
  const meta = pageMeta('gallery');
  res.render('gallery', { title: meta.title, meta, images: listImages() });
});

app.get('/contact', (req, res) => {
  const meta = pageMeta('contact');
  res.render('contact', { title: meta.title, meta, todayLabel: 'Monday - Thursday' });
});

app.get('/book', (req, res) => {
  if (!getBySlug(req.query.service)) return res.redirect('/services');
  const meta = pageMeta('book');
  res.render('booking/select-service', {
    title: meta.title,
    meta,
    barbers: BARBERS,
    form: { name: '', email: '', phone: '', notes: '' },
    errors: null,
    bookingBasePath: '/book',
    ...timeView(req.query)
  });
});

app.get('/book/barber', (req, res) => {
  const meta = pageMeta('book', { title: 'Choose your barber - Sulmina', noindex: true });
  res.render('booking/select-barber', { title: meta.title, meta, service, barbers: BARBERS, step: step(2) });
});

app.get('/book/time', (req, res) => {
  const meta = pageMeta('book', { title: 'Pick a time - Sulmina', noindex: true });
  res.render('booking/select-time', { title: meta.title, meta, ...timeView(req.query) });
});

app.get('/book/time/slots', (req, res) => {
  res.render('booking/_time-grid', { ...timeView(req.query), shop: SHOP });
});

app.get('/book/slots', (req, res) => {
  res.render('booking/_time-grid', {
    ...timeView(req.query),
    bookingBasePath: '/book',
    showBarberTabs: false,
    shop: SHOP
  });
});

app.get('/book/details', (req, res) => {
  const meta = pageMeta('book', { title: 'Your details - Sulmina', noindex: true });
  const todayKey = shopDateKey(new Date());
  const previewSlot = listAvailableSlots({
    date: dateFromKey(todayKey),
    service,
    bookings: [],
    barberCount: BARBER_COUNT,
    openingHours: OPENING_HOURS,
    timezone: SHOP.timezone,
    granularityMinutes: SLOT_GRANULARITY_MINUTES,
    now: dateFromKey(todayKey, 0, 0)
  })[0].startTimes[0] || dateFromKey(todayKey, 9, 0);
  res.render('booking/details', {
    title: meta.title,
    meta,
    service,
    slotIso: previewSlot.toISOString(),
    barberChosen: 'any',
    barberLabel: 'Any available',
    slotLabel: shopTime(previewSlot),
    slotDateLong: shopDateLong(previewSlot),
    step: step(4),
    errors: null,
    form: { name: '', email: '', phone: '', notes: '' }
  });
});

app.get('/book/conflict', (req, res) => {
  const meta = pageMeta('book', { title: 'Slot taken - Sulmina', noindex: true });
  res.render('booking/conflict', { title: meta.title, meta, service, dateKey: shopDateKey(new Date()), barber: 'any', reason: '' });
});

app.get('/book/confirmed/mock', (req, res) => {
  const meta = pageMeta('book', { title: 'Booked - Sulmina', noindex: true });
  res.render('booking/confirmation', {
    title: meta.title,
    meta,
    booking: {
      customerName: 'Ada Lovelace',
      customerEmail: 'ada@example.com',
      serviceName: service.name,
      serviceDuration: service.durationMinutes,
      servicePrice: service.price
    },
    barberName: 'Barber 1',
    slotLabel: '09:00',
    slotDateLong: 'Monday 15 June'
  });
});

const port = Number(process.env.PORT) || 4173;

if (require.main === module) {
  app.listen(port, () => {
    try {
      process.stdout.write(`[preview] http://localhost:${port}\n`);
    } catch (_) {
      // Hidden Windows launches can have no writable console.
    }
  });
}

module.exports = app;
