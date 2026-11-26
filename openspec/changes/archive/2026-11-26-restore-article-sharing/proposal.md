## Why

The article sharing menu has been reported to show only an envelope with no visible result when clicked. Readers should be able to share a prepared article link directly, and the site should stop listing the author's retired personal X account.

## What Changes

- Restore labeled direct actions for email, Facebook, LinkedIn, Telegram, X, and WhatsApp within the existing styled menu.
- Add Copy link with visible success feedback and a manual fallback.
- Remove the retired personal X link from public profile links and retain the article sharing action and preview metadata.

## Capabilities

### Modified Capabilities

- `blog-public`: Defines article sharing behavior and removes the retired personal profile from public surfaces.

## Impact

The article and About interfaces, social link data, and focused frontend coverage are affected. Public API and CMS contracts stay compatible.

Related issue: #69.
