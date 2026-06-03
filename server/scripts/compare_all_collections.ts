import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Supabase Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ywuefjnalaizgwzpzgot.supabase.co';
const SUPABASE_API_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dWVmam5hbGFpemd3enB6Z290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MTMzODIsImV4cCI6MjA3ODI4OTM4Mn0.FlVcKrEnGgUCkbfm99MnP7H2AFfWS49KtsMToLMdOC8';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLLECTIONS = [
    'training_assignments',
    'training_attendance',
    'teachers',
    'schools',
    'mentors',
    'training_programs',
    'school_assignments',
    'employee_tasks',
    'school_followups',
    'user_devices'
];

async function fetchCollectionFromSupabase(collection: string): Promise<any[]> {
    const url = `${SUPABASE_URL}/rest/v1/${collection}?select=id`;

    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${collection}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function compareAllCollections() {
    console.log('=== COMPARING ALL COLLECTIONS ===\n');

    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();

    const allMissingIds: { [key: string]: string[] } = {};
    let totalMissing = 0;

    for (const collection of COLLECTIONS) {
        console.log(`\nChecking: ${collection}`);

        try {
            // Get Supabase data
            const supabaseData = await fetchCollectionFromSupabase(collection);
            console.log(`  Supabase: ${supabaseData.length}`);

            // Get Firestore data
            const snapshot = await db.collection(collection).get();
            console.log(`  Firestore: ${snapshot.size}`);

            // Compare
            const supabaseIds = new Set(supabaseData.map(item => item.id));
            const firestoreIds = new Set(snapshot.docs.map(d => d.id));

            const missingInFirestore = supabaseData.filter(item => !firestoreIds.has(item.id));

            if (missingInFirestore.length > 0) {
                console.log(`  ⚠️  Missing: ${missingInFirestore.length}`);
                allMissingIds[collection] = missingInFirestore.map(item => item.id);
                totalMissing += missingInFirestore.length;
            } else {
                console.log(`  ✓  In sync`);
            }

        } catch (error: any) {
            console.error(`  ✗  Error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('=== SUMMARY ===\n');
    console.log(`Total Missing Records: ${totalMissing}`);

    if (totalMissing > 0) {
        console.log('\nCollections with missing records:');
        Object.entries(allMissingIds).forEach(([collection, ids]) => {
            console.log(`  - ${collection}: ${ids.length} missing`);
        });

        // Save to file
        const outputPath = path.join(__dirname, 'all_missing_ids.json');
        fs.writeFileSync(outputPath, JSON.stringify(allMissingIds, null, 2));
        console.log(`\nSaved missing IDs to: all_missing_ids.json`);
    }

    console.log('='.repeat(80));
}

compareAllCollections();
