#!/usr/bin/env node

/**
 * 构建后重命名脚本
 * 将可执行文件重命名为包含版本号的格式
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 package.json 获取版本号
function getVersion() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function main() {
  const version = getVersion();
  console.log(`📦 当前版本: ${version}`);

  const srcTauriPath = path.join(__dirname, '..', 'src-tauri');
  const targetPath = path.join(srcTauriPath, 'target');

  // 需要重命名的文件映射
  const renameMap = [
    {
      pattern: 'release/opcode.exe',
      newName: `release/opcode-v${version}.exe`
    },
    {
      pattern: 'release/bundle/msi/*.msi',
      newName: `release/bundle/msi/opcode-v${version}.msi`
    }
  ];

  try {
    // 重命名 exe 文件
    const exePath = path.join(targetPath, 'release/opcode.exe');
    const newExePath = path.join(targetPath, `release/opcode-v${version}.exe`);

    if (fs.existsSync(exePath)) {
      fs.renameSync(exePath, newExePath);
      console.log(`  ✅ 已重命名: opcode.exe → opcode-v${version}.exe`);
    } else {
      console.log(`  ⚠️  未找到: ${exePath}`);
    }

    // 重命名 MSI 文件
    const msiDir = path.join(targetPath, 'release/bundle/msi');
    if (fs.existsSync(msiDir)) {
      const files = fs.readdirSync(msiDir);
      const msiFile = files.find(f => f.endsWith('.msi') && f.startsWith('opcode_'));

      if (msiFile) {
        const oldMsiPath = path.join(msiDir, msiFile);
        const newMsiPath = path.join(msiDir, `opcode-v${version}.msi`);
        fs.renameSync(oldMsiPath, newMsiPath);
        console.log(`  ✅ 已重命名: ${msiFile} → opcode-v${version}.msi`);
      }
    }

    console.log(`\n✨ 文件重命名完成！`);
  } catch (error) {
    console.error(`❌ 重命名失败:`, error.message);
  }
}

main();
