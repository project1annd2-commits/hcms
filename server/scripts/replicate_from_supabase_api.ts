import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';

// Supabase Configuration
// Project ID: ywuefjnalaizgwzpzgot
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ywuefjnalaizgwzpzgot.supabase.co';
const SUPABASE_API_KEY = 'hcms_4HksSlj8xILFJaSaDpAR96206T99ZnmVe60hovjYmEvh6ucu';

interface SupabaseConfig {
    endpoint: string;
    collection: string;
}

const COLLECTIONS_TO_SYNC: SupabaseConfig[] = [
    { endpoint: 'training_assignments', collection: Collections.TRAINING_ASSIGNMENTS },
    { endpoint: 'training_attendance', collection: Collections.TRAINING_ATTENDANCE },
    { endpoint: 'teachers', collection: Collections.TEACHERS },
    { endpoint: 'schools', collection: Collections.SCHOOLS },
    { endpoint: 'mentors', collection: Collections.MENTORS },
    { endpoint: 'training_programs', collection: Collections.TRAINING_PROGRAMS },
    { endpoint: 'school_assignments', collection: Collections.SCHOOL_ASSIGNMENTS },
    { endpoint: 'employee_tasks', collection: Collections.EMPLOYEE_TASKS },
    { endpoint: 'school_followups', collection: Collections.SCHOOL_FOLLOWUPS },
    { endpoint: 'user_devices', collection: Collections.USER_DEVICES },
];

async function fetchFromSupabase(endpoint: string): Promise<any[]> {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;

    console.log(`  Fetching from: ${endpoint}...`);

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

async function replicateCollection(config: SupabaseConfig): Promise<{ synced: number, skipped: number, errors: number }> {
    try {
        // Fetch from Supabase
        const supabaseData = await fetchFromSupabase(config.endpoint);
        console.log(`    Found ${supabaseData.length} records in Supabase`);

        // Get existing data from MongoDB
        const existingData = await mongodb.getCollection(config.collection).find({}).toArray();
        const existingIds = new Set(existingData.map((item: any) => item.id));
        console.log(`    Found ${existingData.length} existing records in MongoDB`);

        // Find missing records
        const missingRecords = supabaseData.filter(item => !existingIds.has(item.id));
        console.log(`    Missing ${missingRecords.length} records`);

        if (missingRecords.length === 0) {
            console.log(`    ✓ Collection ${config.collection} is up to date!\n`);
            return { synced: 0, skipped: supabaseData.length, errors: 0 };
        }

        // Transform and insert missing records
        const transformedRecords = missingRecords.map(transformData);

        let synced = 0;
        let errors = 0;
        const batchSize = 50;

        for (let i = 0; i < transformedRecords.length; i += batchSize) {
            const batch = transformedRecords.slice(i, i + batchSize);
            try {
                await mongodb.getCollection(config.collection).insertMany(batch);
                synced += batch.length;
                console.log(`    Synced batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transformedRecords.length / batchSize)}`);
            } catch (error: any) {
                console.error(`    Error inserting batch:`, error.message);
                errors += batch.length;
            }
        }

        console.log(`    ✓ Synced ${synced} new records\n`);
        return { synced, skipped: supabaseData.length - missingRecords.length, errors };

    } catch (error: any) {
        console.error(`    ✗ Error syncing ${config.collection}:`, error.message);
        return { synced: 0, skipped: 0, errors: 1 };
    }
}

async function replicateAllData() {
    try {
        if (SUPABASE_URL.includes('YOUR-PROJECT-ID')) {
            console.error('\n❌ ERROR: Please update the SUPABASE_URL in the script with your actual Supabase project URL!\n');
            console.log('Your Supabase URL should look like: https://xxxxx.supabase.co\n');
            return;
        }

        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');
        console.log('=== REPLICATING DATA FROM SUPABASE API ===\n');
        console.log(`Supabase URL: ${SUPABASE_URL}\n`);

        const results = {
            totalSynced: 0,
            totalSkipped: 0,
            totalErrors: 0
        };

        for (const config of COLLECTIONS_TO_SYNC) {
            console.log(`Syncing: ${config.collection}`);
            const result = await replicateCollection(config);
            results.totalSynced += result.synced;
            results.totalSkipped += result.skipped;
            results.totalErrors += result.errors;
        }

        console.log('='.repeat(80));
        console.log('=== REPLICATION SUMMARY ===\n');
        console.log(`Total Records Synced:   ${results.totalSynced}`);
        console.log(`Total Records Skipped:  ${results.totalSkipped} (already exist)`);
        console.log(`Total Errors:           ${results.totalErrors}`);
        console.log('='.repeat(80));

        if (results.totalErrors === 0) {
            console.log('\n✅ Replication completed successfully!\n');
        } else {
            console.log('\n⚠ Replication completed with errors. Check logs above.\n');
        }

    } catch (error: any) {
        console.error('✗ Fatal error during replication:', error.message);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

replicateAllData();
