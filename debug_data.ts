import { db } from './src/lib/services/db';
import { Collections } from './src/lib/constants';

async function debug() {
    try {
        const allSchools = await db.find(Collections.SCHOOLS, {});
        console.log(`--- TOTAL SCHOOLS: ${allSchools.length} ---`);
        
        // Find ALL schools with "Huda" in the name
        const hudaSchools = allSchools.filter((s: any) => 
            s.name?.toLowerCase().includes('huda')
        );
        
        console.log('--- HUDA SCHOOLS FOUND ---');
        hudaSchools.forEach((s: any) => {
            console.log(`ID: ${s.id}, Name: ${s.name}, Code: ${s.code}`);
        });

        const checklists = await db.find('implementation_checklists', {});
        console.log(`--- TOTAL CHECKLISTS: ${checklists.length} ---`);
        
        // Let's see some checklist school IDs to detect patterns
        console.log('--- SAMPLE CHECKLIST SCHOOL IDS ---');
        checklists.slice(0, 10).forEach((c: any) => {
            console.log(`School ID: ${c.school_id}`);
        });

        console.log('--- HUDA MATCHES ---');
        hudaSchools.forEach((s: any) => {
            const match = checklists.find((c: any) => c.school_id === s.id);
            if (match) {
                console.log(`MATCH FOUND for ${s.name} (${s.id})`);
                console.log(JSON.stringify(match, null, 2));
            } else {
                console.log(`NO DATA for ${s.name} (${s.id})`);
            }
        });

        // Check for "Huda" inside checklist data stringified if it's there? (Unlikely but good to check)
        // If some schools changed IDs or names.
    } catch (e) {
        console.error(e);
    }
}
debug();
