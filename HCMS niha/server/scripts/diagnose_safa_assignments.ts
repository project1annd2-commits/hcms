import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function diagnoseSafa() {
    console.log('🔍 Diagnosing Safa Assignments...\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        // 1. Find Safa
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

        console.log(`User: ${user.data().username} (${user.id})`);
        console.log(`Role: ${user.data().role}`);

        // 2. Get Assignments
        const assignmentsSnapshot = await db.collection('school_assignments').where('employee_id', '==', user.id).get();
        console.log(`Assignments Found: ${assignmentsSnapshot.size}`);

        if (assignmentsSnapshot.empty) {
            console.log('❌ No assignments found.');
        } else {
            for (const doc of assignmentsSnapshot.docs) {
                const schoolId = doc.data().school_id;
                const schoolDoc = await db.collection('schools').doc(schoolId).get(); // Assuming ID is doc ID
                // Or query if ID is a field
                const schoolQuery = await db.collection('schools').where('id', '==', schoolId).get();

                let exists = schoolDoc.exists;
                let name = schoolDoc.exists ? schoolDoc.data()?.name : 'Unknown';

                if (!exists && !schoolQuery.empty) {
                    exists = true;
                    name = schoolQuery.docs[0].data().name;
                    console.log(`  - School ID ${schoolId} found via query (not doc ID).`);
                } else if (exists) {
                    console.log(`  - School ID ${schoolId} found via doc ID.`);
                } else {
                    console.log(`  - ❌ School ID ${schoolId} NOT FOUND in schools collection.`);
                }

                console.log(`    Name: ${name}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

diagnoseSafa().catch(console.error);
