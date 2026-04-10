import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Student, School, StudentAssessment } from '../lib/models';
import { BarChart3, Users } from 'lucide-react';

export default function StudentAnalytics() {
    const [students, setStudents] = useState<Student[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [assessments, setAssessments] = useState<StudentAssessment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [studentsData, schoolsData, assessmentsData] = await Promise.all([
                db.find<Student>(Collections.STUDENTS, {}),
                db.find<School>(Collections.SCHOOLS, {}),
                db.find<StudentAssessment>(Collections.STUDENT_ASSESSMENTS, {})
            ]);
            setStudents(studentsData);
            setSchools(schoolsData);
            setAssessments(assessmentsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const gradeBreakdown = {
        H1: students.filter(s => s.grade === 'H1').length,
        H2: students.filter(s => s.grade === 'H2').length,
        H3: students.filter(s => s.grade === 'H3').length,
    };

    const totalAssessed = new Set(assessments.map(a => a.student_id)).size;
    const assessmentRate = students.length > 0 ? Math.round((totalAssessed / students.length) * 100) : 0;

    const schoolStudentCounts = schools.map(school => ({
        name: school.name,
        count: students.filter(s => s.school_id === school.id).length
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="text-blue-600" size={28} />
                <h2 className="text-2xl font-bold text-gray-800">Student Analytics</h2>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border p-5">
                            <p className="text-sm text-gray-500">Total Students</p>
                            <p className="text-3xl font-bold text-blue-600">{students.length}</p>
                        </div>
                        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-sm p-5 text-white">
                            <p className="text-sm opacity-80">H1 Students</p>
                            <p className="text-3xl font-bold">{gradeBreakdown.H1}</p>
                        </div>
                        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-sm p-5 text-white">
                            <p className="text-sm opacity-80">H2 Students</p>
                            <p className="text-3xl font-bold">{gradeBreakdown.H2}</p>
                        </div>
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-sm p-5 text-white">
                            <p className="text-sm opacity-80">H3 Students</p>
                            <p className="text-3xl font-bold">{gradeBreakdown.H3}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border p-5">
                            <h3 className="font-bold text-gray-800 mb-4">Assessment Coverage</h3>
                            <div className="text-center py-6">
                                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-blue-200">
                                    <span className="text-2xl font-bold text-blue-600">{assessmentRate}%</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-3">{totalAssessed} of {students.length} students assessed</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border p-5">
                            <h3 className="font-bold text-gray-800 mb-4">Top Schools by Students</h3>
                            <div className="space-y-3">
                                {schoolStudentCounts.map((school, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600 w-40 truncate">{school.name}</span>
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(school.count / (schoolStudentCounts[0]?.count || 1)) * 100}%` }}></div>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600 w-8 text-right">{school.count}</span>
                                    </div>
                                ))}
                                {schoolStudentCounts.length === 0 && <p className="text-gray-500 text-sm">No data</p>}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
