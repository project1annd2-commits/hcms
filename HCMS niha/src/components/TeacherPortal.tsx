import React, { useState, useEffect, useRef } from 'react';
import { Teacher, TrainingAssignment, TrainingProgram, TrainingAttendance, School, SchoolAssignment, User, CertificateTemplate, TeacherProfileDetails } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { LogOut, GraduationCap, BookOpen, Calendar, Award, MessageSquare, FileText, X, Printer, CheckCircle, ClipboardCheck, ArrowLeft, User as UserIcon, Settings, Users, Bot, Plus, Target, Download, ChevronDown, ChevronUp, File } from 'lucide-react';
import ChatWindow from './ChatWindow';
import PasscodeSettings from './PasscodeSettings';
import { chatService } from '../lib/services/chat';
import RenderedTemplate from './TemplateDesigner/RenderedTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getComponentGrade } from '../lib/utils';
import StudentAssessmentForm from './StudentAssessmentForm';
import ThemeChecklistsAnalytics from './ThemeChecklistsAnalytics';
import StudentManager from './StudentManager';
import TeacherStudentListing from './TeacherStudentListing';
import StudentProfileView from './StudentProfileView';
import { Student, StudentAssessment } from '../lib/models';
import { THEMES } from './StudentAssessmentForm';
import ProfessionalTeacherProfile from './ProfessionalTeacherProfile';


interface Props {
  teacher: Teacher;
  onLogout: () => void;
}

type AssignmentWithDetails = TrainingAssignment & {
  training_program?: TrainingProgram;
  is_self_enrolled?: boolean;
};

export default function TeacherPortal({ teacher, onLogout }: Props) {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [availablePrograms, setAvailablePrograms] = useState<TrainingProgram[]>([]);
  const [attendance, setAttendance] = useState<TrainingAttendance[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<Record<string, number>>({});
  const [school, setSchool] = useState<School | null>(null);
  const [assignedEmployee, setAssignedEmployee] = useState<User | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [isSupportChat, setIsSupportChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'home' | 'trainings' | 'checklist' | 'profile' | 'attendance' | 'settings' | 'students'>('home');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateAssignment, setCertificateAssignment] = useState<AssignmentWithDetails | null>(null);
  const [certificateModalMode, setCertificateModalMode] = useState<'certificate' | 'marks_card'>('certificate');
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showStudentManager, setShowStudentManager] = useState(false);
  const [profileFormData, setProfileFormData] = useState<TeacherProfileDetails | null>(null);
  const [teacherInfoFormData, setTeacherInfoFormData] = useState<Partial<Teacher>>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showProfileAlert, setShowProfileAlert] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Student Performance Breakdown states
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [studentAssessments, setStudentAssessments] = useState<Record<string, StudentAssessment[]>>({});
  const [selectedThemeForBreakdown, setSelectedThemeForBreakdown] = useState<number>(7);
  const [selectedSectionForBreakdown, setSelectedSectionForBreakdown] = useState<string>('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const performanceRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Check if profile needs completion on load
  useEffect(() => {
    if (!teacher.profile_details?.area_of_excellency?.self && !teacher.profile_details?.area_of_improvement?.self) {
      setShowProfileAlert(true);
      // Removed timeout to make it persistent until updated or closed
    }
  }, [teacher]);

  const handleSaveProfile = async () => {
    if (!teacher.id || !profileFormData) return;
    setSavingProfile(true);
    try {
      await db.updateById(Collections.TEACHERS, teacher.id, {
        ...teacherInfoFormData,
        profile_details: profileFormData,
        updated_at: new Date().toISOString()
      });
      setIsEditingProfile(false);
      db.logActivity({
        user_id: teacher.id,
        user_name: `${teacherInfoFormData.first_name || teacher.first_name} ${teacherInfoFormData.last_name || teacher.last_name}`,
        user_role: 'teacher',
        action: 'update_profile',
        details: 'Teacher updated their profile and self-evaluation',
        school_id: teacher.school_id || undefined
      });
      setToastMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      setToastMessage({ type: 'error', text: 'Failed to update profile' });
    }
    setSavingProfile(false);
  };

  // Track view changes
  useEffect(() => {
    if (!teacher) return;

    db.logActivity({
      user_id: teacher.id!,
      user_name: `${teacher.first_name} ${teacher.last_name}`,
      user_role: 'teacher',
      action: 'view_change',
      view: currentView,
      school_id: teacher.school_id || undefined
    });
  }, [currentView, teacher]);

  const certificateRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (assignments.length > 0 && programs.length > 0) {
      fetchAttendanceStats();
    }
  }, [assignments, programs]);

  // Load students when checklist view is active
  useEffect(() => {
    if (currentView === 'checklist' && teacher.school_id) {
      loadStudentsForPerformance();
    }
  }, [currentView, teacher.school_id, selectedThemeForBreakdown]);

  const availableSectionsForBreakdown = Array.from(new Set(studentsList
    .map(s => s.section || '')
    .filter(s => s !== '')
  )).sort();

  const filteredPerformanceStudents = studentsList.filter(s => 
    !selectedSectionForBreakdown || (s.section || '').toUpperCase() === selectedSectionForBreakdown.toUpperCase()
  );

  const loadTemplates = async () => {
    try {
      const allTemplates = await db.find<CertificateTemplate>(Collections.CERTIFICATE_TEMPLATES, {});
      setTemplates(allTemplates);
    } catch (error) {
      console.error("Error loading templates", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Find all teacher IDs associated with this phone number
      let teacherIds = [teacher.id];
      if (teacher.phone) {
        const teachersWithSamePhone = await db.find<Teacher>(Collections.TEACHERS, { phone: teacher.phone });
        if (teachersWithSamePhone && teachersWithSamePhone.length > 0) {
          teacherIds = teachersWithSamePhone.map(t => t.id!);
        }
      }

      console.log('Fetching assignments for teacher IDs:', teacherIds);

      const [assignmentsData, attendanceData, schoolData, schoolAssignmentsData] = await Promise.all([
        db.find(Collections.TRAINING_ASSIGNMENTS, { teacher_id: { $in: teacherIds } }, { sort: { assigned_date: -1 } }),
        db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, { teacher_id: teacher.id }, { sort: { attendance_date: -1 } }),
        teacher.school_id
          ? db.findById<School>(Collections.SCHOOLS, teacher.school_id)
          : Promise.resolve(null),
        teacher.school_id
          ? db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, { school_id: teacher.school_id })
          : Promise.resolve([])
      ]);

      // Load assigned employee if exists
      let employeeData: User | null = null;
      const assignments = schoolAssignmentsData as any[]; // Type assertion for array result
      if (assignments && assignments.length > 0) {
        const employeeId = assignments[0].employee_id;
        employeeData = await db.findById<User>(Collections.USERS, employeeId);
      }

      // Load training programs for assignments
      const allPrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});
      setPrograms(allPrograms);

      const mapped = assignmentsData.map((a: any) => ({
        ...a,
        training_program: allPrograms.find(p => p.id === a.training_program_id)
      }));

      // Identify available programs (active but not assigned and not ended)
      const assignedProgramIds = new Set(mapped.map(a => a.training_program_id));
      const today = new Date().toISOString().split('T')[0];
      const available = allPrograms.filter(p =>
        p.status === 'active' &&
        !assignedProgramIds.has(p.id!) &&
        (!p.end_date || p.end_date >= today) &&
        (!p.target_audience || p.target_audience === 'teachers' || p.target_audience === 'all')
      );

      setAssignments(mapped);
      setAvailablePrograms(available);
      setAttendance(attendanceData);
      setSchool(schoolData);
      setAssignedEmployee(employeeData);
    } catch (error) {
      console.error('Error loading teacher portal data:', error);
    }
    setLoading(false);
  };

  const handleJoinTraining = async (programId: string) => {
    try {
      if (!teacher.id) return;

      const program = programs.find(p => p.id === programId);
      if (!program) return;

      const today = new Date().toISOString().split('T')[0];
      if (program.end_date && program.end_date < today) {
        setToastMessage({ type: 'error', text: 'Enrollment for this training has closed' });
        return;
      }

      const newAssignment = {
        teacher_id: teacher.id,
        training_program_id: programId,
        status: 'assigned',
        progress_percentage: 0,
        assigned_by: 'self',
        is_self_enrolled: true,
        assigned_date: new Date().toISOString().split('T')[0],
        due_date: program.end_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await db.insertOne(Collections.TRAINING_ASSIGNMENTS, newAssignment as any);

      // Update local state
      const assignmentWithDetails: AssignmentWithDetails = {
        ...newAssignment,
        id: result.id,
        training_program: program
      } as any;

      setAssignments(prev => [assignmentWithDetails, ...prev]);
      setAvailablePrograms(prev => prev.filter(p => p.id !== programId));

      db.logActivity({
        user_id: teacher.id,
        user_name: `${teacher.first_name} ${teacher.last_name}`,
        user_role: 'teacher',
        action: 'self_enrollment',
        details: `Enrolled in ${program.title}`,
        school_id: teacher.school_id || undefined
      });

      setToastMessage({ type: 'success', text: `Successfully enrolled in ${program.title}!` });
    } catch (error: any) {
      console.error('Error joining training:', error);
      setToastMessage({ type: 'error', text: 'Failed to join training: ' + error.message });
    }
  };

  useEffect(() => {
    if (teacher) {
      setTeacherInfoFormData({
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        phone: teacher.phone,
        qualification: teacher.qualification,
        years_of_experience: teacher.years_of_experience,
        date_of_birth: teacher.date_of_birth,
        subject_specialization: teacher.subject_specialization
      });

      if (teacher.profile_details) {
        setProfileFormData(teacher.profile_details);
      } else {
        const emptyProfile: any = {
          induction_training: { self: '', principal: '' },
          refresher_training: { self: '', principal: '' },
          hauna_40_training: { self: '', principal: '' },
          phase_2_training: { self: '', principal: '' },
          lsrw_ratings: {
            listening: { self: '', principal: '' },
            speaking: { self: '', principal: '' },
            reading: { self: '', principal: '' },
            writing: { self: '', principal: '' }
          },
          phonics_2026: { self: '', principal: '' },
          area_of_excellency: { self: '', principal: '' },
          area_of_improvement: { self: '', principal: '' },
          phonics_program: { self: '', principal: '' },
          competencies: {
            patience: { self: '', principal: '' },
            psychology: { self: '', principal: '' },
            planning: { self: '', principal: '' },
            hygiene: { self: '', principal: '' },
            cooperative: { self: '', principal: '' },
            initiative: { self: '', principal: '' }
          }
        };
        setProfileFormData(emptyProfile);
      }
    }
  }, [teacher]);


  const fetchAttendanceStats = async () => {
    const c10Programs = programs.filter(p =>
      (p.title || '').toLowerCase().includes('c10') || (p.title || '').toLowerCase().includes('c.10')
    );

    if (c10Programs.length === 0) return;

    const c10ProgramIds = c10Programs.map(p => p.id!);
    const c10Assignments = assignments.filter(a => c10ProgramIds.includes(a.training_program_id));

    if (c10Assignments.length === 0) return;

    try {
      const attendanceFilter = { training_program_id: { $in: c10ProgramIds } };
      const allAttendance = await db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, attendanceFilter);

      const newStats: Record<string, number> = {};

      c10Programs.forEach(program => {
        const programAttendance = allAttendance.filter(r => r.training_program_id === program.id);
        const programAssignments = c10Assignments.filter(a => a.training_program_id === program.id);

        programAssignments.forEach(assignment => {
          const userAttendance = programAttendance.filter(r =>
            r.teacher_id === teacher.id &&
            (r.status === 'present' || r.status === 'late')
          );

          const presentCount = userAttendance.length;
          // C10 training (18 Nov to 9 Dec 2025) has fixed 16 training days (weekends excluded)
          const totalDays = 16;
          const percentage = Math.round((presentCount / totalDays) * 100);

          if (assignment.id) {
            newStats[assignment.id] = percentage;
          }
        });
      });

      setAttendanceStats(prev => ({ ...prev, ...newStats }));
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    }
  };

  // Load students for performance breakdown
  const loadStudentsForPerformance = async () => {
    if (!teacher.school_id || !teacher.id) return;
    setLoadingStudents(true);
    try {
      const students = await db.find<Student>(Collections.STUDENTS, { school_id: teacher.school_id });
      const filteredStudents = (students || [])
        .filter((s: Student) => s.status !== 'dropped' && s.teacher_id === teacher.id)
        .sort((a, b) => a.name.localeCompare(b.name));
      setStudentsList(filteredStudents);
      
      // Load assessments for all students
      const studentIds = filteredStudents.map(s => s.id!);
      if (studentIds.length > 0) {
        const assessments = await db.find<StudentAssessment>(Collections.STUDENT_ASSESSMENTS, {
          student_id: { $in: studentIds },
          theme_number: selectedThemeForBreakdown
        });
        
        const assessmentsMap: Record<string, StudentAssessment[]> = {};
        assessments.forEach(a => {
          if (!assessmentsMap[a.student_id]) {
            assessmentsMap[a.student_id] = [];
          }
          assessmentsMap[a.student_id].push(a);
        });
        setStudentAssessments(assessmentsMap);
      } else {
        setStudentAssessments({});
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
    setLoadingStudents(false);
  };

  // Calculate domain breakdown for a student
  const getStudentDomainBreakdown = (studentId: string) => {
    const assessments = studentAssessments[studentId] || [];
    const student = studentsList.find(s => s.id === studentId);
    const grade = student?.grade || 'H2';
    const selectedTheme = THEMES.find(t => t.id === selectedThemeForBreakdown);
    
    if (!selectedTheme) return [];
    
    const domains = ['Language Skills', 'Cognitive Skills', 'Social, Spiritual and Emotional Skills', 'Physical Development Skills'];
    const gradeConfig = selectedTheme.config[grade as keyof typeof selectedTheme.config] || selectedTheme.config.H2;
    
    return domains.map(domainName => {
      const domainQuestions = gradeConfig?.find((d: any) => d.title === domainName)?.questions || [];
      
      let can = 0, trying = 0, help = 0;
      
      assessments.forEach(assessment => {
        Object.entries(assessment.skills || {}).forEach(([qId, val]) => {
          if (domainQuestions.some((q: any) => q.id === qId)) {
            if (val === 'can') can++;
            else if (val === 'trying') trying++;
            else if (val === 'help') help++;
          }
        });
      });
      
      return { domain: domainName, can, trying, help, total: can + trying + help };
    });
  };

  // Calculate mastery percentage for a student
  const getStudentMastery = (studentId: string): number => {
    const assessments = studentAssessments[studentId] || [];
    let totalCan = 0;
    let totalQuestions = 0;
    
    assessments.forEach(assessment => {
      Object.entries(assessment.skills || {}).forEach(([_, val]) => {
        totalQuestions++;
        if (val === 'can') totalCan++;
      });
    });
    
    return totalQuestions > 0 ? Math.round((totalCan / totalQuestions) * 100) : 0;
  };

  // Toggle student row expansion
  const toggleStudentExpand = (studentId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Download individual student PDF
  const downloadStudentPDF = async (student: Student) => {
    try {
      const assessments = studentAssessments[student.id!] || [];
      const grade = student.grade || 'H2';
      const selectedTheme = THEMES.find(t => t.id === selectedThemeForBreakdown);
      const themeConfig = selectedTheme?.config[grade as keyof typeof selectedTheme.config] || selectedTheme?.config.H2;
      
      // Calculate mastery
      let totalCan = 0;
      let totalQuestions = 0;
      const skillsData = assessments.flatMap(a => Object.entries(a.skills || {}));
      skillsData.forEach(([_, val]) => {
        totalQuestions++;
        if (val === 'can') totalCan++;
      });
      const mastery = totalQuestions > 0 ? Math.round((totalCan / totalQuestions) * 100) : 0;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header
      pdf.setFillColor(239, 243, 250); // #EFF3FA - light bluish background
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(61, 116, 237); // #3D74ED - bright royal blue text
      // School Name - Bold
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text((school?.name || '').toUpperCase(), 105, 14, { align: 'center' });
      // Report Title
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('STUDENT PERFORMANCE REPORT', 105, 22, { align: 'center' });
      // Theme Text
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedTheme?.name || 'Theme 7: Animals and birds', 105, 30, { align: 'center' });

      // Student Info Section
      pdf.setTextColor(0, 0, 0);
      pdf.setFillColor(248, 250, 252);
      pdf.rect(10, 50, 190, 35, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(10, 50, 190, 35, 'S');
      
      // Student Information Labels
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Student Name:', 15, 60);
      pdf.text('Theme:', 110, 60);
      pdf.text('Grade:', 15, 72);
      pdf.text('Mastery:', 110, 72);
      
      // Student Information Values
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(student.name || 'N/A', 50, 60);
      pdf.text(selectedTheme?.name?.replace('Theme ' + selectedTheme.id + ': ', '') || 'Animals and birds', 140, 60);
      pdf.text(grade, 40, 72);
      
      pdf.setFont('helvetica', 'bold');
      if (mastery >= 80) {
        pdf.setTextColor(22, 163, 74);
      } else if (mastery >= 50) {
        pdf.setTextColor(234, 179, 8);
      } else {
        pdf.setTextColor(220, 38, 38);
      }
      pdf.text(`${mastery}%`, 140, 72);
      pdf.setTextColor(0, 0, 0);

      // Domain Breakdown Sections
      let yPos = 100;
      const domains = ['Language Skills', 'Cognitive Skills', 'Social, Spiritual and Emotional Skills', 'Physical Development Skills'];
      
      domains.forEach(domainName => {
        const domainConfig = themeConfig?.find((d: any) => d.title === domainName);
        const domainQuestions = domainConfig?.questions || [];
        
        // Get skills for this domain
        const canSkills: string[] = [];
        const tryingSkills: string[] = [];
        const helpSkills: string[] = [];
        
        domainQuestions.forEach((q: any) => {
          const val = skillsData.find(([qId]) => qId === q.id)?.[1];
          if (val === 'can') canSkills.push(q.text);
          else if (val === 'trying') tryingSkills.push(q.text);
          else if (val === 'help') helpSkills.push(q.text);
        });
        
        // Check if we need a new page
        if (yPos > 230) {
          pdf.addPage();
          yPos = 20;
        }
        
        // Domain Header
        pdf.setFillColor(243, 245, 249); // #F3F5F9 - very light grey-blue background
        pdf.rect(10, yPos - 6, 190, 10, 'F');
        pdf.setTextColor(55, 65, 81); // #374151 - dark grey text
        pdf.setDrawColor(229, 231, 235); // #E5E7EB - light grey divider line
        pdf.line(10, yPos + 4, 200, yPos + 4);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(domainName, 15, yPos);
        pdf.setFontSize(10);
        pdf.text(`(${canSkills.length}/${domainQuestions.length} skills mastered)`, 170, yPos, { align: 'right' });
        yPos += 12;
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(11);
        
        // I Can Do section
        if (canSkills.length > 0) {
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(22, 163, 74); // green for I Can Do
          pdf.text('I Can Do', 15, yPos);
          yPos += 6;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(75, 85, 99); // #4B5563 - dark grey for bullet points
          pdf.setFontSize(10);
          canSkills.forEach(skill => {
            if (yPos > 280) {
              pdf.addPage();
              yPos = 20;
            }
            pdf.text(`• ${skill}`, 20, yPos);
            yPos += 5;
          });
        }
        
        // Trying section
        if (tryingSkills.length > 0) {
          yPos += 2;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(234, 179, 8); // yellow for Trying To
          pdf.text('Trying To', 15, yPos);
          yPos += 6;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(75, 85, 99); // #4B5563 - dark grey for bullet points
          pdf.setFontSize(10);
          tryingSkills.forEach(skill => {
            if (yPos > 280) {
              pdf.addPage();
              yPos = 20;
            }
            pdf.text(`• ${skill}`, 20, yPos);
            yPos += 5;
          });
        }
        
        // Need Help section
        if (helpSkills.length > 0) {
          yPos += 2;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(220, 38, 38); // red for Need Help
          pdf.text('Need Help With', 15, yPos);
          yPos += 6;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(75, 85, 99); // #4B5563 - dark grey for bullet points
          pdf.setFontSize(10);
          helpSkills.forEach(skill => {
            if (yPos > 280) {
              pdf.addPage();
              yPos = 20;
            }
            pdf.text(`• ${skill}`, 20, yPos);
            yPos += 5;
          });
        }
        
        yPos += 8;
      });

      // Footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 290, { align: 'center' });
        pdf.text('Hauna Centre for Research and Training', 105, 295, { align: 'center' });
        pdf.text(`Page ${i} of ${pageCount}`, 195, 295, { align: 'right' });
      }

      pdf.save(`${student.name.replace(/\s+/g, '_')}_Performance_Report.pdf`);
      setToastMessage({ type: 'success', text: 'Student PDF downloaded successfully!' });
    } catch (error) {
      console.error('Error generating student PDF:', error);
      setToastMessage({ type: 'error', text: 'Failed to generate PDF' });
    }
  };

  // Download Class Booklet PDF
  const downloadClassBooklet = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const selectedTheme = THEMES.find(t => t.id === selectedThemeForBreakdown);
      
      // Title Page
      pdf.setFillColor(16, 185, 129);
      pdf.rect(0, 0, 297, 30, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Class Performance Booklet', 148.5, 12, { align: 'center' });
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${school?.name || 'National Public School'} - ${selectedTheme?.name || 'Theme 8: Nature'}`, 148.5, 22, { align: 'center' });

      // Summary Stats
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total Students: ${filteredPerformanceStudents.length}`, 15, 45);
      pdf.text(`Grade: All (H1, H2, H3)${selectedSectionForBreakdown ? ` - Section ${selectedSectionForBreakdown}` : ''}`, 15, 55);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 15, 65);

      // Student Table Header
      let yPos = 80;
      pdf.setFillColor(240, 240, 240);
      pdf.rect(15, yPos - 5, 267, 10, 'F');
      pdf.setFontSize(9);
      pdf.text('Sl No', 18, yPos);
      pdf.text('Student Name', 35, yPos);
      pdf.text('Grade & Sec', 110, yPos);
      pdf.text('Mastery %', 140, yPos);
      pdf.text('Language', 170, yPos);
      pdf.text('Cognitive', 200, yPos);
      pdf.text('Social/Emotional', 230, yPos);
      pdf.text('Physical', 265, yPos);

      yPos += 10;
      pdf.setFont('helvetica', 'normal');

      filteredPerformanceStudents.forEach((student, index) => {
        if (yPos > 180) {
          pdf.addPage();
          yPos = 20;
        }
        
        const mastery = getStudentMastery(student.id!);
        const domains = getStudentDomainBreakdown(student.id!);
        
        pdf.text((index + 1).toString(), 18, yPos);
        pdf.text(student.name.substring(0, 25), 35, yPos);
        pdf.text(`${student.grade || '-'}${student.section ? ` (${student.section})` : ''}`, 110, yPos);
        pdf.text(`${mastery}%`, 140, yPos);
        
        const langDomain = domains.find(d => d.domain === 'Language Skills');
        const cogDomain = domains.find(d => d.domain === 'Cognitive Skills');
        const socDomain = domains.find(d => d.domain === 'Social, Spiritual and Emotional Skills');
        const physDomain = domains.find(d => d.domain === 'Physical Development Skills');
        
        pdf.text(`${langDomain?.can || 0}/${langDomain?.total || 0}`, 170, yPos);
        pdf.text(`${cogDomain?.can || 0}/${cogDomain?.total || 0}`, 200, yPos);
        pdf.text(`${socDomain?.can || 0}/${socDomain?.total || 0}`, 230, yPos);
        pdf.text(`${physDomain?.can || 0}/${physDomain?.total || 0}`, 265, yPos);
        
        yPos += 8;
      });

      pdf.save(`Class_Booklet_${selectedTheme?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Theme_8'}.pdf`);
      setToastMessage({ type: 'success', text: 'Class Booklet downloaded successfully!' });
    } catch (error) {
      console.error('Error generating class booklet:', error);
      setToastMessage({ type: 'error', text: 'Failed to generate Class Booklet' });
    }
  };

  const handleGenerateCertificate = (assignment: AssignmentWithDetails) => {
    setCertificateAssignment(assignment);
    setCertificateModalMode('certificate');
    setShowCertificateModal(true);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const handleViewMarksCard = (assignment: AssignmentWithDetails) => {
    setCertificateAssignment(assignment);
    setCertificateModalMode('marks_card');
    setShowCertificateModal(true);
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;

    try {
      const element = certificateRef.current;
      const isPortrait = certificateModalMode === 'marks_card';

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: isPortrait ? element.offsetWidth : element.offsetWidth,
        height: isPortrait ? (element.offsetWidth * 1.414) : (element.offsetWidth / 1.414),
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: isPortrait ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      if (isPortrait) {
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      }

      const fileName = certificateModalMode === 'certificate'
        ? `Certificate_${teacher.first_name}.pdf`
        : `MarksCard_${teacher.first_name}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };


  const getCertificateStatus = (assignment: AssignmentWithDetails) => {
    const isC10 = (assignment.training_program?.title || '').toLowerCase().includes('c10') ||
      (assignment.training_program?.title || '').toLowerCase().includes('c.10');

    if (!isC10) return { disabled: false, reason: "" };

    const attendance = attendanceStats[assignment.id!] ?? 0;
    const marksData = assignment.marks_data || {};
    const hasPhonics = Object.keys(marksData).some(k => k.toLowerCase().includes('phonics'));
    const hasVocabulary = Object.keys(marksData).some(k => k.toLowerCase().includes('vocabulary'));
    const isMissingMarks = !hasPhonics || !hasVocabulary;

    const disabled = attendance < 75 || (attendance === 100 && isMissingMarks);
    let reason = "";
    if (attendance < 75) {
      reason = `Attendance too low (${attendance}%)`;
    } else if (attendance === 100 && isMissingMarks) {
      reason = "Required marks (Phonics/Vocabulary) missing";
    }

    return { disabled, reason };
  };

  const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  const totalPresentCount = attendance.filter(a => a.status === 'present').length;

  const getViewTitle = () => {
    switch (currentView) {
      case 'trainings': return 'My Trainings';
      case 'checklist': return 'Student Checklist';
      case 'profile': return 'My Profile';
      case 'attendance': return 'Attendance Records';
      case 'settings': return 'Settings';
      case 'students': return selectedStudent ? 'Student Profile' : 'My Students';
      default: return 'Teacher Portal';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {currentView !== 'home' ? (
                <button
                  onClick={() => setCurrentView('home')}
                  className="p-2 -ml-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all flex items-center gap-1 group"
                >
                  <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-sm font-medium hidden sm:inline">Back</span>
                </button>
              ) : (
                <GraduationCap className="text-blue-600" size={32} />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{getViewTitle()}</h1>
                <p className="text-xs text-gray-500">HCMS Portal</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* In-App Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${toastMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toastMessage.type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
          <span className="font-bold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 p-1 hover:bg-white/20 rounded-full"><X size={14} /></button>
        </div>
      )}

      {/* Onboarding Alert */}
      {showProfileAlert && currentView === 'home' && (
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-4 shadow-2xl flex justify-between items-center animate-in slide-in-from-top-full duration-500 z-50 sticky top-16">
          <div className="flex items-center gap-4 max-w-7xl mx-auto w-full">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <UserIcon size={24} className="animate-bounce" />
            </div>
            <div className="flex-1">
              <p className="font-black text-lg tracking-tight">ADVERTISEMENT: Update Your Profile at Hauna Central Management Systems</p>
              <p className="text-blue-100 text-sm font-medium">Showcase your professional growth, skills, and certifications to the Hauna community. Complete your self-evaluation now!</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setCurrentView('profile');
                  setShowProfileAlert(false);
                }} 
                className="bg-white text-blue-700 px-6 py-2 rounded-xl font-black text-sm hover:bg-blue-50 transition-all shadow-lg active:scale-95"
              >
                UPDATE NOW
              </button>
              <button onClick={() => setShowProfileAlert(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" ref={mainContentRef}>
        {assignedEmployee && teacher.school_id && (
          <div className="fixed bottom-6 right-6 z-40">
            <button
              onClick={async () => {
                if (!showChat || isSupportChat) {
                  const session = await chatService.getOrCreateSession(
                    teacher.id!,
                    assignedEmployee.id!,
                    teacher.school_id!
                  );
                  setChatSessionId(session.id!);
                  setIsSupportChat(false);
                }
                setShowChat(!showChat || isSupportChat);
              }}
              className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 hover:scale-110 transition-all flex items-center gap-2"
            >
              <MessageSquare size={24} />
              <span className="font-medium hidden sm:inline">Chat with Coordinator</span>
            </button>
          </div>
        )}

        <div className="fixed bottom-24 right-6 z-40">
          <button
            onClick={async () => {
              if (!showChat || !isSupportChat) {
                const session = await chatService.getOrCreateSupportSession(
                  teacher.id!,
                  'teacher',
                  teacher.school_id || undefined
                );
                setChatSessionId(session.id!);
                setIsSupportChat(true);
              }
              setShowChat(!showChat || !isSupportChat);
            }}
            className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 hover:scale-110 transition-all flex items-center gap-2"
          >
            <Bot size={24} />
            <span className="font-medium hidden sm:inline">Technical Support</span>
          </button>
        </div>

        {showChat && chatSessionId && assignedEmployee && (
          <ChatWindow
            sessionId={chatSessionId!}
            currentUserId={teacher.id!}
            currentUserType="teacher"
            otherUserName={isSupportChat ? 'Technical Support' : assignedEmployee.full_name}
            otherUserRole={isSupportChat ? 'employee' : 'employee'}
            onClose={() => setShowChat(false)}
          />
        )}

        {currentView === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Profile Booster Advertisement */}
            {(!teacher.profile_details?.area_of_excellency?.self || !teacher.profile_details?.area_of_improvement?.self) && (
              <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                  <div className="w-32 h-32 md:w-48 md:h-48 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/30 shadow-2xl shrink-0">
                    <UserIcon size={64} className="text-white drop-shadow-lg" />
                  </div>
                  <div className="text-center md:text-left">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-6 border border-white/10">
                      <Target size={14} />
                      Boost Your Career
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">Your Profile is Your <br /><span className="text-blue-200">Digital Resume</span></h2>
                    <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl mb-8">
                      Teachers who maintain a complete profile at **Hauna Central Management Systems** are 3x more likely to receive premium training recommendations.
                    </p>
                    <button 
                      onClick={() => setCurrentView('profile')}
                      className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-black text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95"
                    >
                      Complete Your Profile Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* My Trainings Tile */}
            <button
              onClick={() => setCurrentView('trainings')}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all group aspect-square"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="text-blue-600" size={36} />
              </div>
              <span className="font-bold text-gray-800 text-lg">My Trainings</span>
              <span className="text-xs text-gray-500 mt-1">{assignments.length} Active / {availablePrograms.length} New</span>
            </button>

            {/* Student Checklist Tile */}
            <button
              onClick={() => setCurrentView('checklist')}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-emerald-200 transition-all group aspect-square"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="text-emerald-600" size={36} />
              </div>
              <span className="font-bold text-gray-800 text-lg">Student Checklist</span>
              <span className="text-xs text-gray-500 mt-1">Theme Progress</span>
            </button>

            {/* Attendance Tile */}
            <button
              onClick={() => setCurrentView('attendance')}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-rose-200 transition-all group aspect-square"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="text-rose-500" size={36} />
              </div>
              <span className="font-bold text-gray-800 text-lg">Attendance</span>
              <span className="text-xs text-gray-500 mt-1">{totalPresentCount} Days Present</span>
            </button>

            {/* My Profile Tile */}
            <button
              onClick={() => setCurrentView('profile')}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-orange-200 transition-all group aspect-square"
            >
              <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative">
                <UserIcon className="text-orange-500" size={36} />
                {(!teacher.profile_details?.area_of_excellency?.self || !teacher.profile_details?.area_of_improvement?.self) && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse shadow-lg">INCOMPLETE</span>
                )}
              </div>
              <span className="font-bold text-gray-800 text-lg">My Profile</span>
              <span className="text-xs text-gray-500 mt-1">Account Info</span>
            </button>

            {/* Settings Tile */}
            <button
              onClick={() => setCurrentView('settings')}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all group aspect-square"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Settings className="text-gray-600" size={36} />
              </div>
              <span className="font-bold text-gray-800 text-lg">Settings</span>
              <span className="text-xs text-gray-500 mt-1">Change Passcode</span>
            </button>

            {/* My Students Tile */}
            <button
              onClick={() => {
                setSelectedStudent(null);
                setCurrentView('students');
              }}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all group aspect-square"
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="text-indigo-600" size={36} />
              </div>
              <span className="font-bold text-gray-800 text-lg">My Students</span>
              <span className="text-xs text-gray-500 mt-1">View Student Profiles</span>
            </button>
          </div>
        </div>
      )}

        {currentView === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 max-w-2xl mx-auto">
              <div className="p-8 border-b border-gray-100 bg-gray-50">
                <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
                <p className="text-gray-500">Manage your security and profile</p>
              </div>

              <div className="p-8">
                <PasscodeSettings teacher={teacher} />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {currentView === 'profile' && profileFormData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              {isEditingProfile ? (
                <div className="space-y-8">
                  {/* Profile Card Editor */}
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="h-32 bg-gradient-to-r from-orange-400 to-orange-600"></div>
                    <div className="px-8 pb-8">
                      <div className="relative -mt-16 mb-6 flex justify-between items-end">
                        <div className="h-32 w-32 bg-white rounded-3xl shadow-lg p-2">
                          <div className="h-full w-full bg-orange-100 rounded-2xl flex items-center justify-center">
                            <UserIcon className="text-orange-600" size={48} />
                          </div>
                        </div>
                        <div className="mb-2 flex gap-2">
                          <button
                            onClick={() => setIsEditingProfile(false)}
                            disabled={savingProfile}
                            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveProfile}
                            disabled={savingProfile}
                            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-100 disabled:opacity-50 flex items-center gap-2"
                          >
                            {savingProfile ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">First Name</label>
                          <input
                            type="text"
                            value={teacherInfoFormData.first_name || ''}
                            onChange={(e) => setTeacherInfoFormData({ ...teacherInfoFormData, first_name: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Last Name</label>
                          <input
                            type="text"
                            value={teacherInfoFormData.last_name || ''}
                            onChange={(e) => setTeacherInfoFormData({ ...teacherInfoFormData, last_name: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Basic Information Editor */}
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                    <h4 className="text-xl font-black text-gray-900 mb-8 pb-4 border-b border-gray-100">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                        <input
                          type="text"
                          value={teacherInfoFormData.phone || ''}
                          onChange={(e) => setTeacherInfoFormData({ ...teacherInfoFormData, phone: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Qualification</p>
                        <input
                          type="text"
                          value={teacherInfoFormData.qualification || ''}
                          onChange={(e) => setTeacherInfoFormData({ ...teacherInfoFormData, qualification: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Subject Specialization</p>
                        <input
                          type="text"
                          value={teacherInfoFormData.subject_specialization || ''}
                          onChange={(e) => setTeacherInfoFormData({ ...teacherInfoFormData, subject_specialization: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Years of Experience</p>
                        <input
                          type="number"
                          value={teacherInfoFormData.years_of_experience || ''}
                          onChange={(e) => setTeacherInfoFormData({ ...teacherInfoFormData, years_of_experience: Number(e.target.value) })}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Date of Birth</p>
                        <input
                          type="date"
                          value={teacherInfoFormData.date_of_birth || ''}
                          onChange={(e) => setTeacherInfoFormData({ ...teacherInfoFormData, date_of_birth: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* dossier Section Editor */}
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-gray-900 leading-none">Self-Evaluation & Mastery</h3>
                          <p className="text-sm text-gray-500 mt-1">Update your professional profile and self-evaluation</p>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-8 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-[0.2em] w-[40%]">Evaluation Criteria</th>
                            <th className="px-8 py-5 text-center text-xs font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50/30">Teacher (Self-Entry)</th>
                            <th className="px-8 py-5 text-center text-xs font-black text-purple-600 uppercase tracking-[0.2em] bg-purple-50/30">Management / Verified</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr className="bg-gray-50/80">
                            <td colSpan={3} className="px-8 py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Training Mastery (Completed Month/Year)</td>
                          </tr>
                          {[
                            { id: 'induction_training', label: 'Induction Training' },
                            { id: 'refresher_training', label: 'Refresher Training' },
                            { id: 'hauna_40_training', label: 'Hauna 40 (Foundation)' },
                            { id: 'phase_2_training', label: 'Phase 2 Training' },
                          ].map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-8 py-5 font-bold text-gray-800">{item.label}</td>
                              <td className="px-8 py-5 text-center">
                                <input
                                  type="text"
                                  className="w-full text-center p-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 font-bold"
                                  placeholder="e.g. Sept 2025"
                                  value={(profileFormData as any)[item.id]?.self || ''}
                                  onChange={(e) => setProfileFormData({ ...profileFormData, [item.id]: { ...(profileFormData as any)[item.id], self: e.target.value } })}
                                />
                              </td>
                              <td className="px-8 py-5 text-center">
                                <span className="font-black text-purple-700 bg-purple-50 px-3 py-1 rounded-lg">{(profileFormData as any)[item.id]?.principal || '-'}</span>
                              </td>
                            </tr>
                          ))}

                          <tr className="bg-gray-50/80 border-t border-gray-200">
                            <td colSpan={3} className="px-8 py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">LSRW Proficiencies (Rating)</td>
                          </tr>
                          {[
                            { id: 'listening', label: 'Listening' },
                            { id: 'speaking', label: 'Speaking' },
                            { id: 'reading', label: 'Reading' },
                            { id: 'writing', label: 'Writing' },
                          ].map((sub) => (
                            <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-8 py-5 font-bold text-gray-800">{sub.label} Skill</td>
                              <td className="px-8 py-5 text-center">
                                <select
                                  className="w-full text-center p-2 rounded-lg border border-blue-200 font-bold"
                                  value={profileFormData.lsrw_ratings?.[sub.id as keyof typeof profileFormData.lsrw_ratings]?.self || ''}
                                  onChange={(e) => setProfileFormData({ ...profileFormData, lsrw_ratings: { ...profileFormData.lsrw_ratings, [sub.id]: { ...profileFormData.lsrw_ratings?.[sub.id as keyof typeof profileFormData.lsrw_ratings], self: e.target.value } } as any })}
                                >
                                  <option value="">Select Rating</option>
                                  <option value="Excellent">Excellent</option>
                                  <option value="Good">Good</option>
                                  <option value="Average">Average</option>
                                  <option value="Needs Improvement">Needs Improvement</option>
                                </select>
                              </td>
                              <td className="px-8 py-5 text-center">
                                <span className="font-black text-purple-700 bg-purple-50 px-4 py-1.5 rounded-xl border border-purple-100">{profileFormData.lsrw_ratings?.[sub.id as keyof typeof profileFormData.lsrw_ratings]?.principal || '-'}</span>
                              </td>
                            </tr>
                          ))}

                          {/* Qualitative feedback editor */}
                          <tr className="bg-gray-50/80 border-t border-gray-200">
                            <td colSpan={3} className="px-8 py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Qualitative Feedback</td>
                          </tr>
                          {[
                            { id: 'area_of_excellency', label: 'My Greatest Strength' },
                            { id: 'area_of_improvement', label: 'Area for Personal Growth' },
                            { id: 'languages_known', label: 'Languages Known' },
                          ].map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-8 py-5 font-bold text-gray-800">{item.label}</td>
                              <td className="px-8 py-5">
                                <textarea
                                  className="w-full text-sm font-medium p-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500"
                                  rows={item.id === 'languages_known' ? 2 : 3}
                                  value={(profileFormData as any)[item.id]?.self || ''}
                                  onChange={(e) => setProfileFormData({ ...profileFormData, [item.id]: { ...(profileFormData as any)[item.id], self: e.target.value } })}
                                />
                              </td>
                              <td className="px-8 py-5">
                                <span className="text-sm font-semibold text-purple-950">{(profileFormData as any)[item.id]?.principal || '-'}</span>
                              </td>
                            </tr>
                          ))}

                          <tr className="bg-gray-50/80 border-t border-gray-200">
                            <td colSpan={3} className="px-8 py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Fundamental Competencies</td>
                          </tr>
                          {[
                            { id: 'patience', label: 'Patience & Empathy' },
                            { id: 'planning', label: 'Daily Lesson Planning' },
                            { id: 'cooperative', label: 'Cooperative Spirit' },
                            { id: 'initiative', label: 'Initiative for Learning' },
                          ].map((comp) => (
                            <tr key={comp.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-8 py-5 font-bold text-gray-800">{comp.label}</td>
                              <td className="px-8 py-5 text-center">
                                <div className="flex justify-center gap-1">
                                  {[1, 2, 3, 4, 5].map((val) => (
                                    <button
                                      key={val}
                                      onClick={() => setProfileFormData({ ...profileFormData, competencies: { ...profileFormData.competencies, [comp.id]: { ...(profileFormData.competencies as any)[comp.id], self: val.toString() } } as any })}
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${(profileFormData.competencies as any)[comp.id]?.self === val.toString() ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}
                                    >
                                      {val}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="px-8 py-5 text-center">
                                <span className="font-black text-purple-700">{(profileFormData.competencies as any)[comp.id]?.principal || '-'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-end pr-4">
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="bg-white text-blue-600 px-6 py-2.5 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all shadow-xl shadow-blue-50 active:scale-95 border border-blue-50 flex items-center gap-2"
                    >
                      <Settings size={18} />
                      EDIT PROFILE DATA
                    </button>
                  </div>
                  
                  <ProfessionalTeacherProfile 
                    teacher={teacher}
                    assignments={assignments}
                    attendance={attendance}
                    school={school}
                  />
                </div>
              )}
            </div>
          )}

          {currentView === 'attendance' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
              {assignments.map((assignment) => {
                const program = assignment.training_program;
                const programAttendance = attendance.filter(a => a.training_program_id === assignment.training_program_id);

                if (programAttendance.length === 0) return null;

                const pCount = programAttendance.filter(a => a.status === 'present').length;
                const aCount = programAttendance.filter(a => a.status === 'absent').length;
                const lCount = programAttendance.filter(a => a.status === 'late').length;
                const eCount = programAttendance.filter(a => a.status === 'excused').length;

                return (
                  <div key={assignment.id} className="space-y-6">
                    <div className="flex items-center gap-3 mb-2 ml-2">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <BookOpen size={24} className="text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900">{program?.title || 'Training Program'}</h3>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-3">
                          <CheckCircle className="text-green-600" size={24} />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{pCount}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Present</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-3">
                          <X className="text-red-600" size={24} />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{aCount}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Absent</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center mb-3">
                          <Calendar className="text-yellow-600" size={24} />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{lCount}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Late</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                          <MessageSquare className="text-blue-600" size={24} />
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{eCount}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Excused</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 border-b border-gray-100">
                        <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                          <Calendar size={20} className="text-rose-500" />
                          Attendance Timeline
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {programAttendance.map((record) => (
                              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                                  {new Date(record.attendance_date).toLocaleDateString(undefined, {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${record.status === 'present' ? 'bg-green-50 text-green-700 border-green-200' :
                                    record.status === 'absent' ? 'bg-red-50 text-red-700 border-red-200' :
                                      record.status === 'late' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 italic font-medium">
                                  {record.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}

              {attendance.length === 0 && (
                <div className="py-20 bg-white rounded-3xl border border-gray-100 text-center">
                  <Calendar size={64} className="mx-auto text-gray-100 mb-4" />
                  <p className="text-gray-400 font-bold text-lg">No attendance records found yet</p>
                  <p className="text-gray-400 text-sm mt-1">Your attendance will appear here once recorded by your coordinator.</p>
                </div>
              )}
            </div>
          )}

          {currentView === 'trainings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              {/* Active Trainings Section */}
              <section>
                <div className="flex items-center gap-2 mb-6 ml-2 text-blue-800">
                  <BookOpen size={24} />
                  <h3 className="text-xl font-bold">Programs in Progress</h3>
                </div>
                {assignments.length === 0 ? (
                  <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-medium text-lg">No active training programs found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                        <div className="p-6 md:p-8">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                            <div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${assignment.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                  }`}>
                                  {assignment.status.replace('_', ' ').toUpperCase()}
                                </span>
                                {assignment.is_self_enrolled && (
                                  <span className="px-3 py-1 text-xs font-bold rounded-full border bg-purple-50 text-purple-700 border-purple-100 flex items-center gap-1">
                                    <Award size={12} />
                                    SELF-ENROLLED
                                  </span>
                                )}
                                {assignment.training_program?.title && (
                                  <span className="px-3 py-1 text-xs font-bold rounded-full border bg-indigo-50 text-indigo-700 border-indigo-100">
                                    {assignment.training_program.title.includes('C10') || assignment.training_program.title.includes('C.10') ? 'C.10' :
                                      assignment.training_program.title.includes('Foundation') ? 'FOUNDATION' :
                                        assignment.training_program.title.substring(0, 10).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-2xl font-black text-gray-900 leading-tight">{assignment.training_program?.title}</h4>
                              <p className="text-gray-500 mt-2 font-medium max-w-2xl">{assignment.training_program?.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Duration</div>
                                <div className="text-lg font-black text-gray-900">{assignment.training_program?.duration_hours || 0}h</div>
                              </div>
                              <div className="w-px h-10 bg-gray-100 mx-2"></div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Completion</div>
                                <div className="text-lg font-black text-blue-600">{assignment.progress_percentage}%</div>
                              </div>
                            </div>
                          </div>

                          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-8">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${assignment.progress_percentage === 100 ? 'bg-green-500' : 'bg-blue-600'
                                }`}
                              style={{ width: `${assignment.progress_percentage}%` }}
                            />
                          </div>

                          {assignment.training_program?.meeting_link && (
                            <div className="bg-blue-600 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-blue-200 shadow-xl mb-6">
                              <div className="text-white flex items-center gap-4">
                                <div className="p-3 bg-blue-500/30 rounded-xl">
                                  <MessageSquare className="text-blue-100" size={28} />
                                </div>
                                <div>
                                  <div className="font-black text-lg">Next Online Session</div>
                                  <div className="text-blue-100 text-sm font-medium">The virtual classroom is ready for you</div>
                                </div>
                              </div>
                              <a
                                href={`${assignment.training_program.meeting_link}${assignment.training_program.meeting_link.includes('?') ? '&' : '?'}identity=${teacher.id}&training_id=${assignment.training_program_id}&name=${encodeURIComponent(teacher.first_name + ' ' + teacher.last_name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-blue-700 w-full md:w-auto px-10 py-4 rounded-xl font-black hover:bg-blue-50 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                              >
                                <BookOpen size={20} />
                                JOIN CLASSROOM
                              </a>
                            </div>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
                            {assignment.training_program?.start_date && (
                              <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Start Date</div>
                                <div className="font-semibold text-gray-700">{formatDate(assignment.training_program.start_date)}</div>
                              </div>
                            )}
                            {assignment.training_program?.end_date && (
                              <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">End Date</div>
                                <div className="font-semibold text-gray-700">{formatDate(assignment.training_program.end_date)}</div>
                              </div>
                            )}
                            {assignment.due_date && (
                              <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Deadline</div>
                                <div className="font-semibold text-red-600">{formatDate(assignment.due_date)}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Available Trainings Section */}
              {availablePrograms.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-6 ml-2 text-purple-800">
                    <Award size={24} />
                    <h3 className="text-xl font-bold">Announced & Available Trainings</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {availablePrograms.map((program) => (
                      <div key={program.id} className="bg-white rounded-3xl shadow-sm border border-purple-100 overflow-hidden hover:shadow-lg transition-all border-l-4 border-l-purple-500">
                        <div className="p-6 md:p-8">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                            <div className="flex-1">
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="px-3 py-1 text-xs font-bold rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                                  OPEN ENROLLMENT
                                </span>
                                <span className="px-3 py-1 text-xs font-bold rounded-full border bg-indigo-50 text-indigo-700 border-indigo-100">
                                  {program.title.includes('C10') || program.title.includes('C.10') ? 'C.10' :
                                    program.title.includes('Foundation') ? 'FOUNDATION' :
                                      program.title.substring(0, 10).toUpperCase()}
                                </span>
                              </div>
                              <h4 className="text-2xl font-black text-gray-900 leading-tight">{program.title}</h4>
                              <p className="text-gray-500 mt-2 font-medium max-w-2xl">{program.description}</p>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Duration</div>
                                <div className="text-lg font-black text-gray-900">{program.duration_hours || 0}h</div>
                              </div>
                              <button
                                onClick={() => handleJoinTraining(program.id!)}
                                className="bg-purple-600 text-white px-8 py-3 rounded-xl font-black hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 active:scale-95 flex items-center gap-2"
                              >
                                <Plus size={20} />
                                JOIN PROGRAM
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-50 flex gap-4 text-sm text-gray-500 font-medium">
                            {program.start_date && (
                              <div className="flex items-center gap-1">
                                <Calendar size={14} className="text-purple-400" />
                                Starts: {new Date(program.start_date).toLocaleDateString()}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Target size={14} className="text-purple-400" />
                              Target: {program.target_audience || 'All Teachers'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Achievements Section */}
              <section className="pt-8">
                <div className="flex items-center gap-2 mb-8 ml-2 text-indigo-800">
                  <Award size={28} />
                  <h3 className="text-2xl font-black">My Results & Badges</h3>
                </div>
                {assignments.filter(a => a.marks_published).length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center text-gray-400 border border-gray-100">
                    <Award size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-medium">No certificates available yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {assignments
                      .filter(a => a.training_program?.enable_marks_card && a.marks_published)
                      .filter(a => {
                        const isC10 = (a.training_program?.title || '').toLowerCase().includes('c10') ||
                          (a.training_program?.title || '').toLowerCase().includes('c.10');
                        if (!isC10) return true;
                        const attendance = attendanceStats[a.id!] ?? 0;
                        return attendance >= 75;
                      })
                      .map((assignment) => {
                        const program = assignment.training_program;
                        const subjects = program?.marks_configuration?.subjects || [];
                        const marksData = assignment.marks_data || {};
                        const totalMax = subjects.reduce((sum, s) => sum + s.max_marks, 0);
                        const totalObtained = Object.values(marksData).reduce((sum: number, val: any) => sum + (val as number), 0);

                        return (
                          <div key={assignment.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                            <div className="bg-indigo-600 p-8 relative overflow-hidden">
                              <Award className="absolute -right-4 -top-4 text-white opacity-10" size={120} />
                              <h4 className="text-white text-xl font-black max-w-[80%] leading-tight">{program?.title}</h4>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <span className="bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold border border-indigo-400">CLASS OF 2025</span>
                                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10">GRADUATED</span>
                              </div>
                            </div>
                            <div className="p-8">
                              <div className="space-y-4 mb-8">
                                {subjects.map((sub, i) => (
                                  <div key={i} className="flex justify-between items-center group/item p-3 rounded-xl hover:bg-indigo-50 transition-colors">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{sub.name}</span>
                                      <div className="w-32 bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div
                                          className="bg-indigo-600 h-full rounded-full"
                                          style={{ width: `${(marksData[sub.name] || 0) / sub.max_marks * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div className="text-xl font-black text-gray-900">{marksData[sub.name] || 0}<span className="text-gray-300 text-sm font-medium ml-1">/{sub.max_marks}</span></div>
                                  </div>
                                ))}
                              </div>

                              <div className="bg-indigo-50 rounded-2xl p-6 flex items-center justify-between mb-8 border border-indigo-100">
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-indigo-400 uppercase tracking-[.2em] mb-1">Overall Performance</span>
                                  <span className="text-sm font-bold text-indigo-800 italic">Distinction Achieved</span>
                                </div>
                                <div className="text-3xl font-black text-indigo-700">{totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0}%</div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <button
                                  onClick={() => handleViewMarksCard(assignment)}
                                  className="flex items-center justify-center gap-2 bg-gray-50 text-gray-700 py-4 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all border border-gray-200"
                                >
                                  <FileText size={18} />
                                  MARKS CARD
                                </button>
                                <button
                                  onClick={() => handleGenerateCertificate(assignment)}
                                  disabled={getCertificateStatus(assignment).disabled}
                                  className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 ${getCertificateStatus(assignment).disabled
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed border-gray-100'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                                    }`}
                                >
                                  <Award size={18} />
                                  CERTIFICATE
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </section>
            </div>
          )}

          {currentView === 'checklist' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              {/* Checklist Action Header */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 shadow-xl shadow-emerald-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-white opacity-10 group-hover:scale-125 transition-transform duration-1000 rotate-12">
                  <ClipboardCheck size={200} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-3xl font-black text-white mb-3">Student Assessment Center</h3>
                  <p className="text-emerald-50 font-medium max-w-lg mb-8 text-lg opacity-90">Track student progress in phonics, vocabulary, and holistic development for Theme 8: Nature.</p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setShowAssessmentForm(true)}
                      className="bg-white text-emerald-700 px-10 py-4 rounded-2xl font-black hover:bg-emerald-50 transition-all shadow-xl active:scale-95 flex items-center gap-2 hover:gap-3"
                    >
                      <ClipboardCheck size={24} />
                      START EVALUATION
                    </button>
                    <button
                      onClick={() => setShowStudentManager(true)}
                      className="bg-emerald-600/30 text-white border-2 border-emerald-400/30 px-10 py-4 rounded-2xl font-black hover:bg-emerald-600/50 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Users size={24} />
                      MANAGE STUDENTS
                    </button>
                  </div>
                </div>
              </div>

              {/* Analytics Sub-view */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 overflow-hidden">
                <div className="flex items-center gap-3 mb-8 ml-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <FileText size={24} className="text-emerald-600" />
                  </div>
                  <h4 className="text-2xl font-black text-gray-900 underline decoration-emerald-200 underline-offset-8">Progress Analytics</h4>
                </div>
                <ThemeChecklistsAnalytics currentUser={teacher} />
              </div>

              {/* Student Performance Breakdown Section */}
              <div ref={performanceRef} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 overflow-hidden">
                <div className="flex items-center justify-between mb-8 ml-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <File size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-900 underline decoration-blue-200 underline-offset-8">Student Performance Breakdown</h4>
                      <p className="text-sm text-gray-500 mt-1">{school?.name || 'National Public School'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Theme Selector */}
                    <div className="relative">
                      <select
                        value={selectedThemeForBreakdown}
                        onChange={(e) => setSelectedThemeForBreakdown(Number(e.target.value))}
                        className="appearance-none bg-gray-50 border border-gray-200 px-4 py-2.5 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 cursor-pointer"
                      >
                        {THEMES.map(theme => (
                          <option key={theme.id} value={theme.id}>{theme.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>

                    {/* Section Selector */}
                    <div className="relative">
                      <select
                        value={selectedSectionForBreakdown}
                        onChange={(e) => setSelectedSectionForBreakdown(e.target.value)}
                        className="appearance-none bg-gray-50 border border-gray-200 px-4 py-2.5 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700 cursor-pointer"
                      >
                        <option value="">All Sections</option>
                        {availableSectionsForBreakdown.map(section => (
                          <option key={section} value={section}>Section {section}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>

                    <button
                      onClick={downloadClassBooklet}
                      disabled={loadingStudents || filteredPerformanceStudents.length === 0}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download size={18} />
                      Download Class Booklet (PDF)
                    </button>
                  </div>
                </div>

                {loadingStudents ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  </div>
                ) : studentsList.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl">
                    <Users size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No students found</p>
                    <p className="text-gray-400 text-sm mt-1">Add students to see performance breakdown</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest w-16">Sl No</th>
                          <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Student Name</th>
                          <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest w-24">Grade & Sec</th>
                          <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest w-28">Mastery</th>
                          <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Domain Breakdown</th>
                          <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest w-32">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredPerformanceStudents.map((student, index) => {
                          const mastery = getStudentMastery(student.id!);
                          const isExpanded = expandedStudents.has(student.id!);
                          const domainBreakdown = getStudentDomainBreakdown(student.id!);
                          
                          return (
                            <React.Fragment key={student.id}>
                              <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-4">
                                  <span className="text-sm font-bold text-gray-500">{index + 1}</span>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="font-bold text-gray-900">{student.name}</span>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-col gap-1">
                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black w-fit">{student.grade}</span>
                                    {student.section && (
                                      <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black w-fit">Sec {student.section}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all ${mastery >= 80 ? 'bg-green-500' : mastery >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${mastery}%` }}
                                      />
                                    </div>
                                    <span className={`text-sm font-bold ${mastery >= 80 ? 'text-green-600' : mastery >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{mastery}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <button
                                    onClick={() => toggleStudentExpand(student.id!)}
                                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    {isExpanded ? 'Hide' : 'View'} Details
                                  </button>
                                </td>
                                <td className="px-4 py-4">
                                  <button
                                    onClick={() => downloadStudentPDF(student)}
                                    className="flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors"
                                  >
                                    <Download size={14} />
                                    PDF
                                  </button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} className="px-4 py-4 bg-blue-50/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                      {domainBreakdown.map((domain, dIdx) => (
                                        <div key={dIdx} className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                                          <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{domain.domain}</h5>
                                          <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs font-medium text-green-600">Can:</span>
                                              <span className="text-sm font-bold text-gray-900">{domain.can}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs font-medium text-yellow-600">Trying:</span>
                                              <span className="text-sm font-bold text-gray-900">{domain.trying}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs font-medium text-red-600">Help:</span>
                                              <span className="text-sm font-bold text-gray-900">{domain.help}</span>
                                            </div>
                                            <div className="pt-2 border-t border-gray-100">
                                              <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-500">Total:</span>
                                                <span className="text-sm font-black text-blue-600">{domain.total}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showAssessmentForm && teacher.school_id && (
          <StudentAssessmentForm
            user={teacher}
            userType="teacher"
            schoolId={teacher.school_id}
            onClose={() => setShowAssessmentForm(false)}
          />
        )}

        {currentView === 'students' && teacher.school_id && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {selectedStudent ? (
              <StudentProfileView
                student={selectedStudent}
                onBack={() => setSelectedStudent(null)}
              />
            ) : (
              <TeacherStudentListing
                schoolId={teacher.school_id}
                teacherId={teacher.id!}
                onViewProfile={(student) => setSelectedStudent(student)}
              />
            )}
          </div>
        )}

        {showCertificateModal && certificateAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 no-print">
                <h3 className="text-lg font-bold text-gray-900">
                  {certificateModalMode === 'certificate' ? 'Training Certificate' : 'Marks Card'}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FileText size={18} />
                    Download PDF
                  </button>
                  <button
                    onClick={handlePrintCertificate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Printer size={18} />
                    Print
                  </button>
                  <button
                    onClick={() => setShowCertificateModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-x-auto flex justify-center bg-gray-100" id="certificate-print-area" ref={certificateRef}>
                {certificateModalMode === 'certificate' ? (
                  certificateAssignment.training_program?.certificate_template_id && templates.find(t => t.id === certificateAssignment!.training_program?.certificate_template_id) ? (
                    <RenderedTemplate
                      template={templates.find(t => t.id === certificateAssignment!.training_program?.certificate_template_id)!}
                      data={{ assignment: certificateAssignment!, role: 'teacher' }}
                    />
                  ) : (
                    <div className="bg-white p-12 rounded-lg shadow-lg max-w-2xl w-full text-center">
                      <h2 className="text-2xl font-bold mb-4">Certificate of Completion</h2>
                      <p className="mb-8">This is to certify that {teacher.first_name} {teacher.last_name} has successfully completed the program:</p>
                      <h3 className="text-xl font-bold text-blue-600 mb-8">{certificateAssignment.training_program?.title}</h3>
                      <div className="w-full">
                        <p className="font-script text-3xl text-blue-900 border-b border-gray-400 pb-1">Authorized Signatory</p>
                      </div>
                      <div className="w-full border-t border-gray-400 mt-0">
                        <p className="text-sm text-gray-500 uppercase tracking-widest mt-2 pt-1">Director Signature</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="w-[210mm] min-h-[297mm] p-0 bg-white shadow-2xl relative overflow-hidden font-sans border border-gray-100 print:shadow-none print:w-[210mm] print:h-[297mm]">
                    {/* Decorative Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#2563eb 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}></div>

                    {/* Premium Wavy Header */}
                    <div className="relative h-44 overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-br from-blue-50 via-white to-blue-50"></div>
                      <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-16">
                          <path d="M0 60L60 55C120 50 240 40 360 45C480 50 600 70 720 75C840 80 960 70 1080 60C1200 50 1320 40 1380 35L1440 30V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V60Z" fill="white" />
                          <path d="M0 30L60 35C120 40 240 50 360 45C480 40 600 20 720 15C840 10 960 20 1080 30C1200 40 1320 50 1380 55L1440 60V0H1380C1320 0 1200 0 1080 0C960 0 840 0 720 0C600 0 480 0 360 0C240 0 120 0 60 0H0V30Z" fill="#dbeafe" opacity="0.5" />
                        </svg>
                      </div>

                      <div className="relative z-10 flex flex-col items-center pt-6">
                        <img src="/hauna_logo.png" alt="Hauna Logo" className="h-16 object-contain mb-1" />
                        <h2 className="text-[10px] font-bold text-blue-900 tracking-[0.2em] mb-1">Millat Centre for Research and Training</h2>
                        <div className="w-16 h-0.5 bg-blue-600 rounded-full mb-2"></div>
                        <h1 className="text-3xl font-extrabold text-blue-950 uppercase tracking-wider font-serif">Statement of Marks</h1>
                      </div>
                    </div>

                    <div className="px-8 py-4">
                      {/* Academic Details & Result Summary Grid */}
                      <div className="grid grid-cols-5 border-2 border-blue-900 rounded-lg overflow-hidden mb-4">
                        {/* Left Column: Details */}
                        <div className="col-span-3 border-r-2 border-blue-900">
                          {[
                            { label: 'Academic Year', value: '2025-26' },
                            { label: 'Programme', value: (certificateAssignment!.training_program?.title || 'N/A') + ' Induction Training' },
                            { label: 'Batch Name', value: ((certificateAssignment!.training_program?.title || '').toLowerCase().includes('c10') || (certificateAssignment!.training_program?.title || '').toLowerCase().includes('c.10')) ? 'C.10 Batch' : 'Regular' },
                            { label: 'Course Code', value: certificateAssignment!.training_program?.id?.slice(-6).toUpperCase() || 'TRN-001' },
                            { label: 'Student Name', value: `${teacher.first_name} ${teacher.last_name}` },
                            { label: 'School Name', value: school?.name || 'N/A' },
                            { label: 'Date of Issue', value: new Date().toLocaleDateString('en-IN') }
                          ].map((item, idx) => (
                            <div key={idx} className={`grid grid-cols-2 border-b-2 border-blue-900 last:border-b-0`}>
                              <div className="bg-blue-50 px-3 py-1.5 font-bold text-blue-900 text-[11px] border-r-2 border-blue-900 flex items-center">{item.label}</div>
                              <div className="px-3 py-1.5 text-gray-800 font-semibold text-[11px] flex items-center bg-white">{item.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Right Column: Result Summary */}
                        <div className="col-span-2">
                          <div className="bg-blue-100 px-3 py-2 font-black text-blue-950 text-center uppercase tracking-widest border-b-2 border-blue-900 text-[12px]">Result Summary</div>
                          <div className="p-3 space-y-2 bg-blue-50/30 h-full">
                            <div className="border-b border-blue-200 pb-1">
                              <p className="text-[10px] text-blue-800 uppercase font-bold mb-0.5">Total Marks Obtained</p>
                              <p className="text-lg font-black text-blue-950">
                                {Object.values(certificateAssignment!.marks_data || {}).reduce((sum: number, val: any) => sum + (val as number), 0)} / {certificateAssignment!.training_program?.marks_configuration?.subjects.reduce((sum, s) => sum + s.max_marks, 0)}
                              </p>
                            </div>
                            <div className="border-b border-blue-200 pb-1">
                              <p className="text-[10px] text-blue-800 uppercase font-bold mb-0.5">Percentage</p>
                              <p className="text-lg font-black text-blue-950">
                                {(() => {
                                  const subjects = certificateAssignment!.training_program?.marks_configuration?.subjects || [];
                                  const totalMax = subjects.reduce((sum, s) => sum + s.max_marks, 0);
                                  const totalObtained = Object.values(certificateAssignment!.marks_data || {}).reduce((sum: number, val: any) => sum + (val as number), 0);
                                  return totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
                                })()}%
                              </p>
                            </div>
                            <div className="border-b border-blue-200 pb-1">
                              <p className="text-[10px] text-blue-800 uppercase font-bold mb-0.5">Overall Grade</p>
                              <p className="text-lg font-black text-blue-950">
                                {(() => {
                                  const subjects = certificateAssignment!.training_program?.marks_configuration?.subjects || [];
                                  const totalMax = subjects.reduce((sum, s) => sum + s.max_marks, 0);
                                  const totalObtained = Object.values(certificateAssignment!.marks_data || {}).reduce((sum: number, val: any) => sum + (val as number), 0);
                                  return getComponentGrade('Overall', totalObtained, totalMax);
                                })()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-blue-800 uppercase font-bold mb-0.5">Remarks</p>
                              <p className="text-[12px] font-serif italic text-blue-900 leading-tight">
                                Excellent Performance. The candidate has demonstrated exceptional understanding of the core training components.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Main Marks Table */}
                      <div className="mb-4 border-2 border-blue-900 rounded-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-2">
                          <h3 className="text-white font-bold uppercase tracking-wider text-center text-sm">Marks Details</h3>
                        </div>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-blue-50 border-b-2 border-blue-900">
                              <th className="px-3 py-2 text-left font-bold text-blue-950 uppercase text-[10px] border-r-2 border-blue-900 w-12 text-center">Sl.No</th>
                              <th className="px-3 py-2 text-left font-bold text-blue-950 uppercase text-[10px] border-r-2 border-blue-900">Course Component</th>
                              <th className="px-3 py-2 text-center font-bold text-blue-950 uppercase text-[10px] border-r-2 border-blue-900 w-32">Max Marks</th>
                              <th className="px-3 py-2 text-center font-bold text-blue-950 uppercase text-[10px] border-r-2 border-blue-900 w-32">Marks Obtained</th>
                              <th className="px-3 py-2 text-center font-bold text-blue-950 uppercase text-[10px] w-24">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y-2 divide-blue-900">
                            {certificateAssignment!.training_program?.marks_configuration?.subjects.map((subject, index) => (
                              <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                                <td className="px-3 py-1.5 text-center text-[11px] font-bold text-blue-900 border-r-2 border-blue-900 bg-white">{index + 1}</td>
                                <td className="px-3 py-1.5 text-[11px] font-bold text-gray-800 border-r-2 border-blue-900 bg-white">{subject.name}</td>
                                <td className="px-3 py-1.5 text-center text-[11px] font-black text-gray-600 border-r-2 border-blue-900 bg-white">{subject.max_marks}</td>
                                <td className="px-3 py-1.5 text-center text-[11px] font-black text-blue-600 border-r-2 border-blue-900 bg-white">
                                  {certificateAssignment!.marks_data?.[subject.name] ?? '-'}
                                </td>
                                <td className="px-3 py-1.5 text-center text-[11px] font-black text-blue-900 bg-white">
                                  {getComponentGrade(subject.name, certificateAssignment!.marks_data?.[subject.name] as number, subject.max_marks)}
                                </td>
                              </tr>
                            ))}
                            {/* Total Row */}
                            <tr className="bg-blue-100/50 font-black border-t-2 border-blue-900">
                              <td className="px-3 py-2 text-center border-r-2 border-blue-900 text-[11px]"></td>
                              <td className="px-3 py-2 text-right border-r-2 border-blue-900 uppercase tracking-widest text-[10px]">Total Aggregate</td>
                              <td className="px-3 py-2 text-center border-r-2 border-blue-900 text-[11px]">
                                {certificateAssignment!.training_program?.marks_configuration?.subjects.reduce((sum, s) => sum + s.max_marks, 0)}
                              </td>
                              <td className="px-3 py-2 text-center border-r-2 border-blue-900 text-blue-700 text-sm">
                                {Object.values(certificateAssignment!.marks_data || {}).reduce((sum: number, val: any) => sum + (val as number), 0)}
                              </td>
                              <td className="px-3 py-2 text-center text-blue-900 text-[11px]">
                                {(() => {
                                  const subjects = certificateAssignment!.training_program?.marks_configuration?.subjects || [];
                                  const totalMax = subjects.reduce((sum, s) => sum + s.max_marks, 0);
                                  const totalObtained = Object.values(certificateAssignment!.marks_data || {}).reduce((sum: number, val: any) => sum + (val as number), 0);
                                  return getComponentGrade('Overall', totalObtained, totalMax);
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Certification Text */}
                      <div className="mb-6 bg-blue-50/50 p-4 rounded-lg border-l-4 border-blue-900">
                        <p className="text-blue-950 font-serif leading-relaxed text-center text-[13px]">
                          This is to certify that <span className="font-bold text-base underline decoration-blue-300 underline-offset-4">{teacher.first_name} {teacher.last_name}</span> has successfully completed the <span className="font-bold">{certificateAssignment!.training_program?.title}</span> training program organized by Millat Centre for Research and Training for the academic year 2025-26.
                        </p>
                      </div>

                      {/* Signatures Section */}
                      <div className="flex justify-between items-end px-12 pb-4">
                        <div className="w-40 h-16 mb-1"></div>

                        {/* Seal Image */}
                        <div className="flex items-center justify-center transform translate-y-4">
                          <img src="/maarif_seal.png" alt="Maarif Seal" className="w-32 h-auto object-contain opacity-90" />
                        </div>

                        <div className="text-center">
                          <div className="w-40 h-16 mb-1 relative flex items-center justify-center">
                            {certificateAssignment!.training_program?.signature_url ? (
                              <img src={certificateAssignment!.training_program?.signature_url} alt="Director Signature" className="h-12 object-contain" />
                            ) : (
                              <div className="absolute inset-0 border-b-2 border-blue-900 flex items-center justify-center">
                                <span className="text-blue-900 font-script text-2xl opacity-80">Director</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-black text-blue-950 uppercase tracking-widest mb-0.5">Director</p>
                          <p className="text-[9px] text-gray-500 font-serif italic">(Millat Centre for Research and Training)</p>
                        </div>
                      </div>
                    </div>

                    {/* Organised Under Text */}
                    <div className="text-center pb-2">
                      <p className="text-[10px] text-blue-900/60 font-serif italic">This program is organised under 'Maarif Educational and Charitable Trust' Bengaluru</p>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showCertificateModal && (
          <style>{`
          @media print {
            @page {
              size: ${certificateModalMode === 'certificate' ? 'A4 landscape' : 'A4 portrait'};
              margin: 0;
            }
            body * {
              visibility: hidden;
            }
            .no-print {
              display: none;
            }
            #certificate-print-area, #certificate-print-area * {
              visibility: visible;
            }
            #certificate-print-area {
              position: fixed;
              left: 0;
              top: 0;
              width: ${certificateModalMode === 'certificate' ? '297mm' : '210mm'};
              height: ${certificateModalMode === 'certificate' ? '210mm' : '297mm'};
              margin: 0;
              padding: 0 !important;
              box-shadow: none;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10000;
            }
            #certificate-print-area > div {
              width: ${certificateModalMode === 'certificate' ? '297mm' : '210mm'};
              height: ${certificateModalMode === 'certificate' ? '210mm' : '297mm'};
            }
          }
        `}</style>
        )}
        <style>{`
          .font-script {
            font-family: 'Brush Script MT', cursive;
          }
        `}</style>
        {showStudentManager && teacher.school_id && (
          <StudentManager
            schoolId={teacher.school_id}
            teacherId={teacher.id}
            onClose={() => setShowStudentManager(false)}
          />
        )}
      </div>
    </div >
  );
}
