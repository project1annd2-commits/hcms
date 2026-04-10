#!/bin/bash

echo "Firebase CLI Deployment Script"
echo "=============================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

echo "Logging into Firebase..."
firebase login

echo "Initializing Firebase project..."
firebase init

echo "Deploying Firebase configuration..."
firebase deploy --only firestore,storage

echo "Deployment complete!"
echo ""
echo "To use the new Firebase project, ensure the firebaseConfig in src/lib/firebase.ts"
echo "is configured for your project ID: hcms-test-c1e7f"