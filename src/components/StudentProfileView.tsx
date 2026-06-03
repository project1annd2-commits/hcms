import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Student, StudentAssessment, School, Teacher, Mentor } from '../lib/models';
import { ArrowLeft, User as UserIcon, Calendar, TrendingUp, CheckCircle2, Clock, BookOpen, Building2, Download, Phone, ShieldAlert, Award } from 'lucide-react';
import { THEMES } from './StudentAssessmentForm';
import LoadingSpinner from './LoadingSpinner';
import StudentReportCard from './StudentReportCard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
    student: Student;
    onBack: () => void;
}

export default function StudentProfileView({ student, onBack }: Props) {
    const [assessments, setAssessments] = useState<StudentAssessment[]>([]);
    const [school, setSchool] = useState<School | null>(null);
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [mentor, setMentor] = useState<Mentor | null>(null);
    const [loading, setLoading] = useState(true);
    const [printingThemeId, setPrintingThemeId] = useState<number | null>(null);

    useEffect(() => {
        loadStudentData();
    }, [student]);

    const loadStudentData = async () => {
        setLoading(true);
        try {
            const [assessmentsData, schoolData, teacherData, mentorData] = await Promise.all([
                db.find<StudentAssessment>(Collections.STUDENT_ASSESSMENTS, { student_id: student.id }),
                db.findById<School>(Collections.SCHOOLS, student.school_id),
                student.teacher_id ? db.findById<Teacher>(Collections.TEACHERS, student.teacher_id).catch(() => null) : Promise.resolve(null),
                student.mentor_id ? db.findById<Mentor>(Collections.MENTORS, student.mentor_id).catch(() => null) : Promise.resolve(null)
            ]);
            setAssessments(assessmentsData);
            setSchool(schoolData);
            setTeacher(teacherData);
            setMentor(mentorData);
        } catch (error) {
            console.error('Error loading student profile data:', error);
        }
        setLoading(false);
    };

    // Calculate some simple stats
    const totalAssessments = assessments.length;
    const lastAssessed = assessments.length > 0
        ? new Date(Math.max(...assessments.map(a => new Date(a.updated_at || a.created_at).getTime()))).toLocaleDateString()
        : 'Never';

    // Basic mastery calculation (average of all skills if present)
    let totalMastery = 0;
    let masteryCount = 0;

    assessments.forEach(ass => {
        if (ass.skills) {
            const skills = Object.values(ass.skills);
            if (skills.length > 0) {
                const canCount = skills.filter(s => s === 'can').length;
                const totalSkills = skills.length;
                totalMastery += (canCount / totalSkills) * 100;
                masteryCount++;
            }
        }
    });

    const averageMastery = masteryCount > 0 ? Math.round(totalMastery / masteryCount) : 0;

    // Derived assessments insights
    const themeInsights = THEMES.map(theme => {
        const assessment = assessments.find(a => a.theme_number === theme.id);
        let mastery = 0;
        if (assessment?.skills) {
            const skills = Object.values(assessment.skills);
            const canCount = skills.filter(s => s === 'can').length;
            mastery = Math.round((canCount / skills.length) * 100);
        }
        return { themeName: theme.name.split(':')[0], mastery, hasAssessment: !!assessment };
    }).filter(t => t.hasAssessment);

    const strengths = themeInsights.filter(t => t.mastery >= 80);
    const needsImprovement = themeInsights.filter(t => t.mastery < 60);

    const statusConfig = {
        active: { label: 'Active Student', color: 'bg-green-100 text-green-700 border-green-200' },
        inactive: { label: 'Inactive Student', color: 'bg-gray-100 text-gray-700 border-gray-200' },
        dropped: { label: 'Dropped Student', color: 'bg-red-100 text-red-700 border-red-200' }
    };
    const currentStatus = student.status || 'active';
    const statusStyle = statusConfig[currentStatus] || statusConfig.active;

    const handleDownloadReport = async (themeId: number) => {
        const assessment = assessments.find(a => a.theme_number === themeId);
        if (!assessment) return;

        setPrintingThemeId(themeId);

        // Wait for state update and render
        setTimeout(async () => {
            try {
                const element = document.getElementById(`report-${student.id}-${themeId}`);
                if (!element) {
                    setPrintingThemeId(null);
                    return;
                }

                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: 800
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'px',
                    format: [canvas.width / 2, canvas.height / 2]
                });

                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
                pdf.save(`${student.name.replace(/\s+/g, '_')}_Theme_${themeId}_Report.pdf`);
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Failed to generate report. Please try again.');
            }
            setPrintingThemeId(null);
        }, 500);
    };

    if (loading) return <LoadingSpinner label="Loading student profile..." />;

    return (
        <div className="space-y-6">
            {/* Navigation Header */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
                <ArrowLeft size={20} />
                Back to Student List
            </button>

            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                <div className="px-6 pb-6">
                    <div className="relative flex flex-col md:flex-row md:items-end gap-6 -mt-12">
                        <div className="w-32 h-32 bg-white rounded-2xl shadow-lg border-4 border-white flex items-center justify-center text-blue-600">
                            <UserIcon size={64} />
                        </div>
                        <div className="flex-1 pb-2">
                            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-600">
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold border border-blue-200">
                                        Roll: {student.roll_number || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Building2 size={16} />
                                    <span>{school?.name || 'Loading school...'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <BookOpen size={16} />
                                    <span>Grade {student.grade} {student.section ? `(${student.section})` : ''}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={16} />
                                    <span>Added {new Date(student.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="pb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${statusStyle.color}`}>
                                {statusStyle.label}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Student Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal & Contact Info */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <UserIcon size={16} className="text-blue-600" />
                        Personal Details
                    </h3>
                    <div className="space-y-3">
                        {student.gender && (
                            <div className="grid grid-cols-3 text-sm">
                                <span className="text-gray-500">Gender</span>
                                <span className="col-span-2 font-medium text-gray-900 capitalize">{student.gender}</span>
                            </div>
                        )}
                        {student.phone && (
                            <div className="grid grid-cols-3 text-sm">
                                <span className="text-gray-500">Phone</span>
                                <span className="col-span-2 font-medium text-gray-900">{student.phone}</span>
                            </div>
                        )}
                        {(student.parent_name || student.parent_phone) && (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                {student.parent_name && (
                                    <div className="grid grid-cols-3 text-sm">
                                        <span className="text-gray-500">Parent/Guardian</span>
                                        <span className="col-span-2 font-medium text-gray-900">{student.parent_name}</span>
                                    </div>
                                )}
                                {student.parent_phone && (
                                    <div className="grid grid-cols-3 text-sm">
                                        <span className="text-gray-500">Parent Phone</span>
                                        <div className="col-span-2 flex items-center gap-2">
                                            <Phone size={14} className="text-gray-400" />
                                            <span className="font-medium text-gray-900">{student.parent_phone}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {!student.gender && !student.phone && !student.parent_name && !student.parent_phone && (
                            <p className="text-sm text-gray-500 italic">No additional details provided.</p>
                        )}
                    </div>
                </div>

                {/* Assigned Personnel */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Building2 size={16} className="text-blue-600" />
                        Academic Team
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                                {teacher ? teacher.first_name[0] : 'T'}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Class Teacher</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Not Assigned'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                                {mentor ? mentor.first_name[0] : 'M'}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Academic Mentor</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {mentor ? `${mentor.first_name} ${mentor.last_name}` : 'Not Assigned'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Overall Mastery</p>
                        <TrendingUp className="text-blue-600" size={20} />
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-gray-900">{averageMastery}%</span>
                        <div className="mb-2 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all duration-1000"
                                style={{ width: `${averageMastery}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Assessments</p>
                        <CheckCircle2 className="text-emerald-600" size={20} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-gray-900">{totalAssessments}</span>
                        <span className="text-gray-500 font-medium">Themes Completed</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Last Activity</p>
                        <Clock className="text-orange-600" size={20} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{lastAssessed}</span>
                    </div>
                </div>
            </div>

            {/* Strengths & Needs Improvement */}
            {(strengths.length > 0 || needsImprovement.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="text-emerald-500" size={20} />
                            <h3 className="font-bold text-gray-900">Strengths (Mastery {'>='} 80%)</h3>
                        </div>
                        {strengths.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {strengths.map(s => (
                                    <span key={s.themeName} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
                                        {s.themeName} ({s.mastery}%)
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No particular strengths identified yet.</p>
                        )}
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldAlert className="text-orange-500" size={20} />
                            <h3 className="font-bold text-gray-900">Needs Focus (Mastery {'<'} 60%)</h3>
                        </div>
                        {needsImprovement.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {needsImprovement.map(s => (
                                    <span key={s.themeName} className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium border border-orange-100">
                                        {s.themeName} ({s.mastery}%)
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No specific areas need immediate focus.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Detailed Theme Progress */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                    <h3 className="text-lg font-bold text-gray-900">Thematic Progress Breakdown</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-6">
                        {THEMES.map(theme => {
                            const assessment = assessments.find(a => a.theme_number === theme.id);
                            let mastery = 0;
                            if (assessment?.skills) {
                                const skills = Object.values(assessment.skills);
                                const canCount = skills.filter(s => s === 'can').length;
                                mastery = Math.round((canCount / skills.length) * 100);
                            }

                            return (
                                <div key={theme.id} className="group">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-wide">
                                            {theme.name.split(':')[0]}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                                                {assessment ? `${mastery}% Mastery` : 'Not Started'}
                                            </span>
                                            {assessment && (
                                                <button
                                                    onClick={() => handleDownloadReport(theme.id)}
                                                    disabled={printingThemeId === theme.id}
                                                    title="Download Report"
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    {printingThemeId === theme.id ? (
                                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <Download size={18} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${assessment ? (mastery >= 80 ? 'bg-green-500' : mastery >= 50 ? 'bg-blue-500' : 'bg-orange-500') : 'bg-gray-200'}`}
                                            style={{ width: `${mastery}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Hidden Report Generation Area */}
            <div className="fixed -left-[2000px] top-0 opacity-0 pointer-events-none">
                {printingThemeId && (
                    <StudentReportCard
                        student={student}
                        assessment={assessments.find(a => a.theme_number === printingThemeId)!}
                        school={school}
                        currentUser={{ id: student.teacher_id }}
                    />
                )}
            </div>
        </div>
    );
}
