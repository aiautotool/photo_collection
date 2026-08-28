mod storage_allocator;
use storage_allocator::{StorageAccount,GIB};

#[tauri::command]
fn demo_accounts()->Vec<StorageAccount>{
    vec![
        StorageAccount::new("a","drive-a@example.com",8*GIB,8*GIB),
        StorageAccount::new("b","drive-b@example.com",2*GIB,13*GIB),
    ]
}

#[tauri::command]
fn run_sync_cycle()->String{
    "Sync cycle queued. Production build will execute persisted jobs and Drive provider calls.".into()
}

#[cfg_attr(mobile,tauri::mobile_entry_point)]
pub fn run(){
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![demo_accounts,run_sync_cycle])
        .run(tauri::generate_context!())
        .expect("error while running PhotoSync");
}
