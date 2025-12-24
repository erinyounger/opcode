#!/bin/bash

# Script to bump version across all files
# Usage: ./scripts/bump-version.sh 1.0.0
# When manually setting version, patch number is automatically reset to 0

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 1.0.0"
    exit 1
fi

INPUT_VERSION=$1

# Parse the input version
IFS='.' read -ra VERSION_PARTS <<< "$INPUT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

# If patch is not provided or empty, set it to 0
if [ -z "$PATCH" ]; then
    PATCH=0
fi

# Format version with patch set to 0 (manual version change resets patch)
VERSION="${MAJOR}.${MINOR}.0"

echo "🎯 手动设置版本: $INPUT_VERSION"
echo "🔄 自动归零 patch 版本: $VERSION"
echo ""

# Update package.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
rm -f package.json.bak

# Update Cargo.toml
sed -i.bak "s/^version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
rm -f src-tauri/Cargo.toml.bak

# Update tauri.conf.json
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
rm -f tauri.conf.json.bak

echo "✅ 版本已更新到 $VERSION (patch 自动归零)"
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff"
echo "2. Commit: git commit -am \"chore: bump version to v$VERSION\""
echo "3. Tag: git tag -a v$VERSION -m \"Release v$VERSION\""
echo "4. Push: git push && git push --tags"
