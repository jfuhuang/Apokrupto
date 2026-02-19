const pool = require('./db');

async function init() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        password_hash VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS user_providers (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,      -- provider name, e.g. 'github'
        provider_id VARCHAR(255) NOT NULL,  -- provider-specific user id (string)
        provider_profile JSONB,             -- store returned profile (name, avatar, etc)
        created_at TIMESTAMPTZ DEFAULT now(),
        last_seen_at TIMESTAMPTZ
        );

        -- ensure each external account maps to at most one local user
        CREATE UNIQUE INDEX IF NOT EXISTS ux_user_providers_provider_providerid ON user_providers (provider, provider_id);
        CREATE INDEX IF NOT EXISTS ix_user_providers_user_id ON user_providers (user_id);
  `);
}

module.exports = init;