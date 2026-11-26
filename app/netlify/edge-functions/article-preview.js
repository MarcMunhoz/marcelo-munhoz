import { articleHeroImageUrl } from "../../src/utils/contentfulImages.js";

const entities = { "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" };
const escapeAttribute = (value) => value.replace(/[&"<>]/g, (character) => entities[character]);
const headEnd = /<\/head\s*>/i;

function previewTags(fields, url) {
  if (typeof fields?.title !== "string" || !fields.title.trim()) return "";

  const image = URL.parse(articleHeroImageUrl(fields));
  const imageUrl = image?.protocol === "https:" && !image.username && !image.password ? image.href : "";
  const description = typeof fields.description === "string" ? fields.description : "";
  const properties = {
    "og:type": "article",
    "og:url": url,
    "og:title": fields.title,
    "og:description": description,
    "og:image": imageUrl,
  };
  const names = {
    "twitter:card": imageUrl ? "summary_large_image" : "summary",
    "twitter:title": fields.title,
    "twitter:description": description,
    "twitter:image": imageUrl,
  };

  return Object.entries(properties)
    .map(([key, value]) => ["property", key, value])
    .concat(Object.entries(names).map(([key, value]) => ["name", key, value]))
    .filter(([, , value]) => value.trim())
    .map(([attribute, key, value]) => `  <meta ${attribute}="${key}" content="${escapeAttribute(value)}" data-article-preview>`)
    .join("\n");
}

export const config = {
  pattern: "^/blog/[^/]+/?$",
  method: "GET",
  onError: "bypass",
};

export default async function articlePreview(request, context) {
  const url = new URL(request.url);
  const match = /^\/blog\/([^/]+)\/?$/.exec(url.pathname);
  if (request.method !== "GET" || !match) return;

  // Transform the complete SPA shell even when a crawler requests only its first bytes.
  const downstreamRequest = new Request(request);
  downstreamRequest.headers.delete("range");
  downstreamRequest.headers.delete("if-range");
  const response = await context.next(downstreamRequest);
  if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")) return response;

  try {
    const slug = decodeURIComponent(match[1]);
    if (!slug || /[/\\]/.test(slug) || slug === "." || slug === "..") return response;

    const articlePath = `/blog/${encodeURIComponent(slug)}`;
    const apiUrl = new URL(`/api/contentful/article/${encodeURIComponent(slug)}`, url);
    const articleResponse = await fetch(apiUrl.href, { redirect: "error", signal: AbortSignal.timeout(2500) });
    if (!articleResponse.ok) return response;

    const { fields } = await articleResponse.json();
    const tags = previewTags(fields, new URL(articlePath, url).href);
    if (!tags) return response;

    const html = await response.clone().text();
    if (!headEnd.test(html)) return response;

    const headers = new Headers(response.headers);
    for (const name of ["content-encoding", "content-length", "etag", "last-modified"]) headers.delete(name);
    headers.set("cache-control", "no-cache");
    return new Response(html.replace(headEnd, (closingTag) => `${tags}\n${closingTag}`), { status: response.status, headers });
  } catch {
    return response;
  }
}
