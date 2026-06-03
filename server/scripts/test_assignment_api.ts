import 'dotenv/config';
import { mongodb } from '../src/config/mongodb';
import { db } from '../src/services/db';
import { Collections } from '../src/config/mongodb';

async function testAssignmentAPI() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Test the same query that the frontend might be using
        const assignments = await db.find(Collections.TRAINING_ASSIGNMENTS, {}, { sort: { assigned_date: -1 } });
        console.log(`Total assignments found: ${assignments.length}`);

        // Load training programs and teachers for assignments (like the frontend does)
        const programs = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, { status: 'active' }, { sort: { title: 1 } });
        const allTeachers = await db.find(Collections.TEACHERS, { status: 'active' }, { sort: { last_name: 1 } });
        const allSchools = await db.find(Collections.SCHOOLS, {}, { sort: { name: 1 } });

        console.log(`Total programs: ${programs.length}`);
        console.log(`Total teachers: ${allTeachers.length}`);
        console.log(`Total schools: ${allSchools.length}`);

        // Map assignments with joined data (like the frontend does)
        let mapped = assignments.map((a: any) => {
            const teacher = allTeachers.find((t: any) => t.id === a.teacher_id);
            const school = teacher?.school_id ? allSchools.find((s: any) => s.id === teacher.school_id) : undefined;
            const program = programs.find((p: any) => p.id === a.training_program_id);

            return {
                ...a,
                training_program: program,
                teacher: teacher ? { ...teacher, school } : undefined
            };
        });

        console.log('\n=== First 5 Mapped Assignments ===');
        console.log(mapped.slice(0, 5));

        // Check if any assignments are missing teacher data
        const assignmentsWithoutTeachers = mapped.filter((a: any) => !a.teacher);
        console.log(`\nAssignments without teacher data: ${assignmentsWithoutTeachers.length}`);

        if (assignmentsWithoutTeachers.length > 0) {
            console.log('Sample assignments without teachers:');
            console.log(assignmentsWithoutTeachers.slice(0, 3));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongodb.disconnect();
    }
}

// Define types for better type checking
type TrainingProgram = {
    id: string;
    title: string;
    description: string;
    duration_hours: number;
    category: string;
    status: 'active' | 'archived';
    start_date: string | null;
    end_date: string | null;
    meeting_link: string;
    created_at: string;
    updated_at: string;
};

type Teacher = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    school_id: string;
    subject_specialization: string;
    hire_date: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
};

type School = {
    id: string;
    name: string;
    code: string;
    address: string;
    phone: string;
    email: string;
    h1_count: number;
    h2_count: number;
    h3_count: number;
    principal_name: string;
    created_at: string;
    updated_at: string;
};

type TrainingAssignment = {
    id: string;
    training_program_id: string;
    teacher_id: string;
    assigned_date: string;
    due_date: string | null;
    completion_date: string | null;
    status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
    progress_percentage: number;
    score: number | null;
    assigned_by: string | null;
    created_at: string;
    updated_at: string;
};

testAssignmentAPI();