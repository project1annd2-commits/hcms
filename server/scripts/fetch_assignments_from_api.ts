import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const SUPABASE_URL = 'https://ywuefjnalaizgwzpzgot.supabase.co';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dWVmam5hbGFpemd3enB6Z290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MTMzODIsImV4cCI6MjA3ODI4OTM4Mn0.FlVcKrEnGgUCkbfm99MnP7H2AFfWS49KtsMToLMdOC8';

async function fetchAndImportAssignments() {
    console.log('🚀 Fetching Training Assignments from Supabase API...\n');

    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();
    console.log('✅ Firebase Admin initialized');

    try {
        // 1. Fetch from Supabase
        const url = `${SUPABASE_URL}/rest/v1/training_assignments`;
        console.log(`\n📥 Fetching from: ${url}...`);

        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${SUPABASE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`\n❌ API Error: ${response.status} ${response.statusText}`);
            // const errorText = await response.text();
            // console.error(errorText.substring(0, 200));
            return;
        }

        const assignments = await response.json();
        console.log(`\n📦 Found ${assignments.length} assignments in Supabase`);

        if (assignments.length === 0) {
            console.log('⚠️ No assignments found in API.');
            return;
        }

        // 2. Transform Data
        const transformedAssignments = assignments.map((data: any) => {
            const transformed = { ...data };

            // Handle date fields
            const dateTimeFields = ['created_at', 'updated_at'];
            dateTimeFields.forEach(field => {
                if (transformed[field]) {
                    transformed[field] = new Date(transformed[field]).toISOString();
                }
            });

            const dateFields = ['assigned_date', 'due_date', 'completion_date'];
            dateFields.forEach(field => {
                if (transformed[field] && transformed[field] !== null) {
                    transformed[field] = new Date(transformed[field]).toISOString().split('T')[0];
                }
            });

            return transformed;
        });

        // 3. Clear existing assignments (optional, but good for clean state if we want exact match)
        // For now, let's just upsert (overwrite existing)

        console.log('\n💾 Importing to Firebase...');

        let batch = db.batch();
        let batchCount = 0;
        let imported = 0;

        for (const assignment of transformedAssignments) {
            const ref = db.collection('training_assignments').doc(assignment.id);
            batch.set(ref, assignment);
            batchCount++;
            imported++;

            if (batchCount >= 400) {
                await batch.commit();
                console.log(`   Imported ${imported}/${transformedAssignments.length}...`);
                batch = db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        console.log(`\n✅ Successfully imported ${imported} training assignments!`);

        // Verify count
        const finalCount = await db.collection('training_assignments').count().get();
        console.log(`\n📊 Total in Firebase: ${finalCount.data().count}`);

    } catch (error) {
        console.error('\n❌ Error:', error);
    }

    process.exit(0);
}

fetchAndImportAssignments().catch(console.error);
