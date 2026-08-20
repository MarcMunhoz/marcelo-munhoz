# Cloudinary Media Editor Notes

The admin uses Cloudinary Media Editor as an optional image-editing path, loaded only when a signed-in writer clicks **Edit image** on an existing article thumbnail.

## Integration Boundary

- The browser receives only `cloudName` from `/api/admin/contentful/media/editor-config`.
- Cloudinary API key and secret remain server-side for listing and upload routes.
- The widget script is loaded from `https://media-editor.cloudinary.com/latest/all.js` only on demand.
- If the widget cannot load, the editor keeps the existing Select image and Upload image workflows available.

## Edited Image Persistence Decision

For this change, exported edits do not overwrite the original Cloudinary asset and do not create a new asset reference through the app.

The export event updates the article form with:

- the existing or returned Cloudinary public ID, and
- the exported delivery URL as `thumbnail.secure_url`.

The author must still save the article draft to persist the edited thumbnail metadata in Contentful. This keeps the first integration narrow and reversible while avoiding browser-side Cloudinary credentials.

## Staging Validation

The Media Editor path must be smoke-tested on the Netlify branch deploy before it becomes the primary image-editing path:

- Confirm Netlify Identity login opens the admin editor.
- Open an article with an existing thumbnail.
- Click **Edit image** and confirm the Cloudinary Media Editor modal opens.
- Export a cropped image and confirm the article thumbnail preview updates.
- Save the draft and reload the editor to confirm the exported delivery URL persists.
- Confirm Select image and Upload image still work when the widget is unavailable or blocked.

Until that staging validation is complete, image selection and upload remain the reliable primary workflows.
