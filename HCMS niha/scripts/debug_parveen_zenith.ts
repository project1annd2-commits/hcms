import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    const parveenId = 'bd6089c7-8364-46cb-a934-c80db95fb718';
    const zenithId = '5fe96229-4841-4867-bec1-b3ece08e72fa';
    const zenithCode = 'UP049';

    const followups = await db.find<any>(Collections.SCHOOL_FOLLOWUPS, {});
    const pFollowups = followups.filter(f => f.employee_id === parveenId);

    console.log(`Parveen has ${pFollowups.length} total followups.`);

    const zenithPFollowups = pFollowups.filter(f => f.school_id === zenithId || f.school_id === zenithCode);
    console.log(`Parveen Zenith Followups: ${zenithPFollowups.length}`);
    zenithPFollowups.sort((a, b) => b.followup_date?.localeCompare(a.followup_date)).forEach(f => {
        console.log(`- Date: ${f.followup_date}, Field: "${f.school_id}"`);
    });
}

debug().catch(console.error);
