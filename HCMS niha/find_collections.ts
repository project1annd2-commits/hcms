import { db } from './src/lib/services/db';
async function listCollections() {
    const collections = [
        'implementation_checklists', 
        'checklists', 
        'school_checklists', 
        'implementation', 
        'school_implementation',
        'school_onboarding',
        'onboarding_checklists'
    ];
    for (const c of collections) {
        try {
            const data = await db.find(c, {});
            console.log(`Collection ${c}: ${data.length} records`);
            if (data.length > 0) {
                // Peek at some data to see if it's what we want
                console.log(`Sample from ${c}:`, JSON.stringify(data[0]).substring(0, 100));
            }
        } catch (e) {
            console.log(`Error checking ${c}`);
        }
    }
}
listCollections();
