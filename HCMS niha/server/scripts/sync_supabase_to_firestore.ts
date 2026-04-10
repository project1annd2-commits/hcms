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

interface SupabaseConfig {
    endpoint: string;
    collection: string;
}

const COLLECTIONS_TO_SYNC: SupabaseConfig[] = [
    { endpoint: 'training_assignments', collection: 'training_assignments' },
    { endpoint: 'training_attendance', collection: 'training_attendance' },
    { endpoint: 'teachers', collection: 'teachers' },
    { endpoint: 'schools', collection: 'schools' },
    { endpoint: 'mentors', collection: 'mentors' },
    { endpoint: 'training_programs', collection: 'training_programs' },
    { endpoint: 'school_assignments', collection: 'school_assignments' },
    { endpoint: 'employee_tasks', collection: 'employee_tasks' },
    { endpoint: 'school_followups', collection: 'school_followups' },
    { endpoint: 'user_devices', collection: 'user_devices' },
];

async function fetchFromSupabase(endpoint: string, lastUpdate: string | null): Promise<any[]> {
    let url = `${SUPABASE_URL}/rest/v1/${endpoint}`;

    if (lastUpdate) {
        console.log(`    Fetching updates since ${lastUpdate}...`);
        url += `?updated_at=gt.${lastUpdate}`;
    } else {
        console.log(`    Fetching all records...`);
    }

    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

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

async function syncToFirestore() {
    console.log('=== SYNCING SUPABASE TO FIRESTORE ===\n');
    console.log(`Supabase URL: ${SUPABASE_URL}\n`);

    // Initialize Firebase Admin
    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    if (!fs.existsSync(serviceAccountPath)) {
        console.error(`❌ Service account file not found at: ${serviceAccountPath}`);
        return;
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();
    console.log('✅ Firebase Admin initialized\n');

    const results = {
        totalSynced: 0,
        totalErrors: 0
    };

    for (const config of COLLECTIONS_TO_SYNC) {
        console.log(`Syncing: ${config.collection}`);
        try {
            // 1. Check last update in Firestore
            let lastUpdate: string | null = null;
            try {
                const snapshot = await db.collection(config.collection)
                    .orderBy('updated_at', 'desc')
                    .limit(1)
                    .get();

                if (!snapshot.empty) {
                    const doc = snapshot.docs[0].data();
                    if (doc.updated_at) {
                        lastUpdate = doc.updated_at;
                        console.log(`    Last local update: ${lastUpdate}`);
                    }
                }
            } catch (error: any) {
                // Ignore index errors, just fetch all
                if (error.code !== 5 && !error.message.includes('requires an index')) {
                    console.warn(`    Warning checking last update: ${error.message}`);
                } else {
                    console.log(`    (Index missing, performing full sync)`);
                }
            }

            // 2. Fetch from Supabase
            const data = await fetchFromSupabase(config.endpoint, lastUpdate);
            console.log(`    Found ${data.length} new/updated records`);

            if (data.length === 0) {
                console.log(`    ✓ Up to date\n`);
                continue;
            }

            // 3. Transform and Upsert to Firestore
            const transformedRecords = data.map(transformData);
            let batch = db.batch();
            let batchCount = 0;
            let syncedCount = 0;

            for (const record of transformedRecords) {
                const docId = record.id || record._id; // Ensure we have an ID
                if (!docId) {
                    console.warn('    Skipping record without ID');
                    continue;
                }

                const docRef = db.collection(config.collection).doc(String(docId));
                batch.set(docRef, record, { merge: true });
                batchCount++;
                syncedCount++;

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

            console.log(`\n    ✓ Synced ${syncedCount} records\n`);
            results.totalSynced += syncedCount;

        } catch (error: any) {
            console.error(`    ✗ Error syncing ${config.collection}:`, error.message);
            results.totalErrors++;
        }
    }

    console.log('='.repeat(80));
    console.log('=== SYNC SUMMARY ===\n');
    console.log(`Total Records Synced: ${results.totalSynced}`);
    console.log(`Total Errors:         ${results.totalErrors}`);
    console.log('='.repeat(80));
}

syncToFirestore();
