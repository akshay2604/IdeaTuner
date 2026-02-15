#!/usr/bin/env bash
set -euo pipefail

# Release script for IdeaTuner
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

# Bump version
OLD_VERSION=$(node -p "require('./package.json').version")
npm version "$BUMP_TYPE" --no-git-tag-version
VERSION=$(node -p "require('./package.json').version")
echo "Version: $OLD_VERSION → $VERSION"

# Build
echo "Building app..."
npm run build

# Package for current platform
echo "Packaging for macOS..."
npm run dist:mac

# Find the DMG artifact
DMG=$(ls dist/ideatuner-*.dmg 2>/dev/null | head -1)
if [ -z "$DMG" ]; then
  echo "Error: No DMG found in dist/"
  exit 1
fi
echo "Built: $DMG"

# Commit version bump and tag
git add package.json package-lock.json
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
