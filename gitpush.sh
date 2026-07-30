#!/bin/bash

# Exit if any command fails
set -e

# Check if we're inside a Git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "❌ This is not a Git repository."
    exit 1
fi

# Ask for commit message
echo ""
read -p "📝 Enter commit message: " COMMIT_MSG

# Validate input
if [ -z "$COMMIT_MSG" ]; then
    echo "❌ Commit message cannot be empty."
    exit 1
fi

echo ""
echo "📦 Adding files..."
git add .

echo "💾 Committing..."
git commit -m "$COMMIT_MSG"

echo "🚀 Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done!"