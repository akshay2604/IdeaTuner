use tauri::State;

use crate::db::connection::Database;

const SETTING_API_KEY: &str = "anthropic_api_key";

#[tauri::command]
pub fn get_api_key(db: State<Database>) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT value FROM app_settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;
    let result: Option<String> = stmt
        .query_row([SETTING_API_KEY], |row| row.get(0))
        .ok();

    match result {
        Some(key) if key.len() > 14 => {
            Ok(Some(format!("{}...{}", &key[..10], &key[key.len() - 4..])))
        }
        Some(key) if !key.is_empty() => Ok(Some(key)),
        _ => Ok(None),
    }
}

#[tauri::command]
pub fn get_api_key_raw(db: State<Database>) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT value FROM app_settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;
    let result: Option<String> = stmt
        .query_row([SETTING_API_KEY], |row| row.get(0))
        .ok();

    match result {
        Some(key) if !key.is_empty() => Ok(Some(key)),
        _ => Ok(None),
    }
}

#[tauri::command]
pub fn set_api_key(db: State<Database>, key: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [SETTING_API_KEY, &key],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn remove_api_key(db: State<Database>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM app_settings WHERE key = ?1",
        [SETTING_API_KEY],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
