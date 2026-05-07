'use strict';

/**
 * Availability engine — pure function.
 *
 * Given a date, a service, and the existing bookings on that date,
 * compute the list of valid start times per barber.
 *
 * Design rules (from Architecture.md):
 *   A proposed booking of service S, duration D, starting at time T on
 *   barber B is valid when ALL of these hold:
 *     (1) T >= openingTime
 *     (2) T + D <= closingTime
 *     (3) T >= previousBookingEnd   (back-to-back allowed)
 *     (4) T + D <= nextBookingStart (back-to-back allowed)
 *
 *   Closing time is a hard boundary, not buffered.
 *   Three barbers checked independently. No before/after buffers.
 *
 * This module has no Mongo or Express dependency. All I/O is at the
 * caller's layer. Keeping it pure makes it trivially testable and
 * extractable into a standalone package later.
 */

/**
 * Build a UTC Date representing HH:MM on a specific calendar date in
 * the shop's local timezone.
 *
 * We stay in UTC throughout storage and comparison. Display conversion
 * is the caller's responsibility (via Intl.DateTimeFormat).
 *
 * Note on BST/GMT: London has a one-hour offset from UTC in winter and
 * zero offset? No — London is UTC in winter (GMT) and UTC+1 in summer
 * (BST). We need to determine which offset applies on the given calendar
 * date, because 09:00 London on 15 July is 08:00 UTC, while 09:00 London
 * on 15 January is 09:00 UTC.
 */
function localShopTimeToUtc(year, month, day, hour, minute, timezone) {
  // Strategy: construct a Date assuming UTC, then use Intl to ask what
  // that instant looks like in the shop's timezone. The delta is the
  // offset that applies at that local date, which we subtract.
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const parts = fmt.formatToParts(new Date(asIfUtc));
  const get = (t) => Number(parts.find(p => p.type === t).value);
  const localAsUtc = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour') === 24 ? 0 : get('hour'),
    get('minute'), get('second')
  );
  const offsetMs = localAsUtc - asIfUtc;
  return new Date(asIfUtc - offsetMs);
}

/**
 * Parse a "HH:MM" string into { hour, minute } numbers.
 */
function parseHm(hm) {
  const [h, m] = hm.split(':').map(Number);
  return { hour: h, minute: m };
}

/**
 * Does the time window [aStart, aEnd) overlap [bStart, bEnd)?
 * Back-to-back (aEnd === bStart) does NOT overlap.
 */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Given a date and the service, compute the list of valid start times
 * per barber.
 *
 * @param {object} args
 * @param {Date}   args.date         — any UTC Date within the target calendar day
 * @param {object} args.service      — { durationMinutes, ... } from src/data/services.js
 * @param {Array}  args.bookings     — array of { barberId, startAt, endAt } for that day
 * @param {number} args.barberCount  — total barbers on shift
 * @param {object} args.openingHours — { 0..6: { open, close } }
 * @param {string} args.timezone     — IANA zone, e.g. 'Europe/London'
 * @param {number} args.granularityMinutes — slot step
 * @param {Date}   [args.now]        — inject current time for testing; defaults to new Date()
 *
 * @returns {Array<{ barberId:number, startTimes:Date[] }>}
 *   One entry per barber, even if startTimes is empty.
 */
function listAvailableSlots({
  date,
  service,
  bookings,
  barberCount,
  openingHours,
  timezone,
  granularityMinutes,
  now = new Date()
}) {
  if (!service || typeof service.durationMinutes !== 'number') {
    throw new Error('listAvailableSlots: service.durationMinutes required');
  }
  if (!Number.isInteger(barberCount) || barberCount < 1) {
    throw new Error('listAvailableSlots: barberCount must be a positive integer');
  }
  if (!Number.isInteger(granularityMinutes) || granularityMinutes < 1) {
    throw new Error('listAvailableSlots: granularityMinutes must be a positive integer');
  }

  // Determine the calendar day in the shop's timezone.
  const dayFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long'
  });
  const parts = dayFmt.formatToParts(date);
  const year  = Number(parts.find(p => p.type === 'year').value);
  const month = Number(parts.find(p => p.type === 'month').value);
  const day   = Number(parts.find(p => p.type === 'day').value);
  const weekdayName = parts.find(p => p.type === 'weekday').value;
  const weekdayIndex = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    .indexOf(weekdayName);

  const oh = openingHours[weekdayIndex];
  if (!oh) {
    // Shop is closed this day — return empty result for every barber.
    return Array.from({ length: barberCount }, (_, i) => ({
      barberId: i + 1, startTimes: []
    }));
  }

  const openHm  = parseHm(oh.open);
  const closeHm = parseHm(oh.close);

  const openAt  = localShopTimeToUtc(year, month, day, openHm.hour,  openHm.minute,  timezone);
  const closeAt = localShopTimeToUtc(year, month, day, closeHm.hour, closeHm.minute, timezone);

  const durationMs    = service.durationMinutes * 60_000;
  const granularityMs = granularityMinutes * 60_000;

  // Sort all bookings once by startAt; per-barber filters below use this.
  const sorted = bookings.slice().sort((a, b) => a.startAt - b.startAt);

  const out = [];
  for (let barberId = 1; barberId <= barberCount; barberId++) {
    const barberBookings = sorted.filter(b => b.barberId === barberId);
    const startTimes = [];

    // Walk candidate start times from openAt, stepping by granularity.
    // For each candidate:
    //   - enforce rule (1): candidate >= openAt       (automatic)
    //   - enforce rule (2): candidate + D <= closeAt
    //   - enforce rules (3) & (4): no overlap with any booking
    //   - enforce "no booking in the past"            (now guard)
    for (let t = openAt.getTime(); t + durationMs <= closeAt.getTime(); t += granularityMs) {
      if (t < now.getTime()) continue;

      const candStart = t;
      const candEnd   = t + durationMs;

      let conflict = false;
      for (const b of barberBookings) {
        if (overlaps(candStart, candEnd, b.startAt.getTime(), b.endAt.getTime())) {
          conflict = true;
          break;
        }
      }
      if (!conflict) startTimes.push(new Date(candStart));
    }

    out.push({ barberId, startTimes });
  }
  return out;
}

/**
 * Validate a single proposed booking against live DB state.
 * Used inside the transactional booking write (Phase 3A-2).
 *
 * Returns null if valid, or a string reason if not.
 */
function checkSingleSlot({
  barberId,
  startAt,
  service,
  bookings,
  openingHours,
  timezone,
  now = new Date()
}) {
  if (!(startAt instanceof Date)) {
    return 'startAt must be a Date';
  }
  if (startAt.getTime() < now.getTime()) {
    return 'start time is in the past';
  }

  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

  // Determine the day's opening hours in the shop timezone.
  const dayFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long'
  });
  const parts = dayFmt.formatToParts(startAt);
  const year  = Number(parts.find(p => p.type === 'year').value);
  const month = Number(parts.find(p => p.type === 'month').value);
  const day   = Number(parts.find(p => p.type === 'day').value);
  const weekdayName = parts.find(p => p.type === 'weekday').value;
  const weekdayIndex = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    .indexOf(weekdayName);

  const oh = openingHours[weekdayIndex];
  if (!oh) return 'shop is closed on that day';

  const openHm  = parseHm(oh.open);
  const closeHm = parseHm(oh.close);
  const openAt  = localShopTimeToUtc(year, month, day, openHm.hour,  openHm.minute,  timezone);
  const closeAt = localShopTimeToUtc(year, month, day, closeHm.hour, closeHm.minute, timezone);

  if (startAt.getTime() < openAt.getTime())  return 'start is before opening time';
  if (endAt.getTime()   > closeAt.getTime()) return 'end is after closing time';

  // Only this barber's bookings matter.
  const barberBookings = bookings.filter(b => b.barberId === barberId);
  for (const b of barberBookings) {
    if (overlaps(startAt.getTime(), endAt.getTime(), b.startAt.getTime(), b.endAt.getTime())) {
      return 'slot overlaps an existing booking';
    }
  }

  return null;
}

module.exports = {
  listAvailableSlots,
  checkSingleSlot,
  // Exported for tests only:
  _internals: { localShopTimeToUtc, parseHm, overlaps }
};
