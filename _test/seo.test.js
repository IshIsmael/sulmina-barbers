'use strict';

const assert = require('node:assert');

const {
  pageMeta,
  buildLocalBusinessJsonLd,
  buildServiceListJsonLd,
  siteUrl
} = require('../src/lib/seo');

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

test('home meta targets Southgate barbershop searches', () => {
  const meta = pageMeta('home');
  assert.match(meta.title, /Southgate/i);
  assert.match(meta.title, /Barber/i);
  assert.match(meta.description, /43 High Street/i);
  assert.match(meta.description, /skin fade|skin fades/i);
  assert.strictEqual(meta.canonical, siteUrl() + '/');
});

test('LocalBusiness JSON-LD includes local geo and contact facts', () => {
  const json = buildLocalBusinessJsonLd();
  assert.strictEqual(json['@type'], 'HairSalon');
  assert.strictEqual(json.name, 'Sulmina Barber Shop');
  assert.strictEqual(json.address.postalCode, 'N14 6LD');
  assert.match(json.telephone, /^\+44/);
  assert.ok(json.geo.latitude);
  assert.ok(json.geo.longitude);
  assert.ok(Array.isArray(json.openingHoursSpecification));
  assert.ok(json.openingHoursSpecification.length >= 3);
});

test('Service JSON-LD is generated from the real service catalogue', () => {
  const json = buildServiceListJsonLd();
  assert.strictEqual(json['@type'], 'ItemList');
  assert.ok(json.itemListElement.length >= 10);
  const names = json.itemListElement.map(item => item.item.name);
  assert.ok(names.includes('Skin Fade'));
  assert.ok(names.includes('The Full Service'));
  const skinFade = json.itemListElement.find(item => item.item.name === 'Skin Fade');
  assert.strictEqual(skinFade.item.offers.priceCurrency, 'GBP');
  assert.ok(Number(skinFade.item.offers.price) > 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
