import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://curriculumhauna_db_user:KISSwGBN1KlSrV71@159.41.225.248:27017/hcms_db?authSource=admin&directConnection=true';
const dbName = process.env.MONGODB_DB_NAME || 'hcms_db';

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

async function checkLastUpdates() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(dbName);

        for (const collectionName of COLLECTIONS) {
            const collection = db.collection(collectionName);

            // Find the document with the most recent updated_at or created_at
            const latestUpdate = await collection.find({})
                .sort({ updated_at: -1 })
                .limit(1)
                .toArray();

            let lastDate = null;
            if (latestUpdate.length > 0 && latestUpdate[0].updated_at) {
                lastDate = latestUpdate[0].updated_at;
            } else {
                // Fallback to created_at if updated_at is missing
                const latestCreate = await collection.find({})
                    .sort({ created_at: -1 })
                    .limit(1)
                    .toArray();

                if (latestCreate.length > 0 && latestCreate[0].created_at) {
                    lastDate = latestCreate[0].created_at;
                }
            }

            console.log(`Collection: ${collectionName.padEnd(25)} Last Update: ${lastDate || 'Never'}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkLastUpdates();
