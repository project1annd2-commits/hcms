// Test script to find your Supabase URL
// Common URL patterns to try

const SUPABASE_API_KEY = 'hcms_4HksSlj8xILFJaSaDpAR96206T99ZnmVe60hovjYmEvh6ucu';

// Try to extract project ID from the API key or test common patterns
const possibleUrls = [
    'https://nfubnpqakfdprhigjmpx.supabase.co', // Example pattern
    // Add your actual URL here
];

async function testSupabaseConnection(url: string) {
    try {
        console.log(`Testing: ${url}`);

        const response = await fetch(`${url}/rest/v1/schools?limit=1`, {
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${SUPABASE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`  Status: ${response.status}`);

        if (response.ok) {
            const data = await response.json();
            console.log(`  ✅ SUCCESS! Found ${Array.isArray(data) ? data.length : 0} schools`);
            console.log(`  Your Supabase URL is: ${url}\n`);
            return true;
        } else {
            const error = await response.text();
            console.log(`  ❌ Failed: ${error.substring(0, 100)}\n`);
            return false;
        }
    } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}\n`);
        return false;
    }
}

async function findSupabaseUrl() {
    console.log('=== TESTING SUPABASE CONNECTION ===\n');
    console.log('Please provide your Supabase project URL.\n');
    console.log('It should look like: https://xxxxx.supabase.co\n');
    console.log('You can find it in your Supabase project settings.\n');

    console.log('Testing known patterns...\n');

    for (const url of possibleUrls) {
        const success = await testSupabaseConnection(url);
        if (success) {
            console.log('Connection successful! Update the script with this URL.');
            return;
        }
    }

    console.log('❌ Could not find working Supabase URL.');
    console.log('\nPlease provide your Supabase project URL.');
    console.log('You can find it in:');
    console.log('  1. Supabase Dashboard → Settings → API');
    console.log('  2. Look for "Project URL" or "API URL"\n');
}

findSupabaseUrl();
