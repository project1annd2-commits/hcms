import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    console.log('--- checking school_id format in assignments vs schools ---');

    const employeeId = 'bd6089c7-8364-46cb-a934-c80db95fb718';
    const assignments = await db.find<any>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: employeeId });
    const allSchools = await db.find<any>(Collections.SCHOOLS, {});

    for (const a of assignments) {
        const school = allSchools.find(s => s.id === a.school_id);
        const schoolByCode = allSchools.find(s => s.code === a.school_id);

        if (school) {
            console.log(`Assignment SchoolID: ${a.school_id} -> MATCHES UUID of ${school.name}`);
        } else if (schoolByCode) {
            console.log(`Assignment SchoolID: ${a.school_id} -> MATCHES CODE of ${schoolByCode.name} [INCONSISTENCY FOUND]`);
        } else {
            console.log(`Assignment SchoolID: ${a.school_id} -> NO MATCH FOUND`);
        }
    }
}

debug().catch(console.error);
