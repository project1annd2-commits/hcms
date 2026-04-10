import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';

async function checkUser() {
    try {
        await mongodb.connect();
        console.log('✓ Connected to MongoDB\n');

        const phoneNumber = '9330752813';
        console.log(`=== Checking User: ${phoneNumber} ===\n`);

        // Check in teachers collection
        console.log('1. Checking TEACHERS collection:');
        const teachers = await mongodb.getCollection(Collections.TEACHERS)
            .find({})
            .toArray();

        const teacherMatches = teachers.filter((t: any) =>
            t.phone?.replace(/\\s+/g, '').includes(phoneNumber) ||
            t.phone?.includes(phoneNumber)
        );

        if (teacherMatches.length > 0) {
            console.log(`   Found ${teacherMatches.length} teacher(s) with this phone:`);
            teacherMatches.forEach((t: any, i: number) => {
                console.log(`   ${i + 1}. ID: ${t.id || t._id}`);
                console.log(`      Name: ${t.name}`);
                console.log(`      Phone: ${t.phone}`);
                console.log(`      School ID: ${t.school_id || 'None'}`);
                console.log(`      Status: ${t.status || 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('   ✗ No teachers found with this phone\n');
        }

        // Check in mentors collection
        console.log('2. Checking MENTORS collection:');
        const mentors = await mongodb.getCollection(Collections.MENTORS)
            .find({})
            .toArray();

        const mentorMatches = mentors.filter((m: any) =>
            m.phone?.replace(/\\s+/g, '').includes(phoneNumber) ||
            m.phone?.includes(phoneNumber)
        );

        if (mentorMatches.length > 0) {
            console.log(`   Found ${mentorMatches.length} mentor(s) with this phone:`);
            mentorMatches.forEach((m: any, i: number) => {
                console.log(`   ${i + 1}. ID: ${m.id || m._id}`);
                console.log(`      Name: ${m.name}`);
                console.log(`      Phone: ${m.phone}`);
                console.log(`      Status: ${m.status || 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('   ✗ No mentors found with this phone\n');
        }

        // Check training assignments
        if (teacherMatches.length > 0) {
            console.log('3. Checking TRAINING ASSIGNMENTS:');
            for (const teacher of teacherMatches) {
                const assignments = await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS)
                    .find({ teacher_id: teacher.id || teacher._id })
                    .toArray();

                console.log(`   Teacher ${teacher.id || teacher._id} (${teacher.name}):`);
                if (assignments.length > 0) {
                    console.log(`   ✓ Found ${assignments.length} training assignment(s):`);
                    assignments.forEach((a: any, i: number) => {
                        console.log(`      ${i + 1}. Assignment ID: ${a.id || a._id}`);
                        console.log(`         Program ID: ${a.program_id}`);
                        console.log(`         Status: ${a.status}`);
                        console.log(`         Assigned Date: ${a.assigned_date}`);
                    });
                } else {
                    console.log('   ✗ No training assignments found');
                }
                console.log('');
            }
        }

        // Check if phone format is the issue
        console.log('4. Checking phone number format:');
        console.log(`   Search phone: ${phoneNumber}`);
        console.log(`   Trimmed: ${phoneNumber.trim()}`);
        console.log(`   With tab prefix: \\t${phoneNumber}`);

        // Check with tab prefix (as seen in the grep results)
        const teachersWithTab = await mongodb.getCollection(Collections.TEACHERS)
            .find({ phone: `\\t${phoneNumber}` })
            .toArray();

        if (teachersWithTab.length > 0) {
            console.log(`   ✓ Found ${teachersWithTab.length} teacher(s) with TAB prefix!`);
            console.log('   ⚠ ISSUE: Phone number has a tab character prefix');
            teachersWithTab.forEach((t: any, i: number) => {
                console.log(`   ${i + 1}. ID: ${t.id || t._id}`);
                console.log(`      Name: ${t.name}`);
                console.log(`      Phone (raw): ${JSON.stringify(t.phone)}`);
                console.log(`      School ID: ${t.school_id || 'None'}`);
            });
        }

        console.log('\n=== DIAGNOSIS ===');
        if (teachersWithTab.length > 0) {
            console.log('✗ PROBLEM FOUND: Phone number has improper formatting (tab character)');
            console.log('  Solution: Clean phone number data or update login logic to handle whitespace');
        } else if (teacherMatches.length === 0 && mentorMatches.length === 0) {
            console.log('✗ PROBLEM: User not found in database');
        } else if (teacherMatches.some((t: any) => !t.school_id)) {
            console.log('⚠ WARNING: Teacher found but has no school_id assigned');
        } else {
            console.log('✓ User data appears correct. Issue may be elsewhere.');
        }

    } catch (error) {
        console.error('✗ Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

checkUser();
