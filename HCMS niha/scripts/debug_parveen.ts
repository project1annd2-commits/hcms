import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    console.log('--- Debugging Parveen Followups ---');

    // Find Parveen
    const users = await db.find<any>(Collections.USERS, {});
    const parveen = users.find((u: any) => u.full_name?.toLowerCase().includes('parveen'));

    if (!parveen) {
        console.log('Parveen not found!');
        return;
    }
    console.log('Parveen ID:', parveen.id, 'Name:', parveen.full_name);

    // Get her school assignments
    const schoolAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: parveen.id });
    console.log(`\nParveen has ${schoolAssignments.length} schools assigned.`);

    const schoolIds = schoolAssignments.map((sa: any) => sa.school_id);

    // Get all followups by Parveen
    const allFollowups = await db.find(Collections.SCHOOL_FOLLOWUPS, { employee_id: parveen.id });
    console.log(`Parveen has ${allFollowups.length} total followup records.`);

    // Map latest followup per school
    const latestFollowupMap = new Map<string, any>();
    allFollowups.forEach((f: any) => {
        if (!latestFollowupMap.has(f.school_id) || f.followup_date > latestFollowupMap.get(f.school_id).followup_date) {
            latestFollowupMap.set(f.school_id, f);
        }
    });

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    console.log(`\nToday: ${today}, 7 days ago: ${sevenDaysAgoStr}`);
    console.log('\n--- Schools Analysis ---');

    let needsFollowupCount = 0;

    for (const schoolId of schoolIds) {
        const latest = latestFollowupMap.get(schoolId);

        let reason = '';
        let needsFollowup = false;

        if (!latest) {
            needsFollowup = true;
            reason = 'No followup ever recorded';
        } else if (latest.next_followup_date && latest.next_followup_date <= today) {
            needsFollowup = true;
            reason = `next_followup_date (${latest.next_followup_date}) has passed`;
        } else {
            const isOverdueBy7Days = latest.followup_date && latest.followup_date < sevenDaysAgoStr;
            const hasNoFutureDate = !latest.next_followup_date || latest.next_followup_date <= today;
            if (isOverdueBy7Days && hasNoFutureDate) {
                needsFollowup = true;
                reason = `Last followup (${latest.followup_date}) > 7 days ago, no future date set`;
            }
        }

        if (needsFollowup) {
            needsFollowupCount++;
            console.log(`School ${schoolId}: NEEDS FOLLOWUP - ${reason}`);
        }
    }

    console.log(`\n=== Total schools needing followup: ${needsFollowupCount} ===`);
}

debug().catch(console.error);
