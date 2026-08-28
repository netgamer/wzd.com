import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../dist/${path}`, import.meta.url), 'utf8');
const home = read('index.html');
const about = read('about.html');
for (const [html, canonical] of [[home, 'https://www.wzd.kr/'], [about, 'https://www.wzd.kr/about']]) {
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(html.includes(`rel="canonical" href="${canonical}"`));
  assert.ok(html.includes('<html lang="ko">'));
  assert.ok(html.includes('<h1>'));
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(schemas.length, 1);
  assert.equal(JSON.parse(schemas[0][1])['@context'], 'https://schema.org');
}
assert.ok(about.includes('RSS 피드'));
assert.ok(about.includes('WZD 시작하기'));
assert.ok(!/<script[^>]+src=/.test(about), 'Introduction must not depend on JS/API');
assert.ok(home.includes('href="/about"'));
const sitemap = read('sitemap.xml');
assert.ok(sitemap.includes('<loc>https://www.wzd.kr/about</loc>'));
assert.ok(!sitemap.includes('/api/'));
assert.ok(!sitemap.includes('/board/'));
const robots = read('robots.txt');
const groups = robots.split(/\r?\n\s*\r?\n/).filter(group => group.includes('User-agent:'));
for (const agent of ['*', 'Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User']) {
  const group = groups.find(group => group.split(/\r?\n/).includes(`User-agent: ${agent}`));
  assert.ok(group, agent);
  assert.ok(group.includes('Allow: /'));
  assert.ok(group.includes('Disallow: /api/'));
  assert.ok(group.includes('Disallow: /landing'));
}
assert.deepEqual(JSON.parse(read('_routes.json')), { version: 1, include: ['/api/*', '/board/*'], exclude: [] });
console.log('SEO checks passed: static content, canonical, JSON-LD, sitemap, search crawler groups, unchanged Worker scope.');
