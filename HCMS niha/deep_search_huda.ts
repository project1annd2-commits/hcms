import { db } from './src/lib/services/db';
import { Collections } from './src/lib/constants';

async function deepSearch() {
    try {
        const allSchools = await db.find(Collections.SCHOOLS, {});
        const hudaSchools = allSchools.filter((s: any) => s.name?.toLowerCase().includes('huda'));
        const hudaIds = hudaSchools.map((s: any) => s.id);

        console.log(`Searching for data related to ${hudaIds.length} Huda schools...`);

        // Check if data is accidentally in another collection
        const colts = [
            'implementation_checklists', 'school_onboarding', 'onboarding', 
            'checklists', 'school_checklists', 'implementation'
        ];

        for (const col of colts) {
            try {
                const data = await db.find(col, {});
                const matches = data.filter((item: any) => hudaIds.includes(item.school_id));
                console.log(`Collection ${col}: Found ${matches.length} matches for Huda IDs`);
                if (matches.length > 0) {
                    matches.forEach((m: any) => console.log(`Match in ${col} for school_id ${m.school_id}`));
                }
            } catch (e) {}
        }

        // Search for "Huda" string in ALL records of these collections (maybe school_id is name?)
        for (const col of colts) {
            try {
                const data = await db.find(col, {});
                const matches = data.filter((item: any) => JSON.stringify(item).toLowerCase().includes('huda'));
                console.log(`Collection ${col}: Found ${matches.length} records containing "Huda" string`);
            } catch (e) {}
        }

    } catch (e) {
        console.error(e);
    }
}
deepSearch();
