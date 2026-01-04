#!/usr/bin/env bash
set -euo pipefail

PATCH_FILE="${1:-}"

if [[ -z "$PATCH_FILE" ]]; then
	echo "Usage: scripts/apply_patch.sh path/to/change.patch"
	exit 1
fi

if [[ ! -f "$PATCH_FILE" ]]; then
	echo "Patch file not found: $PATCH_FILE"
	exit 1
fi

# Ensure we're in a git repo
git rev-parse --is-inside-work-tree >/dev/null

echo "== Checking working tree is clean =="
if ! git diff --quiet || ! git diff --cached --quiet; then
	echo "Working tree is not clean. Commit/stash your changes first."
	exit 1
fi

echo "== Applying patch (3-way merge enabled) =="
git apply --3way --whitespace=nowarn "$PATCH_FILE"

echo "== Patch applied. Status =="
git status --short

echo ""
echo "Next:"
echo "  - run your tests/build"
echo "  - git add -A"
echo "  - git commit -m \"<message>\""
