import { useMemo } from 'react';
import { Teacher, Mentor, TrainingAssignment, TrainingProgram, TrainingAttendance, School, MentorTrainingAssignment } from '../lib/models';
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Award, 
  Clock, 
  Building2, 
  Mail, 
  Phone, 
  Star, 
  ShieldCheck,
  Briefcase,
  Zap,
  Target,
  MapPin,
  User,
  HeartPulse,
  CreditCard,
  PhoneIncoming
} from 'lucide-react';

interface Props {
  teacher: Teacher | Mentor;
  assignments: (TrainingAssignment | MentorTrainingAssignment | (TrainingAssignment & { training_program?: TrainingProgram }) | (MentorTrainingAssignment & { training_program?: TrainingProgram }))[];
  attendance: TrainingAttendance[];
  school: School | null;
}

export default function ProfessionalTeacherProfile({ teacher, assignments, attendance, school }: Props) {
  // Calculate Stats
  const stats = useMemo(() => {
    const completed = assignments.filter(a => a.status === 'completed').length;
    const inProgress = assignments.filter(a => a.status === 'in_progress').length;
    
    // Average score
    const scores = assignments.filter(a => a.score !== null).map(a => a.score as number);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    // Attendance Rate
    const totalAttendance = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    // Certificates
    const certificatesIssued = assignments.filter(a => (a as any).certificate_issued).length;
    
    return {
      completed,
      inProgress,
      avgScore,
      attendanceRate,
      totalTrainings: assignments.length,
      certificatesIssued,
    };
  }, [assignments, attendance]);

  // Per-program attendance helper
  const getAttendanceForProgram = (programId: string) => {
    const records = attendance.filter(a => a.training_program_id === programId);
    const present = records.filter(a => a.status === 'present' || a.status === 'late').length;
    const absent = records.filter(a => a.status === 'absent').length;
    const total = records.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { records, present, absent, total, rate };
  };

  // Certificate eligibility helper
  const getCertEligibility = (assignment: any) => {
    if (assignment.certificate_issued) return 'certified';
    if (assignment.status !== 'completed') {
      // Check if they attended at all
      const progAttendance = getAttendanceForProgram(assignment.training_program_id);
      if (progAttendance.total === 0) return 'pending';
      return 'in_progress';
    }
    // Completed — check if attendance >= 75%
    const progAttendance = getAttendanceForProgram(assignment.training_program_id);
    if (progAttendance.rate < 75) return 'not_eligible';
    if (assignment.score !== null && assignment.score < 60) return 'not_eligible';
    return 'eligible';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'on_leave': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  // Helper to get specialization regardless of type
  const specialization = (teacher as Teacher).subject_specialization || (teacher as Mentor).specialization;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header Profile Card */}
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100 overflow-hidden border border-blue-50">
        <div className="h-48 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <div className="absolute -bottom-1 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
        </div>
        
        <div className="px-8 md:px-12 pb-10">
          <div className="relative flex flex-col md:flex-row md:items-end gap-8 -mt-20">
            {/* Avatar Section */}
            <div className="relative group">
                <div className="w-40 h-40 bg-white rounded-[2.5rem] shadow-2xl p-2 border border-blue-50 relative z-10 overflow-hidden">
                    {(teacher as Teacher).photo_url ? (
                        <img 
                            src={(teacher as Teacher).photo_url} 
                            alt={`${teacher.first_name} ${teacher.last_name}`}
                            className="w-full h-full rounded-[2rem] object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }}
                        />
                    ) : null}
                    <div className={`w-full h-full bg-blue-50 rounded-[2rem] items-center justify-center text-blue-600 group-hover:scale-95 transition-transform duration-500 ${(teacher as Teacher).photo_url ? 'hidden' : 'flex'}`}>
                        <GraduationCap size={72} strokeWidth={1.5} className="drop-shadow-sm" />
                    </div>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-[2.75rem] blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">{teacher.first_name} {teacher.last_name}</h1>
                <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${getStatusColor(teacher.status)}`}>
                  {teacher.status || 'Active'}
                </span>
                {(teacher as any).role === 'mentor' || !((teacher as any).hasOwnProperty('subject_specialization')) ? (
                   <span className="px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest border bg-indigo-50 text-indigo-700 border-indigo-100">
                     Mentor
                   </span>
                ) : null}
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-slate-500 font-medium">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <Building2 size={16} className="text-blue-500" />
                  <span className="text-slate-700">{school?.name || 'Academic Institution Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <Briefcase size={16} className="text-indigo-500" />
                  <span className="text-slate-700">{specialization || 'General Education'}</span>
                </div>
                {teacher.years_of_experience && (
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Zap size={16} className="text-amber-500" />
                        <span className="text-slate-700">{teacher.years_of_experience} Years Exp.</span>
                    </div>
                )}
              </div>
            </div>

            {/* Contact Quick Links */}
            <div className="flex md:flex-col gap-3 pb-2">
                <div className="flex items-center gap-2 text-slate-400 font-medium text-sm">
                    <Mail size={16} />
                    <span>{teacher.email || 'notprovided@hauna.com'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-medium text-sm">
                    <Phone size={16} />
                    <span>{teacher.phone || '+91 ----------'}</span>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* HR Details Card */}
      {(() => {
        const t = teacher as Teacher;
        const hasHrData = t.employee_id || t.gender || t.date_of_birth || t.blood_group || t.address || t.emergency_contact?.name;
        if (!hasHrData) return null;
        const age = t.date_of_birth ? Math.floor((Date.now() - new Date(t.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
        return (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100 p-8">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-600" />
              HR File
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {t.employee_id && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><CreditCard size={11} />Employee ID</p>
                  <p className="text-sm font-bold text-slate-900">{t.employee_id}</p>
                </div>
              )}
              {t.date_of_birth && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={11} />Date of Birth</p>
                  <p className="text-sm font-bold text-slate-900">{new Date(t.date_of_birth).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}{age ? ` (${age} yrs)` : ''}</p>
                </div>
              )}
              {t.gender && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><User size={11} />Gender</p>
                  <p className="text-sm font-bold text-slate-900 capitalize">{t.gender}</p>
                </div>
              )}
              {t.blood_group && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><HeartPulse size={11} />Blood Group</p>
                  <p className="text-sm font-bold text-red-600">{t.blood_group}</p>
                </div>
              )}
              {t.address && (
                <div className="col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={11} />Address</p>
                  <p className="text-sm font-bold text-slate-900">{t.address}</p>
                </div>
              )}
            </div>
            {t.emergency_contact?.name && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-1"><PhoneIncoming size={11} />Emergency Contact</p>
                <div className="flex flex-wrap gap-4">
                  <span className="text-sm font-bold text-slate-900">{t.emergency_contact.name}</span>
                  {t.emergency_contact.relationship && <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-100">{t.emergency_contact.relationship}</span>}
                  {t.emergency_contact.phone && <span className="flex items-center gap-1 text-sm font-bold text-slate-600"><Phone size={13} />{t.emergency_contact.phone}</span>}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Training Performance */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <TrendingUp size={24} />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Academic Score</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-black text-slate-900">{stats.avgScore}%</h3>
                    <span className="text-xs font-bold text-emerald-500 mb-1.5 flex items-center gap-0.5">
                        <Star size={12} fill="currentColor" /> Mastery
                    </span>
                </div>
                <div className="mt-4 w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${stats.avgScore}%` }}></div>
                </div>
            </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                    <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Programs Completed</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-black text-slate-900">{stats.completed}</h3>
                    <span className="text-xs font-bold text-slate-400 mb-1.5">of {stats.totalTrainings} Assigned</span>
                </div>
                <div className="mt-4 w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.completed / (stats.totalTrainings || 1)) * 100}%` }}></div>
                </div>
            </div>
        </div>

        {/* Attendance Score */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                    <Calendar size={24} />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Attendance Rate</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-black text-slate-900">{stats.attendanceRate}%</h3>
                    <span className="text-xs font-bold text-rose-500 mb-1.5">Reliability</span>
                </div>
                <div className="mt-4 w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${stats.attendanceRate}%` }}></div>
                </div>
            </div>
        </div>

        {/* Certificates Earned */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                    <Award size={24} />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Certificates</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-black text-slate-900">{stats.certificatesIssued}</h3>
                    <span className="text-xs font-bold text-amber-500 mb-1.5">Earned</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <Clock size={14} className="text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-500">
                      {assignments.reduce((acc, curr) => acc + ((curr as any).training_program?.duration_hours || 0), 0)} Hrs Total
                    </span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Professional Dossier (Training Cards) */}
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <Award className="text-blue-600" />
                    Training Certifications
                </h3>
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl border border-blue-100">
                    {assignments.length} Total Programs
                </span>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {assignments.map((assignment) => {
                    const eligibility = getCertEligibility(assignment);
                    const progId = (assignment as any).training_program_id || '';
                    const progAttendance = getAttendanceForProgram(progId);
                    const marksData = (assignment as any).marks_data as Record<string, number> | undefined;
                    const marksConfig = (assignment as any).training_program?.marks_configuration?.subjects;

                    const eligBadge = {
                      certified: { label: 'Certified', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <ShieldCheck size={14} /> },
                      eligible: { label: 'Eligible for Certificate', bg: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 size={14} /> },
                      not_eligible: { label: 'Attended · Not Eligible', bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Target size={14} /> },
                      in_progress: { label: 'In Progress', bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: <TrendingUp size={14} /> },
                      pending: { label: 'Not Started', bg: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Clock size={14} /> }
                    }[eligibility];

                    return (
                    <div key={assignment.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 hover:shadow-2xl hover:shadow-slate-200 transition-all group relative overflow-hidden">
                        {/* Certificate Eligibility Badge */}
                        <div className="absolute top-0 right-0 p-4">
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${eligBadge.bg}`}>
                                {eligBadge.icon}
                                {eligBadge.label}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:scale-110 transition-transform">
                                <BookOpen size={32} className="text-slate-400" />
                            </div>
                            
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h4 className="text-xl font-black text-slate-900 mb-1">{(assignment as any).training_program?.title}</h4>
                                    <p className="text-slate-500 font-medium text-sm line-clamp-2">{(assignment as any).training_program?.description}</p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-lg ${assignment.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {assignment.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Date</p>
                                        <p className="text-sm font-bold text-slate-700">{new Date(assignment.assigned_date).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Progress</p>
                                        <p className="text-sm font-black text-blue-600">{assignment.progress_percentage}%</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                        <p className={`text-sm font-black ${assignment.score && assignment.score >= 80 ? 'text-emerald-600' : 'text-slate-900'}`}>{assignment.score ? `${assignment.score}%` : '---'}</p>
                                    </div>
                                </div>

                                {/* Attendance Breakdown */}
                                {progAttendance.total > 0 && (
                                  <div className="pt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Calendar size={11} /> Attendance
                                      </p>
                                      <span className={`text-xs font-bold ${progAttendance.rate >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {progAttendance.present}/{progAttendance.total} days ({progAttendance.rate}%)
                                      </span>
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                      {progAttendance.records.map((rec, idx) => (
                                        <div
                                          key={idx}
                                          title={`${rec.attendance_date} — ${rec.status}${rec.notes ? ': ' + rec.notes : ''}`}
                                          className={`w-5 h-5 rounded-md text-[8px] font-black flex items-center justify-center ${
                                            rec.status === 'present' ? 'bg-emerald-100 text-emerald-600' :
                                            rec.status === 'late' ? 'bg-amber-100 text-amber-600' :
                                            rec.status === 'excused' ? 'bg-blue-100 text-blue-600' :
                                            'bg-red-100 text-red-600'
                                          }`}
                                        >
                                          {rec.status === 'present' ? 'P' : rec.status === 'late' ? 'L' : rec.status === 'excused' ? 'E' : 'A'}
                                        </div>
                                      ))}
                                    </div>
                                    {progAttendance.rate < 75 && (
                                      <p className="text-[10px] text-amber-600 font-bold mt-1">⚠ Below 75% minimum for certificate eligibility</p>
                                    )}
                                  </div>
                                )}

                                {/* Marks Breakdown */}
                                {marksData && Object.keys(marksData).length > 0 && (
                                  <div className="pt-3 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                      <Star size={11} /> Subject-wise Marks
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                      {Object.entries(marksData).map(([subject, marks]) => {
                                        const maxMarks = marksConfig?.find((s: any) => s.name === subject)?.max_marks || 100;
                                        const pct = Math.round((marks / maxMarks) * 100);
                                        return (
                                          <div key={subject} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-500 truncate">{subject}</p>
                                            <div className="flex items-end gap-1 mt-0.5">
                                              <span className={`text-sm font-black ${pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{marks}</span>
                                              <span className="text-[10px] text-slate-400 mb-0.5">/{maxMarks}</span>
                                            </div>
                                            <div className="h-1 w-full bg-slate-200 rounded-full mt-1 overflow-hidden">
                                              <div className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }}></div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>

        {/* Competency & Verified Details */}
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4 px-2">
                <h3 className="text-2xl font-black text-slate-900">Expertise</h3>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-100">
                <div className="p-8 space-y-8">
                    {/* Qualification */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                            <ShieldCheck size={14} />
                            Verified Qualifications
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {((teacher as Teacher).qualification || (teacher as Mentor).profile_details?.qualification || 'Certification Pending').split(',').map((q, i) => (
                                <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-100">
                                    {q.trim()}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Competencies */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                            <Star size={14} />
                            Soft Skill Index
                        </div>
                        
                        <div className="space-y-5">
                            {[
                                { label: 'Patience & Empathy', value: teacher.profile_details?.competencies?.patience?.principal ?? 0 },
                                { label: 'Daily Lesson Planning', value: teacher.profile_details?.competencies?.planning?.principal ?? 0 },
                                { label: 'Cooperative Spirit', value: teacher.profile_details?.competencies?.cooperative?.principal ?? 0 },
                                { label: 'Inquiry & Learning', value: teacher.profile_details?.competencies?.initiative?.principal ?? 0 },
                            ].map((comp, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-700">
                                        <span>{comp.label}</span>
                                        <span className="text-blue-600">{comp.value}/5</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000" 
                                            style={{ width: `${(Number(comp.value) / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* LSRW Profile */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                            <BookOpen size={14} />
                            LSRW Proficiency
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(teacher.profile_details?.lsrw_ratings || {}).map(([key, val]: [string, any]) => (
                                <div key={key} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{key}</p>
                                    <p className="text-xs font-black text-slate-900">{val.principal || 'UNRATED'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
