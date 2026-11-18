import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const canonical = 'https://www.myops.com.my';

test('production HTML advertises the actual canonical www host', async () => {
  const html = await read('../index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.myops\.com\.my\/"/);
  assert.match(html, /<meta property="og:url" content="https:\/\/www\.myops\.com\.my\/"/);
  assert.doesNotMatch(html, /(?:href|content)="https:\/\/myops\.com\.my\//);
});

test('robots sitemap points to the same canonical production host', async () => {
  const robots = await read('../public/robots.txt');
  assert.match(robots, /^Sitemap: https:\/\/www\.myops\.com\.my\/sitemap\.xml$/m);
});

test('all published sitemap locations use the canonical www host', async () => {
  const sitemap = await read('../public/sitemap.xml');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.ok(locations.length > 0, 'sitemap must contain published locations');
  for (const location of locations) {
    const url = new URL(location);
    assert.equal(url.origin, canonical, `noncanonical sitemap location: ${location}`);
  }
});
