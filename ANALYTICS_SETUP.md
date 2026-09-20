# Factory Career Analytics setup

The repository contains a private analytics dashboard at:

- `/admin-analytics`

## Required Cloudflare Pages bindings

Create a D1 database and bind it to the Pages project using:

- Binding name: `ANALYTICS_DB`

Create a Pages environment variable / secret:

- Variable name: `ADMIN_TOKEN`
- Value: a long random secret known only to the site owner

The API creates its tables and indexes automatically on first use. No manual SQL migration is required.

## Routes

- `POST /api/analytics/collect` — anonymous first-party event collection
- `GET /api/admin/analytics?days=1|7|30` — authenticated dashboard aggregates
- `POST /api/admin/exclusion` — authenticated owner-browser exclusion

## Privacy

The first-party analytics database stores anonymous browser/session IDs, page paths, referral domain, device category, scroll/engagement and CTA events. It does not store form answers, names, email addresses, phone numbers or IP addresses as analytics columns.

GA4 remains enabled independently.
