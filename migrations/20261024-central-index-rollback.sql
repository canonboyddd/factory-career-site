-- Restore original secondary indexes only if measured query regression requires them.
-- Rebuilding indexes consumes write quota. Prefer restoring only the needed index,
-- check account headroom first, and do not restore request-time DDL code.
CREATE INDEX IF NOT EXISTS idx_central_site ON central_events(site_key);
CREATE INDEX IF NOT EXISTS idx_central_event ON central_events(event_name);
CREATE INDEX IF NOT EXISTS idx_central_program ON central_events(program);
CREATE INDEX IF NOT EXISTS idx_central_provider ON central_events(provider);
CREATE INDEX IF NOT EXISTS idx_central_page ON central_events(site_key,page_path);
CREATE INDEX IF NOT EXISTS idx_central_product ON central_events(site_key,product_id);
CREATE INDEX IF NOT EXISTS idx_central_actress ON central_events(site_key,actress);
CREATE INDEX IF NOT EXISTS idx_central_genre ON central_events(site_key,genre);
CREATE INDEX IF NOT EXISTS idx_central_maker ON central_events(site_key,maker);
CREATE INDEX IF NOT EXISTS idx_central_variant ON central_events(site_key,program,placement,variant);
CREATE INDEX IF NOT EXISTS idx_central_origin_actress ON central_events(site_key,origin_actress);
CREATE INDEX IF NOT EXISTS idx_central_origin_genre ON central_events(site_key,origin_genre);
CREATE INDEX IF NOT EXISTS idx_central_origin_maker ON central_events(site_key,origin_maker);
CREATE INDEX IF NOT EXISTS idx_central_okazu_actress ON central_events(site_key,origin_actress);
CREATE INDEX IF NOT EXISTS idx_central_okazu_genre ON central_events(site_key,origin_genre);
CREATE INDEX IF NOT EXISTS idx_central_okazu_maker ON central_events(site_key,origin_maker);
