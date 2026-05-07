'use strict';

/**
 * Availability engine test suite — runs in pure Node, no Mongo needed.
 * Usage: node _test/availability.test.js
 *
 * Tests are hand-written — deliberate, covering the four-check rule
 * and edge cases. No framework, no dependencies. Either all PASS or
 * the process exits non-zero.
 */

const assert = require('node:assert');
const { listAvailableSlots, checkSingleSlot, _internals } =
  require('../src/lib/availability');

const TZ = 'Europe/London';

// A compact opening-hours config we can vary per test if needed.
const STD_HOURS = {
  0: { open: '10:00', close: '18:00' },
  1: { open: '09:00', close: '20:00' },
  2: { open: '09:00', close: '20:00' },
  3: { open: '09:00', close: '20:00' },
  4: { open: '09:00', close: '20:00' },
  5: { open: '09:30', close: '20:30' },
  6: { open: '09:30', close: '20:30' }
};

// Helper: build a London-local time as a UTC Date for a given calendar day.
function londonTime(yyyy, mm, dd, hh, min) {
  return _internals.localShopTimeToUtc(yyyy, mm, dd, hh, min, TZ);
}

// Helper: make a booking
function b(barberId, startAt, endAt) {
  return { barberId, startAt, endAt };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS  ' + name);
  } catch (err) {
    failed++;
    console.error('FAIL  ' + name + '\n      ' + err.message);
  }
}

// ============================================================================
// TEST 1 — Empty day: all granularity slots available per barber
// ============================================================================
test('empty Wednesday yields slots every 15 minutes for a 30-min haircut', () => {
  // Use a fixed winter Wednesday (GMT): 2026-01-14
  const date = londonTime(2026, 1, 14, 12, 0);
  const service = { durationMinutes: 30 };
  const result = listAvailableSlots({
    date, service, bookings: [],
    barberCount: 3, openingHours: STD_HOURS,
    timezone: TZ, granularityMinutes: 15,
    now: londonTime(2026, 1, 14, 8, 0) // before open
  });
  assert.strictEqual(result.length, 3, 'should return entry per barber');
  // Wed 09:00 → 20:00 = 11 hours. Service 30 min. Last start = 19:30.
  // Slots from 09:00 to 19:30 inclusive, every 15 min = 43 slots.
  for (const barber of result) {
    assert.strictEqual(barber.startTimes.length, 43,
      `barber ${barber.barberId}: expected 43 slots, got ${barber.startTimes.length}`);
    // First slot should be 09:00 London
    const first = barber.startTimes[0];
    assert.strictEqual(first.getTime(), londonTime(2026, 1, 14, 9, 0).getTime(),
      'first slot should be 09:00 London');
    // Last slot should be 19:30 London (last valid start for a 30-min service)
    const last = barber.startTimes[barber.startTimes.length - 1];
    assert.strictEqual(last.getTime(), londonTime(2026, 1, 14, 19, 30).getTime(),
      'last slot should be 19:30 London');
  }
});

// ============================================================================
// TEST 2 — Slot granularity is 15, not service duration
// ============================================================================
test('45-min service can start at 9:00, 9:15, 9:30 — not only on hour/half-hour', () => {
  const date = londonTime(2026, 1, 14, 12, 0);
  const service = { durationMinutes: 45 };
  const result = listAvailableSlots({
    date, service, bookings: [],
    barberCount: 1, openingHours: STD_HOURS,
    timezone: TZ, granularityMinutes: 15,
    now: londonTime(2026, 1, 14, 8, 0)
  });
  const times = result[0].startTimes;
  assert.ok(times.some(t => t.getTime() === londonTime(2026, 1, 14, 9, 0).getTime()),  'should contain 09:00');
  assert.ok(times.some(t => t.getTime() === londonTime(2026, 1, 14, 9, 15).getTime()), 'should contain 09:15');
  assert.ok(times.some(t => t.getTime() === londonTime(2026, 1, 14, 9, 30).getTime()), 'should contain 09:30');
  // Last valid start: 20:00 - 0:45 = 19:15
  assert.strictEqual(times[times.length - 1].getTime(),
    londonTime(2026, 1, 14, 19, 15).getTime(),
    'last slot should be 19:15 for a 45-min service');
});

// ============================================================================
// TEST 3 — Back-to-back allowed (no before/after buffer)
// Booking 10:00–10:45 on B1. 30-min service should be able to start AT 10:45.
// ============================================================================
test('back-to-back: new booking can start the moment the previous ends', () => {
  const date = londonTime(2026, 1, 14, 12, 0);
  const service = { durationMinutes: 30 };
  const existing = [
    b(1, londonTime(2026, 1, 14, 10, 0), londonTime(2026, 1, 14, 10, 45))
  ];
  const result = listAvailableSlots({
    date, service, bookings: existing,
    barberCount: 1, openingHours: STD_HOURS,
    timezone: TZ, granularityMinutes: 15,
    now: londonTime(2026, 1, 14, 8, 0)
  });
  const times = result[0].startTimes;
  assert.ok(times.some(t => t.getTime() === londonTime(2026, 1, 14, 10, 45).getTime()),
    'should contain 10:45 (back-to-back with previous ending at 10:45)');
  assert.ok(!times.some(t => t.getTime() === londonTime(2026, 1, 14, 10, 30).getTime()),
    'should NOT contain 10:30 (overlaps previous)');
});

// ============================================================================
// TEST 4 — New booking must end by the next booking's start
// Next booking at 13:00. 45-min service: latest start is 12:15.
// ============================================================================
test('new booking must end by next booking start (45-min before a 13:00)', () => {
  const date = londonTime(2026, 1, 14, 12, 0);
  const service = { durationMinutes: 45 };
  const existing = [
    b(1, londonTime(2026, 1, 14, 13, 0), londonTime(2026, 1, 14, 14, 15))
  ];
  const result = listAvailableSlots({
    date, service, bookings: existing,
    barberCount: 1, openingHours: STD_HOURS,
    timezone: TZ, granularityMinutes: 15,
    now: londonTime(2026, 1, 14, 8, 0)
  });
  const times = result[0].startTimes;
  // 12:15 + 45 = 13:00 → allowed (back-to-back)
  assert.ok(times.some(t => t.getTime() === londonTime(2026, 1, 14, 12, 15).getTime()),
    'should contain 12:15 (ends exactly at 13:00)');
  // 12:30 + 45 = 13:15 → overlaps 13:00–14:15 → blocked
  assert.ok(!times.some(t => t.getTime() === londonTime(2026, 1, 14, 12, 30).getTime()),
    'should NOT contain 12:30 (would overlap 13:00 booking)');
});

// ============================================================================
// TEST 5 — 15-min trim between two bookings at 10:45 and 13:00
// Expected window: [10:45, 12:45] — matching Architecture.md example.
// ============================================================================
test('15-min trim between 10:45 end and 13:00 start: 10:45–12:45', () => {
  const date = londonTime(2026, 1, 14, 12, 0);
  const service = { durationMinutes: 15 };
  const existing = [
    b(1, londonTime(2026, 1, 14, 10, 0),  londonTime(2026, 1, 14, 10, 45)),
    b(1, londonTime(2026, 1, 14, 13, 0),  londonTime(2026, 1, 14, 14, 15))
  ];
  const result = listAvailableSlots({
    date, service, bookings: existing,
    barberCount: 1, openingHours: STD_HOURS,
    timezone: TZ, granularityMinutes: 15,
    now: londonTime(2026, 1, 14, 8, 0)
  });
  const times = result[0].startTimes;
  // Inside the window: 10:45, 11:00, 11:15, 11:30, 11:45, 12:00, 12:15, 12:30, 12:45
  const expectedInside = [
    [10,45],[11,0],[11,15],[11,30],[11,45],[12,0],[12,15],[12,30],[12,45]
  ];
  for (const [h, m] of expectedInside) {
    assert.ok(times.some(t => t.getTime() === londonTime(2026, 1, 14, h, m).getTime()),
      `window should contain ${h}:${String(m).padStart(2,'0')}`);
  }
  // Excluded: 10:30 (overlaps prev), 12:50 (not on granularity), 13:00 (overlaps next)
  assert.ok(!times.some(t => t.getTime() === londonTime(2026, 1, 14, 10, 30).getTime()));
  assert.ok(!times.some(t => t.getTime() === londonTime(2026, 1, 14, 13, 0).getTime()));
});

// ============================================================================
// TEST 6 — Barbers checked independently
// B1 booked 10:00–10:45. B2 and B3 should still have a slot at 10:00.
// ============================================================================
test('other barbers still available when one is booked', () => {
  const date = londonTime(2026, 1, 14, 12, 0);
  const service = { durationMinutes: 30 };
  const existing = [
    b(1, londonTime(2026, 1, 14, 10, 0), londonTime(2026, 1, 14, 10, 45))
  ];
  const result = listAvailableSlots({
    date, service, bookings: existing,
    barberCount: 3, openingHours: STD_HOURS,
    timezone: TZ, granularityMinutes: 15,
    now: londonTime(2026, 1, 14, 8, 0)
  });
  const b1 = result.find(r => r.barberId === 1);
  const b2 = result.find(r => r.barberId === 2);
  const b3 = result.find(r => r.barberId === 3);
  assert.ok(!b1.startTimes.some(t => t.getTime() === londonTime(2026, 1, 14, 10, 0).getTime()),
    'B1 should NOT have 10:00 (booked)');
  assert.ok( b2.startTimes.some(t => t.getTime() === londonTime(2026, 1, 14, 10, 0).getTime()),
    'B2 should have 10:00');
  assert.ok( b3.startTimes.some(t => t.getTime() === londonTime(2026, 1, 14, 10, 0).getTime()),
    'B3 should have 10:00');
});

// ============================================================================
// TEST 7 — Past slots excluded by 'now' guard
// ============================================================================
test('slots before now are excluded', () => {
  const date = londonTime(2026, 1, 14, 12, 0);
  const service = { durationMinutes: 30 };
  const result = listAvailableSlots({
    date, service, bookings: [],
    barberCount: 1, openingHours: STD_HOURS,
    timezone: TZ, granularityMinutes: 15,
    now: londonTime(2026, 1, 14, 14, 0) // it's already 2pm
  });
  const times = result[0].startTimes;
  assert.ok(!times.some(t => t.getTime() < londonTime(2026, 1, 14, 14, 0).getTime()),
    'no slot should be before 14:00');
  // 14:00 itself should be valid (now <= t with current guard: t >= now)
  assert.ok(times.some(t => t.getTime() === londonTime(2026, 1, 14, 14, 0).getTime()),
    '14:00 should still be available (not strictly past)');
});

// ============================================================================
// TEST 8 — Shop closed day returns empty per barber
// ============================================================================
test('day with no opening hours returns empty arrays', () => {
  const closedHours = { ...STD_HOURS };
  delete closedHours[0]; // Sunday closed
  const date = londonTime(2026, 1, 11, 12, 0); // Sunday Jan 11 2026
  const service = { durationMinutes: 30 };
  const result = listAvailableSlots({
    date, service, bookings: [],
    barberCount: 3, openingHours: closedHours,
    timezone: TZ, granularityMinutes: 15,
    now: londonTime(2026, 1, 11, 8, 0)
  });
  assert.strictEqual(result.length, 3);
  for (const r of result) {
    assert.strictEqual(r.startTimes.length, 0,
      `barber ${r.barberId} should have no slots on a closed day`);
  }
});

// ============================================================================
// TEST 9 — BST (summer) correctness: London is UTC+1
// 2026-07-15 open 09:00 London = 08:00 UTC
// ============================================================================
test('BST: July Wednesday 09:00 London = 08:00 UTC', () => {
  const date = londonTime(2026, 7, 15, 12, 0);
  const service = { durationMinutes: 30 };
  const result = listAvailableSlots({
    date, service, bookings: [],
    barberCount: 1, openingHours: STD_HOURS,
    timezone: TZ, granularityMinutes: 15,
    now: londonTime(2026, 7, 15, 7, 0)
  });
  const first = result[0].startTimes[0];
  // 09:00 London on 2026-07-15 is 08:00 UTC
  const expected = new Date(Date.UTC(2026, 6, 15, 8, 0, 0));
  assert.strictEqual(first.getTime(), expected.getTime(),
    `expected ${expected.toISOString()}, got ${first.toISOString()}`);
});

// ============================================================================
// TEST 10 — checkSingleSlot: positive and negative
// ============================================================================
test('checkSingleSlot: returns null for a valid slot', () => {
  const startAt = londonTime(2026, 1, 14, 11, 0);
  const reason = checkSingleSlot({
    barberId: 1, startAt,
    service: { durationMinutes: 30 },
    bookings: [],
    openingHours: STD_HOURS,
    timezone: TZ,
    now: londonTime(2026, 1, 14, 8, 0)
  });
  assert.strictEqual(reason, null);
});

test('checkSingleSlot: flags overlap with a specific reason', () => {
  const startAt = londonTime(2026, 1, 14, 10, 30);
  const reason = checkSingleSlot({
    barberId: 1, startAt,
    service: { durationMinutes: 30 },
    bookings: [ b(1, londonTime(2026, 1, 14, 10, 0), londonTime(2026, 1, 14, 10, 45)) ],
    openingHours: STD_HOURS,
    timezone: TZ,
    now: londonTime(2026, 1, 14, 8, 0)
  });
  assert.match(reason, /overlap/i, `expected overlap reason, got: ${reason}`);
});

test('checkSingleSlot: flags past time', () => {
  const reason = checkSingleSlot({
    barberId: 1,
    startAt: londonTime(2026, 1, 14, 9, 0),
    service: { durationMinutes: 30 },
    bookings: [],
    openingHours: STD_HOURS,
    timezone: TZ,
    now: londonTime(2026, 1, 14, 10, 0) // now is after
  });
  assert.match(reason, /past/i);
});

test('checkSingleSlot: flags start before opening', () => {
  const reason = checkSingleSlot({
    barberId: 1,
    startAt: londonTime(2026, 1, 14, 8, 45),
    service: { durationMinutes: 30 },
    bookings: [],
    openingHours: STD_HOURS,
    timezone: TZ,
    now: londonTime(2026, 1, 14, 8, 0)
  });
  assert.match(reason, /before opening/i);
});

test('checkSingleSlot: flags end after closing', () => {
  const reason = checkSingleSlot({
    barberId: 1,
    startAt: londonTime(2026, 1, 14, 19, 45),
    service: { durationMinutes: 30 },
    bookings: [],
    openingHours: STD_HOURS,
    timezone: TZ,
    now: londonTime(2026, 1, 14, 8, 0)
  });
  assert.match(reason, /after closing/i);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
