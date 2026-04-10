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

async function fetchAllSchoolsFromSupabase(): Promise<any[]> {
    console.log('Fetching all schools from Supabase...');
    const url = `${SUPABASE_URL}/rest/v1/schools?select=id`; // Only fetch IDs for comparison

    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch schools: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function compareSchools() {
    console.log('=== COMPARING SCHOOL COUNTS ===\n');

    // 1. Get Supabase Schools
    const supabaseSchools = await fetchAllSchoolsFromSupabase();
    console.log(`Supabase Count: ${supabaseSchools.length}`);

    // 2. Get Firestore Schools
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();

    const snapshot = await db.collection('schools').get();
    console.log(`Firestore Count: ${snapshot.size}`);

    // 3. Compare
    const supabaseIds = new Set(supabaseSchools.map(s => s.id));
    const firestoreIds = new Set(snapshot.docs.map(d => d.id));

    const missingInFirestore = supabaseSchools.filter(s => !firestoreIds.has(s.id));
    const missingInSupabase = snapshot.docs.filter(d => !supabaseIds.has(d.id));

    console.log(`\nMissing in Firestore: ${missingInFirestore.length}`);
    console.log(`Missing in Supabase: ${missingInSupabase.length}`);

    if (missingInFirestore.length > 0) {
        console.log('\nFirst 5 missing IDs:');
        missingInFirestore.slice(0, 5).forEach(s => console.log(`- ${s.id}`));

        // Save missing IDs to file for next step
        const missingIds = missingInFirestore.map(s => s.id);
        fs.writeFileSync(path.join(__dirname, 'missing_school_ids.json'), JSON.stringify(missingIds, null, 2));
        console.log(`\nSaved ${missingIds.length} missing IDs to missing_school_ids.json`);
    }
}

compareSchools();
