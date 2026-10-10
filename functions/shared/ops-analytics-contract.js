export const CENTRAL_CLICK_EVENTS=['affiliate_click','affiliate_click_unified'];
export const CENTRAL_CLICK_SQL="('affiliate_click','affiliate_click_unified')";
export const VEHICLE_CLICK_EVENTS=['affiliate_click','affiliate_click_unified','affiliate_slot_click','car_valuation_click','bike_buyback_click','rakuten_click'];
export const PROBE_PATHS=["//","/.git/","/.ssh/","/actuator/","/.env","/wp-admin","/wp-login","/wordpress/","/wp/","/wp-content/","/wp-includes/","/xmlrpc.php","/openid_connect/","/cpanel/","/phpmyadmin","/server-status","/vendor/phpunit","/.aws/","/.docker/","/config/","/boaform/","/cgi-bin/"];
export const SUSPICIOUS_BROWSER_SQL=`SELECT site_key,browser_id,date(occurred_at,'+9 hours') day FROM central_events WHERE event_name='page_view' GROUP BY site_key,browser_id,date(occurred_at,'+9 hours') HAVING (COUNT(*)>=20 AND COUNT(DISTINCT session_id)>=20 AND COUNT(DISTINCT page_path)>=10 AND (CAST(COUNT(DISTINCT session_id) AS REAL)/COUNT(*))>=0.90) OR (COUNT(*)>=25 AND COUNT(DISTINCT page_path)>=18 AND COUNT(DISTINCT session_id)<=5 AND (CAST(COUNT(DISTINCT page_path) AS REAL)/COUNT(*))>=0.60)`;

// Conservative mass-crawler signature: thousands of one-page, one-identity sessions
// visiting hundreds of different URLs within one JST day. It deliberately does
// not flag ordinary small sites or campaigns with a narrow landing-page set.
export const SUSPICIOUS_BURST_SQL=`SELECT site_key,date(occurred_at,'+9 hours') day
FROM central_events WHERE event_name='page_view'
GROUP BY site_key,date(occurred_at,'+9 hours')
HAVING COUNT(*)>=2000
 AND COUNT(DISTINCT browser_id)>=COUNT(*)*0.98
 AND COUNT(DISTINCT session_id)>=COUNT(*)*0.98
 AND COUNT(DISTINCT page_path)>=300`;
