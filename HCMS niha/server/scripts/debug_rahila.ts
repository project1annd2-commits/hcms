import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';
import { mongodb } from '../src/config/mongodb';
import { Mentor, TrainingProgram } from '../src/models';

async function main() {
    await mongodb.connect();

    console.log('--- Debugging Rahila ---');

    // 1. Find Mentor Rahila
    const mentors = await db.find<Mentor>(Collections.MENTORS, {});
    const rahila = mentors.find(m =>
        (m.first_name && m.first_name.toLowerCase().includes('rahila')) ||
        (m.last_name && m.last_name.toLowerCase().includes('rahila'))
    );

    if (!rahila) {
        console.log('❌ Mentor "Rahila" not found in MENTORS collection.');
        // Check teachers?
        const teachers = await db.find(Collections.TEACHERS, {});
        const rahilaTeacher = teachers.find((t: any) =>
            (t.first_name && t.first_name.toLowerCase().includes('rahila')) ||
            (t.last_name && t.last_name.toLowerCase().includes('rahila'))
        );
        if (rahilaTeacher) {
            console.log('⚠️ Found "Rahila" in TEACHERS collection:', rahilaTeacher.id, rahilaTeacher.first_name, rahilaTeacher.last_name);
            console.log('NOTE: MentorManagement only shows MENTORS.');
        }
        return;
    }

    console.log('✅ Found Mentor:', rahila.id, rahila.first_name, rahila.last_name, rahila.phone);

    // 2. Find B4 Programs
    const programs = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});
    const b4Programs = programs.filter(p => p.title.toLowerCase().includes('b4'));

    console.log(`Found ${b4Programs.length} programs with "b4" in title:`);
    b4Programs.forEach(p => console.log(`- [${p.id}] ${p.title} (Status: ${p.status})`));

    // 3. Find Assignments for Rahila
    const assignments = await db.find(Collections.MENTOR_TRAINING_ASSIGNMENTS, { mentor_id: rahila.id });
    console.log(`Found ${assignments.length} assignments for Rahila:`);

    assignments.forEach((a: any) => {
        const prog = programs.find(p => p.id === a.training_program_id);
        console.log(`- Assignment ID: ${a.id}, Program ID: ${a.training_program_id}, Name: ${prog?.title || 'Unknown'}`);
    });

    // 4. Check Match
    const b4Program = b4Programs.find(p => p.title.toLowerCase().includes('mentor'));
    if (b4Program) {
        const hasAssignment = assignments.some((a: any) => a.training_program_id === b4Program.id);
        console.log(`\nDoes Rahila have assignment for "${b4Program.title}"? ${hasAssignment ? 'YES ✅' : 'NO ❌'}`);

        if (!hasAssignment) {
            console.log('Reason for missing badge: No assignment found for the B4 program used by the badge logic.');
        }
    } else {
        console.log('\nCould not find a program matching "B4" and "Mentor" which is what UI looks for.');
    }
}

main().catch(console.error);
