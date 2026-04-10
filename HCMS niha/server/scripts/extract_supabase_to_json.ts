import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Supabase Configuration
const SUPABASE_URL = 'https://ywuefjnalaizgwzpzgot.supabase.co';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dWVmam5hbGFpemd3enB6Z290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MTMzODIsImV4cCI6MjA3ODI4OTM4Mn0.FlVcKrEnGgUCkbfm99MnP7H2AFfWS49KtsMToLMdOC8';

interface SupabaseConfig {
    endpoint: string;
    collection: string;
}

// Using the same collection mapping as the replication script
const COLLECTIONS_TO_SYNC: SupabaseConfig[] = [
    { endpoint: 'training_assignments', collection: 'training_assignments' },
    { endpoint: 'training_attendance', collection: 'training_attendance' },
    { endpoint: 'teachers', collection: 'teachers' },
    { endpoint: 'schools', collection: 'schools' },
    { endpoint: 'mentors', collection: 'mentors' },
    { endpoint: 'training_programs', collection: 'training_programs' },
    { endpoint: 'school_assignments', collection: 'school_assignments' },
    { endpoint: 'employee_tasks', collection: 'employee_tasks' },
    { endpoint: 'school_followups', collection: 'school_followups' },
    { endpoint: 'user_devices', collection: 'user_devices' },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DUMP_DIR = path.join(__dirname, '../supabase_dump');

if (!fs.existsSync(DUMP_DIR)) {
    fs.mkdirSync(DUMP_DIR, { recursive: true });
}

async function fetchFromSupabase(endpoint: string): Promise<any[]> {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;

    console.log(`  Fetching from: ${endpoint}...`);

    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_API_KEY,
            'Authorization': `Bearer ${SUPABASE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

async function extractAllData() {
    console.log('=== EXTRACTING DATA FROM SUPABASE API ===\n');
    console.log(`Supabase URL: ${SUPABASE_URL}\n`);
    console.log(`Output Directory: ${DUMP_DIR}\n`);

    const results = {
        totalExtracted: 0,
        totalErrors: 0
    };

    for (const config of COLLECTIONS_TO_SYNC) {
        console.log(`Extracting: ${config.collection}`);
        try {
            const data = await fetchFromSupabase(config.endpoint);
            console.log(`    Found ${data.length} records`);

            const filePath = path.join(DUMP_DIR, `${config.collection}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`    Saved to ${filePath}\n`);

            results.totalExtracted += data.length;
        } catch (error: any) {
            console.error(`    ✗ Error extracting ${config.collection}:`, error.message);
            results.totalErrors++;
        }
    }

    console.log('='.repeat(80));
    console.log('=== EXTRACTION SUMMARY ===\n');
    console.log(`Total Records Extracted: ${results.totalExtracted}`);
    console.log(`Total Errors:            ${results.totalErrors}`);
    console.log('='.repeat(80));

    if (results.totalErrors === 0) {
        console.log('\n✅ Extraction completed successfully!\n');
    } else {
        console.log('\n⚠ Extraction completed with errors. Check logs above.\n');
    }
}

extractAllData();
