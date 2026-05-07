'use strict';

/**
 * Shop configuration — the knobs.
 *
 * Changing any value here propagates through routing, booking logic,
 * and templates. No value in this file should be hard-coded elsewhere.
 */

const SHOP = Object.freeze({
  name: 'Sulmina Barber Shop',
  address: '43 High St, London N14 6LD',
  phone: '07474 372775',
  phoneHref: 'tel:+447474372775',
  instagram: 'https://www.instagram.com/sulmina_barbershop/',
  timezone: 'Europe/London'
});

/**
 * Barbers. The id is the single field stored on a booking document.
 * Names are display-only — rename freely, past bookings keep the id.
 *
 * When the shop supplies real names, edit the `name` fields here.
 * When a barber leaves or a new one starts, add/remove an entry AND
 * update BARBER_COUNT below. Past bookings still reference the id.
 */
const BARBERS = Object.freeze([
  { id: 1, name: 'Barber 1' },
  { id: 2, name: 'Barber 2' },
  { id: 3, name: 'Barber 3' }
]);

/**
 * Number of barbers working concurrently — derived from BARBERS so
 * the two can never drift. Kept as a named export for clarity at
 * call sites that only need the count.
 */
const BARBER_COUNT = BARBERS.length;

/**
 * Opening hours per weekday (0 = Sunday … 6 = Saturday).
 */
const OPENING_HOURS = Object.freeze({
  0: { open: '10:00', close: '18:00' },
  1: { open: '09:00', close: '20:00' },
  2: { open: '09:00', close: '20:00' },
  3: { open: '09:00', close: '20:00' },
  4: { open: '09:00', close: '20:00' },
  5: { open: '09:30', close: '20:30' },
  6: { open: '09:30', close: '20:30' }
});

const HOURS_DISPLAY = Object.freeze([
  { days: 'Monday – Thursday', time: '9:00 – 20:00' },
  { days: 'Friday – Saturday', time: '9:30 – 20:30' },
  { days: 'Sunday',            time: '10:00 – 18:00' }
]);

const SLOT_GRANULARITY_MINUTES = 15;
const BOOKING_LOOKAHEAD_DAYS = 28;

function getBarberById(id) {
  return BARBERS.find(b => b.id === id) || null;
}

module.exports = {
  SHOP,
  BARBERS,
  BARBER_COUNT,
  OPENING_HOURS,
  HOURS_DISPLAY,
  SLOT_GRANULARITY_MINUTES,
  BOOKING_LOOKAHEAD_DAYS,
  getBarberById
};
