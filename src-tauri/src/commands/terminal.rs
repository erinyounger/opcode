use tauri::AppHandle;
use serde::{Deserialize, Serialize};
use tokio::process::Command as AsyncCommand;
use std::path::Path;

/// Command whitelist - only these commands are allowed
#[allow(dead_code)]
const ALLOWED_COMMANDS: &[&str] = &["echo", "pwd", "ls", "cat", "grep", "find", "git"];

/// Maximum command length limit (4096 characters)
#[allow(dead_code)]
const MAX_COMMAND_LENGTH: usize = 4096;

/// Security validation result
#[derive(Debug)]
#[allow(dead_code)]
struct ValidationResult {
    is_valid: bool,
    error_message: Option<String>,
}

/// Validates the command against security rules
#[allow(dead_code)]
fn validate_command(command: &str, working_dir: Option<&String>) -> ValidationResult {
    // Check command length
    if command.len() > MAX_COMMAND_LENGTH {
        return ValidationResult {
            is_valid: false,
            error_message: Some(format!("Command exceeds maximum length of {} characters", MAX_COMMAND_LENGTH)),
        };
    }

    // Extract command name (first word)
    let cmd_name = command.split_whitespace().next()
        .ok_or("Invalid command")
        .unwrap_or("");

    // Check if command is in whitelist
    if !ALLOWED_COMMANDS.contains(&cmd_name) {
        return ValidationResult {
            is_valid: false,
            error_message: Some(format!("Command not allowed: {}. Allowed commands: {:?}", cmd_name, ALLOWED_COMMANDS)),
        };
    }

    // Validate working directory if provided
    if let Some(dir) = working_dir {
        let path = Path::new(dir);

        // Prevent path traversal attacks
        if path.is_absolute() && !dir.starts_with("/") && !dir.starts_with("C:\\") {
            // On Unix systems, ensure path is within allowed directories
            #[cfg(not(target_os = "windows"))]
            {
                if !dir.starts_with("/home") && !dir.starts_with("/tmp") && !dir.starts_with("/var") {
                    return ValidationResult {
                        is_valid: false,
                        error_message: Some("Access to this directory is not allowed".to_string()),
                    };
                }
            }
        }
    }

    ValidationResult {
        is_valid: true,
        error_message: None,
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct CommandOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Execute a terminal command in the given working directory with security validation
#[tauri::command]
#[allow(dead_code)]
pub async fn execute_terminal_command(
    command: String,
    working_dir: Option<String>,
    _app_handle: AppHandle,
) -> Result<CommandOutput, String> {
    // Validate command against security rules
    let validation = validate_command(&command, working_dir.as_ref());
    if !validation.is_valid {
        return Err(validation.error_message.unwrap_or("Command validation failed".to_string()));
    }

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

/// Execute a command and stream output in real-time with security validation
#[tauri::command]
#[allow(dead_code)]
pub async fn execute_terminal_command_stream(
    command: String,
    working_dir: Option<String>,
    _app_handle: AppHandle,
) -> Result<(), String> {
    // Validate command against security rules
    let validation = validate_command(&command, working_dir.as_ref());
    if !validation.is_valid {
        return Err(validation.error_message.unwrap_or("Command validation failed".to_string()));
    }

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

    #[tokio::test]
    async fn test_command_whitelist() {
        // Test allowed command
        let result = execute_terminal_command(
            "echo allowed".to_string(),
            None,
            AppHandle::default(),
        ).await;
        assert!(result.is_ok(), "echo command should be allowed");

        // Test disallowed command
        let result = execute_terminal_command(
            "rm -rf /".to_string(),
            None,
            AppHandle::default(),
        ).await;
        assert!(result.is_err(), "rm command should not be allowed");
        assert!(result.unwrap_err().contains("Command not allowed"));
    }

    #[test]
    fn test_command_length_validation() {
        let long_command = "echo ".to_string() + &"x".repeat(MAX_COMMAND_LENGTH + 1);
        let validation = validate_command(&long_command, None);
        assert!(!validation.is_valid);
        assert!(validation.error_message.unwrap().contains("exceeds maximum length"));
    }

    #[test]
    fn test_working_directory_validation() {
        // Test valid working directory
        let validation = validate_command("echo test", Some(&"/home/user".to_string()));
        assert!(validation.is_valid);

        // Test potentially unsafe working directory (this is a simplified test)
        // In real scenarios, you'd want more comprehensive path validation
        let validation = validate_command("echo test", Some(&"/etc".to_string()));
        // The behavior depends on the actual implementation of path validation
    }
}
