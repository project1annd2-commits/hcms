import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeEmployeeAllocations() {
    console.log('=== EMPLOYEE ALLOCATION ANALYSIS ===\n');

    const serviceAccountPath = path.join(__dirname, '../../hcms-680e6-firebase-adminsdk-fbsvc-2ecb819931.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    try {
        // Fetch all data
        console.log('Fetching data...');
        const [usersSnapshot, assignmentsSnapshot, schoolsSnapshot, teachersSnapshot] = await Promise.all([
            db.collection('users').where('role', '==', 'employee').get(),
            db.collection('school_assignments').get(),
            db.collection('schools').get(),
            db.collection('teachers').get()
        ]);

        const employees = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const assignments = assignmentsSnapshot.docs.map(doc => doc.data() as any);
        const schools = schoolsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const teachers = teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        console.log(`\nTotal Employees: ${employees.length}`);
        console.log(`Total Assignments: ${assignments.length}`);
        console.log(`Total Schools: ${schools.length}`);
        console.log(`Total Teachers: ${teachers.length}\n`);

        // Build school -> teachers mapping
        const schoolTeachers = new Map<string, number>();
        teachers.forEach(teacher => {
            const schoolId = teacher.school_id;
            if (schoolId) {
                schoolTeachers.set(schoolId, (schoolTeachers.get(schoolId) || 0) + 1);
            }
        });

        // Analyze each employee
        const results: any[] = [];

        console.log('─'.repeat(100));
        console.log('Employee Name       | Username           | Schools | Teachers | Avg Teachers/School');
        console.log('─'.repeat(100));

        for (const employee of employees) {
            const name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
            const username = employee.username || 'N/A';

            // Get assigned schools
            const userAssignments = assignments.filter(a => a.employee_id === employee.id);
            const schoolIds = userAssignments.map(a => a.school_id);

            // Count teachers in assigned schools
            let totalTeachers = 0;
            schoolIds.forEach(schoolId => {
                totalTeachers += schoolTeachers.get(schoolId) || 0;
            });

            const avgTeachers = schoolIds.length > 0 ? (totalTeachers / schoolIds.length).toFixed(1) : '0.0';

            results.push({
                id: employee.id,
                name,
                username,
                schoolCount: schoolIds.length,
                teacherCount: totalTeachers,
                avgTeachers: parseFloat(avgTeachers)
            });

            console.log(
                `${name.substring(0, 19).padEnd(19)} | ` +
                `${username.substring(0, 18).padEnd(18)} | ` +
                `${String(schoolIds.length).padStart(7)} | ` +
                `${String(totalTeachers).padStart(8)} | ` +
                `${avgTeachers.padStart(19)}`
            );
        }

        console.log('─'.repeat(100));

        // Summary statistics
        const totalSchools = results.reduce((sum, r) => sum + r.schoolCount, 0);
        const totalTeachersAllocated = results.reduce((sum, r) => sum + r.teacherCount, 0);
        const avgSchoolsPerEmployee = (totalSchools / employees.length).toFixed(1);
        const avgTeachersPerEmployee = (totalTeachersAllocated / employees.length).toFixed(1);

        console.log('\n=== SUMMARY ===\n');
        console.log(`Average Schools per Employee: ${avgSchoolsPerEmployee}`);
        console.log(`Average Teachers per Employee: ${avgTeachersPerEmployee}`);
        console.log(`Total Schools Assigned: ${totalSchools} (out of ${schools.length})`);
        console.log(`Total Teachers Covered: ${totalTeachersAllocated} (out of ${teachers.length})`);

        // Find unassigned schools
        const assignedSchoolIds = new Set(assignments.map(a => a.school_id));
        const unassignedSchools = schools.filter(s => !assignedSchoolIds.has(s.id));

        if (unassignedSchools.length > 0) {
            console.log(`\n⚠️  Unassigned Schools: ${unassignedSchools.length}`);
            console.log('First 5 unassigned schools:');
            unassignedSchools.slice(0, 5).forEach(s => {
                const teacherCount = schoolTeachers.get(s.id) || 0;
                console.log(`  - ${s.name || s.id} (${teacherCount} teachers)`);
            });
        }

        // Distribution analysis
        console.log('\n=== DISTRIBUTION ANALYSIS ===\n');

        // Sort by teacher count
        results.sort((a, b) => b.teacherCount - a.teacherCount);

        console.log('Top 5 employees by teacher count:');
        results.slice(0, 5).forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.name}: ${r.teacherCount} teachers in ${r.schoolCount} schools`);
        });

        console.log('\nBottom 5 employees by teacher count:');
        results.slice(-5).reverse().forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.name}: ${r.teacherCount} teachers in ${r.schoolCount} schools`);
        });

        // Save detailed report
        const reportPath = path.join(__dirname, 'employee_allocation_report.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            summary: {
                totalEmployees: employees.length,
                totalSchools: schools.length,
                totalTeachers: teachers.length,
                totalSchoolsAssigned: totalSchools,
                totalTeachersCovered: totalTeachersAllocated,
                avgSchoolsPerEmployee: parseFloat(avgSchoolsPerEmployee),
                avgTeachersPerEmployee: parseFloat(avgTeachersPerEmployee),
                unassignedSchoolCount: unassignedSchools.length
            },
            employees: results,
            unassignedSchools: unassignedSchools.map(s => ({
                id: s.id,
                name: s.name,
                teacherCount: schoolTeachers.get(s.id) || 0
            }))
        }, null, 2));

        console.log(`\n✅ Detailed report saved to: employee_allocation_report.json`);

    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

analyzeEmployeeAllocations().catch(console.error);
