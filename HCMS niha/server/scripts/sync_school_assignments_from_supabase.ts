import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Supabase Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ywuefjnalaizgwzpzgot.supabase.co';
const SUPABASE_API_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dWVmam5hbGFpemd3enB6Z290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MTMzODIsImV4cCI6MjA3ODI4OTM4Mn0.FlVcKrEnGgUCkbfm99MnP7H2AFfWS49KtsMToLMdOC8';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function transformData(data: any): any {
    const transformed = { ...data };

    const dateTimeFields = ['created_at', 'updated_at'];
    dateTimeFields.forEach(field => {
        if (transformed[field]) {
            transformed[field] = new Date(transformed[field]).toISOString();
        }
    });

    const dateFields = ['assigned_date'];
    dateFields.forEach(field => {
        if (transformed[field] && transformed[field] !== null) {
            transformed[field] = new Date(transformed[field]).toISOString().split('T')[0];
        }
    });

    return transformed;
}

async function syncSchoolAssignments() {
    console.log('=== SYNCING SCHOOL ASSIGNMENTS FROM SUPABASE ===\n');

    // Fetch from Supabase
    console.log('Fetching from Supabase...');
    const url = `${SUPABASE_URL}/rest/v1/school_assignments`;

    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const supabaseAssignments = await response.json();
    console.log(`Supabase Count: ${supabaseAssignments.length}`);

    // Initialize Firebase
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();

    // Get current Firestore data
    const snapshot = await db.collection('school_assignments').get();
    console.log(`Firestore Count: ${snapshot.size}`);

    // Clear existing and replace with Supabase data
    console.log('\nClearing existing Firestore data...');
    const deleteBatch = db.batch();
    snapshot.docs.forEach(doc => {
        deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    console.log('Cleared.');

    // Insert Supabase data
    console.log('Inserting Supabase data...');
    const transformedAssignments = supabaseAssignments.map(transformData);

    let batch = db.batch();
    let batchCount = 0;
    let insertedCount = 0;

    for (const assignment of transformedAssignments) {
        const docRef = db.collection('school_assignments').doc(assignment.id);
        batch.set(docRef, assignment);
        batchCount++;
        insertedCount++;

        if (batchCount >= 400) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
            process.stdout.write('.');
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    console.log(`\n\n✅ Successfully synced ${insertedCount} school assignments from Supabase!`);

    // Verify
    const finalSnapshot = await db.collection('school_assignments').get();
    console.log(`\nFinal Firestore Count: ${finalSnapshot.size}`);
}

syncSchoolAssignments().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
