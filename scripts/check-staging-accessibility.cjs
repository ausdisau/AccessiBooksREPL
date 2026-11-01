/**
 * Static guard only. Manual screen-reader, keyboard, zoom and WCAG journey
 * testing is still required before enabling or deploying this branch.
 */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const load = (path) => fs.readFileSync(path, 'utf8');
const discovery = load('client/src/pages/content-discovery.tsx');
const shop = load('client/src/pages/amazon-bookshop.tsx');
const css = load('client/src/pages/content-discovery.css');
const app = load('client/src/App.tsx');
const legacyAmazon = load('server/amazonPaApi.ts');
const registry = load('server/services/catalogue-v2/registry.ts');
const check = (condition, label) => {
  assert.ok(condition, label);
  console.log('PASS:', label);
};
check(discovery.includes('role="search"'), 'Search has a landmark');
check(discovery.includes('htmlFor='), 'Catalogue form has programmatic labels');
check(discovery.includes('aria-live="polite"'), 'Catalogue updates announced non-disruptively');
check(discovery.includes('aria-busy={busy}'), 'Async results expose busy state');
check(shop.includes('aria-live="polite"'), 'Bookshop availability status announced');
check(css.includes(':focus-visible'), 'Keyboard focus receives visible outline styling');
check(css.includes('prefers-reduced-motion: reduce'), 'Reduced motion preference respected');
check(app.includes('"/content-discovery"') && app.includes('"/bookshop"'), 'Routes are discoverable');
check(!legacyAmazon.includes('paapi5-nodejs-sdk'), 'Discontinued Amazon PA-API removed from request path');
check(registry.includes('amazonCreatorsConfigFromEnv'), 'Amazon gate is explicitly configured');
console.log('Static accessibility checks pass; this is NOT a WCAG 2.2 AA certification.');
