import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetAdminPassword() {
    console.log('🔐 Resetting admin password...');

    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    // New password: "admin123"
    const newPassword = 'admin123';
    const hash = crypto.createHash('sha256').update(newPassword).digest('hex');

    console.log(`New password: ${newPassword}`);
    console.log(`Password hash: ${hash}`);

    // Find admin user
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('username', '==', 'admin').get();

    if (querySnapshot.empty) {
        console.error('❌ Admin user not found!');
        process.exit(1);
    }

    const adminDoc = querySnapshot.docs[0];
    console.log(`Found admin user with ID: ${adminDoc.id}`);

    // Update password
    await adminDoc.ref.update({
        password_hash: hash,
        updated_at: new Date().toISOString()
    });

    console.log('✅ Admin password reset successfully!');
    console.log(`\nYou can now login with:`);
    console.log(`Username: admin`);
    console.log(`Password: ${newPassword}`);

    process.exit(0);
}

resetAdminPassword().catch(console.error);
