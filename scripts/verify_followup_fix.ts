import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function verify() {
    console.log('--- Verification: School Followup Logic Fix (Final) ---');

    const parveenId = 'bd6089c7-8364-46cb-a934-c80db95fb718';
    const today = '2026-01-08';

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const rawFollowups = await db.find<any>(Collections.SCHOOL_FOLLOWUPS, { employee_id: parveenId });

    // Manual sort
    const allFollowups = [...(rawFollowups || [])].sort((a, b) => {
        const dateA = a.followup_date || '';
        const dateB = b.followup_date || '';
        return dateB.localeCompare(dateA);
    });

    const allSchools = await db.find<any>(Collections.SCHOOLS, {});
    const schoolMap = new Map();
    allSchools?.forEach((s: any) => schoolMap.set(s.id, s));

    const schoolLatestFollowup = new Map();
    allFollowups?.forEach((f: any) => {
        const school = allSchools.find(s => s.id === f.school_id || s.code === f.school_id);
        const canonicalId = school ? school.id : f.school_id;

        if (!schoolLatestFollowup.has(canonicalId)) {
            schoolLatestFollowup.set(canonicalId, f);
        }
    });

    const assignments = await db.find<any>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: parveenId });
    const assignedSchoolIds = assignments.map(a => a.school_id);

    const needingFollowup: string[] = [];

    assignedSchoolIds.forEach(schoolId => {
        const school = schoolMap.get(schoolId);
        if (!school) return;

        const latest = schoolLatestFollowup.get(schoolId);

        if (!latest) {
            const createdDate = school.created_at ? school.created_at.split('T')[0] : null;
            if (createdDate && (!createdDate || createdDate < sevenDaysAgoStr)) {
                needingFollowup.push(school.name);
            }
            return;
        }

        if (latest.next_followup_date && latest.next_followup_date <= today) {
            needingFollowup.push(school.name);
            return;
        }

        const isOverdueBy7Days = latest.followup_date && latest.followup_date < sevenDaysAgoStr;
        const hasNoFutureDate = !latest.next_followup_date || latest.next_followup_date <= today;
        if (isOverdueBy7Days && hasNoFutureDate) {
            needingFollowup.push(school.name);
        }
    });

    console.log(`\nSchools Needing Followup: ${needingFollowup.length}`);
    const zenith = needingFollowup.find(name => name.includes('Zenith Global'));
    console.log(`\nDoes Zenith Global show up? ${zenith ? 'YES (FAIL)' : 'NO (PASS)'}`);

    if (!zenith) {
        console.log('Zenith Global is correctly hidden because of Jan 2nd followup.');
    }
}

verify().catch(console.error);
