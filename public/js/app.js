/* app.js — tiny client-side behaviours.
   Mobile menu toggle, header scroll state, reveal-on-scroll.
   Keep this file minimal. */

(function () {
  'use strict';

  // Flag JS availability — reveal styles only apply under .js so
  // content is never hidden when scripts don't run.
  document.documentElement.classList.add('js');

  // ---- Mobile menu -------------------------------------------------
  const toggle = document.querySelector('.menu-toggle');
  const body = document.body;

  if (toggle) {
    const setOpen = function (isOpen) {
      body.classList.toggle('menu-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    };

    toggle.addEventListener('click', function () {
      setOpen(!body.classList.contains('menu-open'));
    });

    // Close on any nav link tap (so in-page hash links still scroll)
    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('menu-open')) {
        setOpen(false);
      }
    });
  }

  // ---- Header scroll state -----------------------------------------
  // Overlay headers (home hero) start transparent and gain their glass
  // surface once the page scrolls.
  const header = document.querySelector('.site-header');
  if (header) {
    const sync = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
  }

  // ---- Reveal on scroll --------------------------------------------
  const revealed = document.querySelectorAll('.reveal');
  if (revealed.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add('in'); });
  }
})();
