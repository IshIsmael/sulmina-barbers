'use strict';

const assert = require('node:assert');
const path = require('node:path');
const ejs = require('ejs');

const { SERVICES, groupByCategory } = require('../src/data/services');
const { SHOP, HOURS_DISPLAY, BARBERS } = require('../src/config/shop');
const { pageMeta, buildLocalBusinessJsonLd, buildServiceListJsonLd } = require('../src/lib/seo');

const viewsDir = path.join(__dirname, '..', 'views');
const service = SERVICES.find(s => s.slug === 'haircut') || SERVICES[0];

function bookingStep(current) {
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

function baseLocals(currentPath, metaKey = 'home', extras = {}) {
  const meta = pageMeta(metaKey);
  return {
    title: meta.title,
    meta,
    shop: SHOP,
    hours: HOURS_DISPLAY,
    currentPath,
    ...extras
  };
}

const timeGridLocals = {
  service,
  step: bookingStep(3),
  strip: [
    { key: '2026-06-15', weekday: 'Mon', day: '15', isSelected: true, isToday: true },
    { key: '2026-06-16', weekday: 'Tue', day: '16', isSelected: false, isToday: false },
    { key: '2026-06-17', weekday: 'Wed', day: '17', isSelected: false, isToday: false }
  ],
  weekStart: '2026-06-15',
  weekRangeLabel: '15 Jun - 21 Jun',
  prevWeekStart: null,
  nextWeekStart: '2026-06-22',
  dateKey: '2026-06-15',
  dateLong: 'Monday 15 June',
  groups: [
    {
      id: 'morning',
      label: 'Morning',
        items: [
          { iso: '2026-06-15T09:00:00.000Z', label: '09:00', status: 'free' },
        { iso: '2026-06-15T09:15:00.000Z', label: '09:15', status: 'free' }
      ]
    }
  ],
  totalSlotCount: 1,
  nextOpen: null,
  barberTabs: [
    { value: 'any', label: 'Any', isActive: true },
    { value: '1', label: 'Barber 1', isActive: false }
  ],
  barberFilter: 'any',
  barberFilterParam: 'any'
};

const cases = [
  ['home.ejs', '/', 'home', {
    jsonLd: [buildLocalBusinessJsonLd(), buildServiceListJsonLd()],
    loadElfsight: true,
    highlights: SERVICES.filter(s => ['full-service', 'haircut', 'haircut-beard', 'skin-fade'].includes(s.slug)),
    todayHours: '09:00 - 20:00',
    todayLabel: 'Monday - Thursday'
  }],
  ['services.ejs', '/services', 'services', {
    jsonLd: buildServiceListJsonLd(),
    groups: groupByCategory()
  }],
  ['about.ejs', '/about', 'about', {}],
  ['gallery.ejs', '/gallery', 'gallery', {
    images: [{ src: '/images/gallery/01.jpg' }, { src: '/images/gallery/02.jpg' }]
  }],
  ['contact.ejs', '/contact', 'contact', { todayLabel: 'Monday - Thursday' }],
  ['booking/select-service.ejs', '/book', 'book', {
    step: bookingStep(1),
    selectedService: service,
    barbers: BARBERS,
    ...timeGridLocals,
    form: { name: '', email: '', phone: '', notes: '' },
    errors: null
  }],
  ['booking/select-barber.ejs', '/book/barber', 'book', {
    service,
    barbers: BARBERS,
    step: bookingStep(2)
  }],
  ['booking/select-time.ejs', '/book/time', 'book', timeGridLocals],
  ['booking/details.ejs', '/book/details', 'book', {
    service,
    step: bookingStep(4),
    slotIso: '2026-06-15T09:00:00.000Z',
    barberChosen: 'any',
    barberLabel: 'Any available',
    slotLabel: '09:00',
    slotDateLong: 'Monday 15 June',
    errors: null,
    form: { name: '', email: '', phone: '', notes: '' }
  }],
  ['booking/conflict.ejs', '/book/conflict', 'book', {
    service,
    dateKey: '2026-06-15',
    barber: 'any',
    reason: 'slot unavailable'
  }],
  ['booking/confirmation.ejs', '/book/confirmed/mock', 'book', {
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
  }],
  ['404.ejs', '/missing', 'not-found', {}],
  ['500.ejs', '/error', 'error', {}]
];

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('PASS  ' + name);
  } catch (err) {
    failed++;
    console.error('FAIL  ' + name + '\n      ' + err.message);
  }
}

(async function run() {
  for (const [template, currentPath, metaKey, extras] of cases) {
    await test(template + ' renders', async () => {
      const html = await ejs.renderFile(
        path.join(viewsDir, template),
        baseLocals(currentPath, metaKey, extras)
      );
      assert.match(html, /<main id="main"/);
      assert.doesNotMatch(html, /svc-card|sec-head|section--contrast|menu-row/);
    });
  }

  await test('booking time keeps progressive enhancement hooks', async () => {
    const html = await ejs.renderFile(
      path.join(viewsDir, 'booking', 'select-time.ejs'),
      baseLocals('/book/time', 'book', timeGridLocals)
    );
    assert.match(html, /class="date-strip-wrap"/);
    assert.match(html, /data-tg-swap/);
    assert.match(html, /aria-live="polite"/);
  });

  await test('booking page is a single-page booking surface with selectable dates', async () => {
    const html = await ejs.renderFile(
      path.join(viewsDir, 'booking', 'select-service.ejs'),
      baseLocals('/book', 'book', {
        step: bookingStep(1),
        selectedService: service,
        barbers: BARBERS,
        ...timeGridLocals,
        form: { name: '', email: '', phone: '', notes: '' },
        errors: null
      })
    );

    assert.match(html, /class="[^"]*\bbooking-studio\b/);
    assert.match(html, /data-booking-page/);
    assert.match(html, /Book Haircut\./);
    assert.match(html, /Change service/);
    assert.doesNotMatch(html, /booking-service-strip/);
    assert.doesNotMatch(html, /booking-service-chip/);
    assert.match(html, /booking-section--barber/);
    assert.match(html, /data-booking-barber-card/);
    assert.match(html, /data-tg-swap/);
    assert.match(html, /booking-section--date/);
    assert.match(html, /booking-section--time/);
    assert.match(html, /booking-section--details/);

    const dateLinks = html.match(/href="\/book\?[^"]*date=/g) || [];
    assert.ok(dateLinks.length >= 3, 'expected multiple selectable dates on /book');
  });

  await test('fade services are grouped with hair cuts', async () => {
    const haircuts = groupByCategory().find(group => group.id === 'haircuts');
    assert.ok(haircuts, 'hair cuts group missing');
    const slugs = haircuts.items.map(item => item.slug);
    assert.ok(slugs.includes('skin-fade'), 'skin fade should be in hair cuts');
    assert.ok(slugs.includes('taper-fade'), 'taper fade should be in hair cuts');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
