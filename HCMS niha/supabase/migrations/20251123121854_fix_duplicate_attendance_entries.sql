/*
  # Fix Duplicate Attendance Entries

  1. Changes
    - Add unique constraint to prevent marking attendance multiple times for same teacher on same day
    - This ensures one attendance record per teacher per day per program

  2. Security
    - Maintains existing RLS policies
    - Prevents data integrity issues with duplicate records

  3. Notes
    - The constraint covers teacher_id, training_program_id, and attendance_date
    - Employees can still update existing attendance records, but cannot create duplicates
*/

-- Add unique constraint to prevent duplicate attendance for same teacher/program/date
-- First, remove any existing duplicate records (keep the most recent one)
DO $$ 
BEGIN
  DELETE FROM training_attendance a
  USING training_attendance b
  WHERE a.id < b.id
    AND a.teacher_id = b.teacher_id
    AND a.training_program_id = b.training_program_id
    AND a.attendance_date = b.attendance_date;
END $$;

-- Now add the unique constraint
ALTER TABLE training_attendance
ADD CONSTRAINT unique_attendance_per_teacher_program_date 
UNIQUE (teacher_id, training_program_id, attendance_date);
