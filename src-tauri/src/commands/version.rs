use tauri::{Manager, State};

/// 获取应用程序版本号
/// 从 Cargo.toml 中读取版本信息
#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    // 从环境变量中获取版本号（由构建脚本设置）
    // 或者从 Cargo.toml 读取
    let version = env!("CARGO_PKG_VERSION").to_string();

    Ok(version)
}

/// 获取详细的版本信息
#[tauri::command]
pub async fn get_version_info() -> Result<serde_json::Value, String> {
    let version = env!("CARGO_PKG_VERSION").to_string();
    let name = env!("CARGO_PKG_NAME").to_string();
    let description = env!("CARGO_PKG_DESCRIPTION").to_string();

    let version_info = serde_json::json!({
        "version": version,
        "name": name,
        "description": description,
        "build_info": {
            "rust_version": env!("CARGO_PKG_RUST_VERSION"),
            "authors": env!("CARGO_PKG_AUTHORS"),
        }
    });

    Ok(version_info)
}

/// 构建时设置的版本信息（用于动态显示）
pub fn register_version_commands() {
    println!("Version commands registered");
}
