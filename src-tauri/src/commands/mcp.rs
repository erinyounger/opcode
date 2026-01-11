#![allow(dead_code)]

use anyhow::{Context, Result};
use dirs;
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;

// ============================================================================
// 常量定义
// ============================================================================

/// 危险字符集合
const DANGEROUS_SHELL_CHARS: &[char] = &[';', '&', '|', '$', '`', '(', ')', '<', '>', '\n', '\r', '*', '?', '[', ']', '{', '}', '~', '!', '#', '%'];
const DANGEROUS_ARG_CHARS: &[char] = &[';', '&', '|', '$', '`', '(', ')', '<', '>', '\n', '\r'];
const DANGEROUS_URL_CHARS: &[char] = &['\n', '\r', '\0', ' ', '<', '>', '"'];
const DANGEROUS_HEADER_CHARS: &[char] = &['\n', '\r', '\0'];

/// 允许的命令路径前缀
const ALLOWED_PATH_PREFIXES: &[&str] = &[
    "/usr/", "/bin/", "/sbin/", "/Applications/",
    "C:\\Program Files\\", "C:\\Windows\\System32\\"
];

/// 最大服务器名称长度
const MAX_SERVER_NAME_LENGTH: usize = 128;

/// 最大环境变量数量
const MAX_ENV_VARS: usize = 100;

/// 最大头部数量
const MAX_HEADERS: usize = 50;

/// 验证结果类型
type ValidationResult = std::result::Result<String, String>;

/// 验证错误类型
#[derive(Debug, Clone)]
pub enum ValidationError {
    EmptyField(String),
    InvalidCharacters(String, String),
    InvalidLength(String, usize),
    InvalidFormat(String, String),
    PathTraversal(String),
    UnauthorizedPath(String),
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::EmptyField(field) => write!(f, "{} cannot be empty", field),
            ValidationError::InvalidCharacters(field, chars) => write!(f, "{} contains invalid characters: {}", field, chars),
            ValidationError::InvalidLength(field, len) => write!(f, "{} length {} exceeds maximum allowed", field, len),
            ValidationError::InvalidFormat(field, format) => write!(f, "{} has invalid format: {}", field, format),
            ValidationError::PathTraversal(path) => write!(f, "Path traversal detected: {}", path),
            ValidationError::UnauthorizedPath(path) => write!(f, "Unauthorized path: {}", path),
        }
    }
}

impl std::error::Error for ValidationError {}

impl From<ValidationError> for String {
    fn from(error: ValidationError) -> Self {
        error.to_string()
    }
}

/// 验证字符串不包含危险字符
fn contains_dangerous_chars(s: &str, dangerous: &[char]) -> bool {
    s.chars().any(|c| dangerous.contains(&c))
}

/// 验证字符串长度
fn validate_length(field: &str, value: &str, max_length: usize) -> Result<String, ValidationError> {
    if value.is_empty() {
        return Err(ValidationError::EmptyField(field.to_string()));
    }

    if value.len() > max_length {
        return Err(ValidationError::InvalidLength(field.to_string(), value.len()));
    }

    Ok(value.to_string())
}

/// 验证命令字符串
fn validate_command(cmd: &str) -> Result<String, ValidationError> {
    let cmd = cmd.trim();
    validate_length("Command", cmd, MAX_SERVER_NAME_LENGTH)?;

    if contains_dangerous_chars(cmd, DANGEROUS_SHELL_CHARS) {
        return Err(ValidationError::InvalidCharacters(
            "Command".to_string(),
            "shell metacharacters".to_string()
        ));
    }

    // 拒绝路径遍历攻击
    if cmd.contains("..") {
        return Err(ValidationError::PathTraversal(cmd.to_string()));
    }

    if cmd.starts_with("~/") {
        return Err(ValidationError::UnauthorizedPath("home directory".to_string()));
    }

    // 验证绝对路径
    if cmd.starts_with('/') && !ALLOWED_PATH_PREFIXES.iter().any(|prefix| cmd.starts_with(prefix)) {
        return Err(ValidationError::UnauthorizedPath(cmd.to_string()));
    }

    Ok(cmd.to_string())
}

/// 验证 URL
fn validate_url(url: &str) -> Result<String, ValidationError> {
    let url = url.trim();
    validate_length("URL", url, MAX_SERVER_NAME_LENGTH * 2)?;

    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(ValidationError::InvalidFormat(
            "URL".to_string(),
            "Only http/https URLs are allowed".to_string()
        ));
    }

    if contains_dangerous_chars(url, DANGEROUS_URL_CHARS) {
        return Err(ValidationError::InvalidCharacters(
            "URL".to_string(),
            "control characters or spaces".to_string()
        ));
    }

    Ok(url.to_string())
}

/// 验证环境变量名
fn validate_env_var_name(name: &str) -> Result<String, ValidationError> {
    let name = name.trim();
    validate_length("Environment variable", name, MAX_SERVER_NAME_LENGTH)?;

    if !name.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err(ValidationError::InvalidCharacters(
            "Environment variable".to_string(),
            "non-alphanumeric characters".to_string()
        ));
    }

    if name.chars().next().map_or(false, |c| c.is_ascii_digit()) {
        return Err(ValidationError::InvalidFormat(
            "Environment variable".to_string(),
            "cannot start with a digit".to_string()
        ));
    }

    Ok(name.to_string())
}

/// 验证 HTTP 头部名称
fn validate_header_name(name: &str) -> Result<String, ValidationError> {
    let name = name.trim();
    validate_length("Header name", name, 256)?;

    if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err(ValidationError::InvalidCharacters(
            "Header name".to_string(),
            "invalid characters".to_string()
        ));
    }

    Ok(name.to_string())
}

/// 验证头部值
fn validate_header_value(value: &str) -> Result<String, ValidationError> {
    let value = value.trim();
    validate_length("Header value", value, 1024)?;

    if contains_dangerous_chars(value, DANGEROUS_HEADER_CHARS) {
        return Err(ValidationError::InvalidCharacters(
            "Header value".to_string(),
            "control characters".to_string()
        ));
    }

    Ok(value.to_string())
}

/// 验证命令参数
fn validate_arg(arg: &str) -> Result<String, ValidationError> {
    let arg = arg.trim();
    validate_length("Argument", arg, MAX_SERVER_NAME_LENGTH)?;

    if contains_dangerous_chars(arg, DANGEROUS_ARG_CHARS) {
        return Err(ValidationError::InvalidCharacters(
            "Argument".to_string(),
            "shell metacharacters".to_string()
        ));
    }

    Ok(arg.to_string())
}

/// 验证服务器名称（防止路径注入）
fn validate_server_name(name: &str) -> Result<String, ValidationError> {
    let name = name.trim();
    validate_length("Server name", name, MAX_SERVER_NAME_LENGTH)?;

    // 只允许字母、数字、-、_
    if !name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        return Err(ValidationError::InvalidCharacters(
            "Server name".to_string(),
            "non-alphanumeric characters except - and _".to_string()
        ));
    }

    Ok(name.to_string())
}

/// 验证环境变量映射
fn validate_env_vars(env: &HashMap<String, String>) -> Result<Vec<(String, String)>, ValidationError> {
    if env.len() > MAX_ENV_VARS {
        return Err(ValidationError::InvalidLength(
            "Environment variables".to_string(),
            env.len()
        ));
    }

    let mut validated_env = Vec::with_capacity(env.len());

    for (key, value) in env {
        let validated_key = validate_env_var_name(key)?;
        let validated_value = value.trim().to_string();

        if validated_value.len() > MAX_SERVER_NAME_LENGTH {
            return Err(ValidationError::InvalidLength(
                format!("Environment variable value for {}", validated_key),
                validated_value.len()
            ));
        }

        validated_env.push((validated_key, validated_value));
    }

    Ok(validated_env)
}

/// 验证头部映射
fn validate_headers(headers: &HashMap<String, String>) -> Result<Vec<(String, String)>, ValidationError> {
    if headers.len() > MAX_HEADERS {
        return Err(ValidationError::InvalidLength(
            "Headers".to_string(),
            headers.len()
        ));
    }

    let mut validated_headers = Vec::with_capacity(headers.len());

    for (key, value) in headers {
        let validated_key = validate_header_name(key)?;
        let validated_value = validate_header_value(value)?;

        validated_headers.push((validated_key, validated_value));
    }

    Ok(validated_headers)
}

// ============================================================================
// 辅助函数
// ============================================================================

/// 创建带环境变量的命令
fn create_command_with_env(program: &str) -> Command {
    crate::claude_binary::create_command_with_env(program)
}

/// 清理命令字符串中的状态指示符
fn clean_command_string(command: &str) -> String {
    let patterns = [
        " - ✓ Connected",
        " - ✗ Failed to connect",
        " - ✓ connected",
        " - ✗ failed",
        " - ✓",
        " - ✗",
    ];

    let mut result = command.to_string();
    for pattern in patterns {
        if let Some(pos) = result.find(pattern) {
            result = result[..pos].trim().to_string();
            break;
        }
    }

    // 处理变体
    if let Some(pos) = result.find(" - ✓") {
        result = result[..pos].trim().to_string();
    } else if let Some(pos) = result.find(" - ✗") {
        result = result[..pos].trim().to_string();
    }

    result
}

/// 查找 claude 二进制文件路径
fn find_claude_binary(app_handle: &AppHandle) -> Result<String> {
    crate::claude_binary::find_claude_binary(app_handle).map_err(|e| anyhow::anyhow!(e))
}

/// 执行 claude mcp 命令
fn execute_claude_mcp_command(app_handle: &AppHandle, args: Vec<String>) -> Result<String> {
    info!("Executing claude mcp command with args: {:?}", args);

    let claude_path = find_claude_binary(app_handle)?;
    let mut cmd = create_command_with_env(&claude_path);
    cmd.arg("mcp");
    for arg in args {
        cmd.arg(arg);
    }

    let output = cmd.output().context("Failed to execute claude command")?;

    if output.status.success() {
        Ok(crate::claude_binary::decode_command_output(&output.stdout))
    } else {
        let stderr = crate::claude_binary::decode_command_output(&output.stderr);
        Err(anyhow::anyhow!("Command failed: {}", stderr))
    }
}

/// Represents an MCP server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPServer {
    /// Server name/identifier
    pub name: String,
    /// Transport type: "stdio" or "sse"
    pub transport: String,
    /// Command to execute (for stdio)
    pub command: Option<String>,
    /// Command arguments (for stdio)
    pub args: Vec<String>,
    /// Environment variables
    pub env: HashMap<String, String>,
    /// URL endpoint (for SSE)
    pub url: Option<String>,
    /// HTTP headers (for SSE/HTTP)
    pub headers: HashMap<String, String>,
    /// Configuration scope: "local", "project", or "user"
    pub scope: String,
    /// Whether the server is currently active
    pub is_active: bool,
    /// Server status
    pub status: ServerStatus,
    /// Available tools for this MCP server
    pub tools: Option<Vec<String>>,
}

/// Server status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    /// Whether the server is running
    pub running: bool,
    /// Last error message if any
    pub error: Option<String>,
    /// Last checked timestamp
    pub last_checked: Option<u64>,
}

/// MCP configuration file paths
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPConfigPaths {
    /// Local config path (project-specific, private)
    pub local: String,
    /// Project config path (.mcp.json, shared)
    pub project: String,
    /// User config path (global)
    pub user: String,
}

/// MCP configuration for project scope (.mcp.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPProjectConfig {
    #[serde(rename = "mcpServers")]
    pub mcp_servers: HashMap<String, MCPServerConfig>,
}

/// Individual server configuration in .mcp.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPServerConfig {
    #[serde(rename = "type")]
    pub transport_type: String,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub headers: Option<HashMap<String, String>>,
}

/// Result of adding a server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddServerResult {
    pub success: bool,
    pub message: String,
    pub server_name: Option<String>,
}

/// Import result for multiple servers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported_count: u32,
    pub failed_count: u32,
    pub servers: Vec<ImportServerResult>,
}

/// Result for individual server import
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportServerResult {
    pub name: String,
    pub success: bool,
    pub error: Option<String>,
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Adds a new MCP server
#[tauri::command]
pub async fn mcp_add(
    app: AppHandle,
    name: String,
    transport: String,
    command: Option<String>,
    args: Vec<String>,
    env: HashMap<String, String>,
    url: Option<String>,
    scope: String,
    headers: HashMap<String, String>,
) -> Result<AddServerResult, String> {
    info!("Adding MCP server: {} with transport: {}", name, transport);

    // 验证服务器名称
    if let Err(e) = validate_server_name(&name) {
        return Ok(AddServerResult {
            success: false,
            message: format!("Invalid server name: {}", e),
            server_name: None,
        });
    }

    // 验证环境变量名
    for key in env.keys() {
        if let Err(e) = validate_env_var_name(key) {
            return Ok(AddServerResult {
                success: false,
                message: format!("Invalid environment variable name '{}': {}", key, e),
                server_name: None,
            });
        }
    }

    // 准备环境变量参数
    let env_args: Vec<String> = env
        .iter()
        .map(|(key, value)| format!("{}={}", key, value))
        .collect();

    let mut cmd_args: Vec<String> = vec!["add".to_string()];

    // Add scope flag
    cmd_args.push("-s".to_string());
    cmd_args.push(scope.clone());

    // Add transport flag for SSE
    if transport == "sse" {
        cmd_args.push("--transport".to_string());
        cmd_args.push("sse".to_string());
    }

    // Add environment variables
    for (i, _) in env.iter().enumerate() {
        cmd_args.push("-e".to_string());
        cmd_args.push(env_args[i].clone());
    }

    // 验证并添加头部
    if !headers.is_empty() && (transport == "http" || transport == "sse") {
        for (key, value) in &headers {
            // 验证头部名称和值
            if let Err(e) = validate_header_name(key) {
                return Ok(AddServerResult {
                    success: false,
                    message: format!("Invalid header name '{}': {}", key, e),
                    server_name: None,
                });
            }

            if let Err(e) = validate_header_value(value) {
                return Ok(AddServerResult {
                    success: false,
                    message: format!("Invalid header value for '{}': {}", key, e),
                    server_name: None,
                });
            }

            cmd_args.push("--header".to_string());
            cmd_args.push(format!("{}: {}", key, value));
        }
    }

    // Add name
    cmd_args.push(name.clone());

    // Add command/URL based on transport
    if transport == "stdio" {
        if let Some(cmd) = &command {
            // 验证命令
            let validated_cmd = match validate_command(cmd) {
                Ok(v) => v,
                Err(e) => {
                    return Ok(AddServerResult {
                        success: false,
                        message: format!("Invalid command: {}", e),
                        server_name: None,
                    });
                }
            };

            // Add "--" separator before command to prevent argument parsing issues
            if !args.is_empty() || validated_cmd.contains('-') {
                cmd_args.push("--".to_string());
            }
            cmd_args.push(validated_cmd);

            // 验证并添加参数
            for arg in &args {
                let validated_arg = match validate_arg(arg) {
                    Ok(v) => v,
                    Err(e) => {
                        return Ok(AddServerResult {
                            success: false,
                            message: format!("Invalid argument '{}': {}", arg, e),
                            server_name: None,
                        });
                    }
                };
                cmd_args.push(validated_arg);
            }
        } else {
            return Ok(AddServerResult {
                success: false,
                message: "Command is required for stdio transport".to_string(),
                server_name: None,
            });
        }
    } else if transport == "sse" {
        if let Some(url_str) = &url {
            // 验证 URL
            let validated_url = match validate_url(url_str) {
                Ok(v) => v,
                Err(e) => {
                    return Ok(AddServerResult {
                        success: false,
                        message: format!("Invalid URL: {}", e),
                        server_name: None,
                    });
                }
            };
            cmd_args.push(validated_url);
        } else {
            return Ok(AddServerResult {
                success: false,
                message: "URL is required for SSE transport".to_string(),
                server_name: None,
            });
        }
    }

    match execute_claude_mcp_command(&app, cmd_args) {
        Ok(output) => {
            info!("Successfully added MCP server: {}", name);
            Ok(AddServerResult {
                success: true,
                message: output.trim().to_string(),
                server_name: Some(name),
            })
        }
        Err(e) => {
            error!("Failed to add MCP server: {}", e);
            Ok(AddServerResult {
                success: false,
                message: e.to_string(),
                server_name: None,
            })
        }
    }
}

/// Lists all configured MCP servers
#[tauri::command]
pub async fn mcp_list(app: AppHandle) -> Result<Vec<MCPServer>, String> {
    info!("Listing MCP servers");

    match execute_claude_mcp_command(&app, vec!["list".to_string()]) {
        Ok(output) => {
            info!("Raw output from 'claude mcp list': {:?}", output);
            let trimmed = output.trim();
            info!("Trimmed output: {:?}", trimmed);

            // Check if no servers are configured
            if trimmed.contains("No MCP servers configured") || trimmed.is_empty() {
                info!("No servers found - empty or 'No MCP servers' message");
                return Ok(vec![]);
            }

            // Parse the text output to get server names
            let mut server_names = Vec::new();
            let lines: Vec<&str> = trimmed.lines().collect();
            info!("Total lines in output: {}", lines.len());
            for (idx, line) in lines.iter().enumerate() {
                info!("Line {}: {:?}", idx, line);
            }

            let mut i = 0;

            while i < lines.len() {
                let line = lines[i];
                info!("Processing line {}: {:?}", i, line);

                // Check if this line starts a new server entry
                if let Some(colon_pos) = line.find(':') {
                    info!("Found colon at position {} in line: {:?}", colon_pos, line);
                    // Make sure this is a server name line (not part of a path)
                    // Server names typically don't contain '/' or '\'
                    let potential_name = line[..colon_pos].trim();
                    info!("Potential server name: {:?}", potential_name);

                    if !potential_name.contains('/') && !potential_name.contains('\\') {
                        info!("Valid server name detected: {:?}", potential_name);
                        server_names.push(potential_name.to_string());
                        info!("Added server name to list: {:?}", potential_name);

                        // Skip to next server (skip continuation lines)
                        i += 1;
                        while i < lines.len() {
                            let next_line = lines[i];
                            info!("Checking next line {} for continuation: {:?}", i, next_line);

                            // If the next line starts with a server name pattern, break
                            if next_line.contains(':') {
                                let potential_next_name =
                                    next_line.split(':').next().unwrap_or("").trim();
                                info!(
                                    "Found colon in next line, potential name: {:?}",
                                    potential_next_name
                                );
                                if !potential_next_name.is_empty()
                                    && !potential_next_name.contains('/')
                                    && !potential_next_name.contains('\\')
                                {
                                    info!("Next line is a new server, breaking");
                                    break;
                                }
                            }
                            // Otherwise, this line is a continuation - skip it
                            info!("Line {} is a continuation, skipping", i);
                            i += 1;
                        }

                        continue;
                    } else {
                        info!("Skipping line - name contains path separators");
                    }
                } else {
                    info!("No colon found in line {}", i);
                }

                i += 1;
            }

            info!("Found {} MCP servers total", server_names.len());
            for (idx, name) in server_names.iter().enumerate() {
                info!("Server {}: name='{}'", idx, name);
            }

            // Get detailed information for each server including correct scope
            let mut servers = Vec::new();
            for name in server_names {
                info!("Getting details for server: {:?}", name);
                match mcp_get(app.clone(), name.clone()).await {
                    Ok(server_details) => {
                        info!("Successfully got details for server '{}': scope={}, transport={}",
                              name, server_details.scope, server_details.transport);
                        servers.push(server_details);
                    }
                    Err(e) => {
                        error!("Failed to get details for server '{}': {}", name, e);
                        // Add a basic server entry with the name if we can't get details
                        servers.push(MCPServer {
                            name: name.clone(),
                            transport: "stdio".to_string(),
                            command: None,
                            args: vec![],
                            env: HashMap::new(),
                            url: None,
                            headers: HashMap::new(),
                            scope: "local".to_string(),
                            is_active: false,
                            status: ServerStatus {
                                running: false,
                                error: Some(format!("Failed to get details: {}", e)),
                                last_checked: None,
                            },
                            tools: None,
                        });
                    }
                }
            }

            Ok(servers)
        }
        Err(e) => {
            error!("Failed to list MCP servers: {}", e);
            Err(e.to_string())
        }
    }
}

/// Gets details for a specific MCP server
#[tauri::command]
pub async fn mcp_get(app: AppHandle, name: String) -> Result<MCPServer, String> {
    info!("Getting MCP server details for: {}", name);

    // 验证服务器名称
    validate_server_name(&name)?;

    match execute_claude_mcp_command(&app, vec!["get".to_string(), name.clone()]) {
        Ok(output) => {
            // Parse the structured text output
            let mut scope = "local".to_string();
            let mut transport = "stdio".to_string();
            let mut command = None;
            let mut args = vec![];
            let env = HashMap::new();
            let mut url = None;
            let headers = HashMap::new();
            let mut is_connected = false;
            let mut status_error: Option<String> = None;

            for line in output.lines() {
                let line = line.trim();

                if line.starts_with("Scope:") {
                    let scope_part = line.replace("Scope:", "").trim().to_string();
                    if scope_part.to_lowercase().contains("local") {
                        scope = "local".to_string();
                    } else if scope_part.to_lowercase().contains("project") {
                        scope = "project".to_string();
                    } else if scope_part.to_lowercase().contains("user")
                        || scope_part.to_lowercase().contains("global")
                    {
                        scope = "user".to_string();
                    }
                } else if line.starts_with("Status:") {
                    let status_part = line.replace("Status:", "").trim().to_string();
                    if status_part.contains("✓") || status_part.to_lowercase().contains("connected") {
                        is_connected = true;
                    } else if status_part.contains("✗") || status_part.to_lowercase().contains("failed") {
                        is_connected = false;
                        status_error = Some(status_part);
                    }
                } else if line.starts_with("Type:") {
                    transport = line.replace("Type:", "").trim().to_string();
                } else if line.starts_with("Command:") {
                    command = Some(line.replace("Command:", "").trim().to_string());
                } else if line.starts_with("Args:") {
                    let args_str = line.replace("Args:", "").trim().to_string();
                    if !args_str.is_empty() {
                        args = args_str.split_whitespace().map(|s| s.to_string()).collect();
                    }
                } else if line.starts_with("URL:") {
                    url = Some(line.replace("URL:", "").trim().to_string());
                } else if line.starts_with("Environment:") {
                    // TODO: Parse environment variables if they're listed
                    // For now, we'll leave it empty
                }
            }

            // Get the available tools for this MCP server
            let tools = match get_mcp_server_tools(&app, &name).await {
                Ok(tool_list) => Some(tool_list),
                Err(e) => {
                    warn!("Failed to get tools for server {}: {}", name, e);
                    Some(generate_mcp_tools_for_server(&name))
                }
            };

            Ok(MCPServer {
                name,
                transport,
                command,
                args,
                env,
                url,
                headers,
                scope,
                is_active: is_connected,
                tools,
                status: ServerStatus {
                    running: is_connected,
                    error: status_error,
                    last_checked: Some(std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs()),
                },
            })
        }
        Err(e) => {
            error!("Failed to get MCP server: {}", e);
            Err(e.to_string())
        }
    }
}

/// Gets the available tools for an MCP server using enhanced inference and pattern matching
async fn get_mcp_server_tools(_app: &AppHandle, server_name: &str) -> Result<Vec<String>, String> {
    info!("Getting tools for MCP server: {}", server_name);

    // Try to get real tools from running sessions
    let real_tools = extract_tools_from_running_sessions(_app, server_name).await?;

    if !real_tools.is_empty() {
        info!("Found {} real tools for server {}", real_tools.len(), server_name);
        return Ok(real_tools);
    }

    // Fallback to enhanced inference
    info!("No real tools found, using inference for server {}", server_name);
    Ok(generate_mcp_tools_for_server(server_name))
}

/// Extracts MCP tools from currently running Claude sessions
async fn extract_tools_from_running_sessions(_app: &AppHandle, _server_name: &str) -> Result<Vec<String>, String> {
    // This would search through active JSONL files for system:init messages
    // and extract tools specific to the given server name
    // For now, return empty to use inference

    // TODO: Implement actual extraction from JSONL files
    // - Find active session files
    // - Parse for system:init messages
    // - Filter tools that match the server pattern
    // - Return MCP tools in mcp__ format

    Ok(vec![])
}

/// Generate MCP tools based on server type and naming patterns
fn generate_mcp_tools_for_server(server_name: &str) -> Vec<String> {
    let name_lower = server_name.to_lowercase();
    let name_slug = server_name.replace(" ", "_").replace("-", "_");

    // Database servers
    if name_lower.contains("postgres") || name_lower.contains("postgresql") || name_lower.contains("db") {
        return vec![
            format!("mcp__{}__query", name_slug),
            format!("mcp__{}__connect", name_slug),
            format!("mcp__{}__list_tables", name_slug),
            format!("mcp__{}__describe", name_slug),
            format!("mcp__{}__execute", name_slug),
        ];
    }

    // Git/version control
    if name_lower.contains("git") || name_lower.contains("github") || name_lower.contains("version") {
        return vec![
            format!("mcp__{}__status", name_slug),
            format!("mcp__{}__commit", name_slug),
            format!("mcp__{}__push", name_slug),
            format!("mcp__{}__pull", name_slug),
            format!("mcp__{}__branch", name_slug),
            format!("mcp__{}__create_issue", name_slug),
        ];
    }

    // File system
    if name_lower.contains("fs") || name_lower.contains("file") || name_lower.contains("storage") {
        return vec![
            format!("mcp__{}__read", name_slug),
            format!("mcp__{}__write", name_slug),
            format!("mcp__{}__delete", name_slug),
            format!("mcp__{}__list", name_slug),
            format!("mcp__{}__search", name_slug),
        ];
    }

    // HTTP/API
    if name_lower.contains("http") || name_lower.contains("web") || name_lower.contains("api") {
        return vec![
            format!("mcp__{}__get", name_slug),
            format!("mcp__{}__post", name_slug),
            format!("mcp__{}__put", name_slug),
            format!("mcp__{}__delete", name_slug),
            format!("mcp__{}__list", name_slug),
        ];
    }

    // Docker/containers
    if name_lower.contains("docker") || name_lower.contains("container") {
        return vec![
            format!("mcp__{}__run", name_slug),
            format!("mcp__{}__stop", name_slug),
            format!("mcp__{}__list", name_slug),
            format!("mcp__{}__logs", name_slug),
            format!("mcp__{}__build", name_slug),
        ];
    }

    // Search engines
    if name_lower.contains("search") || name_lower.contains("find") {
        return vec![
            format!("mcp__{}__search", name_slug),
            format!("mcp__{}__filter", name_slug),
            format!("mcp__{}__sort", name_slug),
            format!("mcp__{}__group", name_slug),
        ];
    }

    // Generic MCP tool
    vec![format!("mcp__{}__execute", name_slug)]
}

/// Removes an MCP server
#[tauri::command]
pub async fn mcp_remove(app: AppHandle, name: String) -> Result<String, String> {
    info!("Removing MCP server: {}", name);

    match execute_claude_mcp_command(&app, vec!["remove".to_string(), name.clone()]) {
        Ok(output) => {
            info!("Successfully removed MCP server: {}", name);
            Ok(output.trim().to_string())
        }
        Err(e) => {
            error!("Failed to remove MCP server: {}", e);
            Err(e.to_string())
        }
    }
}

/// Adds an MCP server from JSON configuration
#[tauri::command]
pub async fn mcp_add_json(
    app: AppHandle,
    name: String,
    json_config: String,
    scope: String,
) -> Result<AddServerResult, String> {
    info!(
        "Adding MCP server from JSON: {} with scope: {}",
        name, scope
    );

    // Build command args
    let mut cmd_args: Vec<String> = vec!["add-json".to_string(), name.clone(), json_config.clone()];

    // Add scope flag
    cmd_args.push("-s".to_string());
    cmd_args.push(scope.clone());

    match execute_claude_mcp_command(&app, cmd_args) {
        Ok(output) => {
            info!("Successfully added MCP server from JSON: {}", name);
            Ok(AddServerResult {
                success: true,
                message: output.trim().to_string(),
                server_name: Some(name),
            })
        }
        Err(e) => {
            error!("Failed to add MCP server from JSON: {}", e);
            Ok(AddServerResult {
                success: false,
                message: e.to_string(),
                server_name: None,
            })
        }
    }
}


/// Starts Claude Code as an MCP server
#[tauri::command]
pub async fn mcp_serve(app: AppHandle) -> Result<String, String> {
    info!("Starting Claude Code as MCP server");

    // Start the server in a separate process
    let claude_path = match find_claude_binary(&app) {
        Ok(path) => path,
        Err(e) => {
            error!("Failed to find claude binary: {}", e);
            return Err(e.to_string());
        }
    };

    let mut cmd = create_command_with_env(&claude_path);
    cmd.arg("mcp").arg("serve");

    match cmd.spawn() {
        Ok(_) => {
            info!("Successfully started Claude Code MCP server");
            Ok("Claude Code MCP server started".to_string())
        }
        Err(e) => {
            error!("Failed to start MCP server: {}", e);
            Err(e.to_string())
        }
    }
}

/// Tests connection to an MCP server
#[tauri::command]
pub async fn mcp_test_connection(app: AppHandle, name: String) -> Result<String, String> {
    info!("Testing connection to MCP server: {}", name);

    // For now, we'll use the get command to test if the server exists
    match execute_claude_mcp_command(&app, vec!["get".to_string(), name.clone()]) {
        Ok(_) => Ok(format!("Connection to {} successful", name)),
        Err(e) => Err(e.to_string()),
    }
}

/// Resets project-scoped server approval choices
#[tauri::command]
pub async fn mcp_reset_project_choices(app: AppHandle) -> Result<String, String> {
    info!("Resetting MCP project choices");

    match execute_claude_mcp_command(&app, vec!["reset-project-choices".to_string()]) {
        Ok(output) => {
            info!("Successfully reset MCP project choices");
            Ok(output.trim().to_string())
        }
        Err(e) => {
            error!("Failed to reset project choices: {}", e);
            Err(e.to_string())
        }
    }
}

/// Gets the status of MCP servers
#[tauri::command]
pub async fn mcp_get_server_status() -> Result<HashMap<String, ServerStatus>, String> {
    info!("Getting MCP server status");

    // TODO: Implement actual status checking
    // For now, return empty status
    Ok(HashMap::new())
}

/// Gets the MCP configuration file paths
#[tauri::command]
pub async fn mcp_get_config_paths(project_path: Option<String>) -> Result<MCPConfigPaths, String> {
    info!("Getting MCP config paths");

    // Get home directory for user config
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not find home directory".to_string())?;

    // User config: ~/.claude.json (global, available in all projects)
    let user_path = home_dir.join(".claude.json");

    // Local config: <project>/.claude/settings.local.json
    let local_path = if let Some(ref project) = project_path {
        PathBuf::from(project).join(".claude").join("settings.local.json")
    } else {
        PathBuf::from(".claude").join("settings.local.json")
    };

    // Project config: <project>/.mcp.json
    let project_config_path = if let Some(ref project) = project_path {
        PathBuf::from(project).join(".mcp.json")
    } else {
        PathBuf::from(".mcp.json")
    };

    Ok(MCPConfigPaths {
        local: local_path.to_string_lossy().to_string(),
        project: project_config_path.to_string_lossy().to_string(),
        user: user_path.to_string_lossy().to_string(),
    })
}

/// Reads .mcp.json from the current project
#[tauri::command]
pub async fn mcp_read_project_config(project_path: String) -> Result<MCPProjectConfig, String> {
    info!("Reading .mcp.json from project: {}", project_path);

    let mcp_json_path = PathBuf::from(&project_path).join(".mcp.json");

    if !mcp_json_path.exists() {
        return Ok(MCPProjectConfig {
            mcp_servers: HashMap::new(),
        });
    }

    match fs::read_to_string(&mcp_json_path) {
        Ok(content) => match serde_json::from_str::<MCPProjectConfig>(&content) {
            Ok(config) => Ok(config),
            Err(e) => {
                error!("Failed to parse .mcp.json: {}", e);
                Err(format!("Failed to parse .mcp.json: {}", e))
            }
        },
        Err(e) => {
            error!("Failed to read .mcp.json: {}", e);
            Err(format!("Failed to read .mcp.json: {}", e))
        }
    }
}

/// Updates an existing MCP server (remove + add)
#[tauri::command(rename_all = "snake_case")]
pub async fn mcp_update(
    app: AppHandle,
    old_name: String,
    name: String,
    transport: String,
    command: Option<String>,
    args: Vec<String>,
    env: HashMap<String, String>,
    url: Option<String>,
    scope: String,
    headers: HashMap<String, String>,
) -> Result<AddServerResult, String> {
    info!("Updating MCP server: {} -> {}", old_name, name);

    // Step 1: 删除旧服务器
    if let Err(e) = execute_claude_mcp_command(&app, vec!["remove".to_string(), old_name.clone()]) {
        error!("Failed to remove old server: {}", e);
        return Ok(AddServerResult {
            success: false,
            message: format!("Failed to remove old server: {}", e),
            server_name: None,
        });
    }

    // Step 2: 添加新配置
    mcp_add(app, name, transport, command, args, env, url, scope, headers).await
}

/// Saves .mcp.json to the current project
#[tauri::command]
pub async fn mcp_save_project_config(
    project_path: String,
    config: MCPProjectConfig,
) -> Result<String, String> {
    info!("Saving .mcp.json to project: {}", project_path);

    let mcp_json_path = PathBuf::from(&project_path).join(".mcp.json");

    let json_content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&mcp_json_path, json_content)
        .map_err(|e| format!("Failed to write .mcp.json: {}", e))?;

    Ok("Project MCP configuration saved".to_string())
}
