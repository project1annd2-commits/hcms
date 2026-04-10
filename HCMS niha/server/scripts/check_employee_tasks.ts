import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '..', 'service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath)
    });
}

const db = admin.firestore();

async function checkEmployeeTasks() {
    const output: string[] = [];
    const log = (msg: string) => {
        output.push(msg);
        console.log(msg);
    };

    log('Checking employee_tasks collection...\n');

    // Get today's date in the format used by the app
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    log(`Today's date: ${todayStr}\n`);

    // Get all employee tasks
    const allTasksSnap = await db.collection('employee_tasks').get();
    log(`Total tasks in database: ${allTasksSnap.size}`);

    // Get tasks for today
    const todayTasksSnap = await db.collection('employee_tasks')
        .where('date', '==', todayStr)
        .get();
    log(`Tasks for today (${todayStr}): ${todayTasksSnap.size}\n`);

    // Group tasks by employee_id for today
    const tasksByEmployee: Record<string, any[]> = {};
    todayTasksSnap.docs.forEach(doc => {
        const data = doc.data();
        const empId = data.employee_id || 'unknown';
        if (!tasksByEmployee[empId]) {
            tasksByEmployee[empId] = [];
        }
        tasksByEmployee[empId].push({ id: doc.id, ...data });
    });

    log('Tasks grouped by employee for today:');
    for (const [empId, tasks] of Object.entries(tasksByEmployee)) {
        log(`\nEmployee ID: ${empId}`);
        log(`  Tasks count: ${tasks.length}`);
        tasks.forEach(task => {
            log(`    - ${task.title} (${task.status}, ${task.time_spent}min)`);
        });
    }

    // Get list of all unique dates in the collection
    const uniqueDates = new Set<string>();
    allTasksSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.date) {
            uniqueDates.add(data.date);
        }
    });

    log('\n\nAll unique dates in employee_tasks:');
    const sortedDates = Array.from(uniqueDates).sort().reverse();
    sortedDates.slice(0, 10).forEach(date => {
        log(`  ${date}`);
    });

    // Get all employees
    const employeesSnap = await db.collection('users')
        .where('role', '==', 'employee')
        .where('is_active', '==', true)
        .get();

    log(`\n\nActive employees: ${employeesSnap.size}`);
    employeesSnap.docs.forEach(doc => {
        const data = doc.data();
        log(`  - ${data.full_name} (ID: ${doc.id})`);
    });

    // Save output to file
    const outputPath = path.resolve(__dirname, 'employee_tasks_report.txt');
    fs.writeFileSync(outputPath, output.join('\n'));
    log(`\nReport saved to: ${outputPath}`);

    process.exit(0);
}

checkEmployeeTasks().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
