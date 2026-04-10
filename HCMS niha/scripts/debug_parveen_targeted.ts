import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    console.log('--- Targeted Debug: Parveen vs Specific Schools ---');

    // Find Parveen
    const users = await db.find<any>(Collections.USERS, {});
    const parveen = users.find((u: any) => u.full_name?.toLowerCase().includes('parveen'));

    if (!parveen) {
        console.log('Parveen not found!');
        return;
    }
    console.log('Parveen ID:', parveen.id, 'Name:', parveen.full_name);

    // Specific schools from screenshot
    const targetNames = [
        "Zenith Global",
        "Crescent Scholar",
        "MI Creative (sultanpur)",
        "Rida International (Rayeel)",
        "British Arabic International"
    ];

    const allSchools = await db.find<any>(Collections.SCHOOLS, {});
    const targetSchools = allSchools.filter(s => targetNames.some(name => s.name?.includes(name)));

    console.log(`\nFound ${targetSchools.length} target schools.`);

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    for (const school of targetSchools) {
        console.log(`\nAnalyzing: ${school.name} (${school.id})`);

        // Check assignment
        const assignment = await db.findOne<any>(Collections.SCHOOL_ASSIGNMENTS, {
            school_id: school.id,
            employee_id: parveen.id
        });
        console.log(`Is assigned to Parveen? ${assignment ? 'YES' : 'NO'}`);

        // Check followups
        const followups = await db.find<any>(Collections.SCHOOL_FOLLOWUPS, {
            school_id: school.id,
            employee_id: parveen.id
        }, { sort: { followup_date: -1 } });

        console.log(`Total followups by Parveen for this school: ${followups.length}`);
        if (followups.length > 0) {
            const latest = followups[0];
            console.log(`Latest followup: date=${latest.followup_date}, next=${latest.next_followup_date}`);

            const isOverdueBy7Days = latest.followup_date && latest.followup_date < sevenDaysAgoStr;
            const hasNoFutureDate = !latest.next_followup_date || latest.next_followup_date <= today;
            console.log(`Overdue (>7 days)? ${isOverdueBy7Days}`);
            console.log(`Has no future date? ${hasNoFutureDate}`);

            if (isOverdueBy7Days && hasNoFutureDate) {
                console.log('>> RESULT: SHOULD SHOW IN DASHBOARD');
            } else {
                console.log('>> RESULT: SHOULD NOT SHOW');
            }
        } else {
            console.log('>> RESULT: SHOULD SHOW (No followup ever)');
        }
    }
}

debug().catch(console.error);
