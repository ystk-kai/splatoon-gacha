use std::process::Command;
use std::path::PathBuf;
use std::env;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Webサーバーを起動
      start_web_server()?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn start_web_server() -> Result<(), Box<dyn std::error::Error>> {
  // プロジェクトルートディレクトリを取得
  let current_dir = env::current_dir()?;
  let web_overlay_dir = current_dir.join("web");
  
  log::info!("Starting web server in: {:?}", web_overlay_dir);

  // Node.jsサーバーをバックグラウンドで起動
  let mut cmd = Command::new("node");
  cmd.arg("server.js")
     .current_dir(&web_overlay_dir);

  // 開発環境でない場合は出力を無視
  #[cfg(not(debug_assertions))]
  {
    use std::process::Stdio;
    cmd.stdout(Stdio::null())
       .stderr(Stdio::null());
  }

  match cmd.spawn() {
    Ok(child) => {
      log::info!("Web server started with PID: {}", child.id());
      // プロセスをバックグラウンドで実行し続ける
      std::mem::forget(child);
      Ok(())
    },
    Err(e) => {
      log::error!("Failed to start web server: {}", e);
      Err(Box::new(e))
    }
  }
}
