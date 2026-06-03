
import { db } from '../../src/lib/services/db';
import { Collections } from '../../src/lib/constants';

async function debugEmployeeData() {
    try {
        console.log('--- Debugging Employee Data ---');

        // 1. List all employees
        const employees = await db.find(Collections.USERS, { role: 'employee' });
        console.log(`Found ${employees.length} employees.`);

        for (const employee of employees) {
            console.log(`\nEmployee: ${employee.full_name} (${employee.email}) ID: ${employee.id}`);

            // 2. Check assignments
            const assignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: employee.id });
            console.log(`  Assignments found: ${assignments.length}`);

            if (assignments.length > 0) {
                const schoolIds = assignments.map((a: any) => a.school_id);
                console.log(`  Assigned School IDs: ${schoolIds.join(', ')}`);

                // 3. Check schools
                const schools = await db.find(Collections.SCHOOLS, { id: { $in: schoolIds } });
                console.log(`  Matching Schools found in DB: ${schools.length}`);
                schools.forEach((s: any) => console.log(`    - ${s.name} (${s.id})`));

                // 4. Check teachers in these schools
                const teachers = await db.find(Collections.TEACHERS, { school_id: { $in: schoolIds } });
                console.log(`  Teachers in these schools: ${teachers.length}`);

                // 5. Check mentors in these schools
                const mentors = await db.find(Collections.MENTOR_SCHOOLS, { school_id: { $in: schoolIds } });
                console.log(`  Mentors in these schools: ${mentors.length}`);
            } else {
                console.log('  No schools assigned.');
            }
        }

        console.log('\n--- Testing Count vs Find ---');
        try {
            console.log('Counting Schools...');
            const countSchools = await db.count(Collections.SCHOOLS, {});
            console.log(`Count Schools: ${countSchools}`);
        } catch (e: any) {
            console.log('Count Schools Failed:', e.message);
        }

        try {
            console.log('Finding Schools...');
            const findSchools = await db.find(Collections.SCHOOLS, {});
            console.log(`Find Schools Length: ${findSchools.length}`);
        } catch (e: any) {
            console.log('Find Schools Failed:', e.message);
        }

        try {
            console.log('Counting Teachers...');
            const countTeachers = await db.count(Collections.TEACHERS, {});
            console.log(`Count Teachers: ${countTeachers}`);
        } catch (e: any) {
            console.log('Count Teachers Failed:', e.message);
        }

        try {
            console.log('Finding Teachers...');
            const findTeachers = await db.find(Collections.TEACHERS, {});
            console.log(`Find Teachers Length: ${findTeachers.length}`);
        } catch (e: any) {
            console.log('Find Teachers Failed:', e.message);
        }

    } catch (error) {
        console.error('Error running debug script:', error);
    }
}

debugEmployeeData();
