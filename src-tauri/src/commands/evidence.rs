use tauri::State;

use crate::db::connection::Database;
use crate::db::models::*;
use crate::db::queries;

#[tauri::command]
pub fn create_evidence(
    db: State<Database>,
    data: CreateEvidenceInput,
) -> Result<Evidence, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::create_evidence(&conn, data)
}

#[tauri::command]
pub fn update_evidence(
    db: State<Database>,
    id: String,
    data: UpdateEvidenceInput,
) -> Result<Evidence, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::update_evidence(&conn, &id, data)
}

#[tauri::command]
pub fn delete_evidence(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::delete_evidence(&conn, &id)
}
