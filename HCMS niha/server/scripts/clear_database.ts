import 'dotenv/config';
import { mongodb, Collections } from '../src/config/mongodb';

async function clearDatabase() {
    try {
        await mongodb.connect();
        console.log('Connected to MongoDB');

        // Clear all collections
        console.log('Clearing all collections...');
        
        await mongodb.getCollection(Collections.USERS).deleteMany({});
        console.log('Cleared users collection');
        
        await mongodb.getCollection(Collections.PERMISSIONS).deleteMany({});
        console.log('Cleared permissions collection');
        
        await mongodb.getCollection(Collections.SCHOOLS).deleteMany({});
        console.log('Cleared schools collection');
        
        await mongodb.getCollection(Collections.TEACHERS).deleteMany({});
        console.log('Cleared teachers collection');
        
        await mongodb.getCollection(Collections.MENTORS).deleteMany({});
        console.log('Cleared mentors collection');
        
        await mongodb.getCollection(Collections.MENTOR_SCHOOLS).deleteMany({});
        console.log('Cleared mentor_schools collection');
        
        await mongodb.getCollection(Collections.ADMIN_PERSONNEL).deleteMany({});
        console.log('Cleared admin_personnel collection');
        
        await mongodb.getCollection(Collections.TRAINING_PROGRAMS).deleteMany({});
        console.log('Cleared training_programs collection');
        
        await mongodb.getCollection(Collections.TRAINING_ASSIGNMENTS).deleteMany({});
        console.log('Cleared training_assignments collection');
        
        await mongodb.getCollection(Collections.TRAINING_ATTENDANCE).deleteMany({});
        console.log('Cleared training_attendance collection');
        
        await mongodb.getCollection(Collections.SCHOOL_ASSIGNMENTS).deleteMany({});
        console.log('Cleared school_assignments collection');
        
        await mongodb.getCollection(Collections.EMPLOYEE_TASKS).deleteMany({});
        console.log('Cleared employee_tasks collection');
        
        await mongodb.getCollection(Collections.SCHOOL_FOLLOWUPS).deleteMany({});
        console.log('Cleared school_followups collection');
        
        await mongodb.getCollection(Collections.USER_DEVICES).deleteMany({});
        console.log('Cleared user_devices collection');
        
        console.log('=== All collections cleared successfully ===');
        
    } catch (error) {
        console.error('Error clearing database:', error);
    } finally {
        await mongodb.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

clearDatabase();