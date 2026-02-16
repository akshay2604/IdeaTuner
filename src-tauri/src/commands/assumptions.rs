use tauri::State;

use crate::db::connection::Database;
use crate::db::models::*;
use crate::db::queries;

#[tauri::command]
pub fn create_assumption(
    db: State<Database>,
    data: CreateAssumptionInput,
) -> Result<Assumption, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::create_assumption(&conn, data)
}

#[tauri::command]
pub fn update_assumption(
    db: State<Database>,
    id: String,
    data: UpdateAssumptionInput,
) -> Result<Assumption, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::update_assumption(&conn, &id, data)
}

#[tauri::command]
pub fn delete_assumption(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::delete_assumption(&conn, &id)
}
