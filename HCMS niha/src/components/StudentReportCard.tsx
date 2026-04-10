import { Student, StudentAssessment, School } from '../lib/models';
import { THEMES } from './StudentAssessmentForm';
import { CheckCircle2, Circle, HelpCircle, Trophy, User, BookOpen, Building2 } from 'lucide-react';

interface Props {
    student: Student;
    assessment: StudentAssessment;
    school: School | null;
    currentUser?: any;
}

export default function StudentReportCard({ student, assessment, school, currentUser }: Props) {
    const theme = THEMES.find(t => t.id === assessment.theme_number);
    const gradeConfig = theme?.config[student.grade as 'H1' | 'H2' | 'H3'] || [];

    // Calculate domain mastery
    const domainMastery = gradeConfig.map(domain => {
        const domainQuestions = domain.questions;
        const studentSkills = assessment.skills || {};

        const canCount = domainQuestions.filter((q: any) => studentSkills[q.id] === 'can').length;
        const tryingCount = domainQuestions.filter((q: any) => studentSkills[q.id] === 'trying').length;
        const helpCount = domainQuestions.filter((q: any) => studentSkills[q.id] === 'help').length;

        const total = domainQuestions.length;
        const masteryPercentage = Math.round((canCount / total) * 100);

        return {
            title: domain.title,
            canCount,
            tryingCount,
            helpCount,
            total,
            masteryPercentage,
            questions: domainQuestions
        };
    });

    const overallMastery = Math.round(
        domainMastery.reduce((acc, curr) => acc + curr.masteryPercentage, 0) / (domainMastery.length || 1)
    );

    return (
        <div id={`report-${student.id}-${assessment.theme_number}`} className="bg-white p-8 max-w-[800px] mx-auto border border-gray-100 shadow-xl print:shadow-none print:border-0 print:p-0">
            {/* Header / Branding */}
            <div className="flex justify-between items-start border-b-4 border-blue-600 pb-6 mb-8 text-blue-900">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-600 p-2 rounded-xl">
                            <Trophy className="text-white" size={32} />
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tight">Theme Checklist Report</h1>
                    </div>
                    <p className="text-lg font-bold text-blue-600/80">{assessment.theme_name}</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end gap-2 text-xl font-black mb-1">
                        <Building2 className="text-blue-600" size={24} />
                        <span>{school?.name || 'School Name'}</span>
                    </div>
                </div>
            </div>

            {/* Student Info Bar */}
            <div className="grid grid-cols-3 gap-6 mb-10 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm text-blue-600">
                        <User size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Student Name</p>
                        <p className="text-lg font-bold text-gray-900">{student.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 border-l border-blue-100 pl-6">
                    <div className="bg-white p-3 rounded-xl shadow-sm text-indigo-600">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Class / Grade</p>
                        <p className="text-lg font-bold text-gray-900">Grade {student.grade} {student.section ? `(${student.section})` : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 border-l border-blue-100 pl-6">
                    <div className="bg-white p-3 rounded-xl shadow-sm text-purple-600 border border-purple-100">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Overall Mastery</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-2xl font-black text-gray-900">{overallMastery}%</p>
                            <p className="text-xs font-bold text-gray-500">Achieved</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Domain Mastery Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                {domainMastery.map((domain, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{domain.title}</h3>
                            <span className="text-lg font-black text-blue-600">{domain.masteryPercentage}%</span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full mb-4 overflow-hidden border border-gray-50">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-1000"
                                style={{ width: `${domain.masteryPercentage}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="text-center p-2 rounded-xl bg-green-50 border border-green-100">
                                <p className="text-xs font-bold text-green-700 uppercase mb-0.5">Mastered</p>
                                <p className="text-sm font-black text-green-900">{domain.canCount}</p>
                            </div>
                            <div className="text-center p-2 rounded-xl bg-orange-50 border border-orange-100">
                                <p className="text-xs font-bold text-orange-700 uppercase mb-0.5">Trying</p>
                                <p className="text-sm font-black text-orange-900">{domain.tryingCount}</p>
                            </div>
                            <div className="text-center p-2 rounded-xl bg-red-50 border border-red-100">
                                <p className="text-xs font-bold text-red-700 uppercase mb-0.5">Assistance</p>
                                <p className="text-sm font-black text-red-900">{domain.helpCount}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detailed Skills Section */}
            <div className="space-y-8">
                <h3 className="text-xl font-black text-gray-900 border-b-2 border-gray-100 pb-3 flex items-center gap-2">
                    <CheckCircle2 className="text-blue-600" size={24} />
                    Detailed Skill Progression
                </h3>
                <div className="space-y-10">
                    {domainMastery.map((domain, dIdx) => (
                        <div key={dIdx} className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <h4 className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">
                                    {domain.title}
                                </h4>
                                <div className="flex-1 h-px bg-blue-100"></div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 ml-2">
                                {domain.questions.map((q: any, qIdx: number) => {
                                    const status = assessment.skills?.[q.id];
                                    return (
                                        <div key={qIdx} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                            <div className="mt-0.5">
                                                {status === 'can' ? (
                                                    <CheckCircle2 className="text-green-500" size={20} />
                                                ) : status === 'trying' ? (
                                                    <Circle className="text-orange-400" size={20} />
                                                ) : status === 'help' ? (
                                                    <HelpCircle className="text-red-400" size={20} />
                                                ) : (
                                                    <Circle className="text-gray-200" size={20} />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm font-bold ${status ? 'text-gray-900' : 'text-gray-400'}`}>
                                                    {q.text}
                                                </p>
                                                {status && (
                                                    <p className={`text-[10px] font-black uppercase tracking-tighter mt-1 ${status === 'can' ? 'text-green-600' :
                                                        status === 'trying' ? 'text-orange-600' :
                                                            'text-red-600'
                                                        }`}>
                                                        {status === 'can' ? '✓ Mastered' :
                                                            status === 'trying' ? '→ Developing' :
                                                                '? Needs Support'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t-2 border-gray-100 grid grid-cols-2 gap-10">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-10 text-center">Class Teacher Signature</p>
                    <div className="w-48 mx-auto border-b border-gray-300"></div>
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-10 text-center">Principal / School Authority</p>
                    <div className="w-48 mx-auto border-b border-gray-300"></div>
                </div>
            </div>

            <div className="mt-10 text-center">
                <p className="text-[10px] text-gray-400 font-medium italic">
                    This is a computer-generated report based on continuous thematic assessment.
                    Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
            </div>
        </div>
    );
}
