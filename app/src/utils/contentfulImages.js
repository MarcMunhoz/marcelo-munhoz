const CLOUDINARY_BASE = "https://res.cloudinary.com/marcelo-munhoz/image/upload";
const NO_THUMBNAIL_PUBLIC_ID = "marcelo-munhoz-website/no-thumbnail.jpg";

const secureUrl = (url = "") => String(url || "").replace("http://", "https://");

export const articleImageMetadata = (fields = {}) => fields.thumbnail || (Array.isArray(fields.cloudinary) ? fields.cloudinary[0] : null);

export const articleCardImageUrl = (fields = {}) => {
  const image = articleImageMetadata(fields);
  const publicId = image?.public_id || NO_THUMBNAIL_PUBLIC_ID;

  return `${CLOUDINARY_BASE}/f_auto,w_350,h_233,c_fill/${publicId}`;
};

export const articleHeroImageUrl = (fields = {}) => {
  const image = articleImageMetadata(fields);
  return secureUrl(image?.secure_url || image?.url || "");
};
