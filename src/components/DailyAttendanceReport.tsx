import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import {
  TrainingProgram,
  User,
  Permission,
  TrainingAttendance,
  Teacher,
  School,
  SchoolAssignment,
  TrainingAssignment,
  Mentor,
  MentorTrainingAttendance,
  MentorTrainingAssignment
} from '../lib/models';
import { Calendar, Users, FileText, Download, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

interface DailyAttendance {
  attendance_date: string;
  training_program_id: string;
  training_program_name: string;
  total_assigned: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_percentage: number;
}

interface AttendanceDetail {
  id: string;
  name: string;
  email: string;
  school_name: string;
  role: 'Teacher' | 'Mentor';
  status: string;
  notes: string;
  recorded_by_name: string;
}

interface ConsolidatedAttendance {
  trainee_id: string;
  name: string;
  role: 'Teacher' | 'Mentor';
  school_name: string;
  total_sessions: number;
  present_count: number;
  attendance_percentage: number;
  marks: number | null;
  status: string;
}

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DailyAttendanceReport({ currentUser, currentPermissions }: Props) {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [dailyReports, setDailyReports] = useState<DailyAttendance[]>([]);
  const [attendanceDetails, setAttendanceDetails] = useState<AttendanceDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'consolidated'>('daily');
  const [consolidatedReports, setConsolidatedReports] = useState<ConsolidatedAttendance[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const canViewReports = currentUser.role === 'admin' || currentUser.role === 'employee' || currentPermissions.can_view_reports;

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (reportType === 'daily') {
      if (selectedDate) loadDailyReport();
    } else {
      if (selectedProgram !== 'all') loadConsolidatedReport();
    }
  }, [selectedDate, selectedProgram, reportType]);

  const loadPrograms = async () => {
    const data = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});
    if (data) {
      // Sort client-side to avoid Firestore index requirements
      const sortedData = data.sort((a, b) => a.title.localeCompare(b.title));
      setPrograms(sortedData);
    }
  };

  const loadDailyReport = async () => {
    setLoading(true);

    try {
      let assignedSchoolIds: string[] = [];

      if (currentUser.role !== 'admin') {
        const userAssignments = await db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
        assignedSchoolIds = userAssignments?.map(a => a.school_id) || [];
      }

      const attendanceFilter: any = { attendance_date: selectedDate };
      if (selectedProgram !== 'all') {
        attendanceFilter.training_program_id = selectedProgram;
      }

      // Fetch both teacher and mentor attendance
      const [teacherAttendance, mentorAttendance] = await Promise.all([
        db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, attendanceFilter),
        db.find<MentorTrainingAttendance>(Collections.MENTOR_TRAINING_ATTENDANCE, attendanceFilter)
      ]);

      const allAttendance = [
        ...(teacherAttendance || []).map(a => ({ ...a, type: 'teacher' as const })),
        ...(mentorAttendance || []).map(a => ({ ...a, type: 'mentor' as const }))
      ];

      // Fetch related data
      const [teachers, mentors, schools, allPrograms, users] = await Promise.all([
        db.find<Teacher>(Collections.TEACHERS, {}),
        db.find<Mentor>(Collections.MENTORS, {}),
        db.find<School>(Collections.SCHOOLS, {}),
        db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {}),
        db.find<User>(Collections.USERS, {})
      ]);

      const filteredAttendance = currentUser.role === 'admin'
        ? allAttendance
        : allAttendance.filter((record) => {
          if (record.type === 'teacher') {
            const teacher = teachers?.find(t => t.id === (record as any).teacher_id);
            return teacher && teacher.school_id && assignedSchoolIds.includes(teacher.school_id);
          } else {
            // For mentors, check if they are assigned to any of the user's schools
            // This logic might need refinement based on how mentors are assigned to schools
            const mentor = mentors?.find(m => m.id === (record as any).mentor_id);
            return mentor && mentor.school_id && assignedSchoolIds.includes(mentor.school_id);
          }
        });

      const programMap = new Map<string, DailyAttendance>();

      for (const record of filteredAttendance) {
        const programId = record.training_program_id;
        const program = allPrograms?.find(p => p.id === programId);
        const programName = program?.title || 'Unknown Program';

        if (!programMap.has(programId)) {
          // Fetch assignments to calculate totals
          const [teacherAssignments, mentorAssignments] = await Promise.all([
            db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, { training_program_id: programId }),
            db.find<MentorTrainingAssignment>(Collections.MENTOR_TRAINING_ASSIGNMENTS, { training_program_id: programId })
          ]);

          let totalAssigned = 0;

          if (currentUser.role === 'admin') {
            totalAssigned = (teacherAssignments?.length || 0) + (mentorAssignments?.length || 0);
          } else {
            const filteredTeacherAssignments = (teacherAssignments || []).filter(a => {
              const teacher = teachers?.find(t => t.id === a.teacher_id);
              return teacher && teacher.school_id && assignedSchoolIds.includes(teacher.school_id);
            });

            const filteredMentorAssignments = (mentorAssignments || []).filter(a => {
              const mentor = mentors?.find(m => m.id === a.mentor_id);
              return mentor && mentor.school_id && assignedSchoolIds.includes(mentor.school_id);
            });

            totalAssigned = filteredTeacherAssignments.length + filteredMentorAssignments.length;
          }

          programMap.set(programId, {
            attendance_date: selectedDate,
            training_program_id: programId,
            training_program_name: programName,
            total_assigned: totalAssigned,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attendance_percentage: 0,
          });
        }

        const report = programMap.get(programId)!;

        switch (record.status) {
          case 'present':
            report.present++;
            break;
          case 'absent':
            report.absent++;
            break;
          case 'late':
            report.late++;
            break;
          case 'excused':
            report.excused++;
            break;
        }
      }

      programMap.forEach((report) => {
        report.attendance_percentage = report.total_assigned > 0
          ? Math.round((report.present / report.total_assigned) * 100)
          : 0;
      });

      setDailyReports(Array.from(programMap.values()));

      // Prepare details for the table
      const details: AttendanceDetail[] = filteredAttendance.map((record) => {
        let name = 'Unknown';
        let email = '';
        let schoolName = 'Unknown';
        let role: 'Teacher' | 'Mentor' = 'Teacher';

        if (record.type === 'teacher') {
          const teacher = teachers?.find(t => t.id === (record as any).teacher_id);
          const school = teacher ? schools?.find(s => s.id === teacher.school_id) : undefined;
          name = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher';
          email = teacher?.email || '';
          schoolName = school?.name || 'Unknown School';
          role = 'Teacher';
        } else {
          const mentor = mentors?.find(m => m.id === (record as any).mentor_id);
          const school = mentor ? schools?.find(s => s.id === mentor.school_id) : undefined; // Mentors have school_id
          name = mentor ? `${mentor.first_name} ${mentor.last_name}` : 'Unknown Mentor';
          email = mentor?.email || '';
          schoolName = school?.name || 'Unknown School';
          role = 'Mentor';
        }

        const recordedByUser = users?.find(u => u.id === record.recorded_by);
        const recordedByName = recordedByUser ? recordedByUser.full_name : 'Unknown';

        return {
          id: record.id || `${record.type}-${(record as any).teacher_id || (record as any).mentor_id}-${record.attendance_date}`,
          name,
          email,
          school_name: schoolName,
          role,
          status: record.status,
          notes: record.notes || '',
          recorded_by_name: recordedByName
        };
      });

      setAttendanceDetails(details);

    } catch (error) {
      console.error('Error loading daily report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConsolidatedReport = async () => {
    if (selectedProgram === 'all') return;
    setLoading(true);

    try {
      const [teacherAssignments, mentorAssignments, teacherAttendance, mentorAttendance, teachers, mentors, schools] = await Promise.all([
        db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, { training_program_id: selectedProgram }),
        db.find<MentorTrainingAssignment>(Collections.MENTOR_TRAINING_ASSIGNMENTS, { training_program_id: selectedProgram }),
        db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, { training_program_id: selectedProgram }),
        db.find<MentorTrainingAttendance>(Collections.MENTOR_TRAINING_ATTENDANCE, { training_program_id: selectedProgram }),
        db.find<Teacher>(Collections.TEACHERS, {}),
        db.find<Mentor>(Collections.MENTORS, {}),
        db.find<School>(Collections.SCHOOLS, {})
      ]);

      const allAttendance = [
        ...(teacherAttendance || []).map(a => ({ ...a, type: 'teacher' as const })),
        ...(mentorAttendance || []).map(a => ({ ...a, type: 'mentor' as const }))
      ];

      // Calculate total sessions for this program (unique dates in attendance)
      const selectedProgramObj = programs.find(p => p.id === selectedProgram);
      const isC10 = selectedProgramObj && (
        (selectedProgramObj.title || '').toLowerCase().includes('c10') ||
        (selectedProgramObj.title || '').toLowerCase().includes('c.10')
      );

      const uniqueDates = new Set(allAttendance.map(a => a.attendance_date));
      const totalSessions = isC10 ? 16 : uniqueDates.size;

      const teacherConsolidated: ConsolidatedAttendance[] = (teacherAssignments || []).map(assignment => {
        const teacher = teachers?.find(t => t.id === assignment.teacher_id);
        const school = teacher ? schools?.find(s => s.id === teacher.school_id) : null;
        const traineeAttendance = (teacherAttendance || []).filter(a => a.teacher_id === assignment.teacher_id);
        const presentCount = traineeAttendance.filter(a => a.status === 'present').length;

        return {
          trainee_id: assignment.teacher_id,
          name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher',
          role: 'Teacher',
          school_name: school?.name || 'Unknown School',
          total_sessions: totalSessions,
          present_count: presentCount,
          attendance_percentage: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0,
          marks: assignment.score || null,
          status: assignment.status
        };
      });

      const mentorConsolidated: ConsolidatedAttendance[] = (mentorAssignments || []).map(assignment => {
        const mentor = mentors?.find(m => m.id === assignment.mentor_id);
        const school = mentor ? schools?.find(s => s.id === mentor.school_id) : null;
        const traineeAttendance = (mentorAttendance || []).filter(a => a.mentor_id === assignment.mentor_id);
        const presentCount = traineeAttendance.filter(a => a.status === 'present').length;

        return {
          trainee_id: assignment.mentor_id,
          name: mentor ? `${mentor.first_name} ${mentor.last_name}` : 'Unknown Mentor',
          role: 'Mentor',
          school_name: school?.name || 'Unknown School',
          total_sessions: totalSessions,
          present_count: presentCount,
          attendance_percentage: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0,
          marks: assignment.score || null,
          status: assignment.status
        };
      });

      setConsolidatedReports([...teacherConsolidated, ...mentorConsolidated]);
    } catch (error) {
      console.error('Error loading consolidated report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let csvContent = "";

    if (reportType === 'daily') {
      csvContent = `Daily Attendance Report - ${selectedDate}\n\n`;
      csvContent += 'Program,Total Assigned,Present,Absent,Late,Excused,Attendance %\n';
      dailyReports.forEach(report => {
        csvContent += `"${report.training_program_name}",${report.total_assigned},${report.present},${report.absent},${report.late},${report.excused},${report.attendance_percentage}%\n`;
      });

      if (showDetails && attendanceDetails.length > 0) {
        csvContent += '\n\nAttendance Details\n';
        csvContent += 'Name,Role,Email,School,Status,Notes,Recorded By\n';
        attendanceDetails.forEach(detail => {
          csvContent += `"${detail.name}","${detail.role}","${detail.email}","${detail.school_name}","${detail.status}","${detail.notes}","${detail.recorded_by_name}"\n`;
        });
      }
    } else {
      const programName = programs.find(p => p.id === selectedProgram)?.title || 'Program';
      csvContent = `Consolidated Attendance & Marks Report - ${programName}\n\n`;
      csvContent += 'Name,Role,School,Present Sessions,Total Sessions,Attendance %,Marks,Status\n';
      consolidatedReports.forEach(report => {
        csvContent += `"${report.name}","${report.role}","${report.school_name}",${report.present_count},${report.total_sessions},${report.attendance_percentage}%,${report.marks ?? '-'},"${report.status}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const programName = programs.find(p => p.id === selectedProgram)?.title || 'Program';

    if (reportType === 'daily') {
      doc.setFontSize(18);
      doc.text('Daily Training Attendance Report', 14, 20);

      doc.setFontSize(12);
      doc.text(`Date: ${selectedDate}`, 14, 30);

      const summaryData = dailyReports.map(report => [
        report.training_program_name,
        report.total_assigned.toString(),
        report.present.toString(),
        report.absent.toString(),
        report.late.toString(),
        report.excused.toString(),
        `${report.attendance_percentage}%`
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Program', 'Total', 'Present', 'Absent', 'Late', 'Excused', 'Rate']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 }
      });

      if (showDetails && attendanceDetails.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 40;

        doc.setFontSize(14);
        doc.text('Attendance Details', 14, finalY + 15);

        const detailsData = attendanceDetails.map(detail => [
          detail.name,
          detail.role,
          detail.school_name,
          detail.status,
          detail.notes || '-',
          detail.recorded_by_name
        ]);

        autoTable(doc, {
          startY: finalY + 20,
          head: [['Name', 'Role', 'School', 'Status', 'Notes', 'Recorded By']],
          body: detailsData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 15 },
            2: { cellWidth: 30 },
            3: { cellWidth: 20 },
            4: { cellWidth: 40 },
            5: { cellWidth: 30 }
          }
        });
      }
    } else {
      doc.setFontSize(18);
      doc.text('Consolidated Attendance & Marks Report', 14, 20);

      doc.setFontSize(12);
      doc.text(`Program: ${programName}`, 14, 30);

      const consolidatedData = consolidatedReports.map(report => [
        report.name,
        report.role,
        report.school_name,
        `${report.present_count} / ${report.total_sessions}`,
        `${report.attendance_percentage}%`,
        report.marks?.toString() || '-',
        report.status
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Name', 'Role', 'School', 'Attendance', 'Rate', 'Marks', 'Status']],
        body: consolidatedData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.setFontSize(14);
      doc.text('Attendance Analysis', 14, finalY + 15);

      const highAttendance = consolidatedReports.filter(r => r.attendance_percentage >= 75).length;
      const lowAttendance = consolidatedReports.filter(r => r.attendance_percentage < 75).length;

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Metric', 'Count']],
        body: [
          ['Total Trainees', consolidatedReports.length.toString()],
          ['Attendance >= 75%', highAttendance.toString()],
          ['Attendance < 75%', lowAttendance.toString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 10 },
        margin: { left: 14 }
      });
    }

    const fileName = reportType === 'daily'
      ? `attendance_report_${selectedDate}.pdf`
      : `consolidated_report_${programName.replace(/\s+/g, '_').toLowerCase()}.pdf`;

    doc.save(fileName);
  };

  if (!canViewReports) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">You don't have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-8 h-8 text-blue-600" />
          Training Attendance & Marks Report
        </h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setReportType('daily')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportType === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setReportType('consolidated')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportType === 'consolidated' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Consolidated View
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {reportType === 'daily' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Training Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => {
                console.log('Program selected:', e.target.value);
                setSelectedProgram(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            >
              <option value="all">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={exportToPDF}
              disabled={reportType === 'daily' ? dailyReports.length === 0 : consolidatedReports.length === 0}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={exportToCSV}
              disabled={reportType === 'daily' ? dailyReports.length === 0 : consolidatedReports.length === 0}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading report...</p>
          </div>
        ) : (reportType === 'daily' && dailyReports.length === 0) || (reportType === 'consolidated' && consolidatedReports.length === 0) ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No records found for the selection.</p>
          </div>
        ) : reportType === 'consolidated' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-700">{consolidatedReports.length}</div>
                <div className="text-sm font-medium text-blue-600">Total Trainees</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-700">
                  {consolidatedReports.filter(r => r.attendance_percentage >= 75).length}
                </div>
                <div className="text-sm font-medium text-green-600">Attendance &ge; 75%</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-700">
                  {consolidatedReports.filter(r => r.attendance_percentage < 75).length}
                </div>
                <div className="text-sm font-medium text-red-600">Attendance &lt; 75%</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trainee Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Attendance</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Marks</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consolidatedReports.map((report, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{report.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${report.role === 'Mentor' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {report.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{report.school_name}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-semibold text-gray-900">{report.present_count} / {report.total_sessions}</div>
                        <div className="text-xs text-gray-500">{report.attendance_percentage}%</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-blue-600">{report.marks ?? '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                        ${report.status === 'completed' ? 'bg-green-100 text-green-800' :
                            report.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'}`}>
                          {report.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {dailyReports.map((report) => (
                <div key={report.training_program_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{report.training_program_name}</h3>
                      <p className="text-sm text-gray-600">Total Assigned: {report.total_assigned}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{report.attendance_percentage}%</div>
                      <div className="text-xs text-gray-600">Attendance Rate</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-700">{report.present}</div>
                      <div className="text-xs text-green-600">Present</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-700">{report.absent}</div>
                      <div className="text-xs text-red-600">Absent</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-700">{report.late}</div>
                      <div className="text-xs text-yellow-600">Late</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-700">{report.excused}</div>
                      <div className="text-xs text-blue-600">Excused</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t pt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                {showDetails ? 'Hide' : 'Show'} Attendance Details
              </button>

              {showDetails && attendanceDetails.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceDetails.map((detail, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>{detail.name}</div>
                            <div className="text-xs text-gray-500">{detail.email}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${detail.role === 'Mentor' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {detail.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{detail.school_name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                              ${detail.status === 'present' ? 'bg-green-100 text-green-800' :
                                detail.status === 'absent' ? 'bg-red-100 text-red-800' :
                                  detail.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'}`}>
                              {detail.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{detail.recorded_by_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{detail.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
