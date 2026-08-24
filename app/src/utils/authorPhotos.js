const GRAVATAR_HASH = /^[a-f0-9]{64}$/i;
const GRAVATAR_SLUG = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/i;
const GRAVATAR_PROFILE_HOSTS = new Set(["gravatar.com", "www.gravatar.com"]);
const FALLBACK_PHOTO_HOSTS = new Set([
  "en.gravatar.com",
  "gravatar.com",
  "images.ctfassets.net",
  "res.cloudinary.com",
  "secure.gravatar.com",
  "www.gravatar.com",
]);

export const normalizeGravatarProfileInput = (value = "") => {
  const candidate = String(value || "").trim();

  if (!candidate || candidate.includes("@")) return "";
  if (GRAVATAR_HASH.test(candidate)) return candidate.toLowerCase();

  if (/^https:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      const parts = url.pathname.split("/").filter(Boolean);

      if (url.username || url.password || !GRAVATAR_PROFILE_HOSTS.has(url.hostname.toLowerCase()) || parts.length !== 1) return "";
      return GRAVATAR_SLUG.test(parts[0]) ? parts[0].toLowerCase() : "";
    } catch {
      return "";
    }
  }

  return GRAVATAR_SLUG.test(candidate) ? candidate.toLowerCase() : "";
};

export const gravatarAvatarUrl = (hash = "") => {
  const normalizedHash = String(hash || "").trim().toLowerCase();
  return GRAVATAR_HASH.test(normalizedHash) ? `https://gravatar.com/avatar/${normalizedHash}?s=192&r=g&d=404` : "";
};

export const isAllowedFallbackPhotoUrl = (value = "") => {
  const candidate = String(value || "").trim();
  if (!candidate) return true;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password && FALLBACK_PHOTO_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};

const legacyPhotoUrl = (author = {}) => {
  const photo = author.fields?.photo || author.fields?.avatar || author.fields?.image || author.fields?.picture || author.photo || author.avatar || author.image || author.picture || {};
  const candidate = String(
    (typeof photo === "string" ? photo : photo.secure_url || photo.secureUrl || photo.url || photo.fields?.file?.url) || author.photoUrl || ""
  ).trim();
  return candidate.startsWith("//") ? `https:${candidate}` : candidate;
};

export const authorPhotoCandidates = (author = {}) => {
  const photo = author.fields?.photo || author.photo || {};
  const gravatarHash = typeof photo === "object" ? photo.gravatar_hash || photo.gravatarHash || author.gravatarHash : author.gravatarHash;
  const fallback = typeof photo === "object" ? photo.fallback_url || photo.fallbackUrl || author.fallbackPhotoUrl : author.fallbackPhotoUrl;

  return [...new Set([gravatarAvatarUrl(gravatarHash), String(fallback || "").trim(), legacyPhotoUrl(author)].filter(Boolean))];
};

export const nextAuthorPhotoIndex = (candidates = [], currentIndex = 0) =>
  Math.min(Math.max(0, Number(currentIndex) || 0) + 1, Array.isArray(candidates) ? candidates.length : 0);
