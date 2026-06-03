import { useEffect, useState } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { TrainingProgram, TrainingAttendance, TrainingAssignment } from '../lib/models';
import { BarChart3, Users, UserCheck, UserX, Calendar } from 'lucide-react';

interface DayData {
  date: string;
  assigned: number;
  present: number;
  absent: number;
  totalAttendance: number;
}

export default function AttendanceAnalytics() {
  const [attendanceData, setAttendanceData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalAssigned: 0,
    attendanceRate: 0,
  });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (programs.length > 0) {
      loadAttendanceData();
    }
  }, [selectedProgram, programs]);

  const loadPrograms = async () => {
    try {
      // Fetch ALL programs (not just active) to ensure we can display any attendance data
      const data = await db.find<TrainingProgram>(
        Collections.TRAINING_PROGRAMS,
        {},  // No status filter - get all programs
        { sort: { created_at: -1 } }
      );

      console.log('[AttendanceAnalytics] Loaded programs:', data?.length || 0);
      setPrograms(data || []);

      // Default to "Refresher" program if found (as requested by user)
      const refresherProgram = data?.find(p => p.title.toLowerCase().includes('refresher'));
      if (refresherProgram && refresherProgram.id) {
        setSelectedProgram(refresherProgram.id);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);

    try {
      const attendanceFilter: any = {};
      if (selectedProgram !== 'all') {
        attendanceFilter.training_program_id = selectedProgram;
      }

      // Fetch both teacher and mentor attendance records
      const [teacherAttendanceRecords, mentorAttendanceRecords] = await Promise.all([
        db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, attendanceFilter),
        db.find<any>(Collections.MENTOR_TRAINING_ATTENDANCE, attendanceFilter)
      ]);

      // Combine both attendance records
      const allAttendanceRecords = [
        ...(teacherAttendanceRecords || []),
        ...(mentorAttendanceRecords || [])
      ];

      console.log('[AttendanceAnalytics] Teacher attendance:', teacherAttendanceRecords?.length || 0);
      console.log('[AttendanceAnalytics] Mentor attendance:', mentorAttendanceRecords?.length || 0);

      const assignmentsFilter: any = {};
      if (selectedProgram !== 'all') {
        assignmentsFilter.training_program_id = selectedProgram;
      }

      // Fetch both teacher and mentor training assignments
      const [teacherAssignments, mentorAssignments] = await Promise.all([
        db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, assignmentsFilter),
        db.find<any>(Collections.MENTOR_TRAINING_ASSIGNMENTS, assignmentsFilter)
      ]);

      const totalAssigned = (teacherAssignments?.length || 0) + (mentorAssignments?.length || 0);

      console.log('[AttendanceAnalytics] Teacher assignments:', teacherAssignments?.length || 0);
      console.log('[AttendanceAnalytics] Mentor assignments:', mentorAssignments?.length || 0);

      const dateMap = new Map<string, DayData>();

      allAttendanceRecords?.forEach((record) => {
        const dateStr = record.attendance_date;
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, {
            date: dateStr,
            assigned: totalAssigned,
            present: 0,
            absent: 0,
            totalAttendance: 0,
          });
        }

        const dayData = dateMap.get(dateStr)!;
        dayData.totalAttendance++;

        if (record.status === 'present' || record.status === 'late') {
          dayData.present++;
        } else if (record.status === 'absent') {
          dayData.absent++;
        }
      });

      const sortedData = Array.from(dateMap.values()).sort((a, b) => {
        // Parse dates in local timezone by appending time component
        const dateA = new Date(a.date + 'T00:00:00');
        const dateB = new Date(b.date + 'T00:00:00');
        return dateA.getTime() - dateB.getTime();
      });

      setAttendanceData(sortedData);

      const totalPresent = sortedData.reduce((sum, day) => sum + day.present, 0);
      const totalPossible = sortedData.reduce((sum, day) => sum + day.assigned, 0);
      const attendanceRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

      setTotalStats({
        totalAssigned: totalAssigned,
        attendanceRate,
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      // Trigger animation after data loads
      setTimeout(() => setIsAnimating(true), 100);
    }
  };

  const maxValue = Math.max(...attendanceData.map(d => Math.max(d.assigned, d.present, d.absent)), 1);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading attendance analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <BarChart3 className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Training Attendance Analytics</h3>
              <p className="text-sm text-gray-600">Day-wise attendance breakdown</p>
            </div>
          </div>

          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Programs</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 transform transition-all duration-500 hover:scale-105">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg animate-pulse">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Teachers Assigned</p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-1000">
                  {isAnimating ? totalStats.totalAssigned : 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200 transform transition-all duration-500 hover:scale-105">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-600 p-2 rounded-lg animate-pulse">
                <Calendar className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900 transition-all duration-1000">
                  {isAnimating ? totalStats.attendanceRate : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {attendanceData.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-gray-700">Assigned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-700">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-gray-700">Absent</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-4">
              <div className="inline-flex gap-4 px-4" style={{ minWidth: '100%' }}>
                {attendanceData.map((day, index) => {
                  const assignedHeight = Math.max((day.assigned / maxValue) * 240, day.assigned > 0 ? 20 : 0);
                  const presentHeight = Math.max((day.present / maxValue) * 240, day.present > 0 ? 20 : 0);
                  const absentHeight = Math.max((day.absent / maxValue) * 240, day.absent > 0 ? 20 : 0);

                  return (
                    <div key={index} className="flex flex-col items-center gap-3" style={{ minWidth: '100px' }}>
                      <div className="flex items-end gap-2 h-64">
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative group flex flex-col justify-end" style={{ height: '240px' }}>
                            <div
                              className="bg-blue-500 hover:bg-blue-600 rounded-t cursor-pointer transition-all duration-1000 ease-out"
                              style={{
                                height: isAnimating ? `${assignedHeight}px` : '0px',
                                width: '24px'
                              }}
                            >
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Assigned: {day.assigned}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-blue-600 transition-all duration-500">{isAnimating ? day.assigned : 0}</span>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <div className="relative group flex flex-col justify-end" style={{ height: '240px' }}>
                            <div
                              className="bg-green-500 hover:bg-green-600 rounded-t cursor-pointer transition-all duration-1000 ease-out"
                              style={{
                                height: isAnimating ? `${presentHeight}px` : '0px',
                                width: '24px',
                                transitionDelay: '100ms'
                              }}
                            >
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Present: {day.present}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-green-600 transition-all duration-500">{isAnimating ? day.present : 0}</span>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <div className="relative group flex flex-col justify-end" style={{ height: '240px' }}>
                            <div
                              className="bg-red-500 hover:bg-red-600 rounded-t cursor-pointer transition-all duration-1000 ease-out"
                              style={{
                                height: isAnimating ? `${absentHeight}px` : '0px',
                                width: '24px',
                                transitionDelay: '200ms'
                              }}
                            >
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Absent: {day.absent}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-red-600 transition-all duration-500">{isAnimating ? day.absent : 0}</span>
                        </div>
                      </div>

                      <div className="text-xs font-medium text-gray-700 text-center">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <p>No attendance data available for this training program</p>
          </div>
        )}
      </div>
    </div>
  );
}
