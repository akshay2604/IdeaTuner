#!/usr/bin/env bash
set -euo pipefail

# Release script for IdeaTuner (Tauri v2)
# Usage: ./scripts/release.sh [patch|minor|major]
#   Defaults to "patch" if no argument given

BUMP_TYPE="${1:-patch}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Ensure working tree is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working tree is not clean. Commit or stash changes first."
  exit 1
fi

# Bump version in package.json
OLD_VERSION=$(node -p "require('./package.json').version")
pnpm version "$BUMP_TYPE" --no-git-tag-version
VERSION=$(node -p "require('./package.json').version")
echo "Version: $OLD_VERSION → $VERSION"

# Sync version to tauri.conf.json
node -e "
  const fs = require('fs');
  const p = 'src-tauri/tauri.conf.json';
  const conf = JSON.parse(fs.readFileSync(p, 'utf8'));
  conf.version = '$VERSION';
  fs.writeFileSync(p, JSON.stringify(conf, null, 2) + '\n');
"
echo "Updated src-tauri/tauri.conf.json version"

# Build (Tauri build produces the DMG)
echo "Building app..."
pnpm build

# Find the DMG artifact
DMG=$(ls src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null | head -1)
if [ -z "$DMG" ]; then
  echo "Error: No DMG found in src-tauri/target/release/bundle/dmg/"
  exit 1
fi
echo "Built: $DMG"

# Commit version bump and tag
git add package.json pnpm-lock.yaml src-tauri/tauri.conf.json
git commit -m "release: v$VERSION"
git tag "v$VERSION"
git push origin main --tags

# Create GitHub release
echo "Creating GitHub release v$VERSION..."
gh release create "v$VERSION" "$DMG" \
  --title "IdeaTuner v$VERSION" \
  --generate-notes

echo ""
echo "Released v$VERSION!"
echo "https://github.com/akshay2604/IdeaTuner/releases/tag/v$VERSION"
