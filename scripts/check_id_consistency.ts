import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    console.log('--- checking school_id consistency ---');

    // Parveen's ID
    const employeeId = 'bd6089c7-8364-46cb-a934-c80db95fb718';

    const assignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: employeeId });
    const followups = await db.find(Collections.SCHOOL_FOLLOWUPS, { employee_id: employeeId });

    console.log(`\nParveen's Assignments (${assignments.length}):`);
    assignments.slice(0, 5).forEach((a: any) => console.log(`  SchoolID in Assignment: ${a.school_id}`));

    console.log(`\nParveen's Followups (${followups.length}):`);
    followups.slice(0, 5).forEach((f: any) => console.log(`  SchoolID in Followup: ${f.school_id}`));

    // Find a specific school like Zenith Global
    const zenith = (await db.find(Collections.SCHOOLS, {})).find((s: any) => s.name?.includes('Zenith Global'));
    console.log(`\nZenith Global: name=${zenith?.name}, id=${zenith?.id}, code=${zenith?.code}`);

    const zenithAssignment = assignments.find((a: any) => a.school_id === zenith?.id || a.school_id === zenith?.code);
    console.log(`Zenith Assignment school_id: ${zenithAssignment?.school_id}`);

    const zenithFollowup = followups.find((f: any) => f.school_id === zenith?.id || f.school_id === zenith?.code);
    console.log(`Zenith Followup school_id: ${zenithFollowup?.school_id}`);
}

debug().catch(console.error);
