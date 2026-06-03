import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin (assuming local service account or env vars)
// Changed to 'service-account.json' which exists in 'server/'
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!serviceAccount) {
    console.error('Service account file not found or invalid.');
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

interface SchoolData {
    name: string;
    address: string;
    contact_number: string;
    contact_name: string;
    town_city: string;
    village_area: string;
    marketing_person: string;
    channel_partner: string;
    onboarding_comments: string;
}

const schoolsData: SchoolData[] = [
    {
        name: "Focus School of Excellence",
        address: "1st Floor, Reliance Smart Bazaar, Siddi Talim, Nai Kaman Road, Bidar - 585401",
        contact_number: "8416449758 / 82",
        contact_name: "Syed N",
        town_city: "Bidar",
        village_area: "Bidar",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "01-01-2026: Using Holy Faith curriculum, requested all Hauna sets for comparison. Await admin review after sample evaluation."
    },
    {
        name: "Wisdom School & PU College",
        address: "Old City Fort Area, Bidar - 585401",
        contact_number: "9914449000",
        contact_name: "Sunita",
        town_city: "Bidar",
        village_area: "Bidar",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "31-01-2026: Finalized Oxford books; order already placed. Revisit in Oct 2026 for next academic cycle."
    },
    {
        name: "Classic Public School",
        address: "Nizam's Function Palace, Near Old Civil Hospital, Bidar - 585401",
        contact_number: "9842051024",
        contact_name: "Admin/Asst: -",
        town_city: "Bidar",
        village_area: "Bidar",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "31-01-2026: Using Dubai based curriculum, details shared with in-charge; arrange meeting with admin."
    },
    {
        name: "Genius Kids Club School",
        address: "Mirza Complex, Opp. White House, Nayee Kaman, Bidar - 585401",
        contact_number: "-",
        contact_name: "-",
        town_city: "Bidar",
        village_area: "Bidar",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "31-01-2026: Not interested in changing curriculum; sample shared."
    },
    {
        name: "Holy Faith Public School",
        address: "Siddiq Sha Taleem, Choubaro to Nayee Kaman Road, Bidar - 585401",
        contact_number: "-",
        contact_name: "-",
        town_city: "Bidar",
        village_area: "Bidar",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "31-01-2026: Has own publishing unit; independent setup."
    },
    {
        name: "Ideal Global School",
        address: "Kareem Nagar, Basavakalyan, Karnataka",
        contact_number: "8747571222",
        contact_name: "Principal: Basil",
        town_city: "Basavakalyan",
        village_area: "Basavakalyan",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "02-02-2026: HM reviewed materials; decision depends on academic advisor. Await advisor feedback."
    },
    {
        name: "Madina Public School",
        address: "Chilla Galli, Basavakalyan - 585327",
        contact_number: "935728865",
        contact_name: "Principal: Md.",
        town_city: "Basavakalyan",
        village_area: "Basavakalyan",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "02-02-2026: Reviewed curriculum; asked detailed questions. Follow-up after one week."
    },
    {
        name: "Apple Valley School",
        address: "Chilla Galli, Basavakalyan",
        contact_number: "8217483250 / 76",
        contact_name: "President/HM",
        town_city: "Basavakalyan",
        village_area: "Basavakalyan",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "02-02-2026: HM newly appointed; will convey to admin. Await admin response."
    },
    {
        name: "Stanford Public School",
        address: "Katewadi, Basavakalyan",
        contact_number: "8217257519",
        contact_name: "HM: Parveen",
        town_city: "Basavakalyan",
        village_area: "Basavakalyan",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "02-02-2026: HM showed strong interest. Await discussion with admin."
    },
    {
        name: "Al Ameen Public School",
        address: "Near Jamia Masjid, Main Road, Basavakalyan",
        contact_number: "8880424787 / 82",
        contact_name: "HM/In-charge",
        town_city: "Basavakalyan",
        village_area: "Basavakalyan",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "02-02-2026: Briefed in-charge; HM unavailable. Await HM feedback."
    },
    {
        name: "Excellent Techno English Medium School",
        address: "Ghalib Nagar, Androon Quilla, Raichur - 584101",
        contact_number: "-",
        contact_name: "-",
        town_city: "Raichur",
        village_area: "Raichur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "13-02-2026: School closed (Juma); no meeting. Revisit required."
    },
    {
        name: "Princess Fatima Girls High School",
        address: "Tippu Sultan Road, Raichur - 584101",
        contact_number: "-",
        contact_name: "-",
        town_city: "Raichur",
        village_area: "Raichur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "13-02-2026: No preschool section; discussion denied."
    },
    {
        name: "Presidency School",
        address: "Tarunath Road, Raichur - 584101",
        contact_number: "-",
        contact_name: "-",
        town_city: "Raichur",
        village_area: "Raichur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "13-02-2026: Asked to reschedule due to school events. Visit on 17-02-2026."
    },
    {
        name: "Little Flower Nursery School",
        address: "Androon Quilla, Raichur - 584101",
        contact_number: "-",
        contact_name: "-",
        town_city: "Raichur",
        village_area: "Raichur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "13-02-2026: Extra denied; not interested."
    },
    {
        name: "Little Gems High School",
        address: "Navrang Darwaza, Raichur - 584101",
        contact_number: "9244449918",
        contact_name: "HM: Syeda Arif",
        town_city: "Raichur",
        village_area: "Raichur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "13-02-2026: Positive interest; admin already ordered books. Consider next academic year."
    },
    {
        name: "MG Public School",
        address: "Lal Talab Road, Basavakalyan - 585327",
        contact_number: "9164104090",
        contact_name: "HM: Munawar",
        town_city: "Basavakalyan",
        village_area: "Basavakalyan",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "16-02-2026: Sample shared; coordinator influencing decision. Ordered sample sets; negotiating pricing."
    },
    {
        name: "Excellent Public School",
        address: "Madeena Colony, Basavakalyan - 585327",
        contact_number: "6361858074",
        contact_name: "HM: Sheikh N",
        town_city: "Basavakalyan",
        village_area: "Basavakalyan",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "16-02-2026: Sample shared. Await decision."
    },
    {
        name: "The Age Public School",
        address: "Opp. Shanthi Ketan Ground, Basavakalyan - 585327",
        contact_number: "9845963550",
        contact_name: "HM/Principal",
        town_city: "Basavakalyan",
        village_area: "Basavakalyan",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "16-02-2026: Sample shared. Await internal discussion."
    },
    {
        name: "Innocuous National School",
        address: "LBS Nagar, Raichur",
        contact_number: "9972778191 / 79",
        contact_name: "Admin/HM: S",
        town_city: "Raichur",
        village_area: "Raichur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "17-02-2026: Finalized another publisher; may reconsider. Confirm in 2 days."
    },
    {
        name: "Tauhid National School",
        address: "LBS Nagar, Raichur - 584102",
        contact_number: "8088613405",
        contact_name: "Admin: Ibrahim",
        town_city: "Raichur",
        village_area: "Raichur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "17-02-2026: Busy with annual day. Follow-up on 18-02-2026."
    },
    {
        name: "The Iqra High School",
        address: "Near Ayya Boudi, Maddipeth, Raichur - 584101",
        contact_number: "9019183855",
        contact_name: "HM: Khamaru",
        town_city: "Raichur",
        village_area: "Raichur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "17-02-2026: Low probability this academic year. Monitor for next academic year."
    },
    {
        name: "Royal Public School",
        address: "Indira Nagar, Afzalpur - 585301",
        contact_number: "9731465132 / 99",
        contact_name: "Admin/In-charge",
        town_city: "Afzalpur",
        village_area: "Afzalpur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "18-02-2026: Admin unavailable; info shared. Await admin confirmation."
    },
    {
        name: "Princeton International School",
        address: "Usmania Colony, Afzalpur - 585301",
        contact_number: "7878739192",
        contact_name: "Admin: Aslam",
        town_city: "Afzalpur",
        village_area: "Afzalpur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "18-02-2026: Compared pricing with competitors. Await purchase decision."
    },
    {
        name: "Rahat Gandhi Primary School",
        address: "Siddeshwara Nagar, Afzalpur - 585301",
        contact_number: "9380515181 / 96",
        contact_name: "HM/Admin: R",
        town_city: "Afzalpur",
        village_area: "Afzalpur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "18-02-2026: Already ordered with existing publisher. Consider next academic year."
    },
    {
        name: "National English Medium School",
        address: "Usmania Colony, Afzalpur - 585301",
        contact_number: "8881034074 / 94",
        contact_name: "HM/Admin: J",
        town_city: "Afzalpur",
        village_area: "Afzalpur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "18-02-2026: Staff appreciated curriculum. Await admin response."
    },
    {
        name: "Nishanth Higher Primary School",
        address: "Adarsh Nagar, Afzalpur - 585301",
        contact_number: "8747890856 / 75",
        contact_name: "Admin/Presid",
        town_city: "Afzalpur",
        village_area: "Afzalpur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "18-02-2026: Strong interest but pricing concern. Await final decision."
    },
    {
        name: "Children English Medium School",
        address: "Near Zeina Masjid, Shahpur - 585223",
        contact_number: "9900874547",
        contact_name: "HM: Sameen",
        town_city: "Shahpur",
        village_area: "Shahpur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "24-02-2026: Using similar curriculum; interrupted by BEO visit. Revisit required."
    },
    {
        name: "Shama Public School",
        address: "Bus Stand Road, Shahpur - 585223",
        contact_number: "7259581709",
        contact_name: "Admin: Lokesh",
        town_city: "Shahpur",
        village_area: "Shahpur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "24-02-2026: Strong interest shown. Await management discussion."
    },
    {
        name: "Roshan Minar School",
        address: "Khawazpura, Shahpur - 585223",
        contact_number: "9319847223 / 61",
        contact_name: "Admin/In-charge",
        town_city: "Shahpur",
        village_area: "Shahpur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "24-02-2026: Details shared with in-charge. Await admin response."
    },
    {
        name: "IQRA Public School",
        address: "Mustafa Colony, Shahpur - 585223",
        contact_number: "9742583858 / 81",
        contact_name: "HM/In-charge",
        town_city: "Shahpur",
        village_area: "Shahpur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "24-02-2026: HM unavailable; info shared. Await feedback."
    },
    {
        name: "Sahara English Medium School",
        address: "Sahara Colony, Shahpur - 585223",
        contact_number: "9480161208",
        contact_name: "Admin: Chand",
        town_city: "Shahpur",
        village_area: "Shahpur",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "24-02-2026: Already ordered books. Reconnect in November."
    },
    {
        name: "Anjuman English Medium School",
        address: "Lachyan, Indi Taluk - 586209",
        contact_number: "8088787293 / 89",
        contact_name: "HM/In-charge",
        town_city: "Indi Taluk",
        village_area: "Indi Taluk",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "25-02-2026: Strong interest likely to order. High priority follow-up."
    },
    {
        name: "Bal Bharathi School",
        address: "Shanti Nagar, Indi Taluk - 586209",
        contact_number: "9972785970 / 91",
        contact_name: "HM/Admin: P",
        town_city: "Indi Taluk",
        village_area: "Indi Taluk",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "25-02-2026: Previously used curriculum; re-discussed. Await decision."
    },
    {
        name: "Umar Islamic School",
        address: "Hire Indi Road, Indi Taluk - 586209",
        contact_number: "8970599151",
        contact_name: "Admin: Mohan",
        town_city: "Indi Taluk",
        village_area: "Indi Taluk",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "25-02-2026: Interacted; will discuss with committee. Await internal decision."
    },
    {
        name: "Modal Public School",
        address: "Bagwan Nagar, Indi Taluk - 586209",
        contact_number: "8892994293",
        contact_name: "HM: Abdul Qu",
        town_city: "Indi Taluk",
        village_area: "Indi Taluk",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "25-02-2026: Left samples at office. Await contact."
    },
    {
        name: "Usmania Primary School",
        address: "Kanakagiri, Channagiri - 577213",
        contact_number: "9148324294",
        contact_name: "Admin: Safeer",
        town_city: "Channagiri",
        village_area: "Channagiri",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "28-02-2026: Admin/Principal wants to replace current curriculum. Regular follow-up visits requested."
    },
    {
        name: "Shanti Nagar School",
        address: "Main Road, Kanakagiri - 577213",
        contact_number: "9640772643",
        contact_name: "Admin: -",
        town_city: "Channagiri",
        village_area: "Channagiri",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "28-02-2026: Facing implementation issues. Needs monitoring and support."
    },
    {
        name: "Tipu Sultan Primary School",
        address: "Channagiri - 577213",
        contact_number: "8123123909 / 92",
        contact_name: "-",
        town_city: "Channagiri",
        village_area: "Channagiri",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "28-02-2026: School closed (Ramadan timing). Revisit required."
    },
    {
        name: "RYAN Public School",
        address: "Mahboob Nagar, Basavakalyan - 585327",
        contact_number: "9898838951",
        contact_name: "HM: Chand Bi",
        town_city: "Basavakalyan",
        village_area: "Basavakalyan",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "02-03-2026: Proposal under discussion. Await feedback."
    },
    {
        name: "The Age Primary School",
        address: "Pashapura, Basavakalyan - 585327",
        contact_number: "9035584030",
        contact_name: "President: Yun",
        town_city: "Basavakalyan",
        village_area: "Basavakalyan",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "02-03-2026: Requested sample & demo. Arrange demo."
    },
    {
        name: "Paramount Play School",
        address: "Bharath Chowk, Shahabad",
        contact_number: "9886342255",
        contact_name: "-",
        town_city: "Shahabad",
        village_area: "Shahabad",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "05-03-2026: Not interested; already ordered books. Next academic year."
    },
    {
        name: "Ali Safe School",
        address: "Hagarga Road, Kalaburagi",
        contact_number: "8884693224",
        contact_name: "Principal: Res",
        town_city: "Kalaburagi",
        village_area: "Kalaburagi",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "07-03-2026: Not interested; already ordered books. Next academic year."
    },
    {
        name: "IQRA International School",
        address: "Ring Road, Kalaburagi - 585104",
        contact_number: "7204774506",
        contact_name: "Admin: Sobela",
        town_city: "Kalaburagi",
        village_area: "Kalaburagi",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "10-03-2026: Interested; using in-house curriculum. Follow-up."
    },
    {
        name: "Saba International School",
        address: "Hagarga Cross, Kalaburagi - 585104",
        contact_number: "9541913504",
        contact_name: "HM: Atika Hir",
        town_city: "Kalaburagi",
        village_area: "Kalaburagi",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "10-03-2026: Sample retained. Await admin return."
    },
    {
        name: "Al Qalam School (Branch 2)",
        address: "Mallikarjuna Nagar, Davanagere - 577004",
        contact_number: "7022580179",
        contact_name: "Admin: Ayesha",
        town_city: "Davanagere",
        village_area: "Davanagere",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "15-03-2026: Needs full set review. Await decision."
    },
    {
        name: "Al Iman School",
        address: "GDA Layout, Kalaburagi",
        contact_number: "6362585962",
        contact_name: "HM: In-charge",
        town_city: "Kalaburagi",
        village_area: "Kalaburagi",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "16-03-2026: School closed. Follow-up after Eid."
    },
    {
        name: "Daffodil Public School",
        address: "Sahebganj Colony, Bidar - 585401",
        contact_number: "9342751593",
        contact_name: "HM: Akhila",
        town_city: "Bidar",
        village_area: "Bidar",
        marketing_person: "Mr. Mujahid BH",
        channel_partner: "Direct",
        onboarding_comments: "16-03-2026: Explained curriculum. Await admin's decision."
    }
];

async function importSchools() {
    console.log(`Starting import of ${schoolsData.length} schools...`);
    const batch = db.batch();
    const schoolsCol = db.collection('schools');

    for (const school of schoolsData) {
        const docRef = schoolsCol.doc();
        const schoolData = {
            id: docRef.id,
            name: school.name,
            code: `LEAD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            address: school.address,
            phone: school.contact_number,
            email: '',
            h1_count: 0,
            h2_count: 0,
            h3_count: 0,
            principal_name: school.contact_name,
            state: "Karnataka",
            status: 'onboarding',
            contact_name: school.contact_name,
            contact_number: school.contact_number,
            conversion_rate: 10,
            marketing_person: school.marketing_person,
            channel_partner: school.channel_partner,
            onboarding_comments: school.onboarding_comments,
            town_city: school.town_city,
            village_area: school.village_area,
            academic_year: "2026-27",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        batch.set(docRef, schoolData);
    }

    try {
        await batch.commit();
        console.log(`${schoolsData.length} schools imported successfully!`);
    } catch (error) {
        console.error('Error importing schools:', error);
    }
}

importSchools().then(() => process.exit());

