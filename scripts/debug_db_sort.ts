import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    const parveenId = 'bd6089c7-8364-46cb-a934-c80db95fb718';

    console.log('--- Testing Database Sort ---');
    const allFollowups = await db.find<any>(Collections.SCHOOL_FOLLOWUPS, {
        employee_id: parveenId
    }, { sort: { followup_date: -1 } });

    console.log(`Total: ${allFollowups.length}`);
    console.log('Top 5 dates:');
    allFollowups.slice(0, 5).forEach(f => console.log(`  - ${f.followup_date}`));

    // Zenith Check
    const zenithId = '5fe96229-4841-4867-bec1-b3ece08e72fa';
    const zenithCode = 'UP049';
    const zenithF = allFollowups.filter(f => f.school_id === zenithId || f.school_id === zenithCode);
    console.log('\nZenith Followups in sorted list:');
    zenithF.forEach(f => console.log(`  - Date: ${f.followup_date}, Field: "${f.school_id}"`));
}

debug().catch(console.error);
