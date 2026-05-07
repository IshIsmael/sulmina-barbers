'use strict';

/**
 * Bookings collection — data access.
 *
 * Responsibilities:
 *   - Query existing bookings for a day (used by the availability engine).
 *   - Insert a booking atomically, re-validating against live DB state.
 *
 * The atomic insert is the heart of the conflict-free booking guarantee:
 * we open a Mongo transaction, re-read the day's bookings under that
 * transaction, re-run the availability check, and insert only if still
 * valid. Concurrent attempts serialise on the transaction — one wins,
 * the other sees the inserted booking and is rejected cleanly.
 */

const { getDb, getClient } = require('./mongo');
const { checkSingleSlot } = require('./availability');
const { OPENING_HOURS, SHOP } = require('../config/shop');

function coll() {
  return getDb().collection('bookings');
}

/**
 * Get all bookings whose [startAt, endAt) intersects [dayStart, dayEnd).
 * Used by availability rendering.
 */
async function findByDayRange(dayStartUtc, dayEndUtc, session = null) {
  const q = {
    startAt: { $lt: dayEndUtc },
    endAt:   { $gt: dayStartUtc }
  };
  const opts = session ? { session } : {};
  return coll().find(q, opts).toArray();
}

/**
 * Attempt to insert a booking transactionally.
 *
 * @param {object} input
 * @param {number} input.barberId        — 1..BARBER_COUNT
 * @param {object} input.service         — from src/data/services.js
 * @param {Date}   input.startAt         — UTC
 * @param {object} input.customer        — { name, email, phone, notes }
 *
 * @returns {object} the inserted booking document
 * @throws  {BookingConflictError} if the slot is no longer free
 * @throws  {Error} for validation or DB errors
 */
async function insertBookingAtomic({ barberId, service, startAt, customer }) {
  const client = getClient();
  const session = client.startSession();

  try {
    let inserted = null;

    await session.withTransaction(async () => {
      // 1. Re-read bookings for the day this startAt falls on.
      const dayStart = new Date(startAt);
      dayStart.setUTCHours(0, 0, 0, 0);
      // Use a 48-hour window to safely cover timezone edges — the
      // availability check itself is precise, the window just bounds the read.
      const dayEnd = new Date(dayStart.getTime() + 48 * 60 * 60 * 1000);
      const windowStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);

      const bookings = await findByDayRange(windowStart, dayEnd, session);

      // 2. Re-validate against live state.
      const reason = checkSingleSlot({
        barberId,
        startAt,
        service,
        bookings,
        openingHours: OPENING_HOURS,
        timezone: SHOP.timezone
      });
      if (reason) {
        throw new BookingConflictError(reason);
      }

      // 3. Insert.
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
      const doc = {
        barberId,
        serviceSlug:     service.slug,
        serviceName:     service.name,
        servicePrice:    service.price,
        serviceDuration: service.durationMinutes,
        startAt,
        endAt,
        customerName:  customer.name,
        customerEmail: customer.email.toLowerCase(),
        customerPhone: customer.phone,
        notes:         customer.notes || '',
        createdAt:     new Date()
      };
      const result = await coll().insertOne(doc, { session });
      inserted = { _id: result.insertedId, ...doc };
    });

    return inserted;
  } finally {
    await session.endSession();
  }
}

class BookingConflictError extends Error {
  constructor(reason) {
    super('Booking conflict: ' + reason);
    this.name = 'BookingConflictError';
    this.reason = reason;
  }
}

module.exports = { findByDayRange, insertBookingAtomic, BookingConflictError };
