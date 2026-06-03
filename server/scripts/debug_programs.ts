import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';
import { mongodb } from '../src/config/mongodb';
import { TrainingProgram } from '../src/models';

async function main() {
    await mongodb.connect();
    console.log('--- Debugging Training Programs ---');

    // 1. Fetch All
    const allPrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});
    console.log(`Total programs found: ${allPrograms.length}`);
    allPrograms.forEach(p => {
        console.log(`- ${p.title} (Status: "${p.status}") ID: ${p.id}`);
    });

    // 2. Fetch with Filter
    const activePrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, { status: 'active' });
    console.log(`Active programs found (DB Filter): ${activePrograms.length}`);

}

main().catch(console.error);
