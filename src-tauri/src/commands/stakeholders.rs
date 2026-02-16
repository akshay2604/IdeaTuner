use tauri::State;

use crate::db::connection::Database;
use crate::db::models::*;
use crate::db::queries;

#[tauri::command]
pub fn create_stakeholder(
    db: State<Database>,
    data: CreateStakeholderInput,
) -> Result<Stakeholder, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::create_stakeholder(&conn, data)
}

#[tauri::command]
pub fn update_stakeholder(
    db: State<Database>,
    id: String,
    data: UpdateStakeholderInput,
) -> Result<Stakeholder, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::update_stakeholder(&conn, &id, data)
}

#[tauri::command]
pub fn delete_stakeholder(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::delete_stakeholder(&conn, &id)
}
