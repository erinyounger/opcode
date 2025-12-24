#!/usr/bin/env node

/**
 * 从 package.json 同步版本号到其他配置文件
 * 不递增版本，只同步
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取当前版本号
function getCurrentVersion() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

// 更新其他文件中的版本号
function syncVersionToFiles(version) {
  console.log(`🔄 同步版本号 ${version} 到其他配置文件`);

  // 更新 Cargo.toml - 只替换 [package] 部分的 version
  const cargoPath = path.join(__dirname, '..', 'src-tauri/Cargo.toml');
  let cargoContent = fs.readFileSync(cargoPath, 'utf8');

  // 使用更精确的替换：找到 [package] 部分并替换其下的 version
  cargoContent = cargoContent.replace(
    /(name = "opcode"\s*\n(?:.*\n)*?)version = "[^"]+"/,
    `$1version = "${version}"`
  );

  fs.writeFileSync(cargoPath, cargoContent, 'utf8');
  console.log(`  ✅ 已同步: src-tauri/Cargo.toml`);

  // 更新 tauri.conf.json
  const tauriConfPath = path.join(__dirname, '..', 'src-tauri/tauri.conf.json');
  let tauriConfContent = fs.readFileSync(tauriConfPath, 'utf8');
  tauriConfContent = tauriConfContent.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`);
  fs.writeFileSync(tauriConfPath, tauriConfContent, 'utf8');
  console.log(`  ✅ 已同步: src-tauri/tauri.conf.json`);

  return version;
}

function main() {
  const version = getCurrentVersion();
  console.log(`📦 当前 package.json 版本: ${version}`);
  syncVersionToFiles(version);
  console.log(`\n✨ 版本同步完成`);
}

main();
