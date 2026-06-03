import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    const assignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, {}, { limit: 1 });
    console.log('Assignment Sample:', JSON.stringify(assignments[0], null, 2));
}

debug().catch(console.error);
