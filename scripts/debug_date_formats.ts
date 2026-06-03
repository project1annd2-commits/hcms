import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    const parveenId = 'bd6089c7-8364-46cb-a934-c80db95fb718';
    const followups = await db.find<any>(Collections.SCHOOL_FOLLOWUPS, { employee_id: parveenId });

    console.log(`Parveen has ${followups.length} followups.`);

    // Print unique date formats or samples
    const samples = followups.map(f => f.followup_date).filter((v, i, a) => a.indexOf(v) === i);
    console.log('\nUnique Date Strings Found:', samples.slice(0, 20));
}

debug().catch(console.error);
