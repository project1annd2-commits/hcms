import 'dotenv/config';

const SUPABASE_URL = 'https://ywuefjnalaizgwzpzgot.supabase.co';
const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dWVmam5hbGFpemd3enB6Z290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MTMzODIsImV4cCI6MjA3ODI4OTM4Mn0.FlVcKrEnGgUCkbfm99MnP7H2AFfWS49KtsMToLMdOC8';

async function testJwt() {
    const url = `${SUPABASE_URL}/rest/v1/training_assignments?select=*&limit=1`;
    console.log(`Fetching from: ${url}...`);

    try {
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_API_KEY,
                'Authorization': `Bearer ${SUPABASE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed: ${response.status} ${response.statusText}`);
            console.error(errorText);
        } else {
            const data = await response.json();
            console.log('Success! Data:', data);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testJwt();
