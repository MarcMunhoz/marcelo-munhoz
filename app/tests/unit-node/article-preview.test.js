import { afterEach, describe, expect, it, vi } from "vitest";
import articlePreview from "../../netlify/edge-functions/article-preview.js";

const url = "https://preview.example.test/blog/remote-work";
const shell = () =>
  new Response("<!doctype html><html><head><title>Site</title></head><body><div id=\"q-app\"></div></body></html>", {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'self'",
      "content-length": "90",
      etag: '"shell"',
    },
  });

afterEach(() => vi.unstubAllGlobals());

describe("article preview HTML", () => {
  it("adds escaped metadata to the SPA shell for the current article", async () => {
    const fetchArticle = vi.fn().mockResolvedValue(Response.json({
      fields: {
        title: 'Remote work " & <friends>',
        description: "Description </head><script>alert(1)</script>",
        thumbnail: { secure_url: "https://images.example.test/cover.jpg?a=1&b=2" },
      },
    }));
    vi.stubGlobal("fetch", fetchArticle);

    const response = await articlePreview(new Request(url + "?tracking=1"), { next: shell });
    const html = await response.text();

    expect(fetchArticle).toHaveBeenCalledWith(
      "https://preview.example.test/api/contentful/article/remote-work",
      expect.objectContaining({ redirect: "error" }),
    );
    expect(html).toContain('property="og:title" content="Remote work &quot; &amp; &lt;friends&gt;"');
    expect(html).toContain('property="og:description" content="Description &lt;/head&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
    expect(html).toContain('property="og:url" content="' + url + '"');
    expect(html).toContain('property="og:image" content="https://images.example.test/cover.jpg?a=1&amp;b=2"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('<div id="q-app"></div>');
    expect(response.headers.get("content-security-policy")).toBe("default-src 'self'");
    expect(response.headers.has("content-length")).toBe(false);
    expect(response.headers.has("etag")).toBe(false);
  });

  it("loads the full HTML shell for crawlers requesting a byte range", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ fields: { title: "Backup" } })));
    const request = new Request(url, { headers: { Range: "bytes=0-65535", "If-Range": '"shell"' } });
    const next = vi.fn((downstream = request) =>
      downstream.headers.has("range")
        ? new Response("<html><head></head>", {
            status: 206,
            headers: { "content-type": "text/html", "content-range": "bytes 0-18/90" },
          })
        : shell(),
    );

    const response = await articlePreview(request, { next });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('property="og:title" content="Backup"');
    expect(next.mock.calls[0][0].headers.has("if-range")).toBe(false);
  });

  it("keeps the SPA response when loading metadata fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("API unavailable")));
    const original = shell();
    expect(await articlePreview(new Request(url), { next: () => original })).toBe(original);
  });

  it("supports articles without an image and discards unsafe image URLs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      fields: { title: "Text only", thumbnail: { secure_url: "javascript:alert(1)" } },
    })));
    const response = await articlePreview(new Request(url), { next: shell });
    const html = await response.text();

    expect(html).toContain('property="og:title" content="Text only"');
    expect(html).toContain('name="twitter:card" content="summary"');
    expect(html).not.toContain("og:image");
  });

  it("leaves archive, author, and unsupported method requests alone", async () => {
    const fetchArticle = vi.fn();
    vi.stubGlobal("fetch", fetchArticle);

    for (const request of [
      new Request("https://preview.example.test/blog"),
      new Request("https://preview.example.test/blog/authors/example"),
      new Request(url, { method: "HEAD" }),
    ]) {
      expect(await articlePreview(request, { next: shell })).toBeUndefined();
    }
    expect(fetchArticle).not.toHaveBeenCalled();
  });
});
