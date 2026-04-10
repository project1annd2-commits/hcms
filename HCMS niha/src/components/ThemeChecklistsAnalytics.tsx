import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import {
    ClipboardCheck,
    TrendingUp,
    Users,
    Building2,
    Search,
    GraduationCap,
    CheckCircle2,
    Clock,
    ChevronDown
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { User, School, Student, StudentAssessment, Teacher, Mentor } from '../lib/models';
import { THEMES } from './StudentAssessmentForm';

interface Props {
    currentUser: User | Teacher | Mentor;
}

interface DomainStat {
    name: string;
    can: number;
    trying: number;
    help: number;
}

interface SchoolStats {
    id: string;
    name: string;
    totalStudents: number;
    assessedStudents: number;
    completionRate: number;
    gradeStats: {
        H1: { total: number; assessed: number };
        H2: { total: number; assessed: number };
        H3: { total: number; assessed: number };
    };
    domainStats?: DomainStat[];
}

const isUser = (u: any): u is User => u && 'role' in u;
const isMentor = (u: any): u is Mentor => u && 'specialization' in u;
const isTeacher = (u: any): u is Teacher => u && 'subject_specialization' in u;

export default function ThemeChecklistsAnalytics({ currentUser }: Props) {
    const [loading, setLoading] = useState(true);
    const [schoolStats, setSchoolStats] = useState<SchoolStats[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedThemeId, setSelectedThemeId] = useState<number>(8);

    useEffect(() => {
        loadData();
    }, [currentUser, selectedThemeId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch relevant schools
            let visibleSchools: School[] = [];
            const allSchools = await db.find<School>(Collections.SCHOOLS, {});

            if (isUser(currentUser) && currentUser.role === 'admin') {
                visibleSchools = allSchools;
            } else if (isUser(currentUser) && currentUser.role === 'employee') {
                const schoolAssignments = await db.find<any>(Collections.SCHOOL_ASSIGNMENTS, {
                    employee_id: currentUser.id
                });
                const assignedIds = schoolAssignments.map(sa => sa.school_id);
                visibleSchools = allSchools.filter(s => assignedIds.includes(s.id));
            } else if (isMentor(currentUser)) {
                const mentorSchools = await db.find<any>(Collections.SCHOOL_ASSIGNMENTS, {
                    mentor_id: currentUser.id
                });
                const assignedIds = mentorSchools.map(ms => ms.school_id);

                // Also include the primary school assigned to the mentor directly
                if (currentUser.school_id && !assignedIds.includes(currentUser.school_id)) {
                    assignedIds.push(currentUser.school_id);
                }

                visibleSchools = allSchools.filter(s => assignedIds.includes(s.id));
            } else if (isTeacher(currentUser)) {
                visibleSchools = allSchools.filter(s => s.id === (currentUser as Teacher).school_id);
            }

            const schoolIds = visibleSchools.map(s => s.id!);
            if (schoolIds.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Fetch students and assessments
            const studentsFilter = (isUser(currentUser) && currentUser.role === 'admin') ? {} : { school_id: { $in: schoolIds } };
            let [allStudents, allAssessments] = await Promise.all([
                db.find<Student>(Collections.STUDENTS, studentsFilter),
                db.find<StudentAssessment>(Collections.STUDENT_ASSESSMENTS, { theme_number: selectedThemeId })
            ]);

            // If user is a teacher, filter to show only their added students
            if (isTeacher(currentUser)) {
                allStudents = allStudents.filter(s => s.teacher_id === (currentUser as Teacher).id);
                const studentIds = allStudents.map(s => s.id);
                allAssessments = allAssessments.filter(a => studentIds.includes(a.student_id));
            }

            // 3. Create Domain Mapping
            const selectedTheme = THEMES.find(t => t.id === selectedThemeId);
            const questionToDomain: Record<string, string> = {};
            const domainNames: string[] = [];

            if (selectedTheme) {
                Object.values(selectedTheme.config).forEach((gradeConfigs: any) => {
                    gradeConfigs.forEach((cat: any) => {
                        if (!domainNames.includes(cat.title)) {
                            domainNames.push(cat.title);
                        }
                        cat.questions.forEach((q: any) => {
                            questionToDomain[q.id] = cat.title;
                        });
                    });
                });
            }

            // 4. Pre-group data
            const studentsBySchool: Record<string, Student[]> = {};
            allStudents.forEach(s => {
                const sid = s.school_id;
                if (!studentsBySchool[sid]) studentsBySchool[sid] = [];
                studentsBySchool[sid].push(s);
            });

            const assessmentsByStudent: Record<string, StudentAssessment[]> = {};
            allAssessments.forEach(a => {
                const stid = a.student_id;
                if (!assessmentsByStudent[stid]) assessmentsByStudent[stid] = [];
                assessmentsByStudent[stid].push(a);
            });

            // 5. Process stats
            const stats = visibleSchools.map(school => {
                const schoolId = school.id!;
                const schoolStudents = studentsBySchool[schoolId] || [];

                const getGradeStats = (grade: 'H1' | 'H2' | 'H3') => {
                    const gradeStudents = schoolStudents.filter(s => s.grade === grade);
                    const gradeAssessed = gradeStudents.filter(s => (assessmentsByStudent[s.id!] || []).length > 0).length;
                    return { total: gradeStudents.length, assessed: gradeAssessed };
                };

                const h1 = getGradeStats('H1');
                const h2 = getGradeStats('H2');
                const h3 = getGradeStats('H3');
                const totalAssessed = h1.assessed + h2.assessed + h3.assessed;

                // Domain Aggregation for this school
                const schoolDomainMap: Record<string, DomainStat> = {};
                domainNames.forEach(name => {
                    schoolDomainMap[name] = { name, can: 0, trying: 0, help: 0 };
                });

                schoolStudents.forEach(student => {
                    const studentAssessments = assessmentsByStudent[student.id!] || [];
                    studentAssessments.forEach(assessment => {
                        Object.entries(assessment.skills || {}).forEach(([qId, val]) => {
                            const domain = questionToDomain[qId];
                            if (domain && schoolDomainMap[domain]) {
                                if (val === 'can') schoolDomainMap[domain].can++;
                                else if (val === 'trying') schoolDomainMap[domain].trying++;
                                else if (val === 'help') schoolDomainMap[domain].help++;
                            }
                        });
                    });
                });

                return {
                    id: schoolId,
                    name: school.name,
                    totalStudents: schoolStudents.length,
                    assessedStudents: totalAssessed,
                    completionRate: schoolStudents.length > 0
                        ? Math.round((totalAssessed / schoolStudents.length) * 100)
                        : 0,
                    gradeStats: { H1: h1, H2: h2, H3: h3 },
                    domainStats: Object.values(schoolDomainMap)
                };
            });

            setSchoolStats(stats.sort((a, b) => b.completionRate - a.completionRate));
        } catch (error) {
            console.error('Error loading theme analytics:', error);
        }
        setLoading(false);
    };

    const filteredStats = schoolStats.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Aggregate domain-wise stats across all schools
    const aggregateDomainStats: DomainStat[] = [];
    schoolStats.forEach(school => {
        (school.domainStats || []).forEach(stat => {
            const existing = aggregateDomainStats.find(d => d.name === stat.name);
            if (existing) {
                existing.can += stat.can;
                existing.trying += stat.trying;
                existing.help += stat.help;
            } else {
                aggregateDomainStats.push({ ...stat });
            }
        });
    });

    const aggregateStats = {
        totalStudents: schoolStats.reduce((acc, s) => acc + s.totalStudents, 0),
        totalAssessed: schoolStats.reduce((acc, s) => acc + s.assessedStudents, 0),
        H1: {
            total: schoolStats.reduce((acc, s) => acc + s.gradeStats.H1.total, 0),
            assessed: schoolStats.reduce((acc, s) => acc + s.gradeStats.H1.assessed, 0),
        },
        H2: {
            total: schoolStats.reduce((acc, s) => acc + s.gradeStats.H2.total, 0),
            assessed: schoolStats.reduce((acc, s) => acc + s.gradeStats.H2.assessed, 0),
        },
        H3: {
            total: schoolStats.reduce((acc, s) => acc + s.gradeStats.H3.total, 0),
            assessed: schoolStats.reduce((acc, s) => acc + s.gradeStats.H3.assessed, 0),
        }
    };

    const chartData = [
        {
            name: 'H1 (Nursery)',
            assessed: aggregateStats.H1.assessed,
            remaining: aggregateStats.H1.total - aggregateStats.H1.assessed,
            total: aggregateStats.H1.total
        },
        {
            name: 'H2 (LKG)',
            assessed: aggregateStats.H2.assessed,
            remaining: aggregateStats.H2.total - aggregateStats.H2.assessed,
            total: aggregateStats.H2.total
        },
        {
            name: 'H3 (UKG)',
            assessed: aggregateStats.H3.assessed,
            remaining: aggregateStats.H3.total - aggregateStats.H3.assessed,
            total: aggregateStats.H3.total
        }
    ];

    const selectedThemeName = THEMES.find(t => t.id === selectedThemeId)?.name || 'Unknown Theme';

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading Theme Checklists Analytics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <ClipboardCheck className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Theme Checklists Analytics</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${(isUser(currentUser) && currentUser.role === 'admin')
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                    }`}>
                                    {(isUser(currentUser) && currentUser.role === 'admin') ? 'System Wide' : 'Assigned Schools'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Theme Selector */}
                    <div className="relative min-w-[250px]">
                        <select
                            value={selectedThemeId}
                            onChange={(e) => setSelectedThemeId(Number(e.target.value))}
                            className="w-full appearance-none bg-gray-50 border border-gray-200 px-4 py-2.5 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 cursor-pointer"
                        >
                            {THEMES.map(theme => (
                                <option key={theme.id} value={theme.id}>{theme.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm text-gray-500 mb-1">Total Students</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-gray-900">{aggregateStats.totalStudents}</span>
                        <Users className="text-gray-400 mb-1" size={20} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm text-gray-500 mb-1">Assessed ({selectedThemeName.split(':')[0]})</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-green-600">{aggregateStats.totalAssessed}</span>
                        <CheckCircle2 className="text-green-400 mb-1" size={20} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm text-gray-500 mb-1">Outstanding Tasks</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-orange-600">{aggregateStats.totalStudents - aggregateStats.totalAssessed}</span>
                        <Clock className="text-orange-400 mb-1" size={20} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <p className="text-sm text-gray-500 mb-1">Overall Completion</p>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-blue-600">
                            {aggregateStats.totalStudents > 0
                                ? Math.round((aggregateStats.totalAssessed / aggregateStats.totalStudents) * 100)
                                : 0}%
                        </span>
                        <TrendingUp className="text-blue-400 mb-1" size={20} />
                    </div>
                </div>
            </div>

            {/* Domain-wise Performance Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50/50">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-600" />
                        Domain-wise Performance Analysis
                    </h4>
                </div>
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Domain Status Chart */}
                    <div>
                        <h5 className="text-sm font-bold text-gray-700 mb-4 px-2 border-l-4 border-indigo-500">Aggregate Domain Status</h5>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={aggregateDomainStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="can" name="I Can" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="trying" name="Trying" fill="#FBBF24" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="help" name="Help" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Domain Breakdown Table */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                                    <th className="pb-3">Domain</th>
                                    <th className="pb-3 text-center">Can</th>
                                    <th className="pb-3 text-center">Trying</th>
                                    <th className="pb-3 text-center">Help</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {aggregateDomainStats.map((domain, idx) => (
                                    <tr key={idx} className="group hover:bg-white transition-colors">
                                        <td className="py-3 text-xs font-bold text-gray-700">{domain.name}</td>
                                        <td className="py-3 text-center">
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-black">{domain.can}</span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-black">{domain.trying}</span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-black">{domain.help}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Grade Distribution Chart */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <GraduationCap size={20} className="text-purple-600" />
                        Completion by Grade
                    </h4>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="assessed" name="Assessed" stackId="a" fill="#3B82F6" />
                                <Bar dataKey="remaining" name="Pending" stackId="a" fill="#E5E7EB" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        {chartData.map(d => (
                            <div key={d.name} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{d.name}</span>
                                <span className="font-bold text-gray-900">{d.assessed} / {d.total}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* School Wise Breakdown */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                <Building2 size={20} className="text-blue-600" />
                                School-wise Assessment Status ({selectedThemeName.split(':')[0]})
                            </h4>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search schools..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">School Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">H1</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">H2</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">H3</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Completion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredStats.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No schools found matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStats.map((school) => (
                                        <tr key={school.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{school.name}</div>
                                                <div className="text-xs text-gray-500">{school.totalStudents} Total Students</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-medium">{school.gradeStats.H1.assessed} / {school.gradeStats.H1.total}</span>
                                                    <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500"
                                                            style={{ width: `${school.gradeStats.H1.total > 0 ? (school.gradeStats.H1.assessed / school.gradeStats.H1.total) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-medium">{school.gradeStats.H2.assessed} / {school.gradeStats.H2.total}</span>
                                                    <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500"
                                                            style={{ width: `${school.gradeStats.H2.total > 0 ? (school.gradeStats.H2.assessed / school.gradeStats.H2.total) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-medium">{school.gradeStats.H3.assessed} / {school.gradeStats.H3.total}</span>
                                                    <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-purple-500"
                                                            style={{ width: `${school.gradeStats.H3.total > 0 ? (school.gradeStats.H3.assessed / school.gradeStats.H3.total) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${school.completionRate >= 80 ? 'bg-green-500' :
                                                                school.completionRate >= 50 ? 'bg-blue-500' :
                                                                    'bg-orange-500'
                                                                }`}
                                                            style={{ width: `${school.completionRate}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-900">{school.completionRate}%</span>
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
        </div>
    );
}
