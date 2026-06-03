import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    console.log('--- analyzing school_id formats in Parveen assignments ---');

    const employeeId = 'bd6089c7-8364-46cb-a934-c80db95fb718';
    const assignments = await db.find<any>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: employeeId });
    const allSchools = await db.find<any>(Collections.SCHOOLS, {});

    let uuidCount = 0;
    let codeCount = 0;
    let noMatchCount = 0;

    for (const a of assignments) {
        const isUuid = allSchools.some(s => s.id === a.school_id);
        const isCode = allSchools.some(s => s.code === a.school_id);

        if (isUuid) uuidCount++;
        else if (isCode) codeCount++;
        else noMatchCount++;
    }

    console.log(`Summary for Parveen (${assignments.length} total):`);
    console.log(`- UUID format: ${uuidCount}`);
    console.log(`- Code format: ${codeCount}`);
    console.log(`- No match: ${noMatchCount}`);
}

debug().catch(console.error);
