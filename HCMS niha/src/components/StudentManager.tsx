import { useState, useEffect } from 'react';
import { Student, School } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { X, Plus, Edit2, Trash2, Search, UserPlus, Save, FileSpreadsheet } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface Props {
    schoolId: string;
    teacherId?: string;
    onClose: () => void;
}

export default function StudentManager({ schoolId, teacherId, onClose }: Props) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [school, setSchool] = useState<School | null>(null);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        roll_number: '',
        grade: 'H1' as 'H1' | 'H2' | 'H3',
        parent_name: '',
        parent_phone: '',
        gender: 'male' as 'male' | 'female' | 'other',
        status: 'active' as 'active' | 'inactive' | 'dropped',
        section: ''
    });
    const [migrating, setMigrating] = useState(false);

    useEffect(() => {
        loadData();
    }, [schoolId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [studentsData, schoolData, teachersData] = await Promise.all([
                db.find<Student>(Collections.STUDENTS, { school_id: schoolId }, { sort: { name: 1 } }),
                db.findById<School>(Collections.SCHOOLS, schoolId),
                db.find<any>(Collections.TEACHERS, { school_id: schoolId })
            ]);
            
            setTeachers(teachersData || []);
            setStudents(studentsData);
            setSchool(schoolData);
        } catch (error) {
            console.error('Error loading data:', error);
        }
        setLoading(false);
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.roll_number && s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.section && s.section.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesGrade = !filterGrade || s.grade === filterGrade;
        const matchesTeacher = !teacherId || s.teacher_id === teacherId;
        return matchesSearch && matchesGrade && matchesTeacher;
    });

    const handleExportCSV = () => {
        if (filteredStudents.length === 0) return;

        const headers = ['Roll Number', 'Student Name', 'Grade', 'Section', 'Teacher', 'Parent Name', 'Parent Phone'];
        const rows = filteredStudents.map(s => {
            const teacher = teachers.find(t => t.id === s.teacher_id);
            const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'N/A';
            return [
                s.roll_number || 'N/A',
                s.name,
                s.grade,
                s.section || 'N/A',
                teacherName,
                s.parent_name || 'N/A',
                s.parent_phone || 'N/A'
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
        link.setAttribute('download', `Student_List_${school?.name || 'School'}_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingStudent && editingStudent.id) {
                await db.updateById(Collections.STUDENTS, editingStudent.id, {
                    ...formData,
                    updated_at: new Date().toISOString()
                });
            } else {
                await db.insertOne(Collections.STUDENTS, {
                    ...formData,
                    school_id: schoolId,
                    teacher_id: teacherId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                } as any);
            }
            setShowModal(false);
            setEditingStudent(null);
            resetForm();
            loadData();
        } catch (error) {
            console.error('Error saving student:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this student?')) {
            try {
                await db.deleteById(Collections.STUDENTS, id);
                loadData();
            } catch (error) {
                console.error('Error deleting student:', error);
            }
        }
    };

    const handleInitializeRolls = async () => {
        try {
            setMigrating(true);
            await (db as any).initializeRollNumbers();
            await loadData();
        } catch (error) {
            console.error('Error initializing roll numbers:', error);
        } finally {
            setMigrating(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            roll_number: '',
            grade: 'H1',
            parent_name: '',
            parent_phone: '',
            gender: 'male',
            status: 'active',
            section: ''
        });
    };

    const openEditModal = (student: Student) => {
        setEditingStudent(student);
        setFormData({
            name: student.name,
            roll_number: student.roll_number || '',
            grade: student.grade,
            parent_name: student.parent_name || '',
            parent_phone: student.parent_phone || '',
            gender: (student as any).gender || 'male',
            status: student.status || 'active',
            section: student.section || ''
        });
        setShowModal(true);
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-blue-600 text-white flex justify-between items-center shadow-lg">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <UserPlus size={24} />
                            Student Manager
                        </h2>
                        <p className="text-blue-100 text-sm mt-0.5">{school?.name || 'Loading...'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Global Roll Number Fix Alert */}
                {students.some(s => !s.roll_number) && (
                    <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                <Plus size={16} className="rotate-45" />
                            </div>
                            <p className="text-xs font-bold text-amber-900">
                                Some students are missing roll numbers. Fix them to enable Parent Portal search.
                            </p>
                        </div>
                        <button
                            onClick={handleInitializeRolls}
                            disabled={migrating}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                migrating 
                                    ? 'bg-amber-200 text-amber-400 cursor-not-allowed' 
                                    : 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
                            }`}
                        >
                            {migrating ? 'Fixing...' : 'Fix All Missing Rolls'}
                        </button>
                    </div>
                )}

                <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-1 items-center gap-3 w-full">
                        <div className="relative flex-1 max-w-sm">
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        </div>
                        <select
                            value={filterGrade}
                            onChange={(e) => setFilterGrade(e.target.value)}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="">All Grades</option>
                            <option value="H1">Grade H1</option>
                            <option value="H2">Grade H2</option>
                            <option value="H3">Grade H3</option>
                        </select>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center justify-center gap-2 bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all font-bold shadow-sm text-sm"
                        >
                            <FileSpreadsheet size={18} />
                            Export CSV
                        </button>
                        <button
                            onClick={async () => { 
                                resetForm(); 
                                const nextRoll = await db.getSmallestAvailableRollNumber();
                                setFormData(prev => ({ ...prev, roll_number: nextRoll }));
                                setEditingStudent(null); 
                                setShowModal(true); 
                            }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md shadow-blue-200 text-sm"
                        >
                            <Plus size={20} />
                            Add Student
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <LoadingSpinner label="Loading students..." />
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                            <div className="bg-gray-100 p-4 rounded-full mb-4">
                                <Search size={32} className="text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No students found</p>
                            <button
                                onClick={async () => { 
                                    resetForm(); 
                                    const nextRoll = await db.getSmallestAvailableRollNumber();
                                    setFormData(prev => ({ ...prev, roll_number: nextRoll }));
                                    setEditingStudent(null); 
                                    setShowModal(true); 
                                }}
                                className="text-blue-600 font-bold mt-2 hover:underline"
                            >
                                Add your first student
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStudents.map(student => (
                                <div key={student.id} className="group bg-white p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 w-1 h-full ${student.grade === 'H1' ? 'bg-emerald-400' : student.grade === 'H2' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                                <span className="text-lg font-bold text-gray-700 group-hover:text-blue-600">{student.name.charAt(0)}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 leading-tight">{student.name}</h4>
                                                <p className="text-xs text-gray-400 font-medium">Roll: {student.roll_number || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEditModal(student)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                            <button onClick={() => student.id && handleDelete(student.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-gray-400 mb-0.5">Grade</p>
                                            <p className="font-bold text-gray-900 border-l-2 border-current px-2 -ml-1" style={{ color: student.grade === 'H1' ? '#10b981' : student.grade === 'H2' ? '#f59e0b' : '#3b82f6' }}>{student.grade}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-gray-400 mb-0.5">Status</p>
                                            <p className={`font-bold capitalize ${student.status === 'active' ? 'text-emerald-600' : student.status === 'dropped' ? 'text-rose-500' : 'text-gray-500'}`}>{student.status}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-50">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <p className="truncate"><span className="font-medium">Parent:</span> {student.parent_name || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">{editingStudent ? 'Edit' : 'Add New'} Student</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Student Particulars</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                                        placeholder="Enter full name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Roll Number</label>
                                    <input
                                        readOnly
                                        type="text"
                                        value={formData.roll_number}
                                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none font-bold text-gray-500 cursor-not-allowed"
                                        placeholder="Generating..."
                                    />
                                    <p className="text-[9px] text-blue-500 font-bold mt-1 ml-1 px-1">AUTO-ASSIGNED SYSTEM ID</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Grade</label>
                                    <select
                                        value={formData.grade}
                                        onChange={(e) => setFormData({ ...formData, grade: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                                    >
                                        <option value="H1">Grade H1</option>
                                        <option value="H2">Grade H2</option>
                                        <option value="H3">Grade H3</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Section</label>
                                    <input
                                        type="text"
                                        value={formData.section}
                                        onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                                        placeholder="e.g. A"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Parent Name</label>
                                    <input
                                        type="text"
                                        value={formData.parent_name}
                                        onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                                        placeholder="Father/Mother name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Parent Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.parent_phone}
                                        onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                                        placeholder="10-digit number"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    {editingStudent ? 'Update Student' : 'Save Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
