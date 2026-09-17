#![allow(linker_messages)]

mod git;
mod models;
mod workspace;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            workspace::current_working_directory,
            workspace::list_workspace_entries,
            workspace::read_workspace_file,
            workspace::write_workspace_file,
            workspace::reveal_workspace_file,
            git::get_workspace_review,
            git::stage_workspace_file,
            git::unstage_workspace_file,
            git::commit_workspace,
            git::pull_workspace,
            workspace::search_workspace_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running OMP Desktop application");
}
