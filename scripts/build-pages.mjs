import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const dist = new URL('dist/', root);
const manifest = JSON.parse(
  await readFile(new URL('src/scenes/manifest.json', root), 'utf8'),
);
const shell = await readFile(new URL('index.html', dist), 'utf8');
const siteBase = new URL(
  process.env.SITE_URL ??
    'https://mercator-mathematical-worlds.alexandre-eisenmann.chatgpt.site/',
);

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceMeta(html, attribute, key, content) {
  const tag = new RegExp(
    `<meta\\s+${attribute}="${key}"[\\s\\S]*?\\/?>`,
  );
  if (!tag.test(html)) throw new Error(`Missing ${attribute}="${key}" meta tag`);
  return html.replace(
    tag,
    `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`,
  );
}

for (const scene of manifest) {
  const route = scene.path.replace(/^\/+|\/+$/g, '');
  const pageUrl = new URL(route, siteBase).href;
  const imageUrl = new URL(scene.social.image.replace(/^\/+/, ''), siteBase).href;
  let html = shell;

  html = replaceMeta(html, 'name', 'description', scene.social.description);
  html = replaceMeta(html, 'property', 'og:title', scene.social.title);
  html = replaceMeta(html, 'property', 'og:description', scene.social.description);
  html = replaceMeta(html, 'property', 'og:url', pageUrl);
  html = replaceMeta(html, 'property', 'og:image', imageUrl);
  html = replaceMeta(html, 'property', 'og:image:secure_url', imageUrl);
  html = replaceMeta(html, 'property', 'og:image:alt', scene.social.imageAlt);
  html = replaceMeta(html, 'name', 'twitter:title', scene.social.title);
  html = replaceMeta(html, 'name', 'twitter:description', scene.social.description);
  html = replaceMeta(html, 'name', 'twitter:image', imageUrl);
  html = replaceMeta(html, 'name', 'twitter:image:alt', scene.social.imageAlt);
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`,
  );
  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(scene.social.title)}</title>`,
  );

  const outputDirectory = new URL(`${route}/`, dist);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(new URL('index.html', outputDirectory), html);
}

await copyFile(new URL('index.html', dist), new URL('404.html', dist));
console.log(`Generated ${manifest.length} minimundo page${manifest.length === 1 ? '' : 's'}.`);
