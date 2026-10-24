# Central analytics write budget — 2026-10-24

The owner approved the three API changes and reducing central_events from twenty indexes to four.
Do not change billing, discard events, or modify ClipMade Beta/contact/feedback tables.

## Evidence and choice

On 2026-10-23 UTC, 6090 central events (3179 page_view and 2911 scroll_90) accounted for 133980
written D1 rows: 22 per event, including secondary-index and AUTOINCREMENT bookkeeping. Twenty
secondary indexes were present, including three exact duplicate pairs. D1's free account limit is
100000 written rows/day across databases; a SQL batch alone does not reduce that row accounting.

Options considered:

| Option | Write reduction | Data impact |
|---|---|---|
| SQL batching of unchanged INSERTs | No row-count saving | Exact raw events retained |
| Session/event sampling | Proportional to sampling rate | Estimated totals; rare clicks and UU/funnels need separate treatment |
| Minute aggregation | Depends on dimension cardinality | Raw sequences and exact per-browser/session analysis lost without extra storage |
| Four targeted indexes | Estimated 22 to 6 rows/event | All raw events and existing metric definitions retained |

The index option is the first stage. Expected at the observed volume: 36540 rows/day instead of
133980, approximately 73% lower. This is an estimate until real D1 response meta is checked.
No sampling or dashboard weighting is introduced. Request-time schema maintenance is removed from
central collect, central-dashboard and okazu-analytics, so removed indexes do not return on a request.
Existing bot/probe filtering, authentication, CORS, payload fields and event definitions remain intact.

Retained access paths: occurred_at; (site_key,occurred_at); (site_key,event_name);
(site_key,browser_id,occurred_at). Some narrow entity lookups may become slower; compare read counts
and latency. Do not claim a quota guarantee for unbounded traffic or adversarial API requests.

## Rollout

1. Export the entire existing analytics D1, save privately, verify hash and restore into local SQLite.
2. Run node --test qa/central-index-budget.test.mjs, the existing analytics-consistency and
   ops-dashboard-contract checks. Verify row fingerprints and aggregate results on the real backup.
3. Deploy the source change through existing GitHub main / Cloudflare Pages first. Wait for success.
4. Apply migrations/20261024-central-index-budget.sql only to the existing analytics D1.
5. Confirm four indexes, unchanged stored-event count apart from incoming traffic, representative
   aggregate latency/read counts, and a single controlled collector test (clearly marked site).
   Keep the test event rather than deleting historical data. Verify D1 rows_written metadata.
6. Verify dashboard APIs do not recreate indexes, and existing public sites and ClipMade capacity
   respond. Keep schema migration out of request handlers; any future columns are operator migrations.

## Rollback / safety

The original event rows are not modified. Keep the source-side removal of request-time DDL even if
a query regression requires restoring an index. Recreate only a justified index from
migrations/20261024-central-index-rollback.sql; rebuilding all indexes can itself exceed free quota.
Check remaining account headroom first. Restore from the full backup only for actual data damage,
with a separate explicit recovery plan; never overwrite subsequently received events silently.

The backup contains non-public analytics and must never be committed, placed in the web root or
uploaded to GitHub. No ADMIN_TOKEN, API key, browser ID or session ID belongs in this runbook.

Reference: https://developers.cloudflare.com/d1/platform/pricing/
