
import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkAmeena() {
    console.log('Searching for Ameena...');
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    let found = false;
    snapshot.forEach(doc => {
        const data = doc.data();
        const fullName = (data.full_name || '').toLowerCase();
        const username = (data.username || '').toLowerCase();
        
        if (fullName.includes('ameena') || username.includes('ameena')) {
            console.log('Found:', {
                id: doc.id,
                username: data.username,
                full_name: data.full_name,
                role: data.role
            });
            found = true;
        }
    });
    
    if (!found) {
        console.log('Ameena not found in users collection.');
    }
}

checkAmeena().catch(console.error);
