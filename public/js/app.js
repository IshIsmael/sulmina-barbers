/* app.js - tiny client-side behaviours.
   Mobile menu toggle, header scroll state, reveal-on-scroll.
   Keep this file minimal. */

(function () {
  'use strict';

  document.documentElement.classList.add('js');

  // ---- Mobile menu -------------------------------------------------
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mobile-menu');
  const body = document.body;

  if (toggle) {
    const setOpen = function (isOpen) {
      body.classList.toggle('menu-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      if (menu) menu.setAttribute('aria-hidden', String(!isOpen));
    };

    toggle.addEventListener('click', function () {
      setOpen(!body.classList.contains('menu-open'));
    });

    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.querySelectorAll('[data-menu-close]').forEach(function (button) {
      button.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('menu-open')) {
        setOpen(false);
      }
    });
  }

  // ---- Header scroll state -----------------------------------------
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
