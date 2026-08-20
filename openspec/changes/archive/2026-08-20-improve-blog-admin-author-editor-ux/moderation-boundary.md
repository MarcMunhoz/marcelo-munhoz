# Owner Moderation Boundary

Netlify Identity authenticates the account and role. Contentful Author entries define article authorship for editorial trust.

Article body editing is creator-scoped. A signed-in user can edit an existing article only when the article has a trusted match to that user's Identity subject or resolved Contentful Author entry ID.

Owner access does not override authorship for body edits. Owners can moderate other authors' articles through lifecycle actions:

- Publish articles submitted for review.
- Unpublish published articles or approved unpublication requests.
- Archive articles that should leave the active workflow.
- Permanently delete articles when removal is required.

Owner feedback for other authors belongs in a future feedback-wall or moderation-note workflow. It should not be implemented by changing another author's article body.
