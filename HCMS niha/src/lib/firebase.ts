import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Option 1: Use the new test project (requires proper Firebase setup)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC7NL1fvGeSzuPYN4b7QyZC4eaHPBPNsyc",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hcms-test-c1e7f.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hcms-test-c1e7f",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hcms-test-c1e7f.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "36266448653",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:36266448653:web:598731b0eec5a8805d4244",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KWMZE5T428"
};

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    console.warn('⚠️ Firebase configuration is using hard-coded values. Please set VITE_FIREBASE_* environment variables.');
}

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
