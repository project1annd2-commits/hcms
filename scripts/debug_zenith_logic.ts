import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function verify() {
    console.log('--- Debugging Zenith Global Logic ---');

    const parveenId = 'bd6089c7-8364-46cb-a934-c80db95fb718';
    const today = '2026-01-08';
    const sevenDaysAgoStr = '2026-01-01';

    const allSchools = await db.find<any>(Collections.SCHOOLS, {});
    const zenith = allSchools.find(s => s.name?.includes('Zenith Global'));
    console.log(`Zenith: ID=${zenith.id}, Code=${zenith.code}`);

    const allFollowups = await db.find<any>(Collections.SCHOOL_FOLLOWUPS, { employee_id: parveenId }, { sort: { followup_date: -1 } });

    // Find followups for Zenith
    const zenithFollowups = allFollowups.filter(f => f.school_id === zenith.id || f.school_id === zenith.code);
    console.log(`\nZenith Followups found: ${zenithFollowups.length}`);
    zenithFollowups.forEach(f => console.log(`  - Date: ${f.followup_date}, school_id field: ${f.school_id}`));

    const latest = zenithFollowups[0];
    if (latest) {
        console.log(`\nLatest followup date: ${latest.followup_date}`);
        const isOverdueBy7Days = latest.followup_date && latest.followup_date < sevenDaysAgoStr;
        console.log(`Is overdue (>7 days)? "${latest.followup_date}" < "${sevenDaysAgoStr}" = ${isOverdueBy7Days}`);

        const hasNoFutureDate = !latest.next_followup_date || latest.next_followup_date <= today;
        console.log(`Has no future date? ${hasNoFutureDate}`);
    } else {
        console.log('\nNo followup found for Zenith Global.');
    }
}

verify().catch(console.error);
