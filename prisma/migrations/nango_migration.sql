-- Nango Migration: Remove custom OAuth fields and add Nango connection tracking
-- Run this after updating the schema to Nango-only approach

-- 1. Add new connectionId column
ALTER TABLE oauth_connections ADD COLUMN connection_id TEXT;

-- 2. Remove custom OAuth token columns (data will be lost - ensure Nango connections are established first)
ALTER TABLE oauth_connections DROP COLUMN access_token;
ALTER TABLE oauth_connections DROP COLUMN refresh_token;
ALTER TABLE oauth_connections DROP COLUMN token_type;
ALTER TABLE oauth_connections DROP COLUMN expires_at;

-- 3. Update connectionId to be userId (Nango default)
UPDATE oauth_connections SET connection_id = user_id WHERE connection_id IS NULL;

-- 4. Add new unique constraint for connectionId + service
ALTER TABLE oauth_connections ADD CONSTRAINT oauth_connections_connection_id_service_key UNIQUE (connection_id, service);

-- 5. Update indexes
DROP INDEX IF EXISTS oauth_connections_service_expires_at_idx;
CREATE INDEX oauth_connections_service_is_active_idx ON oauth_connections (service, is_active);

-- 6. Make connectionId required
ALTER TABLE oauth_connections ALTER COLUMN connection_id SET NOT NULL;