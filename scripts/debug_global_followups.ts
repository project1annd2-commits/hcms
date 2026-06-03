import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    console.log('--- Checking Global Followups for Specific Schools ---');

    const targetNames = [
        "Zenith Global",
        "Crescent Scholar",
        "MI Creative (sultanpur)",
        "Rida International (Rayeel)",
        "British Arabic International"
    ];

    const allSchools = await db.find<any>(Collections.SCHOOLS, {});
    const targetSchools = allSchools.filter(s => targetNames.some(name => s.name?.includes(name)));

    for (const school of targetSchools) {
        console.log(`\nSchool: ${school.name} (${school.id})`);

        const followups = await db.find<any>(Collections.SCHOOL_FOLLOWUPS, {
            school_id: school.id
        });

        console.log(`Total followups recorded (any employee): ${followups.length}`);
        followups.forEach((f, i) => {
            console.log(`  ${i + 1}. Date: ${f.followup_date}, Employee: ${f.employee_id}, CreatedAt: ${f.created_at}`);
        });
    }
}

debug().catch(console.error);
