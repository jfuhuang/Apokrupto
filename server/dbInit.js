const pool = require('./db');

async function init() {
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
      max_players INT NOT NULL CHECK (max_players >= 5 AND max_players <= 80),
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

    CREATE TABLE IF NOT EXISTS prompts (
      id            SERIAL PRIMARY KEY,
      phos_prompt   TEXT NOT NULL,
      skotia_prompt TEXT NOT NULL,
      theme_label   TEXT NOT NULL,
      prompt_mode   VARCHAR DEFAULT 'word'
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

  // Migrate existing rounds table — add voting_summary column if absent (safe on fresh DBs too)
  await pool.query(`
    ALTER TABLE rounds ADD COLUMN IF NOT EXISTS voting_summary JSONB;
  `);

  // Migrate mark_events → sus_events (rename table and update action constraint)
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mark_events') THEN
        ALTER TABLE mark_events RENAME TO sus_events;
        ALTER TABLE sus_events DROP CONSTRAINT IF EXISTS mark_events_action_check;
        ALTER TABLE sus_events ADD CONSTRAINT sus_events_action_check
          CHECK (action IN ('sus', 'clear'));
      END IF;
    END$$;
  `);

  // Migrate existing prompts table — add prompt_mode column if absent.
  // Without this, initTurnState's WHERE prompt_mode = $1 query would throw on old DBs,
  // leaving groupTurnState unpopulated even though Movement A was committed as active.
  await pool.query(`
    ALTER TABLE prompts ADD COLUMN IF NOT EXISTS prompt_mode VARCHAR DEFAULT 'word';
  `);
  await pool.query(`
    UPDATE prompts SET prompt_mode = 'word' WHERE prompt_mode IS NULL;
  `);

  // Seed word prompt pairs (only if table is empty)
  await pool.query(`
    INSERT INTO prompts (phos_prompt, skotia_prompt, theme_label, prompt_mode)
    SELECT * FROM (VALUES
      ('Sources of lasting joy',              'Things that feel amazing but fade quickly',   'Joy vs. Pleasure',         'word'),
      ('Things that truly restore you',       'Ways people escape their problems',           'Rest vs. Escape',          'word'),
      ('Things worth sacrificing for',        'Things people give up just to fit in',        'Sacrifice vs. Conformity', 'word'),
      ('Signs of genuine courage',            'Things people do for others'' approval',      'Courage vs. Approval',     'word'),
      ('Things that build real community',    'Things that make you popular',                'Community vs. Popularity', 'word'),
      ('Things that bring genuine peace',     'Ways people stop themselves from thinking',   'Peace vs. Numbness',       'word'),
      ('Signs of real growth in a person',    'Things people change to impress others',      'Growth vs. Image',         'word'),
      ('Things worth dedicating your life to','Things people chase to feel important',       'Purpose vs. Ambition',     'word'),
      ('Things that make someone feel known', 'Things that make someone feel accepted',      'Belonging vs. Fitting In', 'word'),
      ('What real forgiveness looks like',    'Ways people just try to move on',             'Forgiveness vs. Moving On','word'),
      ('Signs of genuine wisdom',             'Things people mistake for wisdom',            'Wisdom vs. Cleverness',    'word'),
      ('What makes a place feel like home',   'Things that make you feel comfortable',       'Home vs. Comfort',         'word'),
      ('What real strength looks like',       'Ways people try to appear strong',            'Strength vs. Performance', 'word'),
      ('Things that bring genuine healing',   'Ways people cope with pain',                  'Healing vs. Coping',       'word'),
      ('What love actually requires',         'What love feels like',                        'Love vs. Feeling',         'word')
    ) AS seed(phos_prompt, skotia_prompt, theme_label, prompt_mode)
    WHERE NOT EXISTS (SELECT 1 FROM prompts LIMIT 1)
  `);

  // Seed sketch prompt pairs (only if no sketch prompts exist yet)
  await pool.query(`
    INSERT INTO prompts (phos_prompt, skotia_prompt, theme_label, prompt_mode)
    SELECT * FROM (VALUES
      ('A lighthouse',           'A swamp',               'Light vs. Dark',          'sketch'),
      ('A shepherd',             'A wolf',                'Shepherd vs. Predator',   'sketch'),
      ('A cross',                'A crown',               'Sacrifice vs. Power',     'sketch'),
      ('A garden in bloom',      'A withered tree',       'Life vs. Decay',          'sketch'),
      ('A door open to light',   'A locked door',         'Welcome vs. Barrier',     'sketch'),
      ('A calm lake',            'A storm cloud',         'Peace vs. Storm',         'sketch'),
      ('A sunrise',              'A shadow',              'Hope vs. Fear',           'sketch'),
      ('A bridge',               'A wall',                'Unity vs. Division',      'sketch'),
      ('A dove',                 'A raven',               'Purity vs. Darkness',     'sketch'),
      ('A loaf of bread',        'A cracked, empty bowl', 'Sustenance vs. Emptiness','sketch')
    ) AS seed(phos_prompt, skotia_prompt, theme_label, prompt_mode)
    WHERE NOT EXISTS (SELECT 1 FROM prompts WHERE prompt_mode = 'sketch' LIMIT 1)
  `);
}

module.exports = init;
