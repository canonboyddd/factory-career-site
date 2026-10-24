-- Run only after the request-time schema code is removed and a full backup exists.
-- Preserves every event and field. Existing production indexes below already exist.
CREATE INDEX IF NOT EXISTS idx_central_time ON central_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_central_okazu_time ON central_events(site_key,occurred_at);
CREATE INDEX IF NOT EXISTS idx_central_okazu_event ON central_events(site_key,event_name);
CREATE INDEX IF NOT EXISTS idx_central_browser ON central_events(site_key,browser_id,occurred_at);
DROP INDEX IF EXISTS idx_central_site;
DROP INDEX IF EXISTS idx_central_event;
DROP INDEX IF EXISTS idx_central_program;
DROP INDEX IF EXISTS idx_central_provider;
DROP INDEX IF EXISTS idx_central_page;
DROP INDEX IF EXISTS idx_central_product;
DROP INDEX IF EXISTS idx_central_actress;
DROP INDEX IF EXISTS idx_central_genre;
DROP INDEX IF EXISTS idx_central_maker;
DROP INDEX IF EXISTS idx_central_variant;
DROP INDEX IF EXISTS idx_central_origin_actress;
DROP INDEX IF EXISTS idx_central_origin_genre;
DROP INDEX IF EXISTS idx_central_origin_maker;
DROP INDEX IF EXISTS idx_central_okazu_actress;
DROP INDEX IF EXISTS idx_central_okazu_genre;
DROP INDEX IF EXISTS idx_central_okazu_maker;
