'use strict';

/**
 * Gallery — filesystem loader.
 *
 * Reads public/images/gallery/ on each request (cheap — dozen files at
 * most, server-local) and returns entries sorted by filename. The sort
 * is ASCII-lexicographic, which is why the numbering convention uses
 * zero-padded prefixes (01, 02, … 08, 09, 10) — this guarantees the
 * display order matches the numeric intent.
 *
 * Accepted extensions: .jpg .jpeg .png .webp .avif
 * Hidden/system files (leading '.') are ignored.
 */

const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'gallery');
const ACCEPTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

function listImages() {
  let entries;
  try {
    entries = fs.readdirSync(GALLERY_DIR);
  } catch (err) {
    if (err.code === 'ENOENT') return []; // folder missing — empty gallery
    throw err;
  }

  return entries
    .filter(name => !name.startsWith('.'))
    .filter(name => ACCEPTED.has(path.extname(name).toLowerCase()))
    .sort() // ASCII sort — matches zero-padded numeric ordering (01, 02, …)
    .map(name => ({
      src: '/images/gallery/' + name,
      filename: name
    }));
}

module.exports = { listImages };
