import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';
import { db } from '../src/services/db';

async function testCollections() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Test if collections exist and count documents
        const collectionsToTest = [
            'schools',
            'teachers',
            'mentors',
            'mentor_schools',
            'training_programs',
            'training_assignments',
            'training_attendance',
            'employee_tasks',
            'school_followups',
            'school_assignments',
            'user_devices'
        ];

        for (const collectionName of collectionsToTest) {
            try {
                const count = await db.count(collectionName, {});
                console.log(`${collectionName}: ${count} documents`);
            } catch (error) {
                console.error(`Error counting ${collectionName}:`, error);
            }
        }

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    } finally {
        await mongodb.disconnect();
    }
}

testCollections();