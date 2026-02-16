use tauri::State;

use crate::db::connection::Database;
use crate::db::models::*;
use crate::db::queries;

#[tauri::command]
pub fn get_conversation(
    db: State<Database>,
    id: String,
) -> Result<Option<AiConversation>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::get_conversation(&conn, &id)
}

#[tauri::command]
pub fn get_latest_conversation(
    db: State<Database>,
    decision_id: String,
) -> Result<Option<AiConversation>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::get_latest_conversation(&conn, &decision_id)
}

#[tauri::command]
pub fn list_conversations(
    db: State<Database>,
    decision_id: String,
) -> Result<Vec<ThreadSummary>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::list_conversations(&conn, &decision_id)
}

#[tauri::command]
pub fn create_conversation(
    db: State<Database>,
    decision_id: String,
    mode: String,
) -> Result<AiConversation, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::create_conversation(&conn, &decision_id, &mode)
}

#[tauri::command]
pub fn create_thread(
    db: State<Database>,
    input: CreateThreadInput,
) -> Result<AiConversation, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::create_thread(&conn, input)
}

#[tauri::command]
pub fn save_conversation_messages(
    db: State<Database>,
    input: SaveMessagesInput,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::save_conversation_messages(&conn, input)
}
