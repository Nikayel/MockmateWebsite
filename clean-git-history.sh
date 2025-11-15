#!/bin/bash
# Script to remove sensitive data from git history
# WARNING: This rewrites git history. Use with caution!

echo "🚨 WARNING: This will rewrite git history!"
echo "This script removes Firebase credentials from git history."
echo ""
echo "Before running:"
echo "1. Make sure you have a backup"
echo "2. Coordinate with team members (they'll need to re-clone)"
echo "3. Force push will be required: git push --force"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Remove Firebase config from lib/firebase.ts in all commits
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch lib/firebase.ts' \
  --prune-empty --tag-name-filter cat -- --all

# Alternative: Use BFG Repo-Cleaner (faster, but requires installation)
# bfg --replace-text passwords.txt

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "Next steps:"
echo "1. Verify: git log --all -- lib/firebase.ts (should show no results)"
echo "2. Force push: git push --force --all"
echo "3. Team members need to: git fetch && git reset --hard origin/main"
echo ""
echo "⚠️  If repository is public, consider rotating Firebase API key"

