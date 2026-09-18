import createDOMPurify from "dompurify";
import { Marked, Renderer } from "marked";

const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"]);
const ARTICLE_IMAGE_HOSTS = new Set(["res.cloudinary.com", "images.ctfassets.net"]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

const MARKDOWN_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];
const MARKDOWN_ATTRIBUTES = ["alt", "href", "rel", "src", "title"];

const escapeHtml = (value) =>
  String(value || "").replace(
    /[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]
  );

const safeLinkHref = (value) => {
  const href = String(value || "").trim();
  if (/^(?:\/[^/]|#)/.test(href)) {
    return href;
  }

  try {
    const url = new URL(href);
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const safeArticleImageSrc = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && !url.username && !url.password && !url.port && ARTICLE_IMAGE_HOSTS.has(url.hostname)
      ? url.href
      : "";
  } catch {
    return "";
  }
};

const renderer = new Renderer();

renderer.html = ({ text }) => escapeHtml(text);
renderer.link = function ({ href, title, tokens }) {
    const safeHref = safeLinkHref(href);
    const label = this.parser.parseInline(tokens);
    if (!safeHref) {
      return label;
    }

    const safeTitle = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${escapeHtml(safeHref)}" rel="noopener noreferrer"${safeTitle}>${label}</a>`;
  };
renderer.image = ({ href, title, text }) => {
    const safeSrc = safeArticleImageSrc(href);
    if (!safeSrc) {
      return escapeHtml(text);
    }

    const safeTitle = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(text)}"${safeTitle}>`;
  };

const articleMarkdown = new Marked({ gfm: true, renderer });

const sanitizeMarkdownHtml = (html) =>
  createDOMPurify(globalThis.window).sanitize(`<div>${html}</div>`, {
    ALLOWED_TAGS: MARKDOWN_TAGS,
    ALLOWED_ATTR: MARKDOWN_ATTRIBUTES,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    FORBID_TAGS: ["iframe", "math", "script", "style", "svg"],
    RETURN_TRUSTED_TYPE: false,
  });

const youtubeVideoId = (url) => {
  if (url.hostname === "youtu.be") {
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.length === 1 ? segments[0] : "";
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v") || "";
  }

  const embedMatch = url.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/);
  return embedMatch?.[1] || "";
};

export const canonicalYoutubeEmbedUrl = (value) => {
  const source = typeof value === "string" ? value.trim() : "";
  if (!source || /\s/.test(source)) {
    return null;
  }

  try {
    const url = new URL(source);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      !YOUTUBE_HOSTS.has(url.hostname)
    ) {
      return null;
    }

    const videoId = youtubeVideoId(url);
    return YOUTUBE_ID.test(videoId) ? `${YOUTUBE_EMBED_ORIGIN}/embed/${videoId}` : null;
  } catch {
    return null;
  }
};

const markdownBlock = (source) => {
  const html = sanitizeMarkdownHtml(articleMarkdown.parse(source));
  return html ? { type: "markdown", html } : null;
};

export const articleContentBlocks = (source) => {
  const tokens = articleMarkdown.lexer(String(source || ""));
  const definitionSource = tokens.filter((token) => token.type === "def").map((token) => token.raw).join("");
  const blocks = [];
  let markdownTokens = [];

  const flushMarkdown = () => {
    if (!markdownTokens.length) {
      return;
    }

    const markdownSource = markdownTokens.map((token) => token.raw).join("");
    const block = markdownBlock(definitionSource ? `${markdownSource}\n\n${definitionSource}` : markdownSource);
    if (block) {
      blocks.push(block);
    }
    markdownTokens = [];
  };

  for (const token of tokens) {
    if (token.type === "def") {
      continue;
    }

    const standaloneSource = token.type === "paragraph" ? token.raw.trim() : "";
    const videoSrc = standaloneSource && standaloneSource === token.text.trim() ? canonicalYoutubeEmbedUrl(standaloneSource) : null;

    if (videoSrc) {
      flushMarkdown();
      blocks.push({ type: "youtube", src: videoSrc });
    } else {
      markdownTokens.push(token);
    }
  }

  flushMarkdown();
  return blocks;
};
