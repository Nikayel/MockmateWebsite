#!/bin/bash
# Script to remove sensitive Firebase data from git history
# This replaces hardcoded Firebase config with env vars in ALL commits

set -e

echo "🚨 WARNING: This will rewrite git history!"
echo "This script replaces hardcoded Firebase credentials with env vars in all commits."
echo ""
echo "Before running:"
echo "1. Make sure you have a backup: git clone --mirror . ../backup-repo"
echo "2. Coordinate with team members (they'll need to re-clone)"
echo "3. Force push will be required: git push --force --all"
echo ""
read -p "Continue? (type 'yes' to proceed): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "🔄 Cleaning git history..."

# Set environment variable to suppress git-filter-branch warning
export FILTER_BRANCH_SQUELCH_WARNING=1

# Create a temporary file with the replacement script
cat > /tmp/firebase-replace.sh << 'EOF'
#!/bin/bash
# Replace hardcoded Firebase config with env vars (only if file exists)
if [ -f lib/firebase.ts ]; then
    # Check if file contains hardcoded values before replacing
    if grep -q 'AIzaSyC2ZsOJlb_56Ef3ApYRM4MiISZl0JindHQ' lib/firebase.ts; then
        sed -i.bak 's/apiKey: "AIzaSyC2ZsOJlb_56Ef3ApYRM4MiISZl0JindHQ"/apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ""/g' lib/firebase.ts
        sed -i.bak 's/authDomain: "danuxx-42bf3.firebaseapp.com"/authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ""/g' lib/firebase.ts
        sed -i.bak 's/projectId: "danuxx-42bf3"/projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ""/g' lib/firebase.ts
        sed -i.bak 's/storageBucket: "danuxx-42bf3.firebasestorage.app"/storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ""/g' lib/firebase.ts
        sed -i.bak 's/messagingSenderId: "557537806336"/messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ""/g' lib/firebase.ts
        sed -i.bak 's/appId: "1:557537806336:web:6ebaf49b70e781c95d70e5"/appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""/g' lib/firebase.ts
        sed -i.bak 's/measurementId: "G-NB88C20NLN"/measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""/g' lib/firebase.ts
        rm -f lib/firebase.ts.bak
        git add lib/firebase.ts 2>/dev/null || true
    fi
fi
EOF

chmod +x /tmp/firebase-replace.sh

# Use git filter-branch to rewrite history
echo "Rewriting commits (this may take a while)..."
git filter-branch --force --tree-filter '/tmp/firebase-replace.sh' --prune-empty --tag-name-filter cat -- --all

# Clean up
rm -f /tmp/firebase-replace.sh
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d 2>/dev/null || true

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "Verifying cleanup..."
if git log --all --source --pretty=format:"%H" | xargs git show 2>/dev/null | grep -q "AIzaSyC2ZsOJlb_56Ef3ApYRM4MiISZl0JindHQ"; then
    echo "⚠️  WARNING: Some instances may still exist. Check manually."
else
    echo "✅ No hardcoded Firebase keys found in history!"
fi

echo ""
echo "Next steps:"
echo "1. Verify: git log --all -p -- lib/firebase.ts | grep -i 'AIzaSy' (should show nothing)"
echo "2. Force push: git push --force --all"
echo "3. Team members need to: git fetch && git reset --hard origin/main"
