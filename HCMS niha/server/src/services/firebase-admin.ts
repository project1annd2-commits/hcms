import * as admin from 'firebase-admin';
import * as path from 'path';

// Define the path to your service account key
const serviceAccountPath = path.resolve(__dirname, '../../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');

// Check if already initialized to avoid errors in dev reloading
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(require(serviceAccountPath)),
            databaseURL: "https://hcms-680e6.firebaseio.com" // Not strictly required for Auth, but good to have
        });
        console.log('Firebase Admin initialized for custom auth.');
    } catch (e) {
        console.error('Failed to initialize Firebase Admin SDK. Make sure the service account file exists and is valid.', e);
    }
}

export const firebaseAdmin = admin;
