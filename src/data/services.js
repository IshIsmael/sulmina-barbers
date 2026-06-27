'use strict';

/**
 * Single source of truth for services offered by Sulmina.
 * Verified against sulminabarbershop.co.uk/book-online on 2026-05-06.
 *
 * Each service's `durationMinutes` is what blocks the barber's calendar
 * for that booking. There are no before- or after-buffers — a new booking
 * can start the moment the previous one ends, and must end by the moment
 * the next one starts.
 *
 * `slug` is used in URLs and must be unique and stable (it ends up
 * referenced in the bookings collection once Phase 3 ships, so do not
 * rename a slug after bookings exist for it).
 */

const SERVICES = Object.freeze([
  {
    slug: 'haircut',
    name: 'Haircut',
    price: 15,
    durationMinutes: 30,
    category: 'haircuts',
    description: 'A classic barber cut with the finish shaped to how you wear it day to day.'
  },
  {
    slug: 'haircut-child',
    name: 'Children’s Haircut (under 11)',
    price: 11,
    durationMinutes: 15,
    category: 'haircuts',
    description: 'A tidy, patient cut for younger clients, kept simple and comfortable.'
  },
  {
    slug: 'haircut-senior',
    name: 'Seniors’ Haircut (over 65)',
    price: 11,
    durationMinutes: 30,
    category: 'haircuts',
    description: 'A straightforward cut with time to get the shape right.'
  },
  {
    slug: 'haircut-beard',
    name: 'Haircut & Beard',
    price: 25,
    durationMinutes: 35,
    category: 'haircuts',
    description: 'Hair and beard shaped together so the sides, neckline and beard sit cleanly.'
  },
  {
    slug: 'skin-fade-beard',
    name: 'Skin Fade & Beard',
    price: 28,
    durationMinutes: 45,
    category: 'haircuts',
    description: 'A close skin fade with beard shaping and line work for a sharper finish.'
  },
  {
    slug: 'buzz-cut',
    name: 'Buzz Cut (Zero)',
    price: 16,
    durationMinutes: 20,
    category: 'other',
    description: 'A clean all-over reset for a low-maintenance finish.'
  },
  {
    slug: 'taper-fade',
    name: 'Taper Fade',
    price: 17,
    durationMinutes: 25,
    category: 'haircuts',
    description: 'A softer fade around the temples and neckline while keeping length on top.'
  },
  {
    slug: 'skin-fade',
    name: 'Skin Fade',
    price: 18,
    durationMinutes: 30,
    category: 'haircuts',
    description: 'A high, mid or low fade taken cleanly down to the skin.'
  },
  {
    slug: 'beard-service',
    name: 'Beard Service',
    price: 12,
    durationMinutes: 15,
    category: 'beard',
    description: 'Beard shaping, line-up and tidy work for a clean outline.'
  },
  {
    slug: 'beard-zero',
    name: 'Beard (Zero Clipper)',
    price: 5,
    durationMinutes: 10,
    category: 'beard',
    description: 'A quick zero-clipper beard reset when you just need it cleared down.'
  },
  {
    slug: 'beard-color',
    name: 'Beard Colour',
    price: 10,
    durationMinutes: 10,
    category: 'beard',
    description: 'A short beard colour service for a more even-looking finish.'
  },
  {
    slug: 'face-mask',
    name: 'Face Mask',
    price: 8,
    durationMinutes: 10,
    category: 'other',
    description: 'A cleansing face mask that can be booked alone or added to a cut.'
  },
  {
    slug: 'full-service',
    name: 'The Full Service',
    price: 38,
    durationMinutes: 60,
    category: 'signature',
    description: 'Haircut, beard, skin fade, brows, nose, ears, face mask and hot towel.'
  }
]);

const CATEGORIES = Object.freeze([
  { id: 'signature', label: 'Signature' },
  { id: 'haircuts',  label: 'Hair cuts' },
  { id: 'beard',     label: 'Beard' },
  { id: 'other',     label: 'Other' }
]);

function getBySlug(slug) {
  return SERVICES.find(s => s.slug === slug) || null;
}

function groupByCategory() {
  return CATEGORIES.map(cat => ({
    ...cat,
    items: SERVICES.filter(s => s.category === cat.id)
  }));
}

module.exports = { SERVICES, CATEGORIES, getBySlug, groupByCategory };
