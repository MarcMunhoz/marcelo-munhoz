## Author Identity Mapping

Netlify Identity remains the authentication source. The admin session resolves the current public author profile through these metadata fields, in order:

- `app_metadata.authorEntryId`
- `app_metadata.author_entry_id`
- `user_metadata.authorEntryId`
- `user_metadata.author_entry_id`

That value must be the Contentful Author entry ID for the signed-in user. The admin author profile page reads and writes only that Contentful Author entry through `/api/admin/contentful/author-profile`.

The existing owner-name fallback remains limited to legacy article edit checks where old content already resolves to the owner's display name. It is not used for author profile updates because profile editing must not guess which Contentful Author entry belongs to a signed-in account.

## Public Author Fields

The first profile workflow treats these Contentful Author fields as public editorial data:

- `name`
- `slug`
- `biography`
- `photo` (optional Cloudinary-style object)

Profile photo is optional. The admin profile page renders a text fallback when no photo URL is available.

Netlify Identity e-mail, roles, invite state, and account metadata are not copied into the public author profile payload.
