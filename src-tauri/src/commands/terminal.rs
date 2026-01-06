use tauri::AppHandle;
use serde::{Deserialize, Serialize};
use tokio::process::Command as AsyncCommand;

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Execute a terminal command in the given working directory
#[tauri::command]
pub async fn execute_terminal_command(
    command: String,
    working_dir: Option<String>,
    _app_handle: AppHandle,
) -> Result<CommandOutput, String> {
    let mut cmd = AsyncCommand::new("sh");

    // Set working directory if provided
    if let Some(ref dir) = working_dir {
        cmd.current_dir(dir);
    }

    // Execute command based on OS
    #[cfg(target_os = "windows")]
    {
        cmd.arg("-c").arg(&command);
    }

    #[cfg(not(target_os = "windows"))]
    {
        cmd.arg("-c").arg(&command);
    }

    let output = cmd.output()
        .await
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1) as i32;

    Ok(CommandOutput {
        stdout,
        stderr,
        exit_code,
    })
}

/// Execute a command and stream output in real-time
#[tauri::command]
pub async fn execute_terminal_command_stream(
    _command: String,
    _working_dir: Option<String>,
    _app_handle: AppHandle,
) -> Result<(), String> {
    // This would be used with WebSocket for real-time output streaming
    // Implementation would involve spawning a process and streaming stdout/stderr
    Err("Streaming not yet implemented".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_execute_command() {
        let result = execute_terminal_command(
            "echo test".to_string(),
            None,
            AppHandle::default(),
        ).await.unwrap();

        assert!(result.stdout.contains("test"));
        assert_eq!(result.exit_code, 0);
    }
}
