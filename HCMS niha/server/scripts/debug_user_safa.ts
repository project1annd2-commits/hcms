import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugUserSafa() {
    console.log('🔍 Debugging User "safa"...\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        // 1. Find the user
        const usersSnapshot = await db.collection('users').get();
        const user = usersSnapshot.docs.find(d => {
            const data = d.data();
            const fullName = ((data.first_name || '') + ' ' + (data.last_name || '')).toLowerCase();
            const username = (data.username || '').toLowerCase();
            return fullName.includes('safa') || username.includes('safa');
        });

        if (!user) {
            console.log('❌ User "safa" not found.');
            process.exit(1);
        }

        const userId = user.id;
        console.log(`✅ Found user: ${user.data().username} (${userId})`);
        console.log(`   Name: ${user.data().first_name} ${user.data().last_name}`);
        console.log(`   Role: ${user.data().role}`);

        // 2. Check Permissions
        const permissionsSnapshot = await db.collection('permissions').where('user_id', '==', userId).get();
        if (permissionsSnapshot.empty) {
            console.log('⚠️ No permissions document found for this user.');
        } else {
            console.log('Permissions:', JSON.stringify(permissionsSnapshot.docs[0].data(), null, 2));
        }

        // 3. Check School Assignments
        const assignmentsSnapshot = await db.collection('school_assignments').where('employee_id', '==', userId).get();
        console.log(`\nSchool Assignments: ${assignmentsSnapshot.size}`);

        if (assignmentsSnapshot.empty) {
            console.log('❌ User has NO school assignments. This is why the dashboard is empty.');
        } else {
            assignmentsSnapshot.docs.forEach(doc => {
                console.log(`- Assignment ID: ${doc.id}, School ID: ${doc.data().school_id}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

debugUserSafa().catch(console.error);
