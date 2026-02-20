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

        CREATE TABLE IF NOT EXISTS lobbies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        max_players INT NOT NULL CHECK (max_players >= 4 AND max_players <= 15),
        created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed')),
        created_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS lobby_players (
        id SERIAL PRIMARY KEY,
        lobby_id INT NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ DEFAULT now(),
        role VARCHAR(20),
        UNIQUE (lobby_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS ix_lobbies_status ON lobbies (status);
        CREATE INDEX IF NOT EXISTS ix_lobby_players_lobby_id ON lobby_players (lobby_id);
        CREATE INDEX IF NOT EXISTS ix_lobby_players_user_id ON lobby_players (user_id);
  `);

  // Incremental migrations — safe to run on every startup
  await pool.query(`
    ALTER TABLE lobby_players ADD COLUMN IF NOT EXISTS role VARCHAR(20);
  `);

}

module.exports = init;