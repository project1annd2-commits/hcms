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

function transformData(data: any): any {
    const transformed = { ...data };

    // Date fields that should be ISO strings
    const dateTimeFields = ['created_at', 'updated_at', 'first_login', 'last_login'];
    dateTimeFields.forEach(field => {
        if (transformed[field]) {
            transformed[field] = new Date(transformed[field]).toISOString();
        }
    });

    // Date fields that should be date-only (YYYY-MM-DD)
    const dateFields = [
        'assigned_date', 'due_date', 'completion_date', 'attendance_date',
        'start_date', 'end_date', 'hire_date', 'followup_date', 'next_followup_date'
    ];
    dateFields.forEach(field => {
        if (transformed[field] && transformed[field] !== null) {
            transformed[field] = new Date(transformed[field]).toISOString().split('T')[0];
        }
    });

    return transformed;
}

async function forceSyncSchools() {
    console.log('=== FORCE SYNC MISSING SCHOOLS ===\n');

    const missingIdsPath = path.join(__dirname, 'missing_school_ids.json');
    if (!fs.existsSync(missingIdsPath)) {
        console.error('❌ missing_school_ids.json not found. Run compare_schools.ts first.');
        return;
    }

    const missingIds: string[] = JSON.parse(fs.readFileSync(missingIdsPath, 'utf8'));
    console.log(`Found ${missingIds.length} missing IDs to sync.`);

    if (missingIds.length === 0) {
        console.log('Nothing to sync.');
        return;
    }

    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();
    console.log('✅ Firebase Admin initialized\n');

    let syncedCount = 0;
    let errorCount = 0;

    for (const id of missingIds) {
        const url = `${SUPABASE_URL}/rest/v1/schools?id=eq.${id}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_API_KEY,
                    'Authorization': `Bearer ${SUPABASE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch school ${id}: ${response.status} ${response.statusText}`);
            }

            const schools = await response.json();
            if (schools.length === 0) {
                console.warn(`    ⚠️ School ${id} not found in Supabase`);
                continue;
            }

            const school = schools[0];
            console.log(`    Fetched school: ${school.name || school.id}`);

            // Upsert to Firestore
            const transformedSchool = transformData(school);
            await db.collection('schools').doc(school.id).set(transformedSchool, { merge: true });

            syncedCount++;

        } catch (error: any) {
            console.error(`    ✗ Error processing school ${id}:`, error.message);
            errorCount++;
        }
    }

    console.log('='.repeat(80));
    console.log('=== SYNC SUMMARY ===\n');
    console.log(`Total Synced: ${syncedCount}`);
    console.log(`Total Errors: ${errorCount}`);
    console.log('='.repeat(80));
}

forceSyncSchools();
