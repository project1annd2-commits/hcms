import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createAdminUser() {
    console.log('🔐 Creating/Ensuring admin user exists...');

    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    // Admin credentials
    const adminUsername = 'admin';
    const adminPassword = 'admin123';
    const hash = crypto.createHash('sha256').update(adminPassword).digest('hex');

    console.log(`Username: ${adminUsername}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Password hash: ${hash}`);

    // Check if admin user exists
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('username', '==', adminUsername).get();

    if (!querySnapshot.empty) {
        const adminDoc = querySnapshot.docs[0];
        console.log(`✅ Admin user already exists with ID: ${adminDoc.id}`);

        // Update password to make sure it matches
        await adminDoc.ref.update({
            password_hash: hash,
            updated_at: new Date().toISOString()
        });
        console.log('✅ Admin password updated!');
    } else {
        console.log('❌ Admin user not found. Creating new admin user...');

        // Create new admin user
        const newAdmin = {
            username: adminUsername,
            full_name: 'System Administrator',
            email: 'admin@example.com',
            password_hash: hash,
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const docRef = await usersRef.add(newAdmin);
        console.log(`✅ Admin user created with ID: ${docRef.id}`);

        // Create permissions for admin
        const permissionsRef = db.collection('permissions');
        const newPermissions = {
            user_id: docRef.id,
            can_delete_schools: true,
            can_manage_users: true,
            can_assign_training: true,
            can_view_reports: true,
            can_manage_schools: true,
            can_manage_teachers: true,
            can_manage_mentors: true,
            can_manage_admin_personnel: true,
            can_manage_training_programs: true
        };

        await permissionsRef.add(newPermissions);
        console.log('✅ Admin permissions created!');
    }

    console.log(`\n✅ You can now login with:`);
    console.log(`Username: ${adminUsername}`);
    console.log(`Password: ${adminPassword}`);

    process.exit(0);
}

createAdminUser().catch(console.error);
