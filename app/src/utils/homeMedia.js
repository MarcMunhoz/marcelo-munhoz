import { fit } from "@cloudinary/url-gen/actions/resize";
import cld from "./coudinaryGallery.js";

export const cloudinaryImg = (imgName, imgWidth) => {
  const image = cld.image(`marcelo-munhoz-website/${imgName}`);

  return image.resize(fit().width(imgWidth)).toURL();
};

export const sortAnything = (thing, thingProperty) =>
  thing.slice().sort((a, b) => a[thingProperty].localeCompare(b[thingProperty]));
