use rusqlite::Connection;

pub fn create_tables(conn: &Connection) {
    conn.execute_batch(
        "
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled Decision',
      slug TEXT NOT NULL,
      context TEXT DEFAULT '',
      problem_statement TEXT DEFAULT '',
      chosen_option_id TEXT,
      rationale TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      reversibility TEXT,
      urgency TEXT,
      impact TEXT,
      quality_score REAL,
      quality_breakdown TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      decided_at TEXT,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS options (
      id TEXT PRIMARY KEY,
      decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      pros TEXT DEFAULT '[]',
      cons TEXT DEFAULT '[]',
      estimated_effort TEXT,
      estimated_cost TEXT,
      time_to_value TEXT,
      is_recommended INTEGER DEFAULT 0,
      is_chosen INTEGER DEFAULT 0,
      eliminated_reason TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
      option_id TEXT REFERENCES options(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      source_url TEXT,
      source_label TEXT,
      confidence TEXT NOT NULL DEFAULT 'moderate',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assumptions (
      id TEXT PRIMARY KEY,
      decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
      statement TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'untested',
      risk_if_wrong TEXT,
      validation_method TEXT,
      ai_suggested INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stakeholders (
      id TEXT PRIMARY KEY,
      decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT,
      involvement TEXT NOT NULL DEFAULT 'informed',
      stance TEXT DEFAULT 'unknown',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      extracted_insights TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS decision_tags (
      decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (decision_id, tag_id)
    );

    -- FTS5 virtual table for search
    CREATE VIRTUAL TABLE IF NOT EXISTS decisions_fts USING fts5(
      title,
      context,
      problem_statement,
      rationale,
      content='decisions',
      content_rowid='rowid'
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS decisions_ai AFTER INSERT ON decisions BEGIN
      INSERT INTO decisions_fts(rowid, title, context, problem_statement, rationale)
      VALUES (NEW.rowid, NEW.title, NEW.context, NEW.problem_statement, NEW.rationale);
    END;

    CREATE TRIGGER IF NOT EXISTS decisions_ad AFTER DELETE ON decisions BEGIN
      INSERT INTO decisions_fts(decisions_fts, rowid, title, context, problem_statement, rationale)
      VALUES ('delete', OLD.rowid, OLD.title, OLD.context, OLD.problem_statement, OLD.rationale);
    END;

    CREATE TRIGGER IF NOT EXISTS decisions_au AFTER UPDATE ON decisions BEGIN
      INSERT INTO decisions_fts(decisions_fts, rowid, title, context, problem_statement, rationale)
      VALUES ('delete', OLD.rowid, OLD.title, OLD.context, OLD.problem_statement, OLD.rationale);
      INSERT INTO decisions_fts(rowid, title, context, problem_statement, rationale)
      VALUES (NEW.rowid, NEW.title, NEW.context, NEW.problem_statement, NEW.rationale);
    END;
    ",
    )
    .expect("Failed to create tables");
}

pub fn run_migrations(conn: &Connection) {
    let migrations = [
        // Phase 2: Option tradeoffs
        "ALTER TABLE options ADD COLUMN optimizes_for TEXT DEFAULT '[]'",
        "ALTER TABLE options ADD COLUMN sacrifices TEXT DEFAULT '[]'",
        "ALTER TABLE options ADD COLUMN option_assumptions TEXT DEFAULT '[]'",
        "ALTER TABLE options ADD COLUMN risk_profile TEXT",
        // Phase 2: Active assumptions
        "ALTER TABLE assumptions ADD COLUMN linked_option_ids TEXT DEFAULT '[]'",
        "ALTER TABLE assumptions ADD COLUMN linked_evidence_ids TEXT DEFAULT '[]'",
        "ALTER TABLE assumptions ADD COLUMN impact_if_flipped TEXT",
        "ALTER TABLE assumptions ADD COLUMN validation_deadline TEXT",
        "ALTER TABLE assumptions ADD COLUMN priority TEXT DEFAULT 'medium'",
        // Phase 2: Option comparisons
        "CREATE TABLE IF NOT EXISTS option_comparisons (
          id TEXT PRIMARY KEY,
          decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
          option_a_id TEXT NOT NULL REFERENCES options(id) ON DELETE CASCADE,
          option_b_id TEXT NOT NULL REFERENCES options(id) ON DELETE CASCADE,
          dimension TEXT NOT NULL,
          winner TEXT,
          reasoning TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        // Idea phases
        "ALTER TABLE decisions ADD COLUMN phase TEXT NOT NULL DEFAULT 'spark'",
        "ALTER TABLE decisions ADD COLUMN raw_idea TEXT DEFAULT ''",
        // Phase 4: Evidence system
        "ALTER TABLE evidence ADD COLUMN weight REAL DEFAULT 1.0",
        "ALTER TABLE evidence ADD COLUMN direction TEXT",
        "ALTER TABLE evidence ADD COLUMN conflicts_with TEXT DEFAULT '[]'",
        "ALTER TABLE evidence ADD COLUMN collected_at TEXT",
        "ALTER TABLE evidence ADD COLUMN expires_at TEXT",
        // Canvas state on conversations
        "ALTER TABLE ai_conversations ADD COLUMN canvas_state TEXT DEFAULT NULL",
        // What-if conversation threads
        "ALTER TABLE ai_conversations ADD COLUMN label TEXT DEFAULT NULL",
        "ALTER TABLE ai_conversations ADD COLUMN parent_conversation_id TEXT DEFAULT NULL",
        // App settings table for keyring fallback
        "CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )",
    ];

    for sql in &migrations {
        match conn.execute_batch(sql) {
            Ok(_) => {}
            Err(e) => {
                let msg = e.to_string();
                if !msg.contains("duplicate column name") && !msg.contains("already exists") {
                    panic!("Migration failed: {}: {}", sql, msg);
                }
            }
        }
    }
}
