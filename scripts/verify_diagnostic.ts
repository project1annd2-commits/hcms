import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function verify() {
    const parveenId = 'bd6089c7-8364-46cb-a934-c80db95fb718';
    const today = '2026-01-08';
    const sevenDaysAgoStr = '2026-01-01';

    const assignments = await db.find<any>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: parveenId });
    const allFollowups = await db.find<any>(Collections.SCHOOL_FOLLOWUPS, { employee_id: parveenId }, { sort: { followup_date: -1 } });
    const allSchools = await db.find<any>(Collections.SCHOOLS, {});

    console.log(`Assignments: ${assignments.length}, Followups: ${allFollowups.length}, Schools: ${allSchools.length}`);

    const schoolLatestFollowup = new Map();
    allFollowups?.forEach((f: any) => {
        const school = allSchools.find(s => s.id === f.school_id || s.code === f.school_id);
        const canonicalId = school ? school.id : f.school_id;

        if (!schoolLatestFollowup.has(canonicalId)) {
            schoolLatestFollowup.set(canonicalId, f);
        }
    });

    const zenith = allSchools.find(s => s.name?.includes('Zenith Global'));
    console.log(`\n--- Zenith Check ---`);
    console.log(`ID: ${zenith.id}, Code: ${zenith.code}`);

    const assignedIds = assignments.map(a => a.school_id);
    console.log(`Is Zenith ID assigned to Parveen? ${assignedIds.includes(zenith.id)}`);

    const latest = schoolLatestFollowup.get(zenith.id);
    if (latest) {
        console.log(`Latest Followup for Zenith: Date=${latest.followup_date}, ID=${latest.id}, Field=${latest.school_id}`);
        const isOverdueBy7Days = latest.followup_date && latest.followup_date < sevenDaysAgoStr;
        console.log(`"2026-01-02" < "2026-01-01" ? ${isOverdueBy7Days}`);

        if (isOverdueBy7Days) console.log('>> REASON: OVERDUE BY 7 DAYS');
    } else {
        console.log('No followup found for Zenith');
    }
}

verify().catch(console.error);
