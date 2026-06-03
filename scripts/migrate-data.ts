/**
 * Data Migration Script: Supabase to MongoDB
 * 
 * This script exports data from Supabase and imports it into MongoDB
 * Run with: npx ts-node scripts/migrate-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { mongodb, Collections } from '../src/lib/mongodb';

// Supabase configuration - you'll need to provide these
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Table/Collection mapping
const tablesToMigrate = [
    { supabaseTable: 'users', mongoCollection: Collections.USERS },
    { supabaseTable: 'permissions', mongoCollection: Collections.PERMISSIONS },
    { supabaseTable: 'schools', mongoCollection: Collections.SCHOOLS },
    { supabaseTable: 'teachers', mongoCollection: Collections.TEACHERS },
    { supabaseTable: 'mentors', mongoCollection: Collections.MENTORS },
    { supabaseTable: 'mentor_schools', mongoCollection: Collections.MENTOR_SCHOOLS },
    { supabaseTable: 'admin_personnel', mongoCollection: Collections.ADMIN_PERSONNEL },
    { supabaseTable: 'training_programs', mongoCollection: Collections.TRAINING_PROGRAMS },
    { supabaseTable: 'training_assignments', mongoCollection: Collections.TRAINING_ASSIGNMENTS },
    { supabaseTable: 'training_attendance', mongoCollection: Collections.TRAINING_ATTENDANCE },
    { supabaseTable: 'employee_tasks', mongoCollection: Collections.EMPLOYEE_TASKS },
    { supabaseTable: 'school_followups', mongoCollection: Collections.SCHOOL_FOLLOWUPS },
    { supabaseTable: 'school_assignments', mongoCollection: Collections.SCHOOL_ASSIGNMENTS },
    { supabaseTable: 'user_devices', mongoCollection: Collections.USER_DEVICES },
];

async function exportFromSupabase(tableName: string): Promise<any[]> {
    console.log(`Exporting data from Supabase table: ${tableName}...`);

    const { data, error } = await supabase
        .from(tableName)
        .select('*');

    if (error) {
        console.error(`Error exporting ${tableName}:`, error);
        return [];
    }

    console.log(`Exported ${data?.length || 0} records from ${tableName}`);
    return data || [];
}

async function importToMongoDB(collectionName: string, data: any[]): Promise<void> {
    if (data.length === 0) {
        console.log(`No data to import to ${collectionName}`);
        return;
    }

    console.log(`Importing ${data.length} records to MongoDB collection: ${collectionName}...`);

    try {
        const collection = mongodb.getCollection(collectionName);

        // Transform data: rename 'id' to '_id' if needed
        const transformedData = data.map(doc => {
            const { id, ...rest } = doc;
            return {
                ...rest,
                // Store original Supabase ID for reference
                supabase_id: id,
                created_at: rest.created_at || new Date().toISOString(),
                updated_at: rest.updated_at || new Date().toISOString(),
            };
        });

        await collection.insertMany(transformedData);
        console.log(`Successfully imported ${data.length} records to ${collectionName}`);
    } catch (error) {
        console.error(`Error importing to ${collectionName}:`, error);
        throw error;
    }
}

async function migrateTable(supabaseTable: string, mongoCollection: string): Promise<void> {
    console.log(`\n=== Migrating ${supabaseTable} to ${mongoCollection} ===`);

    try {
        // Export from Supabase
        const data = await exportFromSupabase(supabaseTable);

        // Import to MongoDB
        await importToMongoDB(mongoCollection, data);

        console.log(`✓ Migration complete for ${supabaseTable}`);
    } catch (error) {
        console.error(`✗ Migration failed for ${supabaseTable}:`, error);
    }
}

async function main() {
    console.log('Starting data migration from Supabase to MongoDB...\n');

    try {
        // Connect to MongoDB
        await mongodb.connect();
        console.log('Connected to MongoDB successfully\n');

        // Migrate each table
        for (const table of tablesToMigrate) {
            await migrateTable(table.supabaseTable, table.mongoCollection);
        }

        console.log('\n=== Data Migration Complete ===');
        console.log('Please verify the data in MongoDB before removing Supabase.');

    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await mongodb.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

// Run migration
if (require.main === module) {
    main().catch(console.error);
}

export { main as migrateData };
