'use strict';

/**
 * Small date-formatting helpers for the booking UI.
 * All rendering is done in the shop's timezone so the customer sees
 * the same times the shop sees. Storage stays UTC throughout.
 */

const { SHOP } = require('../config/shop');

function shopDateKey(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) throw new Error('invalid date key: ' + key);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function shopTime(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
}

function shopWeekdayShort(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    weekday: 'short'
  }).format(date);
}

function shopDayNum(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    day: 'numeric'
  }).format(date);
}

function shopMonthShort(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    month: 'short'
  }).format(date);
}

function shopMonthNum(date) {
  return Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    month: 'numeric'
  }).format(date));
}

function shopHour(date) {
  return Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    hour: '2-digit',
    hour12: false
  }).format(date));
}

function shopDateLong(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone,
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(date);
}

function buildDateStrip(startDate, n) {
  const out = [];
  let prevMonth = null;
  for (let i = 0; i < n; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const month = shopMonthNum(d);
    out.push({
      key: shopDateKey(d),
      weekday: shopWeekdayShort(d),
      day: shopDayNum(d),
      monthShort: shopMonthShort(d),
      showMonth: prevMonth === null || month !== prevMonth,
      date: d
    });
    prevMonth = month;
  }
  return out;
}

/**
 * Format a concise week range for the mobile nav bar.
 *
 *   same month:     "20 – 26 Apr"
 *   crosses months: "28 Apr – 4 May"
 *   crosses years:  "29 Dec 2026 – 4 Jan 2027"
 */
function formatWeekRange(firstDate, lastDate) {
  const firstMonth = shopMonthShort(firstDate);
  const lastMonth  = shopMonthShort(lastDate);
  const firstDay   = shopDayNum(firstDate);
  const lastDay    = shopDayNum(lastDate);
  const firstYear  = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone, year: 'numeric'
  }).format(firstDate));
  const lastYear   = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP.timezone, year: 'numeric'
  }).format(lastDate));

  if (firstYear !== lastYear) {
    return `${firstDay} ${firstMonth} ${firstYear} – ${lastDay} ${lastMonth} ${lastYear}`;
  }
  if (firstMonth !== lastMonth) {
    return `${firstDay} ${firstMonth} – ${lastDay} ${lastMonth}`;
  }
  return `${firstDay} – ${lastDay} ${firstMonth}`;
}

function groupSlotsByDaypart(slots) {
  const groups = { morning: [], afternoon: [], evening: [] };
  for (const s of slots) {
    const hour = shopHour(s.date);
    if (hour < 12) groups.morning.push(s);
    else if (hour < 17) groups.afternoon.push(s);
    else groups.evening.push(s);
  }
  return [
    { id: 'morning',   label: 'Morning',   items: groups.morning },
    { id: 'afternoon', label: 'Afternoon', items: groups.afternoon },
    { id: 'evening',   label: 'Evening',   items: groups.evening }
  ].filter(g => g.items.length > 0);
}

module.exports = {
  shopDateKey,
  parseDateKey,
  shopTime,
  shopWeekdayShort,
  shopDayNum,
  shopMonthShort,
  shopDateLong,
  shopHour,
  buildDateStrip,
  formatWeekRange,
  groupSlotsByDaypart
};
