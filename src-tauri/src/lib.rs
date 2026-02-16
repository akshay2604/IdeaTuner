mod commands;
mod db;
mod services;

use db::connection::init_database;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let database = init_database(app.handle());
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Decisions
            commands::decisions::list_decisions,
            commands::decisions::get_decision,
            commands::decisions::create_decision,
            commands::decisions::update_decision,
            commands::decisions::delete_decision,
            commands::decisions::search_decisions,
            // Options
            commands::options::create_option,
            commands::options::update_option,
            commands::options::delete_option,
            // Evidence
            commands::evidence::create_evidence,
            commands::evidence::update_evidence,
            commands::evidence::delete_evidence,
            // Assumptions
            commands::assumptions::create_assumption,
            commands::assumptions::update_assumption,
            commands::assumptions::delete_assumption,
            // Stakeholders
            commands::stakeholders::create_stakeholder,
            commands::stakeholders::update_stakeholder,
            commands::stakeholders::delete_stakeholder,
            // AI conversations
            commands::ai::get_conversation,
            commands::ai::get_latest_conversation,
            commands::ai::list_conversations,
            commands::ai::create_conversation,
            commands::ai::create_thread,
            commands::ai::save_conversation_messages,
            // Settings
            commands::settings::get_api_key,
            commands::settings::get_api_key_raw,
            commands::settings::set_api_key,
            commands::settings::remove_api_key,
            // Export
            commands::export::export_markdown,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
