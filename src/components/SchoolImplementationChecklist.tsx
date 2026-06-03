import React, { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { User, School, Teacher, Mentor, Management } from '../lib/models';
import {
    ClipboardCheck,
    Save,
    AlertCircle,
    Clock,
    Printer
} from 'lucide-react';

interface Props {
    currentUser: User | Teacher | Mentor | Management;
    userType: 'admin' | 'employee' | 'teacher' | 'mentor' | 'viewer' | 'management';
    targetSchoolId?: string;
}

interface ChecklistItem {
    id: string;
    parameter: string;
    weightage: number;
    category: string;
}

const IMPLEMENTATION_STRUCTURE: Record<string, ChecklistItem[]> = {
    "A. Indoor & outdoor": [
        { id: 'a_1', parameter: 'School board', weightage: 10, category: 'A' },
        { id: 'a_2', parameter: 'Sign / Direction board', weightage: 6, category: 'A' },
        { id: 'a_3', parameter: 'Painting / Displays', weightage: 10, category: 'A' },
        { id: 'a_4', parameter: 'Playground/play area', weightage: 5, category: 'A' },
        { id: 'a_5', parameter: 'Play equipments', weightage: 5, category: 'A' },
        { id: 'a_6', parameter: 'Location / accessibility', weightage: 5, category: 'A' },
        { id: 'a_7', parameter: 'Play equipments (Indoor)', weightage: 10, category: 'A' },
        { id: 'a_8', parameter: 'Sand pit', weightage: 10, category: 'A' },
        { id: 'a_9', parameter: 'Grass mat', weightage: 10, category: 'A' },
        { id: 'a_10', parameter: 'Indoor plants (Minimum 4 pots)', weightage: 10, category: 'A' },
        { id: 'a_11', parameter: 'Aquarium', weightage: 7, category: 'A' },
        { id: 'a_12', parameter: 'Reading corner', weightage: 10, category: 'A' },
        { id: 'a_13', parameter: 'CCTV camera', weightage: 10, category: 'A' },
        { id: 'a_14', parameter: 'Fire extinguisher', weightage: 10, category: 'A' },
    ],
    "B. Classroom": [
        { id: 'b_1', parameter: 'Paint choice', weightage: 10, category: 'B' },
        { id: 'b_2', parameter: 'Shoe rack', weightage: 10, category: 'B' },
        { id: 'b_3', parameter: 'Display boards [Minimum 4 per class]', weightage: 10, category: 'B' },
        { id: 'b_4', parameter: 'Notice board', weightage: 10, category: 'B' },
        { id: 'b_5', parameter: 'Black board', weightage: 10, category: 'B' },
        { id: 'b_6', parameter: 'Bag hanger', weightage: 10, category: 'B' },
        { id: 'b_7', parameter: 'Book racks', weightage: 10, category: 'B' },
        { id: 'b_8', parameter: 'Dustbins', weightage: 10, category: 'B' },
        { id: 'b_9', parameter: 'Big mats', weightage: 10, category: 'B' },
        { id: 'b_10', parameter: 'Spacious & Ventilation', weightage: 8, category: 'B' },
        { id: 'b_11', parameter: 'First aid box', weightage: 10, category: 'B' },
        { id: 'b_12', parameter: 'TLM/Flash cards....[ ]', weightage: 10, category: 'B' },
        { id: 'b_13', parameter: 'Height Chart', weightage: 10, category: 'B' },
    ],
    "C. Teachers": [
        { id: 'c_1', parameter: 'Qualification', weightage: 10, category: 'C' },
        { id: 'c_2', parameter: 'Experience (Hauna)', weightage: 10, category: 'C' },
        { id: 'c_3', parameter: 'Overall teaching experience', weightage: 10, category: 'C' },
        { id: 'c_4', parameter: 'Teaching competency', weightage: 10, category: 'C' },
        { id: 'c_5', parameter: 'English Communication (LSRW)', weightage: 10, category: 'C' },
        { id: 'c_6', parameter: 'Hauna Pedagogies', weightage: 10, category: 'C' },
        { id: 'c_7', parameter: 'Child Psychology', weightage: 10, category: 'C' },
        { id: 'c_8', parameter: 'Interaction with parents', weightage: 10, category: 'C' },
        { id: 'c_9', parameter: 'Organizational skills', weightage: 10, category: 'C' },
        { id: 'c_10', parameter: 'Time management', weightage: 10, category: 'C' },
        { id: 'c_11', parameter: 'Patience', weightage: 10, category: 'C' },
        { id: 'c_12', parameter: 'Soft spoken', weightage: 10, category: 'C' },
        { id: 'c_13', parameter: 'Self presentation', weightage: 10, category: 'C' },
        { id: 'c_14', parameter: 'Hygiene', weightage: 10, category: 'C' },
        { id: 'c_15', parameter: 'Training on first aid', weightage: 10, category: 'C' },
        { id: 'c_16', parameter: 'Hauna timetable', weightage: 5, category: 'C' },
        { id: 'c_17', parameter: 'Training on nutrition', weightage: 10, category: 'C' },
    ],
    "D. HM's / mentor": [
        { id: 'd_1', parameter: 'Walk through & lessons', weightage: 15, category: 'D' },
        { id: 'd_2', parameter: 'Admission register', weightage: 15, category: 'D' },
        { id: 'd_3', parameter: 'Class profile & teachers\' profile', weightage: 15, category: 'D' },
        { id: 'd_4', parameter: 'Diary[ lesson plans ]', weightage: 15, category: 'D' },
        { id: 'd_5', parameter: 'Attendance register [ students &... ]', weightage: 15, category: 'D' },
        { id: 'd_6', parameter: 'Academic calendar', weightage: 10, category: 'D' },
        { id: 'd_7', parameter: 'Perceptions of HM about Hauna', weightage: 10, category: 'D' },
    ],
    "E. General Infrastructure": [
        { id: 'e_1', parameter: 'LCD in common hall with school pictures/events', weightage: 8, category: 'E' },
        { id: 'e_2', parameter: 'Safe drinking water', weightage: 10, category: 'E' },
        { id: 'e_3', parameter: 'Cleanliness checklist', weightage: 10, category: 'E' },
        { id: 'e_4', parameter: 'Good reception area', weightage: 10, category: 'E' },
        { id: 'e_5', parameter: 'Parents waiting area', weightage: 10, category: 'E' },
    ],
    "F. Marketing": [
        { id: 'f_1', parameter: 'Banners / Flyers', weightage: 10, category: 'F' },
        { id: 'f_2', parameter: 'Medium hoardings', weightage: 5, category: 'F' },
        { id: 'f_3', parameter: 'Social media marketing', weightage: 5, category: 'F' },
        { id: 'f_4', parameter: 'Door to door campaign [3 Months before the Academic Year]', weightage: 5, category: 'F' },
        { id: 'f_5', parameter: 'Sibling discount', weightage: 10, category: 'F' },
        { id: 'f_6', parameter: 'Referral discount(token of appreciation)', weightage: 10, category: 'F' },
        { id: 'f_7', parameter: 'Merit scholarship', weightage: 10, category: 'F' },
        { id: 'f_8', parameter: 'Pre awareness of upcoming month\'s curriculum coverage', weightage: 10, category: 'F' },
        { id: 'f_9', parameter: 'Weekly updates to parents of the curriculum covered.', weightage: 10, category: 'F' },
        { id: 'f_10', parameter: 'Admin should be aware of Hauna briefly for admission purpose', weightage: 10, category: 'F' },
        { id: 'f_11', parameter: 'Mothers weekly offline programme', weightage: 10, category: 'F' },
        { id: 'f_12', parameter: 'Public open house', weightage: 10, category: 'F' },
        { id: 'f_13', parameter: 'Admission query register management', weightage: 10, category: 'F' },
        { id: 'f_14', parameter: 'Scholarship programme', weightage: 10, category: 'F' },
        { id: 'f_15', parameter: 'On time uniform', weightage: 10, category: 'F' },
        { id: 'f_16', parameter: 'Quality uniform / sweaters', weightage: 10, category: 'F' },
        { id: 'f_17', parameter: 'Staff incentives', weightage: 10, category: 'F' },
        { id: 'f_18', parameter: 'Parent open house', weightage: 10, category: 'F' },
    ],
    "G. Administration": [
        { id: 'g_1', parameter: 'Health Camps', weightage: 10, category: 'G' },
        { id: 'g_2', parameter: 'Weighing scale', weightage: 10, category: 'G' },
        { id: 'g_3', parameter: 'Marks card', weightage: 10, category: 'G' },
        { id: 'g_4', parameter: 'Local Ullama\'s perception', weightage: 10, category: 'G' },
        { id: 'g_5', parameter: 'Annual day', weightage: 10, category: 'G' },
        { id: 'g_6', parameter: 'Sports day', weightage: 10, category: 'G' },
        { id: 'g_7', parameter: 'Annual Exhibition', weightage: 10, category: 'G' },
        { id: 'g_8', parameter: 'Parents orientation', weightage: 10, category: 'G' },
        { id: 'g_9', parameter: 'PTM (Theme wise)', weightage: 10, category: 'G' },
        { id: 'g_10', parameter: 'Staff promotion', weightage: 10, category: 'G' },
        { id: 'g_11', parameter: 'Staff yearly performance appraisal', weightage: 10, category: 'G' },
        { id: 'g_12', parameter: 'Supporting staff behaviour', weightage: 10, category: 'G' },
        { id: 'g_13', parameter: 'Field trips', weightage: 10, category: 'G' },
    ],
    "H. Training": [
        { id: 'h_1', parameter: 'Standardized training feedback', weightage: 10, category: 'H' },
        { id: 'h_2', parameter: 'Regular trainings', weightage: 10, category: 'H' },
        { id: 'h_3', parameter: 'Weekly meeting', weightage: 10, category: 'H' },
        { id: 'h_4', parameter: 'Need based trainings', weightage: 10, category: 'H' },
        { id: 'h_5', parameter: 'Attending morning and evening', weightage: 10, category: 'H' },
    ],
    "I. Children / Parent": [
        { id: 'i_1', parameter: 'Parents Literacy', weightage: 10, category: 'I' },
        { id: 'i_2', parameter: 'Parents commitment to school', weightage: 10, category: 'I' },
        { id: 'i_3', parameter: 'Child\'s attendance at school', weightage: 10, category: 'I' },
        { id: 'i_4', parameter: 'Food,Nutrition and health', weightage: 10, category: 'I' },
        { id: 'i_5', parameter: 'ID card & escort card', weightage: 10, category: 'I' },
        { id: 'i_6', parameter: 'Tarbiyah Checklist adherence', weightage: 10, category: 'I' },
    ]
};

interface SchoolChecklistData {
    id?: string;
    school_id: string;
    items: Record<string, {
        priority?: string;
        current_weightage?: number;
        timeline?: string;
        ownership?: string;
        budget?: string;
        status?: string;
        comments?: string;
    }>;
    updated_at: string;
    [key: string]: unknown;
}

export default function SchoolImplementationChecklist({ currentUser, userType, targetSchoolId }: Props) {
    const [schools, setSchools] = useState<School[]>([]);
    const [activeSchoolId, setActiveSchoolId] = useState<string | null>(targetSchoolId || null);
    const [checklistData, setChecklistData] = useState<Record<string, SchoolChecklistData>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState<string>('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // 1. Load Schools based on role
            let schoolsData: School[] = [];
            const allSchools = await db.find<School>(Collections.SCHOOLS, {});

            const userObj = currentUser as any;
            const fullName = (userObj.full_name || '').toLowerCase();
            const username = (userObj.username || '').toLowerCase();
            const identifier = `${fullName} ${username}`;
            
            const isAnees = (identifier.includes('anees') || identifier.includes('annes')) && 
                            (identifier.includes('unnisa') || identifier.includes('unissa') || identifier.includes('unnis'));
            const isAsmaAyesha = identifier.includes('asma') || identifier.includes('ayesha');

            if (userType === 'admin' || isAnees || isAsmaAyesha) {
                schoolsData = allSchools;
            } else if (userType === 'teacher' || userType === 'mentor' || userType === 'management') {
                const schoolId = (currentUser as Teacher | Mentor | Management).school_id;
                schoolsData = allSchools.filter(s => s.id === schoolId);
                if (schoolsData.length > 0 && !activeSchoolId) {
                    setActiveSchoolId(schoolsData[0].id!);
                }
            } else if (userType === 'employee') {
                const assignments = await db.find<{ employee_id: string; school_id: string }>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
                const assignedIds = assignments.map(a => a.school_id);
                schoolsData = allSchools.filter(s => s.id && assignedIds.includes(s.id));
            }

            setSchools(schoolsData);

            // 2. Load Checklist Data
            const existingChecklists = await db.find<SchoolChecklistData>('implementation_checklists', {});
            const map: Record<string, SchoolChecklistData> = {};
            existingChecklists.forEach(c => { map[c.school_id] = c; });
            setChecklistData(map);

        } catch (error) {
            console.error('Error loading checklist data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateField = (schoolId: string, itemId: string, field: 'status' | 'notes' | 'priority' | 'current_weightage' | 'timeline' | 'ownership' | 'budget' | 'comments', value: string | number) => {
        setChecklistData(prev => {
            const schoolData = prev[schoolId] || { school_id: schoolId, items: {}, updated_at: new Date().toISOString() };
            const itemData = schoolData.items[itemId] || {};

            return {
                ...prev,
                [schoolId]: {
                    ...schoolData,
                    items: {
                        ...schoolData.items,
                        [itemId]: {
                            ...itemData,
                            [field]: value
                        }
                    }
                }
            };
        });
    };

    const saveChecklist = async (schoolId: string) => {
        setSaving(true);
        try {
            const data = checklistData[schoolId];
            if (!data) return;

            const existing = await db.find<SchoolChecklistData>('implementation_checklists', { school_id: schoolId });
            if (existing.length > 0) {
                await db.updateById('implementation_checklists', existing[0].id!, {
                    items: data.items,
                    updated_at: new Date().toISOString()
                });
            } else {
                await db.insertOne('implementation_checklists', {
                    ...data,
                    updated_at: new Date().toISOString()
                });
            }
            alert('Checklist saved successfully!');
        } catch (error) {
            console.error('Error saving checklist:', error);
            alert('Failed to save checklist.');
        } finally {
            setSaving(false);
        }
    };

    const calculateTotals = (schoolId: string) => {
        let totalMax = 0;
        let totalCurrent = 0;

        // Use filtered domains instead of all domains
        filteredDomains.forEach(([, items]) => {
            items.forEach(item => {
                totalMax += item.weightage;
                totalCurrent += Number(checklistData[schoolId]?.items[item.id]?.current_weightage || 0);
            });
        });

        return { totalMax, totalCurrent };
    };

    // Filter domains based on selected domain
    const filteredDomains = selectedDomain === 'all'
        ? Object.entries(IMPLEMENTATION_STRUCTURE)
        : Object.entries(IMPLEMENTATION_STRUCTURE).filter(([domain]) => domain === selectedDomain);

    if (loading) return <div className="flex h-64 items-center justify-center"><Clock className="animate-spin text-blue-600" /></div>;

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <ClipboardCheck className="text-blue-600" size={32} />
                            SCHOOL IMPLEMENTATION
                        </h1>
                        <p className="text-gray-500 font-bold mt-1">Setup & Quality Standards Checklist</p>
                    </div>

                    {userType === 'admin' || userType === 'employee' || userType === 'mentor' ? (
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
                            <div className="w-full md:w-72">
                                <select
                                    title="School Selection"
                                    value={activeSchoolId || ''}
                                    onChange={(e) => setActiveSchoolId(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-black text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none text-gray-700 cursor-pointer shadow-sm"
                                >
                                    <option value="" disabled>Select a school</option>
                                    {schools.map(school => (
                                        <option key={school.id} value={school.id}>{school.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 no-print">
                                <button
                                    onClick={() => window.print()}
                                    className="hidden md:flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-black text-sm hover:bg-gray-200 transition-all shadow-sm"
                                >
                                    <Printer size={18} />
                                    PRINT
                                </button>
                                <button
                                    onClick={() => activeSchoolId && saveChecklist(activeSchoolId)}
                                    disabled={saving || !activeSchoolId}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {saving ? 'Saving...' : 'SAVE'}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>

                {userType === 'admin' || userType === 'employee' || userType === 'mentor' ? (
                    <div className="w-full overflow-x-auto pb-2">
                        <div className="flex gap-2 min-w-max">
                            <button
                                onClick={() => setSelectedDomain('all')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${selectedDomain === 'all'
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                All Domains
                            </button>
                            {Object.keys(IMPLEMENTATION_STRUCTURE).map(domain => (
                                <button
                                    key={domain}
                                    onClick={() => setSelectedDomain(domain)}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${selectedDomain === domain
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {domain}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="w-full">
                    {activeSchoolId ? (
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between bg-white sticky top-0 z-10 gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-wider">
                                        {selectedDomain === 'all' ? 'All Domains' : selectedDomain}
                                    </h2>
                                    <div className="mt-2 flex items-center gap-4">
                                        <span className="text-sm font-bold text-gray-500">
                                            Total: <span className="text-gray-900">{calculateTotals(activeSchoolId).totalCurrent}</span> / {calculateTotals(activeSchoolId).totalMax}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-900">
                                            <th className="p-4 text-left text-[10px] font-black text-white uppercase tracking-widest border border-gray-800">Parameters</th>
                                            <th className="p-4 text-center text-[10px] font-black text-white uppercase tracking-widest border border-gray-800 w-20">Weightage</th>
                                            <th className="p-4 text-center text-[10px] font-black text-white uppercase tracking-widest border border-gray-800 w-24">Obtained</th>
                                            <th className="p-4 text-center text-[10px] font-black text-white uppercase tracking-widest border border-gray-800 w-32">Timeline</th>
                                            <th className="p-4 text-center text-[10px] font-black text-white uppercase tracking-widest border border-gray-800 w-32">Ownership</th>
                                            <th className="p-4 text-center text-[10px] font-black text-white uppercase tracking-widest border border-gray-800 w-32">Status</th>
                                            <th className="p-4 text-left text-[10px] font-black text-white uppercase tracking-widest border border-gray-800 min-w-[200px]">Comments</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDomains.map(([categoryName, items]) => (
                                            <React.Fragment key={categoryName}>
                                                <tr className="bg-blue-50/50">
                                                    <td colSpan={7} className="p-4 font-black text-blue-800 text-xs italic uppercase border-x border-gray-100">
                                                        {categoryName}
                                                    </td>
                                                </tr>
                                                {items.map((item, idx) => {
                                                    const data = checklistData[activeSchoolId]?.items[item.id] || {};
                                                    return (
                                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                                                            <td className="p-4 text-xs font-bold text-gray-700 border-r border-gray-100">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-gray-300 tabular-nums">{idx + 1}</span>
                                                                    {item.parameter}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-center font-black text-gray-400 text-xs border-r border-gray-100 tabular-nums">
                                                                {item.weightage}
                                                            </td>
                                                            <td className="p-2 border-r border-gray-100">
                                                                <input
                                                                    type="number"
                                                                    value={data.current_weightage || ''}
                                                                    onChange={(e) => handleUpdateField(activeSchoolId, item.id, 'current_weightage', Number(e.target.value))}
                                                                    placeholder="0"
                                                                    className="w-full bg-blue-50/30 border-none font-black text-xs text-center focus:ring-2 focus:ring-blue-200 rounded p-1 tabular-nums"
                                                                />
                                                            </td>
                                                            <td className="p-2 border-r border-gray-100">
                                                                <input
                                                                    type="text"
                                                                    value={data.timeline || ''}
                                                                    onChange={(e) => handleUpdateField(activeSchoolId, item.id, 'timeline', e.target.value)}
                                                                    placeholder="Jan 2024"
                                                                    className="w-full bg-transparent border-none font-bold text-[10px] text-center focus:ring-0"
                                                                />
                                                            </td>
                                                            <td className="p-2 border-r border-gray-100">
                                                                <input
                                                                    type="text"
                                                                    value={data.ownership || ''}
                                                                    onChange={(e) => handleUpdateField(activeSchoolId, item.id, 'ownership', e.target.value)}
                                                                    placeholder="Name"
                                                                    className="w-full bg-transparent border-none font-bold text-[10px] text-center focus:ring-0"
                                                                />
                                                            </td>
                                                            <td className="p-2 border-r border-gray-100">
                                                                <select
                                                                    value={data.status || 'Pending'}
                                                                    onChange={(e) => handleUpdateField(activeSchoolId, item.id, 'status', e.target.value)}
                                                                    className={`w-full bg-transparent border-none font-black text-[10px] text-center focus:ring-0 cursor-pointer ${data.status === 'Completed' ? 'text-green-600' :
                                                                        data.status === 'In Progress' ? 'text-blue-600' : 'text-gray-400'
                                                                        }`}
                                                                >
                                                                    <option value="Pending">Pending</option>
                                                                    <option value="In Progress">Working</option>
                                                                    <option value="Completed">Done</option>
                                                                    <option value="N/A">N/A</option>
                                                                </select>
                                                            </td>
                                                            <td className="p-2">
                                                                <textarea
                                                                    value={data.comments || ''}
                                                                    onChange={(e) => handleUpdateField(activeSchoolId, item.id, 'comments', e.target.value)}
                                                                    placeholder="Notes..."
                                                                    className="w-full bg-transparent border-none text-[10px] font-medium focus:ring-0 resize-none"
                                                                    rows={1}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                        <tr className="bg-gray-50">
                                            <td colSpan={2} className="p-4 text-right font-black text-gray-500 uppercase tracking-widest text-[10px]">Total Score</td>
                                            <td className="p-4 text-center font-black text-gray-900 border-r tabular-nums">{calculateTotals(activeSchoolId).totalMax}</td>
                                            <td className="p-4 text-center font-black text-blue-600 bg-blue-50 tabular-nums">
                                                {calculateTotals(activeSchoolId).totalCurrent}
                                            </td>
                                            <td colSpan={4} className="bg-gray-50"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                            <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-black text-gray-800 uppercase">No School Selected</h3>
                            <p className="text-gray-500 font-bold mt-2">Please select a school to view its implementation progress.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
