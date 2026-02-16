use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

use super::schema;

pub struct Database(pub Mutex<Connection>);

pub fn init_database(app: &tauri::AppHandle) -> Database {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");

    std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");

    let db_path = app_data_dir.join("pmhub.db");
    let conn = Connection::open(db_path).expect("Failed to open database");

    conn.pragma_update(None, "journal_mode", "WAL")
        .expect("Failed to set WAL mode");
    conn.pragma_update(None, "foreign_keys", "ON")
        .expect("Failed to enable foreign keys");

    schema::create_tables(&conn);
    schema::run_migrations(&conn);

    Database(Mutex::new(conn))
}
