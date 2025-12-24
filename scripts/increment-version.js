#!/usr/bin/env node

/**
 * 自动递增版本号脚本
 * 读取 package.json 中的版本，自动递增 patch 版本
 * 然后同步到其他配置文件
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

// 解析版本号
function parseVersion(version) {
  const parts = version.split('.');
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10)
  };
}

// 递增版本号
function incrementVersion(version, type = 'patch') {
  const parts = parseVersion(version);

  switch (type) {
    case 'major':
      return `${parts.major + 1}.${parts.minor}.${parts.patch}`;
    case 'minor':
      return `${parts.major}.${parts.minor + 1}.${parts.patch}`;
    case 'patch':
    default:
      return `${parts.major}.${parts.minor}.${parts.patch + 1}`;
  }
}

// 更新 package.json 中的版本
function updatePackageJsonVersion(newVersion) {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  console.log(`  ✅ 已更新: package.json`);
  return newVersion;
}

// 更新其他文件中的版本号
function syncVersionToFiles(version) {
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
}

// 主函数
function main() {
  const incrementType = process.argv[2] || 'patch'; // 默认递增patch版本
  const currentVersion = getCurrentVersion();
  const newVersion = incrementVersion(currentVersion, incrementType);

  console.log(`📦 当前版本: ${currentVersion}`);
  console.log(`🔢 递增类型: ${incrementType}`);
  console.log(`🎯 新版本: ${newVersion}`);
  console.log('');

  // 更新 package.json
  updatePackageJsonVersion(newVersion);

  // 同步到其他文件
  syncVersionToFiles(newVersion);

  console.log(`\n✨ 版本号已成功更新到 ${newVersion}`);
  console.log(`\n::set-output name=new_version::${newVersion}`);
}

main();
