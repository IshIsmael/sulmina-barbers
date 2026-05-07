'use strict';

const path = require('path');
const express = require('express');

const { SHOP, HOURS_DISPLAY } = require('./src/config/shop');
const mongo = require('./src/lib/mongo');
const email = require('./src/lib/email');
const { pageMeta } = require('./src/lib/seo');
const pagesRouter   = require('./src/routes/pages');
const bookingRouter = require('./src/routes/booking');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '1h'
}));

app.use((req, res, next) => {
  res.locals.shop = SHOP;
  res.locals.hours = HOURS_DISPLAY;
  res.locals.currentPath = req.path;
  next();
});

app.use('/book', bookingRouter);
app.use('/', pagesRouter);

app.use((req, res) => {
  const meta = pageMeta('not-found');
  res.status(404).render('404', { title: meta.title, meta });
});

app.use((err, req, res, _next) => {
  console.error('[error]', err);
  const meta = pageMeta('error');
  res.status(500).render('500', { title: meta.title, meta });
});

async function start() {
  try {
    const db = await mongo.connect();
    console.log(`[mongo] connected → database: ${db.databaseName}`);
    await mongo.ensureIndexes();
    console.log('[mongo] indexes ensured');
  } catch (err) {
    console.error('[mongo] startup failed:', err.message);
    process.exit(1);
  }

  if (email.isConfigured()) {
    console.log(`[email] SMTP configured → bookings will be sent from ${process.env.SMTP_USER}`);
  } else {
    console.warn(
      '[email] SMTP NOT configured — bookings will still commit, but no confirmation emails ' +
      'will be sent. Fill SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM, SHOP_EMAIL in .env.'
    );
  }

  app.listen(PORT, () => {
    console.log(`[http]  listening → http://localhost:${PORT}`);
  });
}

process.on('SIGINT',  async () => { await mongo.close(); process.exit(0); });
process.on('SIGTERM', async () => { await mongo.close(); process.exit(0); });

start();
