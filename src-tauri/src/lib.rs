#![allow(linker_messages)]
#[tauri::command]
fn current_working_directory() -> Result<String, String> {
    std::env::current_dir()
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![current_working_directory])
        .run(tauri::generate_context!())
        .expect("error while running OMP Desktop application");
}
