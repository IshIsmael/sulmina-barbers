'use strict';

/**
 * SEO helpers — titles, descriptions, canonical URLs, JSON-LD.
 *
 * One module so every page gets the same treatment. Routes call
 * pageMeta('home') (or similar) to get their locals. The LocalBusiness
 * JSON-LD block is generated from src/config/shop.js so opening hours
 * stay in sync with the booking engine.
 */

const { SHOP, OPENING_HOURS } = require('../config/shop');

/**
 * Base URL for canonical links. Overridden via SITE_URL env var in
 * production. In dev, we render canonical as-is (relative-safe).
 */
function siteUrl() {
  return (process.env.SITE_URL || 'https://www.sulminabarbershop.co.uk').replace(/\/$/, '');
}

/**
 * Per-page metadata. Every page route calls this and spreads the result
 * into its render locals.
 */
function pageMeta(key, overrides = {}) {
  const common = {
    siteName: SHOP.name,
    ogImage: siteUrl() + '/images/gallery/01.jpg'
  };

  const pages = {
    home: {
      title: 'Barber Shop in Southgate, North London · Sulmina',
      description: 'Sulmina Barber Shop is at 43 High Street, Southgate N14. Book haircuts, skin fades, beard work and full-service grooming online.',
      path: '/',
      ogType: 'website'
    },
    services: {
      title: 'Services & Prices · Sulmina Barber Shop, Southgate N14',
      description: 'Clear prices for Sulmina Barber Shop in Southgate. Haircuts from £11, skin fades, beard work and full-service grooming.',
      path: '/services',
      ogType: 'website'
    },
    about: {
      title: 'About · Sulmina Barber Shop, Southgate',
      description: 'About Sulmina Barber Shop on 43 High Street, Southgate: local haircuts, fades, beard work and online booking.',
      path: '/about',
      ogType: 'website'
    },
    gallery: {
      title: 'Gallery · Sulmina Barber Shop, Southgate',
      description: 'Recent work, finished cuts and shots from the shop floor at Sulmina Barber Shop, Southgate N14.',
      path: '/gallery',
      ogType: 'website'
    },
    contact: {
      title: 'Contact & Find Us · Sulmina Barber Shop, 43 High St, N14 6LD',
      description: 'Sulmina Barber Shop is at 43 High Street, London N14 6LD. Call 07474 372775 to book by phone, or book online.',
      path: '/contact',
      ogType: 'website'
    },
    book: {
      title: 'Book a Chair · Sulmina Barber Shop, Southgate',
      description: 'Book your next cut at Sulmina, Southgate N14. Pick a service and a time online.',
      path: '/book',
      ogType: 'website',
      noindex: true // booking pages with query params, avoid indexing
    },
    'not-found': {
      title: 'Page not found · Sulmina',
      description: 'That page isn\'t here.',
      path: null,
      noindex: true
    },
    error: {
      title: 'Something went wrong · Sulmina',
      description: 'An error occurred.',
      path: null,
      noindex: true
    }
  };

  const p = pages[key];
  if (!p) throw new Error('Unknown page key for SEO meta: ' + key);
  return {
    ...common,
    ...p,
    ...overrides,
    canonical: p.path ? siteUrl() + p.path : null
  };
}

/**
 * Map OPENING_HOURS (keyed 0..6) into schema.org openingHoursSpecification
 * entries. Combines consecutive days with identical hours into one entry
 * for cleaner output.
 */
function buildOpeningHoursSpec() {
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const entries = [];
  let run = null;

  for (let i = 0; i < 7; i++) {
    const h = OPENING_HOURS[i];
    if (!h) {
      if (run) entries.push(run);
      run = null;
      continue;
    }
    if (run && run.opens === h.open && run.closes === h.close) {
      run.dayOfWeek.push(dayNames[i]);
    } else {
      if (run) entries.push(run);
      run = { opens: h.open, closes: h.close, dayOfWeek: [dayNames[i]] };
    }
  }
  if (run) entries.push(run);

  return entries.map(e => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: e.dayOfWeek,
    opens: e.opens,
    closes: e.closes
  }));
}

/**
 * LocalBusiness (HairSalon) JSON-LD for the home page.
 */
function buildLocalBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    '@id': siteUrl() + '/#shop',
    name: SHOP.name,
    url: siteUrl(),
    telephone: '+44' + SHOP.phone.replace(/\s+/g, '').replace(/^0/, ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: '43 High Street',
      addressLocality: 'Southgate',
      addressRegion: 'London',
      postalCode: 'N14 6LD',
      addressCountry: 'GB'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 51.6316,
      longitude: -0.1283
    },
    openingHoursSpecification: buildOpeningHoursSpec(),
    priceRange: '££',
    image: siteUrl() + '/images/gallery/01.jpg',
    logo: siteUrl() + '/img/favicon.svg',
    sameAs: [ SHOP.instagram ]
  };
}

module.exports = { pageMeta, buildLocalBusinessJsonLd, siteUrl };
