const pool = require('./db');

async function init() {
  // Prompts are now in server/data/prompts.js — drop the old DB table if it exists
  await pool.query('DROP TABLE IF EXISTS prompts CASCADE');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(50) UNIQUE,
      password_hash VARCHAR(255),
      created_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS user_providers (
      id               SERIAL PRIMARY KEY,
      user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider         VARCHAR(50) NOT NULL,
      provider_id      VARCHAR(255) NOT NULL,
      provider_profile JSONB,
      created_at       TIMESTAMPTZ DEFAULT now(),
      last_seen_at     TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ux_user_providers_provider_providerid
      ON user_providers (provider, provider_id);
    CREATE INDEX IF NOT EXISTS ix_user_providers_user_id ON user_providers (user_id);

    CREATE TABLE IF NOT EXISTS lobbies (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      max_players INT NOT NULL CHECK (max_players >= 5 AND max_players <= 100),
      created_by  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status      VARCHAR(20) DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'in_progress', 'completed')),
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS lobby_players (
      id        SERIAL PRIMARY KEY,
      lobby_id  INT NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
      user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ DEFAULT now(),
      role      VARCHAR(20),
      points    INT NOT NULL DEFAULT 0,
      is_alive  BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (lobby_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS ix_lobbies_status       ON lobbies (status);
    CREATE INDEX IF NOT EXISTS ix_lobby_players_lobby  ON lobby_players (lobby_id);
    CREATE INDEX IF NOT EXISTS ix_lobby_players_user   ON lobby_players (user_id);

    CREATE TABLE IF NOT EXISTS player_task_completions (
      id            SERIAL PRIMARY KEY,
      lobby_id      INT NOT NULL REFERENCES lobbies(id)  ON DELETE CASCADE,
      user_id       INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
      task_id       VARCHAR(60) NOT NULL,
      points_earned INT NOT NULL DEFAULT 0,
      completed_at  TIMESTAMPTZ DEFAULT now(),
      UNIQUE (lobby_id, user_id, task_id)
    );
    CREATE INDEX IF NOT EXISTS ix_ptc_lobby_user ON player_task_completions (lobby_id, user_id);

    CREATE TABLE IF NOT EXISTS games (
      id            SERIAL PRIMARY KEY,
      lobby_id      INT NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
      status        VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'completed')),
      total_rounds  INT NOT NULL DEFAULT 4,
      current_round INT NOT NULL DEFAULT 1,
      winner        VARCHAR(10) CHECK (winner IN ('phos', 'skotia')),
      win_condition VARCHAR(20) CHECK (win_condition IN ('points', 'supermajority')),
      created_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS game_teams (
      id      SERIAL PRIMARY KEY,
      game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      team    VARCHAR(10) NOT NULL CHECK (team IN ('phos', 'skotia')),
      points  INT NOT NULL DEFAULT 0,
      UNIQUE (game_id, team)
    );

    CREATE TABLE IF NOT EXISTS game_players (
      id        SERIAL PRIMARY KEY,
      game_id   INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team      VARCHAR(10) NOT NULL CHECK (team IN ('phos', 'skotia')),
      is_marked BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE (game_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS game_groups (
      id           SERIAL PRIMARY KEY,
      game_id      INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      round_number INT NOT NULL,
      group_index  INT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_group_members (
      id       SERIAL PRIMARY KEY,
      group_id INT NOT NULL REFERENCES game_groups(id) ON DELETE CASCADE,
      user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id             SERIAL PRIMARY KEY,
      game_id        INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      round_number   INT NOT NULL,
      status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'active', 'summarizing', 'completed')),
      voting_summary JSONB,
      UNIQUE (game_id, round_number)
    );

    CREATE TABLE IF NOT EXISTS movements (
      id            SERIAL PRIMARY KEY,
      round_id      INT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
      movement_type CHAR(1) NOT NULL CHECK (movement_type IN ('A', 'B', 'C')),
      status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'active', 'completed')),
      started_at    TIMESTAMPTZ,
      completed_at  TIMESTAMPTZ,
      UNIQUE (round_id, movement_type)
    );

    CREATE TABLE IF NOT EXISTS movement_a_submissions (
      id           SERIAL PRIMARY KEY,
      movement_id  INT NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
      group_id     INT NOT NULL REFERENCES game_groups(id) ON DELETE CASCADE,
      user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      word         TEXT,
      sketch_data  JSONB,
      submitted_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (movement_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS movement_c_votes (
      id           SERIAL PRIMARY KEY,
      movement_id  INT NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
      group_id     INT NOT NULL REFERENCES game_groups(id) ON DELETE CASCADE,
      voter_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote         VARCHAR(10) NOT NULL CHECK (vote IN ('phos', 'skotia')),
      submitted_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (movement_id, voter_id, target_id)
    );

    CREATE TABLE IF NOT EXISTS sus_events (
      id             SERIAL PRIMARY KEY,
      game_id        INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      game_player_id INT NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
      round_number   INT NOT NULL,
      action         VARCHAR(10) NOT NULL CHECK (action IN ('sus', 'clear')),
      was_correct    BOOLEAN NOT NULL,
      created_at     TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS ix_games_lobby   ON games (lobby_id);
    CREATE INDEX IF NOT EXISTS ix_game_players  ON game_players (game_id, user_id);
    CREATE INDEX IF NOT EXISTS ix_game_groups   ON game_groups (game_id, round_number);
    CREATE INDEX IF NOT EXISTS ix_ggm_group     ON game_group_members (group_id);
    CREATE INDEX IF NOT EXISTS ix_ggm_user      ON game_group_members (user_id);
    CREATE INDEX IF NOT EXISTS ix_movements     ON movements (round_id);
    CREATE INDEX IF NOT EXISTS ix_mv_a_sub      ON movement_a_submissions (movement_id, group_id);
    CREATE INDEX IF NOT EXISTS ix_mv_c_votes    ON movement_c_votes (movement_id, group_id);
    CREATE INDEX IF NOT EXISTS ix_sus_events    ON sus_events (game_id, round_number);
  `);

  // Migrate: widen max_players constraint to 100 if it was created with the old 80 limit
  await pool.query(`
    ALTER TABLE lobbies DROP CONSTRAINT IF EXISTS lobbies_max_players_check;
    ALTER TABLE lobbies ADD CONSTRAINT lobbies_max_players_check
      CHECK (max_players >= 5 AND max_players <= 100);
  `);

}

module.exports = init;
