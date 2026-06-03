import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkZainabRole() {
    console.log('=== CHECKING ZAINAB ROLE ===\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();

    const usersSnapshot = await db.collection('users')
        .where('username', '==', 'zainab740')
        .get();

    if (usersSnapshot.empty) {
        console.log('❌ zainab740 user not found');
        return;
    }

    const zainabUser = usersSnapshot.docs[0].data();
    console.log('User Data:', JSON.stringify(zainabUser, null, 2));
    console.log(`\nRole: ${zainabUser.role}`);
}

checkZainabRole().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
