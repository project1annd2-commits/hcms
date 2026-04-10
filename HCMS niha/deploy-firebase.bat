@echo off
echo Firebase CLI Deployment Script
echo ==============================

:: Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Firebase CLI not found. Installing...
    npm install -g firebase-tools
)

echo Logging into Firebase...
firebase login

echo Initializing Firebase project...
firebase init

echo Deploying Firebase configuration...
firebase deploy --only firestore,storage

echo.
echo Deployment complete!
echo.
echo To use the new Firebase project, ensure the firebaseConfig in src/lib/firebase.ts
echo is configured for your project ID: hcms-test-c1e7f
echo.
echo Next steps:
echo 1. Create the Firebase project at https://console.firebase.google.com/
echo 2. Enable Firestore Database in the project
echo 3. Run this script to deploy the security rules
pause