import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Student, School } from '../lib/models';
import { Users, Search } from 'lucide-react';

interface Props {
}

export default function StudentListing({ }: Props) {
    const [students, setStudents] = useState<Student[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [gradeFilter, setGradeFilter] = useState('all');
    const [schoolFilter, setSchoolFilter] = useState('all');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [studentsData, schoolsData] = await Promise.all([
                db.find<Student>(Collections.STUDENTS, {}),
                db.find<School>(Collections.SCHOOLS, {})
            ]);
            setStudents(studentsData);
            setSchools(schoolsData);
        } catch (error) {
            console.error('Error loading students:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSchoolName = (id: string) => schools.find(s => s.id === id)?.name || 'Unknown';

    const filtered = students.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || getSchoolName(s.school_id).toLowerCase().includes(searchTerm.toLowerCase());
        const matchGrade = gradeFilter === 'all' || s.grade === gradeFilter;
        const matchSchool = schoolFilter === 'all' || s.school_id === schoolFilter;
        return matchSearch && matchGrade && matchSchool;
    });

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <Users className="text-blue-600" size={28} />
                <h2 className="text-2xl font-bold text-gray-800">Students</h2>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">{students.length}</span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div className="flex gap-2">
                    <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)} className="px-3 py-2 border rounded-lg bg-blue-50 border-blue-100 font-bold text-blue-700 focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Schools</option>
                        {schools.map(school => (
                            <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                    </select>

                    <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
                        <option value="all">All Grades</option>
                        <option value="H1">H1</option>
                        <option value="H2">H2</option>
                        <option value="H3">H3</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Roll No.</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">School</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Grade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No students found</td></tr>
                            ) : filtered.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-bold text-blue-600">{student.roll_number || 'N/A'}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{student.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{student.phone}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{getSchoolName(student.school_id)}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">{student.grade}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
