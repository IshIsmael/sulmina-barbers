/* booking-time.js — progressive enhancement for the time-picker.
 *
 * Any link marked [data-tg-swap] is intercepted:
 *   1. fetch the same URL but with the "/time/slots" fragment endpoint
 *   2. replace the .time-grid element in place
 *   3. push the original navigation URL to history so back works
 *
 * If fetch fails or JS is unavailable, the link's href navigates normally.
 * No frameworks, no libraries, ~50 LOC including helpers.
 */

(function () {
  'use strict';

  const ROOT_SELECTOR = '.time-grid';
  const SWAP_ATTR = 'data-tg-swap';
  const SWAP_DELAY = 180; // matches CSS opacity transition

  const root = document.querySelector(ROOT_SELECTOR);
  if (!root) return;

  // The fragment URL is the same as the anchor's href but with
  // /book/time → /book/time/slots. This keeps one source of truth.
  function toFragmentUrl(href) {
    const url = new URL(href, window.location.origin);
    if (url.pathname === '/book/time') url.pathname = '/book/time/slots';
    return url;
  }

  async function swap(anchor) {
    const navUrl = new URL(anchor.href, window.location.origin);
    const fragUrl = toFragmentUrl(anchor.href);

    const current = document.querySelector(ROOT_SELECTOR);
    if (!current) { window.location.href = navUrl.toString(); return; }

    current.classList.add('is-swapping');

    try {
      const resp = await fetch(fragUrl.toString(), {
        headers: { 'Accept': 'text/html' }
      });
      if (!resp.ok) throw new Error('fragment fetch failed: ' + resp.status);
      const html = await resp.text();

      // Parse the fragment and extract the .time-grid from it.
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      const replacement = tpl.content.querySelector(ROOT_SELECTOR);
      if (!replacement) throw new Error('no time-grid in fragment response');

      current.replaceWith(replacement);

      // Update the browser URL (the user-facing /book/time one, not /slots).
      window.history.pushState({}, '', navUrl.toString());

      // Move focus to the day heading for keyboard users.
      const heading = replacement.querySelector('.slots-head');
      if (heading) heading.focus();

      // Smooth-scroll the slot region into view on small screens if the
      // click happened from a date pill (fresh day means new grid).
      if (anchor.classList.contains('date-pill')) {
        const region = replacement.querySelector('.slots-region');
        if (region && window.matchMedia('(max-width: 720px)').matches) {
          region.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } catch (err) {
      // On any failure, fall through to a normal navigation.
      window.location.href = navUrl.toString();
    }
  }

  // Event delegation: we re-run this bind implicitly because the new
  // .time-grid is inside document, and document-level delegation covers it.
  document.addEventListener('click', function (e) {
    const anchor = e.target.closest('[' + SWAP_ATTR + ']');
    if (!anchor) return;

    // Let the browser handle modified clicks (open-in-new-tab etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    e.preventDefault();
    swap(anchor);
  });

  // Back/forward: fetch the matching fragment for the restored URL.
  window.addEventListener('popstate', async function () {
    const current = document.querySelector(ROOT_SELECTOR);
    if (!current) return;

    const fragUrl = toFragmentUrl(window.location.href);
    current.classList.add('is-swapping');
    try {
      const resp = await fetch(fragUrl.toString(), { headers: { 'Accept': 'text/html' } });
      if (!resp.ok) throw new Error('fragment popstate fetch failed');
      const html = await resp.text();
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      const replacement = tpl.content.querySelector(ROOT_SELECTOR);
      if (!replacement) throw new Error('no time-grid in popstate fragment');
      current.replaceWith(replacement);
    } catch (err) {
      window.location.reload();
    }
  });
})();
