import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function grantFullPermissions() {
    console.log('👑 Granting Full Permissions to Admin...\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        // 1. Find the admin user
        const usersSnapshot = await db.collection('users').where('username', '==', 'admin').get();

        if (usersSnapshot.empty) {
            console.log('❌ User "admin" not found.');
            // Try to list all users to help debug
            const allUsers = await db.collection('users').limit(5).get();
            console.log('Available users:', allUsers.docs.map(d => d.data().username).join(', '));
            process.exit(1);
        }

        const adminUser = usersSnapshot.docs[0];
        const adminId = adminUser.id;
        console.log(`✅ Found admin user: ${adminUser.data().username} (${adminId})`);

        // 2. Find or Create Permissions
        const permissionsSnapshot = await db.collection('permissions').where('user_id', '==', adminId).get();

        let permissionRef;
        if (permissionsSnapshot.empty) {
            console.log('⚠️ No permissions document found. Creating one...');
            permissionRef = db.collection('permissions').doc();
        } else {
            permissionRef = permissionsSnapshot.docs[0].ref;
            console.log('✅ Found existing permissions document.');
        }

        // 3. Update Permissions
        const fullPermissions = {
            user_id: adminId,
            can_delete_schools: true,
            can_manage_users: true,
            can_assign_training: true,
            can_view_reports: true,
            can_manage_schools: true,
            can_manage_teachers: true,
            can_manage_mentors: true,
            can_manage_admin_personnel: true,
            can_manage_training_programs: true,
            updated_at: new Date().toISOString()
        };

        await permissionRef.set(fullPermissions, { merge: true });
        console.log('\n✅ Successfully granted FULL permissions to admin!');

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

grantFullPermissions().catch(console.error);
