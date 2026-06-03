import { useState, useRef } from 'react';
import { ArrowLeft, Search, GraduationCap, Download, Printer } from 'lucide-react';
import { THEMES } from './StudentAssessmentForm';

interface Props {
    onBack: () => void;
}

export default function ParentPortal({ onBack }: Props) {
    const [searchInput, setSearchInput] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const handleSearch = async () => {
        const queryVal = searchInput.trim();
        if (!queryVal) return;
        setLoading(true);
        setSearched(true);
        try {
            const { db } = await import('../lib/services/db');
            
            // Search by Roll Number first, then Fallback to Phone
            let students = await db.find('students', { roll_number: queryVal });
            
            if (students.length === 0) {
                students = await db.find('students', { parent_phone: queryVal });
            }
            
            if (students.length === 0) {
                students = await db.find('students', { phone: queryVal });
            }

            // Fetch assessments and school name for each student found
            const resultsWithAssessments = await Promise.all(students.map(async (student: any) => {
                const assessments = await db.find('student_assessments', { student_id: student.id });
                let schoolName = '';
                if (student.school_id) {
                    const school = await db.findById('schools', student.school_id);
                    schoolName = (school as any)?.name || '';
                }
                return { ...student, assessments, schoolName };
            }));

            setResults(resultsWithAssessments);
        } catch (error) {
            console.error('Error:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = (student: any) => {
        const assessments = student.assessments || [];
        const studentGrade = student.grade || 'H1';
        
        let overallCanCount = 0;
        let overallTotalQuestions = 0;

        // Group by themes - but parents usually want the report for the themes already assessed
        // We'll generate a report that shows each theme that has assessments
        const themeReports = assessments.map((assessment: any) => {
            const themeNo = assessment.theme_number;
            const selectedTheme = THEMES.find(t => t.id === themeNo);
            const themeConfig = selectedTheme?.config[studentGrade as keyof typeof selectedTheme.config] || selectedTheme?.config.H1;
            
            if (!themeConfig) return '';

            const domainHtml = themeConfig.map((domain: any) => {
                const domainQuestions = domain.questions || [];
                const canSkills: string[] = [];
                const tryingSkills: string[] = [];
                const helpSkills: string[] = [];
                
                domainQuestions.forEach((q: any) => {
                    const val = assessment.skills?.[q.id];
                    overallTotalQuestions++;
                    if (val === 'can') {
                        canSkills.push(q.text);
                        overallCanCount++;
                    }
                    else if (val === 'trying') tryingSkills.push(q.text);
                    else if (val === 'help') helpSkills.push(q.text);
                });

                if (canSkills.length === 0 && tryingSkills.length === 0 && helpSkills.length === 0) return '';

                return `
                    <div style="margin-bottom: 25px; break-inside: avoid;">
                        <div style="background: #f3f4f6; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; margin-bottom: 15px;">
                            <span style="font-weight: 700; color: #374151; font-size: 16px;">${domain.title}</span>
                            <span style="font-size: 12px; color: #4b5563; font-weight: 600;">(${canSkills.length}/${domainQuestions.length} skills mastered)</span>
                        </div>

                        ${canSkills.length > 0 ? `
                            <div style="margin-bottom: 15px;">
                                <div style="color: #16a34a; font-weight: 700; font-size: 14px; margin-bottom: 5px;">I Can Do</div>
                                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 13px; line-height: 1.6;">
                                    ${canSkills.map(s => `<li>${s}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}

                        ${tryingSkills.length > 0 ? `
                            <div style="margin-bottom: 15px;">
                                <div style="color: #d97706; font-weight: 700; font-size: 14px; margin-bottom: 5px;">Trying To</div>
                                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 13px; line-height: 1.6;">
                                    ${tryingSkills.map(s => `<li>${s}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}

                        ${helpSkills.length > 0 ? `
                            <div style="margin-bottom: 15px;">
                                <div style="color: #dc2626; font-weight: 700; font-size: 14px; margin-bottom: 5px;">Need Help With</div>
                                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 13px; line-height: 1.6;">
                                    ${helpSkills.map(s => `<li>${s}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            return `
                <div style="margin-top: 30px;">
                    <div style="text-align: center; color: #3b82f6; font-size: 14px; font-weight: 600; margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
                        ${selectedTheme?.name || `Theme ${themeNo}`}
                    </div>
                    ${domainHtml}
                </div>
            `;
        }).join('');

        const overallMastery = overallTotalQuestions > 0 ? Math.round((overallCanCount / overallTotalQuestions) * 100) : 0;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Student Report - ${student.name}</title>
    <style>
        @media print {
            body { margin: 0; padding: 0; background: #fff; }
            .no-print { display: none !important; }
            .report-container { border: none !important; box-shadow: none !important; width: 100% !important; max-width: none !important; margin: 0 !important; }
            .page-break { page-break-after: always; }
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f1f5f9;
            margin: 0;
            padding: 40px 20px;
            color: #1e293b;
        }
        .report-container {
            max-width: 850px;
            margin: 0 auto;
            background: #fff;
            border: 1px solid #e2e8f0;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: #eff3fa;
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            color: #3d74ed;
            font-size: 28px;
            margin: 0 0 8px 0;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .header h2 {
            color: #3d74ed;
            font-size: 18px;
            margin: 0 0 12px 0;
            font-weight: 700;
        }
        .header p {
            color: #3d74ed;
            font-size: 13px;
            margin: 0;
        }
        .info-section {
            padding: 30px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 25px;
            border-radius: 4px;
        }
        .info-item {
            display: flex;
            align-items: center;
        }
        .info-item label {
            font-weight: 700;
            min-width: 120px;
            font-size: 14px;
        }
        .info-item span {
            font-size: 14px;
        }
        .mastery-value {
            font-weight: 700;
            font-size: 16px;
        }
        .mastery-high { color: #16a34a; }
        .mastery-mid { color: #d97706; }
        .mastery-low { color: #dc2626; }
        
        .content {
            padding: 0 30px 30px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 11px;
            color: #64748b;
            border-top: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            background: #fff;
        }
        .print-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 50px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            z-index: 100;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>${student.schoolName || ''}</h1>
            <h2>STUDENT PERFORMANCE REPORT</h2>
            <p>${assessments.length > 0 ? (THEMES.find(t => t.id === assessments[0].theme_number)?.name || 'Theme Report') : 'Student Report'}</p>
        </div>
        
        <div class="info-section">
            <div class="info-grid">
                <div class="info-item">
                    <label>Student Name:</label>
                    <span>${student.name}</span>
                </div>
                <div class="info-item">
                    <label>Theme:</label>
                    <span>${assessments.length > 0 ? (THEMES.find(t => t.id === assessments[0].theme_number)?.name?.replace(/Theme \d+: /, '') || 'N/A') : 'N/A'}</span>
                </div>
                <div class="info-item">
                    <label>Grade:</label>
                    <span>${studentGrade}</span>
                </div>
                <div class="info-item">
                    <label>Mastery:</label>
                    <span class="mastery-value ${overallMastery >= 80 ? 'mastery-high' : overallMastery >= 50 ? 'mastery-mid' : 'mastery-low'}">
                        ${overallMastery}%
                    </span>
                </div>
            </div>
        </div>

        <div class="content">
            ${themeReports}
        </div>

        <div class="footer">
            <span>Generated on: ${new Date().toLocaleDateString()}</span>
            <span>Hauna Centre for Research and Training</span>
            <span>Page 1 of 1</span>
        </div>
    </div>
    <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
            printWindow.onload = () => {
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 1000);
            };
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="max-w-2xl mx-auto px-4 py-8">
                <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6">
                    <ArrowLeft size={18} /> Back to Login
                </button>
                <div className="text-center mb-8">
                    <GraduationCap size={40} className="text-blue-600 mx-auto mb-3" />
                    <h1 className="text-3xl font-bold text-gray-800">Parent Portal</h1>
                    <p className="text-gray-500 mt-2">Look up your child's progress</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Find Student Results</label>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                value={searchInput} 
                                onChange={e => setSearchInput(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleSearch()} 
                                placeholder="Enter Roll Number or Phone..." 
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700" 
                            />
                        </div>
                        <button 
                            onClick={handleSearch} 
                            disabled={loading} 
                            className="bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 disabled:opacity-50 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {loading ? 'Searching...' : (
                                <>
                                    <Search size={20} />
                                    Search
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 italic text-center">Tip: Use the unique <b>Roll Number</b> for the fastest result</p>
                </div>

                {searched && results.length === 0 && (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-dashed border-gray-200">
                         <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-gray-300" />
                         </div>
                         <h3 className="text-lg font-bold text-gray-800">No Student Found</h3>
                         <p className="text-gray-500 mt-1 max-w-[250px] mx-auto text-sm">We couldn't find any student with that roll number or phone number.</p>
                    </div>
                )}

                <div className="space-y-6" ref={reportRef}>
                    {results.map((student: any) => (
                        <div key={student.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Student Info Card */}
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 border border-blue-100/50">
                                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                            <span className="text-xl font-bold text-white">{student.name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{student.name}</h3>
                                            <p className="text-blue-100 text-xs font-medium">Roll Number: {student.roll_number || 'N/A'}</p>
                                            {student.schoolName && (
                                                <p className="text-blue-200 text-[10px] font-medium">{student.schoolName}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="inline-block px-3 py-1 bg-white/20 rounded-full backdrop-blur-md">
                                            <p className="text-xs font-black text-white">{student.grade}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 grid grid-cols-2 gap-4 bg-gray-50/30">
                                     <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Parent Name</p>
                                        <p className="font-bold text-gray-800 text-sm">{student.parent_name || 'N/A'}</p>
                                     </div>
                                     <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Status</p>
                                        <p className="text-emerald-600 font-bold text-sm capitalize">{student.status || 'Active'}</p>
                                     </div>
                                </div>

                                {/* Download Report Button */}
                                <div className="px-6 pb-4 flex gap-3">
                                    <button
                                        onClick={() => handleDownloadReport(student)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 font-bold text-sm active:scale-95"
                                    >
                                        <Download size={18} />
                                        Download Report
                                    </button>
                                    <button
                                        onClick={() => handleDownloadReport(student)}
                                        className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-200 transition-all font-bold text-sm"
                                        title="Print Report"
                                    >
                                        <Printer size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Theme Results Grid */}
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Theme Assessment Results (1-9)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(themeNo => {
                                    const assessment = student.assessments?.find((a: any) => a.theme_number === themeNo);
                                    
                                    // Mastery calculation
                                    let mastery = 0;
                                    if (assessment && assessment.skills) {
                                        const values = Object.values(assessment.skills);
                                        const total = values.length;
                                        if (total > 0) {
                                            const can = values.filter(v => v === 'can').length;
                                            const trying = values.filter(v => v === 'trying').length;
                                            mastery = Math.round(((can * 1) + (trying * 0.5)) / total * 100);
                                        }
                                    }

                                    return (
                                        <div key={themeNo} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all ${assessment ? 'border-blue-100 hover:shadow-md' : 'border-gray-100'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${assessment ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-300'}`}>
                                                    {themeNo}
                                                </div>
                                                {assessment ? (
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-blue-600 mb-1">{mastery}% Mastery</p>
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${mastery}%` }} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-gray-300 uppercase">Pending</span>
                                                )}
                                            </div>
                                            <h5 className={`font-bold text-sm mb-1 ${assessment ? 'text-gray-800' : 'text-gray-400'}`}>Theme {themeNo}</h5>
                                            <p className="text-[10px] text-gray-400 leading-tight">
                                                {assessment 
                                                    ? `Assessed on ${new Date(assessment.created_at).toLocaleDateString()}` 
                                                    : 'Not yet assessed for this theme'}
                                            </p>
                                            {/* Skill Details */}
                                            {assessment && assessment.skills && (
                                                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                                                    {Object.entries(assessment.skills).map(([skillName, value]) => (
                                                        <div key={skillName} className="flex items-center justify-between">
                                                            <span className="text-[10px] text-gray-500 truncate max-w-[140px]" title={skillName}>{skillName}</span>
                                                            <span className={`text-[10px] font-bold ${
                                                                value === 'can' ? 'text-green-600' : 
                                                                value === 'trying' ? 'text-amber-500' : 'text-red-500'
                                                            }`}>
                                                                {value === 'can' ? 'I Can ✓' : value === 'trying' ? 'Trying ◐' : 'Need Help ✗'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
