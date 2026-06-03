import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { User, School } from '../lib/models';
import { BarChart3 } from 'lucide-react';
import { View } from '../lib/accessControl';

interface Props {
    currentUser: User;
    onNavigate?: (view: View, subTab?: string, targetId?: string) => void;
}

export default function ImplementationAnalytics({ currentUser, onNavigate }: Props) {
    const [schools, setSchools] = useState<School[]>([]);
    const [checklists, setChecklists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const allSchools = await db.find<School>(Collections.SCHOOLS, {});
            const checklistData = await db.find<any>('implementation_checklists', {});

            let visibleSchools = allSchools;
            if (currentUser && currentUser.role === 'employee') {
                const assignments = await db.find<any>(Collections.SCHOOL_ASSIGNMENTS, {
                    employee_id: currentUser.id
                });
                const assignedIds = assignments.map(a => a.school_id);
                visibleSchools = allSchools.filter(s => assignedIds.includes(s.id!));
            }

            setSchools(visibleSchools);
            setChecklists(checklistData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSchoolProgress = (schoolId: string) => {
        const checklist = checklists.find(c => c.school_id === schoolId);
        if (!checklist?.items) return 0;
        const total = 9; // total checklist items
        const completed = Object.values(checklist.items).filter(Boolean).length;
        return Math.round((completed / total) * 100);
    };

    const schoolsWithProgress = schools.map(s => ({
        ...s,
        progress: getSchoolProgress(s.id!)
    })).sort((a, b) => b.progress - a.progress);

    const avgProgress = schoolsWithProgress.length > 0
        ? Math.round(schoolsWithProgress.reduce((sum, s) => sum + s.progress, 0) / schoolsWithProgress.length)
        : 0;

    const completed = schoolsWithProgress.filter(s => s.progress === 100).length;
    const inProgress = schoolsWithProgress.filter(s => s.progress > 0 && s.progress < 100).length;
    const notStarted = schoolsWithProgress.filter(s => s.progress === 0).length;

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="text-blue-600" size={28} />
                <h2 className="text-2xl font-bold text-gray-800">Implementation Analytics</h2>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border p-5">
                            <p className="text-sm text-gray-500">Average Progress</p>
                            <p className="text-3xl font-bold text-blue-600">{avgProgress}%</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border p-5">
                            <p className="text-sm text-gray-500">Completed</p>
                            <p className="text-3xl font-bold text-green-600">{completed}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border p-5">
                            <p className="text-sm text-gray-500">In Progress</p>
                            <p className="text-3xl font-bold text-yellow-600">{inProgress}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border p-5">
                            <p className="text-sm text-gray-500">Not Started</p>
                            <p className="text-3xl font-bold text-red-600">{notStarted}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">School</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {schoolsWithProgress.map(school => (
                                    <tr key={school.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{school.name}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                                    <div className={`h-2 rounded-full ${school.progress === 100 ? 'bg-green-500' : school.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`} style={{ width: `${school.progress}%` }}></div>
                                                </div>
                                                <span className="text-xs text-gray-500">{school.progress}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs ${school.progress === 100 ? 'bg-green-100 text-green-700' : school.progress > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                {school.progress === 100 ? 'Completed' : school.progress > 0 ? 'In Progress' : 'Not Started'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => onNavigate?.('implementation-checklist', undefined, school.id)} className="text-sm text-blue-600 hover:underline">View Checklist</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
