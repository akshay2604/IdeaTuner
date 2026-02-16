use tauri::State;

use crate::db::connection::Database;
use crate::db::models::*;
use crate::db::queries;

#[tauri::command]
pub fn create_option(db: State<Database>, data: CreateOptionInput) -> Result<OptionModel, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::create_option(&conn, data)
}

#[tauri::command]
pub fn update_option(
    db: State<Database>,
    id: String,
    data: UpdateOptionInput,
) -> Result<OptionModel, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::update_option(&conn, &id, data)
}

#[tauri::command]
pub fn delete_option(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::delete_option(&conn, &id)
}
