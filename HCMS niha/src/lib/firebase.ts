import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Option 1: Use the new test project (requires proper Firebase setup)
const firebaseConfig = {
    apiKey: "AIzaSyC7NL1fvGeSzuPYN4b7QyZC4eaHPBPNsyc",
    authDomain: "hcms-test-c1e7f.firebaseapp.com",
    projectId: "hcms-test-c1e7f",
    storageBucket: "hcms-test-c1e7f.firebasestorage.app",
    messagingSenderId: "36266448653",
    appId: "1:36266448653:web:598731b0eec5a8805d4244",
    measurementId: "G-KWMZE5T428"
};

// Option 2: Use the original working project (uncomment to use)
// const firebaseConfig = {
//     apiKey: "AIzaSyC5_mkf3qPYIy9vOmHm1bivOD3P3ycWmRM",
//     authDomain: "hcms-680e6.firebaseapp.com",
//     projectId: "hcms-680e6",
//     storageBucket: "hcms-680e6.firebasestorage.app",
//     messagingSenderId: "1033007205802",
//     appId: "1:1033007205802:web:7ac660d2b8ad3dd363afd3",
//     measurementId: "G-XMPRDVPW4V"
// };

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
