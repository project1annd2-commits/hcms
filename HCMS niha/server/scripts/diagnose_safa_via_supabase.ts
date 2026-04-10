import 'dotenv/config';

// Supabase Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ywuefjnalaizgwzpzgot.supabase.co';
const SUPABASE_API_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dWVmam5hbGFpemd3enB6Z290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MTMzODIsImV4cCI6MjA3ODI4OTM4Mn0.FlVcKrEnGgUCkbfm99MnP7H2AFfWS49KtsMToLMdOC8';

async function fetchFromSupabase(table: string, filter?: string): Promise<any[]> {
    const url = `${SUPABASE_URL}/rest/v1/${table}${filter || ''}`;

    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${table}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function diagnoseSupabase() {
    console.log('🔍 Diagnosing via Supabase (No Firestore Quota Usage)\n');
    console.log('='.repeat(80));

    try {
        // 1. Find Safa
        console.log('\n📌 Finding Safa Warsi in users...');
        const users = await fetchFromSupabase('users', '?role=eq.employee');

        const user = users.find(u => {
            const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
            const username = (u.username || '').toLowerCase();
            return fullName.includes('safa') || username.includes('safa');
        });

        if (!user) {
            console.log('❌ User "safa" not found in Supabase.');
            process.exit(1);
        }

        console.log(`✅ Found: ${user.first_name} ${user.last_name}`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);

        // 2. Get assignments
        console.log('\n📌 Fetching school assignments...');
        const allAssignments = await fetchFromSupabase('school_assignments');
        const userAssignments = allAssignments.filter(a => a.employee_id === user.id);

        console.log(`   Total Assignments for Safa: ${userAssignments.length}`);

        if (userAssignments.length === 0) {
            console.log('❌ No assignments found for Safa.');
            process.exit(0);
        }

        // 3. Get all schools
        console.log('\n📌 Fetching all schools...');
        const schools = await fetchFromSupabase('schools');
        console.log(`   Total Schools in DB: ${schools.length}`);

        // Build lookup set
        const validSchoolIds = new Set(schools.map(s => s.id));
        const schoolsById = new Map(schools.map(s => [s.id, s]));

        // 4. Analyze
        console.log('\n📌 Analyzing assignments...\n');

        let validCount = 0;
        let orphanedCount = 0;
        const orphanedAssignments = [];
        const validAssignments = [];

        for (const assignment of userAssignments) {
            const schoolId = assignment.school_id;

            if (validSchoolIds.has(schoolId)) {
                validCount++;
                const school = schoolsById.get(schoolId);
                console.log(`✅ ${school.name || 'Unnamed'} (${schoolId})`);
                validAssignments.push({
                    assignmentId: assignment.id,
                    schoolId: schoolId,
                    schoolName: school.name,
                    assignedDate: assignment.assigned_date || 'N/A'
                });
            } else {
                orphanedCount++;
                orphanedAssignments.push({
                    assignmentId: assignment.id,
                    schoolId: schoolId,
                    assignedDate: assignment.assigned_date || 'N/A'
                });
                console.log(`❌ ORPHANED: Assignment ${assignment.id} → School ${schoolId} (NOT IN DB)`);
            }
        }

        // 5. Summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total Assignments:        ${userAssignments.length}`);
        console.log(`Valid Assignments:        ${validCount} ✅`);
        console.log(`Orphaned Assignments:     ${orphanedCount} ❌`);
        console.log(`Expected Dashboard Count: ${validCount}`);
        console.log('='.repeat(80));

        // 6. Report
        const report = {
            diagnosis: {
                userId: user.id,
                userName: `${user.first_name} ${user.last_name}`,
                username: user.username,
                totalAssignments: userAssignments.length,
                validAssignments: validCount,
                orphanedAssignments: orphanedCount,
                expectedDashboardCount: validCount
            },
            orphanedDetails: orphanedAssignments,
            validDetails: validAssignments
        };

        // Save report
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const reportPath = path.join(__dirname, 'safa_diagnosis_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`\n📝 Full report saved to: safa_diagnosis_report.json`);

        // 7. Recommendation
        console.log('\n🎯 DIAGNOSIS RESULT:');
        if (orphanedCount > 0) {
            console.log(`❌ There are ${orphanedCount} orphaned assignment(s).`);
            console.log(`   These assignments reference schools that don't exist in the database.`);
            console.log(`\n   Dashboard shows: ${validCount} schools (correct)`);
            console.log(`   Assignment count: ${userAssignments.length} (includes orphaned)`);
            console.log(`   Discrepancy: ${orphanedCount} schools`);

            console.log(`\n💡 RECOMMENDED SOLUTION:`);
            console.log(`   Remove the ${orphanedCount} orphaned assignment(s) from school_assignments collection.`);
            console.log(`   This will make the assignment count match the dashboard count.`);

            console.log(`\n   Orphaned School IDs:`);
            orphanedAssignments.forEach(a => {
                console.log(`     - ${a.schoolId} (Assignment: ${a.assignmentId})`);
            });
        } else {
            console.log(`✅ No orphaned assignments found!`);
            console.log(`   All ${validCount} assignments reference valid schools.`);
            console.log(`   The dashboard should display all schools correctly.`);
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

diagnoseSupabase().then(() => {
    console.log('\n✅ Diagnosis complete!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
