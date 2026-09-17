#![allow(linker_messages)]

mod commands;
mod errors;
mod models;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::workspace::current_working_directory,
            commands::workspace::list_workspace_entries,
            commands::workspace::read_workspace_file,
            commands::workspace::write_workspace_file,
            commands::workspace::reveal_workspace_file,
            commands::workspace::search_workspace_files,
            commands::git::get_workspace_review,
            commands::git::stage_workspace_file,
            commands::git::unstage_workspace_file,
            commands::git::commit_workspace,
            commands::git::pull_workspace,
            commands::models::fetch_model_candidates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running OMP Desktop application");
}
