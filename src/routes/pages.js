'use strict';

const express = require('express');
const { SERVICES, groupByCategory } = require('../data/services');
const { OPENING_HOURS, HOURS_DISPLAY, SHOP } = require('../config/shop');
const {
  pageMeta,
  buildLocalBusinessJsonLd,
  buildServiceListJsonLd,
  siteUrl
} = require('../lib/seo');
const { listImages } = require('../lib/gallery');

const router = express.Router();

function getTodayInfo() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    weekday: 'long'
  });
  const weekdayName = fmt.format(now);
  const weekdayIndex = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    .indexOf(weekdayName);

  const todayHoursRaw = OPENING_HOURS[weekdayIndex];
  const todayHours = todayHoursRaw
    ? `${todayHoursRaw.open} – ${todayHoursRaw.close}`
    : null;

  const todayLabel =
    weekdayIndex === 0 ? 'Sunday' :
    weekdayIndex >= 1 && weekdayIndex <= 4 ? 'Monday – Thursday' :
    'Friday – Saturday';

  return { todayHours, todayLabel };
}

router.get('/', (req, res) => {
  const highlights = SERVICES.filter(s =>
    ['full-service', 'haircut', 'haircut-beard', 'skin-fade'].includes(s.slug)
  );
  const { todayHours, todayLabel } = getTodayInfo();
  const meta = pageMeta('home');
  res.render('home', {
    title: meta.title,
    meta,
    jsonLd: [buildLocalBusinessJsonLd(), buildServiceListJsonLd()],
    loadElfsight: true,
    highlights, todayHours, todayLabel
  });
});

router.get('/services', (req, res) => {
  const meta = pageMeta('services');
  res.render('services', {
    title: meta.title,
    meta,
    jsonLd: buildServiceListJsonLd(),
    groups: groupByCategory()
  });
});

router.get('/about', (req, res) => {
  const meta = pageMeta('about');
  res.render('about', { title: meta.title, meta });
});

router.get('/gallery', (req, res) => {
  const images = listImages();
  const meta = pageMeta('gallery');
  res.render('gallery', { title: meta.title, meta, images });
});

router.get('/contact', (req, res) => {
  const { todayLabel } = getTodayInfo();
  const meta = pageMeta('contact');
  res.render('contact', { title: meta.title, meta, todayLabel });
});

router.get('/robots.txt', (req, res) => {
  const base = siteUrl();
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /book/time',
    'Disallow: /book/details',
    'Disallow: /book/confirm',
    'Disallow: /book/confirmed/',
    'Disallow: /book/conflict',
    'Disallow: /book/_preview/',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    ''
  ].join('\n');
  res.type('text/plain').send(body);
});

router.get('/sitemap.xml', (req, res) => {
  const base = siteUrl();
  const today = new Date().toISOString().slice(0, 10);
  const pages = [
    { loc: '/',         changefreq: 'weekly',  priority: '1.0' },
    { loc: '/services', changefreq: 'monthly', priority: '0.9' },
    { loc: '/about',    changefreq: 'yearly',  priority: '0.6' },
    { loc: '/gallery',  changefreq: 'monthly', priority: '0.6' },
    { loc: '/contact',  changefreq: 'yearly',  priority: '0.8' }
  ];
  const urls = pages.map(p => `  <url>
    <loc>${base}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  res.type('application/xml').send(xml);
});

module.exports = router;
