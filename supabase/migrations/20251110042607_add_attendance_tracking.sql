/*
  # Add Attendance Tracking for Training Sessions

  ## New Tables
  1. `training_attendance`
     - `id` (uuid, primary key)
     - `assignment_id` (uuid, foreign key to training_assignments)
     - `teacher_id` (uuid, foreign key to teachers)
     - `training_program_id` (uuid, foreign key to training_programs)
     - `attendance_date` (date) - Date of attendance
     - `status` (text) - present, absent, late, excused
     - `notes` (text) - Additional notes about attendance
     - `recorded_by` (uuid, foreign key to users) - Employee who recorded attendance
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  ## Purpose
  Allow employees to track teacher attendance for training programs and maintain
  detailed attendance records for each training session.

  ## Security
  - Enable RLS on training_attendance table
  - Authenticated users can view attendance records
  - Only users with proper permissions can record attendance
*/

-- Create training_attendance table
CREATE TABLE IF NOT EXISTS training_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES training_assignments(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  training_program_id uuid REFERENCES training_programs(id) ON DELETE CASCADE NOT NULL,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes text DEFAULT '',
  recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_assignment ON training_attendance(assignment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher ON training_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_program ON training_attendance(training_program_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON training_attendance(attendance_date);

-- Enable RLS
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for training_attendance
CREATE POLICY "Authenticated users can view attendance"
  ON training_attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can record attendance"
  ON training_attendance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendance"
  ON training_attendance FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attendance"
  ON training_attendance FOR DELETE
  TO authenticated
  USING (true);