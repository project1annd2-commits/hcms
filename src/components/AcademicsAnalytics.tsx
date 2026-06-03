import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import {
    BarChart3,
    LineChart,
    Download,
    TrendingUp,
    Users,
    BookOpen,
    Filter,
    AlertCircle,
    Search,
    Clock
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart as RechartsLineChart,
    Line
} from 'recharts';
import { TrainingProgram, TrainingAssignment, MentorTrainingAssignment, User, Teacher, Mentor, School, TrainingAttendance } from '../lib/models';

interface Props {
    currentUser: User;
}

export default function AcademicsAnalytics({ currentUser }: Props) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalParticipants: 0,
        avgPhonics: 0,
        avgVocabulary: 0,
        phonicsDistribution: [] as any[],
        vocabularyDistribution: [] as any[],
        schoolPerformance: [] as any[],
    });
    const [atRiskParticipants, setAtRiskParticipants] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (currentUser) {
            loadData();
        }
    }, [currentUser]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Training Programs
            const allPrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});
            const c10Programs = allPrograms.filter(p =>
                (p.title || '').toLowerCase().includes('c10') ||
                (p.title || '').toLowerCase().includes('c.10')
            );

            if (c10Programs.length === 0) {
                setLoading(false);
                return;
            }

            const c10ProgramIds = c10Programs.map(p => p.id!);

            // 2. Fetch Assignments & Attendance
            const [
                teacherAssignments,
                mentorAssignments,
                schoolsData,
                teachersData,
                mentorsData,
                schoolAssignments,
                teacherAttendance,
                mentorAttendance
            ] = await Promise.all([
                db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, { training_program_id: { $in: c10ProgramIds } }),
                db.find<MentorTrainingAssignment>(Collections.MENTOR_TRAINING_ASSIGNMENTS, { training_program_id: { $in: c10ProgramIds } }),
                db.find<School>(Collections.SCHOOLS, {}),
                db.find<Teacher>(Collections.TEACHERS, {}),
                db.find<Mentor>(Collections.MENTORS, {}),
                db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id }),
                db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, { training_program_id: { $in: c10ProgramIds } }),
                db.find<any>(Collections.MENTOR_TRAINING_ATTENDANCE, { training_program_id: { $in: c10ProgramIds } })
            ]);

            // Determine visible schools for the current user
            let visibleSchoolIds: string[] = [];
            if (currentUser.role === 'admin') {
                visibleSchoolIds = schoolsData.map(s => s.id!);
            } else {
                visibleSchoolIds = schoolAssignments.map((sa: any) => sa.school_id);
            }

            const allAssignments = [...(teacherAssignments || []), ...(mentorAssignments || [])];
            const allAttendance = [...(teacherAttendance || []), ...(mentorAttendance || [])];

            let totalPhonics = 0;
            let totalVocabulary = 0;
            let countPhonics = 0;
            let countVocabulary = 0;

            const phonicsScores: number[] = [];
            const vocabScores: number[] = [];
            const riskyList: any[] = [];

            allAssignments.forEach(assignment => {
                // Identify User
                const isTeacher = 'teacher_id' in assignment;
                const userId = isTeacher ? (assignment as TrainingAssignment).teacher_id : (assignment as MentorTrainingAssignment).mentor_id;
                const user = isTeacher ? teachersData.find(t => t.id === userId) : mentorsData.find(m => m.id === userId);

                if (!user || (user.school_id && !visibleSchoolIds.includes(user.school_id))) {
                    return; // Skip if user not managed by this employee
                }

                const school = schoolsData.find(s => s.id === user.school_id);
                const marks = assignment.marks_data || {};
                const phonicsKey = Object.keys(marks).find(k => k.toLowerCase().includes('phonics'));
                const vocabKey = Object.keys(marks).find(k => k.toLowerCase().includes('vocabulary'));

                let phonicsScore = 0;
                let vocabScore = 0;
                let hasPhonics = false;
                let hasVocab = false;

                // Marks Processing
                if (phonicsKey && typeof marks[phonicsKey] === 'number') {
                    const score = marks[phonicsKey];
                    const program = c10Programs.find(p => p.id === assignment.training_program_id);
                    const subject = program?.marks_configuration?.subjects.find(s => s.name === phonicsKey);

                    let normalized = score;
                    if (subject && subject.max_marks > 0) {
                        normalized = Math.round((score / subject.max_marks) * 100);
                    }
                    phonicsScore = normalized;
                    totalPhonics += normalized;
                    countPhonics++;
                    phonicsScores.push(normalized);
                    hasPhonics = true;
                }

                if (vocabKey && typeof marks[vocabKey] === 'number') {
                    const score = marks[vocabKey];
                    const program = c10Programs.find(p => p.id === assignment.training_program_id);
                    const subject = program?.marks_configuration?.subjects.find(s => s.name === vocabKey);

                    let normalized = score;
                    if (subject && subject.max_marks > 0) {
                        normalized = Math.round((score / subject.max_marks) * 100);
                    }
                    vocabScore = normalized;
                    totalVocabulary += normalized;
                    countVocabulary++;
                    vocabScores.push(normalized);
                    hasVocab = true;
                }

                // Attendance Processing
                // C10 has fixed 16 sessions
                const totalSessions = 16;
                const userAttendance = allAttendance.filter(r =>
                    (isTeacher ? r.teacher_id === userId : r.mentor_id === userId) &&
                    r.training_program_id === assignment.training_program_id &&
                    (r.status === 'present' || r.status === 'late')
                );
                const presentCount = userAttendance.length;
                const attendancePercentage = Math.round((presentCount / totalSessions) * 100);


                // Check for Risk (Score < 60% OR Attendance < 75%)
                const lowPhonics = hasPhonics && phonicsScore < 60;
                const lowVocab = hasVocab && vocabScore < 60;
                const lowAttendance = attendancePercentage < 75;

                if (lowPhonics || lowVocab || lowAttendance) {
                    riskyList.push({
                        id: assignment.id,
                        name: `${user.first_name} ${user.last_name}`,
                        role: isTeacher ? 'Teacher' : 'Mentor',
                        schoolName: school?.name || 'Unknown School',
                        phonics: hasPhonics ? phonicsScore : 'N/A',
                        vocabulary: hasVocab ? vocabScore : 'N/A',
                        attendance: attendancePercentage,
                        lowPhonics,
                        lowVocab,
                        lowAttendance,
                        programName: c10Programs.find(p => p.id === assignment.training_program_id)?.title || 'Unknown Program'
                    });
                }
            });

            // Prepare Chart Data
            const buckets = ['0-20', '21-40', '41-60', '61-80', '81-100'];
            const phonicsDist = buckets.map(bucket => ({ name: bucket, count: 0 }));
            const vocabDist = buckets.map(bucket => ({ name: bucket, count: 0 }));

            phonicsScores.forEach(score => {
                let idx = 0;
                if (score > 80) idx = 4;
                else if (score > 60) idx = 3;
                else if (score > 40) idx = 2;
                else if (score > 20) idx = 1;
                else idx = 0;
                phonicsDist[idx].count++;
            });

            vocabScores.forEach(score => {
                let idx = 0;
                if (score > 80) idx = 4;
                else if (score > 60) idx = 3;
                else if (score > 40) idx = 2;
                else if (score > 20) idx = 1;
                else idx = 0;
                vocabDist[idx].count++;
            });

            setStats({
                totalParticipants: phonicsScores.length, // Approx
                avgPhonics: countPhonics > 0 ? Math.round(totalPhonics / countPhonics) : 0,
                avgVocabulary: countVocabulary > 0 ? Math.round(totalVocabulary / countVocabulary) : 0,
                phonicsDistribution: phonicsDist,
                vocabularyDistribution: vocabDist,
                schoolPerformance: [],
            });

            setAtRiskParticipants(riskyList);

        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
        setLoading(false);
    };

    const filteredRiskyList = atRiskParticipants.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.schoolName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-3 rounded-lg">
                            <TrendingUp className="text-indigo-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Academics Analytics</h3>
                            <p className="text-sm text-gray-600">Performance analytics for C10 Training (Phonics & Vocabulary)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Participants</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.totalParticipants}</p>
                        </div>
                        <Users className="text-gray-400" size={40} />
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Avg. Phonics Score</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.avgPhonics}%</p>
                        </div>
                        <BookOpen className="text-blue-400" size={40} />
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Avg. Vocabulary Score</p>
                            <p className="text-3xl font-bold text-green-600">{stats.avgVocabulary}%</p>
                        </div>
                        <BookOpen className="text-green-400" size={40} />
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Phonics Distribution */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h4 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-600" />
                        Phonics Score Distribution
                    </h4>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.phonicsDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" label={{ value: 'Score Range (%)', position: 'insideBottom', offset: -5 }} />
                                <YAxis allowDecimals={false} label={{ value: 'Participants', angle: -90, position: 'insideLeft' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#eff6ff' }}
                                />
                                <Bar dataKey="count" name="Participants" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Vocabulary Distribution */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h4 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-green-600" />
                        Vocabulary Score Distribution
                    </h4>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.vocabularyDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" label={{ value: 'Score Range (%)', position: 'insideBottom', offset: -5 }} />
                                <YAxis allowDecimals={false} label={{ value: 'Participants', angle: -90, position: 'insideLeft' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#eff6ff' }}
                                />
                                <Bar dataKey="count" name="Participants" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Teachers Needing Support */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="flex items-center gap-2 text-lg font-bold text-red-600">
                                <AlertCircle size={20} />
                                Teachers Needing Support
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">Participants with scores below 60% or attendance below 75%</p>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search teacher or school..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher/Mentor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Phonics</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vocabulary</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRiskyList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No participants found needing support based on current criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredRiskyList.map((item) => (
                                    <tr key={item.id} className="hover:bg-red-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.role}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600">{item.schoolName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.lowPhonics ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {item.phonics !== 'N/A' ? `${item.phonics}%` : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.lowVocab ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {item.vocabulary !== 'N/A' ? `${item.vocabulary}%` : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.lowAttendance ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {item.attendance}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {item.lowPhonics && (
                                                    <span className="text-xs text-red-600 flex items-center gap-1">
                                                        <AlertCircle size={12} /> Low Phonics
                                                    </span>
                                                )}
                                                {item.lowVocab && (
                                                    <span className="text-xs text-red-600 flex items-center gap-1">
                                                        <AlertCircle size={12} /> Low Vocabulary
                                                    </span>
                                                )}
                                                {item.lowAttendance && (
                                                    <span className="text-xs text-red-600 flex items-center gap-1">
                                                        <Clock size={12} /> Low Attendance
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
