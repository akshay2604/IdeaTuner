use tauri::State;

use crate::db::connection::Database;
use crate::db::queries;

#[tauri::command]
pub fn export_markdown(db: State<Database>, decision_id: String) -> Result<String, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::export_markdown(&conn, &decision_id)
}
