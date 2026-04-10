import { db } from '../src/lib/services/db';
import { Collections } from '../src/lib/constants';

async function debug() {
    const schools = await db.find<any>(Collections.SCHOOLS, {});
    const statuses = new Set(schools.map(s => s.status));
    console.log('Unique statuses:', Array.from(statuses));

    const statusCounts = schools.reduce((acc: any, s: any) => {
        const st = s.status || 'undefined';
        acc[st] = (acc[st] || 0) + 1;
        return acc;
    }, {});
    console.log('Status counts:', statusCounts);
}

debug().catch(console.error);
