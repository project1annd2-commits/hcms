import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function verify() {
    console.log('--- Verification: School Dropped Status ---');

    // 1. Create a lead
    const schoolName = 'Test Dropped School ' + Date.now();
    const newSchool = await db.insertOne(Collections.SCHOOLS, {
        name: schoolName,
        status: 'onboarding',
        created_at: new Date().toISOString()
    } as any);
    const leadId = newSchool.id;
    console.log('Created lead with ID:', leadId);

    // 2. Mark as dropped
    const reason = 'Budget constraints';
    await db.updateById(Collections.SCHOOLS, leadId, {
        status: 'dropped',
        dropped_reason: reason,
        updated_at: new Date().toISOString()
    });
    console.log('Marked lead as dropped with reason:', reason);

    // 3. Verify in database
    const droppedSchool = await db.findById<any>(Collections.SCHOOLS, leadId);
    console.log('Database Status:', droppedSchool.status);
    console.log('Database Reason:', droppedSchool.dropped_reason);

    if (droppedSchool.status === 'dropped' && droppedSchool.dropped_reason === reason) {
        console.log('PASS: Database updated correctly.');
    } else {
        console.log('FAIL: Database update error.');
    }

    // 4. Verify filtering logic (Simulation of component logic)
    const allSchools = await db.find<any>(Collections.SCHOOLS, {});

    // Simulations
    const onboardingView = allSchools.filter(s => s.status === 'onboarding' || s.status === 'dropped');
    const managementView = allSchools.filter(s => s.status !== 'onboarding' && s.status !== 'dropped');

    const inOnboarding = onboardingView.some(s => s.id === leadId);
    const inManagement = managementView.some(s => s.id === leadId);

    console.log('Visible in Onboarding?', inOnboarding);
    console.log('Visible in Management?', inManagement);

    if (inOnboarding && !inManagement) {
        console.log('PASS: Filtering logic simulation passed.');
    } else {
        console.log('FAIL: Filtering logic simulation failed.');
    }

    // Cleanup
    await db.deleteById(Collections.SCHOOLS, leadId);
    console.log('Cleanup: Deleted test school.');
}

verify().catch(console.error);
