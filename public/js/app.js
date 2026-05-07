/* app.js — tiny client-side behaviours.
   Currently: mobile menu toggle. Keep this file minimal.         */

(function () {
  'use strict';

  const toggle = document.querySelector('.menu-toggle');
  const body = document.body;
  if (!toggle) return;

  function setOpen(isOpen) {
    body.classList.toggle('menu-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  }

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
})();
