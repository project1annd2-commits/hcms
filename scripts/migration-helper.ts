// Component Migration Helper Script
// This file documents the migration pattern for quick reference

/* 
MIGRATION PATTERN FOR ALL COMPONENTS:
====================================

1. IMPORTS - Replace:
   FROM: import { supabase, Type1, Type2 } from '../lib/supabase';
   TO:   import { Type1, Type2 } from '../lib/models';
         import { db } from '../lib/services/db';
         import { Collections } from '../lib/mongodb';

2. QUERIES - Replace patterns:

a) SELECT/FIND:
   FROM: const { data } = await supabase.from('table').select('*')
   TO:   const data = await db.find<Type>(Collections.TABLE, {})

b) SELECT ONE:
   FROM: const { data } = await supabase.from('table').select('*').eq('field', value).maybeSingle()
   TO:   const data = await db.findOne<Type>(Collections.TABLE, { field: value })

c) INSERT:
   FROM: await supabase.from('table').insert(data)
   TO:   await db.insertOne<Type>(Collections.TABLE, data as any)

d) UPDATE:
   FROM: await supabase.from('table').update(data).eq('id', id)
   TO:   await db.updateById<Type>(Collections.TABLE, id, data)
   OR:   await db.updateOne<Type>(Collections.TABLE, { id }, data)

e) DELETE:
   FROM: await supabase.from('table').delete().eq('id', id)
   TO:   await db.deleteById(Collections.TABLE, id)

f) JOINS - Use separate queries or aggregation:
   FROM: .select('*, related(*)')
   TO:   Two queries with Promise.all or aggregation pipeline

3. ORDER/SORT:
   FROM: .order('field', { ascending: false })
   TO:   {}, { sort: { field: -1 } } (as third parameter to find())

4. ID HANDLING:
   - MongoDB uses ObjectId internally but we convert to string
   - Always check id exists before using: if (item.id) { ... }
*/

// Components requiring migration:
const componentsToMigrate = [
    'SchoolManagement.tsx',       // Already migrated (no supabase found)
    'TeacherManagement.tsx',       // Needs migration
    'MentorManagement.tsx',        // Needs migration
    'AdminPersonnelManagement.tsx', // Needs migration
    'TrainingProgramManagement.tsx', // Needs migration
    'TrainingAssignmentManagement.tsx', // Needs migration (complex)
    'TeacherPortal.tsx',           // Needs migration
    'EmployeeTasks.tsx',           // Needs migration
    'SchoolFollowups.tsx',         // Needs migration
    'SchoolAssignments.tsx',       // Needs migration
    'DeviceManagement.tsx',        // Needs migration
    'AttendanceAnalytics.tsx',     // Needs migration (aggregations)
    'DailyAttendanceReport.tsx',   // Needs migration
    'BulkUpload.tsx',              // Needs migration
    'Login.tsx',                   // Needs migration
    'Dashboard.tsx',               // Might need migration
];

export { };
