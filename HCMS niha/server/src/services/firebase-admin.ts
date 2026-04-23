import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin using environment variable or fallback file
if (!admin.apps.length) {
    try {
        let credential;
        
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
            console.log('Firebase Admin initialized from environment variable.');
        } else {
            // Define the path to your service account key (FALLBACK - NOT RECOMMENDED FOR PRODUCTION)
            const serviceAccountPath = path.resolve(__dirname, '../../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
            credential = admin.credential.cert(require(serviceAccountPath));
            console.warn('⚠️ Firebase Admin initialized from local file fallback. Please use FIREBASE_SERVICE_ACCOUNT_JSON environment variable.');
        }

        admin.initializeApp({
            credential,
            databaseURL: "https://hcms-680e6.firebaseio.com"
        });
    } catch (e) {
        console.error('Failed to initialize Firebase Admin SDK:', e);
    }
}

export const firebaseAdmin = admin;
