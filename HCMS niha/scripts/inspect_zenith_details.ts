import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    console.log('--- Inspecting Zenith Global Followups (Complete) ---');

    const zenithId = '5fe96229-4841-4867-bec1-b3ece08e72fa';
    const allFollowups = await db.find<any>(Collections.SCHOOL_FOLLOWUPS, {});

    // Filter by name or ID manually to be safe
    const zenithSchools = (await db.find<any>(Collections.SCHOOLS, {})).filter(s => s.name?.includes('Zenith Global'));
    const zenithIds = zenithSchools.map(s => s.id);
    const zenithCodes = zenithSchools.map(s => s.code);

    const relatedFollowups = allFollowups.filter(f =>
        zenithIds.includes(f.school_id) ||
        zenithCodes.includes(f.school_id) ||
        f.school_name?.includes('Zenith Global')
    );

    console.log(`Related Followups: ${relatedFollowups.length}`);
    relatedFollowups.sort((a, b) => b.followup_date?.localeCompare(a.followup_date)).forEach((f, i) => {
        console.log(`\nFollowup #${i + 1}:`);
        console.log(`  ID: ${f.id}`);
        console.log(`  Date: ${f.followup_date}`);
        console.log(`  SchoolID Field: "${f.school_id}"`);
        console.log(`  EmployeeID: ${f.employee_id}`);
        console.log(`  SchoolName: ${f.school_name}`);
    });
}

debug().catch(console.error);
