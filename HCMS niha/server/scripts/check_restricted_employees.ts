
import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkEmployees() {
    console.log('Searching for Tanzila and Khatija...');
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const fullName = (data.full_name || '').toLowerCase();
        const username = (data.username || '').toLowerCase();
        
        if (fullName.includes('tanzila') || username.includes('tanzila') ||
            fullName.includes('khatija') || username.includes('khatija')) {
            console.log('Found:', {
                id: doc.id,
                username: data.username,
                full_name: data.full_name,
                role: data.role
            });
        }
    });
}

checkEmployees().catch(console.error);
