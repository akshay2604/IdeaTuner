use tauri::State;

use crate::db::connection::Database;
use crate::db::models::*;
use crate::db::queries;

#[tauri::command]
pub fn list_decisions(db: State<Database>) -> Result<Vec<Decision>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::list_decisions(&conn)
}

#[tauri::command]
pub fn get_decision(db: State<Database>, id: String) -> Result<Option<DecisionWithRelations>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::get_decision(&conn, &id)
}

#[tauri::command]
pub fn create_decision(db: State<Database>, data: CreateDecisionInput) -> Result<Decision, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::create_decision(&conn, data)
}

#[tauri::command]
pub fn update_decision(
    db: State<Database>,
    id: String,
    data: UpdateDecisionInput,
) -> Result<Decision, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::update_decision(&conn, &id, data)
}

#[tauri::command]
pub fn delete_decision(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::delete_decision(&conn, &id)
}

#[tauri::command]
pub fn search_decisions(db: State<Database>, query: String) -> Result<Vec<Decision>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::search_decisions(&conn, &query)
}
