import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';

async function checkTrainingProgram() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Check training programs
        const programs = await db.find('training_programs', {});
        console.log('\n=== Training Programs ===');
        console.log(programs);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

checkTrainingProgram();