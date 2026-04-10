import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Student, StudentAssessment } from '../lib/models';
import { Search, User as UserIcon, ChevronRight, GraduationCap, FileSpreadsheet } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface Props {
    schoolId: string;
    teacherId: string;
    onViewProfile: (student: Student) => void;
}

export default function TeacherStudentListing({ schoolId, teacherId, onViewProfile }: Props) {
    const [students, setStudents] = useState<Student[]>([]);
    const [schoolTeachers, setSchoolTeachers] = useState<any[]>([]);
    const [assessments, setAssessments] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const handleExportCSV = () => {
        if (students.length === 0) return;

        const headers = ['Roll Number', 'Student Name', 'Grade', 'Section', 'Teacher'];
        const rows = filteredStudents.map(s => {
            const teacher = schoolTeachers.find(t => t.id === s.teacher_id);
            const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'N/A';
            return [
                s.roll_number || 'N/A',
                s.name,
                s.grade,
                s.section || 'N/A',
                teacherName
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Student_List_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        loadStudents();
    }, [schoolId, teacherId]);

    const loadStudents = async () => {
        setLoading(true);
        try {
            const [schoolStudents, teachersData] = await Promise.all([
                db.find<Student>(Collections.STUDENTS, {
                    school_id: schoolId,
                    status: { $ne: 'dropped' }
                }),
                db.find<any>(Collections.TEACHERS, { school_id: schoolId })
            ]);

            setSchoolTeachers(teachersData);

            // If teacherId is provided and not empty, filter by it. 
            // Otherwise show all students in the school (for mentors)
            const visibleStudents = teacherId 
                ? schoolStudents.filter(s => s.teacher_id === teacherId)
                : schoolStudents;

            setStudents(visibleStudents.sort((a, b) => a.name.localeCompare(b.name)));

            // 2. Fetch assessment counts to show progress
            const studentIds = schoolStudents.map(s => s.id!);
            if (studentIds.length > 0) {
                // Just get a count or presence for now to indicate "Assessed"
                const allAssessments = await db.find<StudentAssessment>(Collections.STUDENT_ASSESSMENTS, {
                    student_id: { $in: studentIds }
                });

                const counts: Record<string, number> = {};
                allAssessments.forEach(a => {
                    counts[a.student_id] = (counts[a.student_id] || 0) + 1;
                });
                setAssessments(counts);
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
        setLoading(false);
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.section && s.section.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <LoadingSpinner label="Loading students..." />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">My Students</h2>
                    <p className="text-gray-500">View and manage students in your school</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleExportCSV}
                        disabled={filteredStudents.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                    >
                        <FileSpreadsheet size={18} />
                        Export Roll Numbers
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <UserIcon className="mx-auto text-gray-400 mb-2" size={40} />
                        <p className="text-gray-500">No students found.</p>
                    </div>
                ) : (
                    filteredStudents.map(student => (
                        <div
                            key={student.id}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition-all cursor-pointer group"
                            onClick={() => onViewProfile(student)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                        <UserIcon size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900">{student.name}</h3>
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-bold whitespace-nowrap">
                                                Roll: {student.roll_number || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                                                {student.grade}
                                            </span>
                                            {student.section && (
                                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                                                    Sec {student.section}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" size={20} />
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <GraduationCap size={14} className="text-blue-500" />
                                    <span>{assessments[student.id!] || 0} Assessments</span>
                                </div>
                                {assessments[student.id!] > 0 && (
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                        Active
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
