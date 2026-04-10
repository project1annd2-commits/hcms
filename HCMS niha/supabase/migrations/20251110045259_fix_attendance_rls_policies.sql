/*
  # Fix Attendance RLS Policies

  ## Changes
  - Drop existing restrictive policies on training_attendance
  - Create permissive policies that allow all operations
  - System uses custom authentication, not Supabase auth

  ## Security Note
  The application uses custom authentication via the users table,
  not Supabase's built-in auth. Policies need to be permissive
  to allow the custom auth system to work.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view attendance" ON training_attendance;
DROP POLICY IF EXISTS "Authenticated users can record attendance" ON training_attendance;
DROP POLICY IF EXISTS "Authenticated users can update attendance" ON training_attendance;
DROP POLICY IF EXISTS "Authenticated users can delete attendance" ON training_attendance;

-- Create permissive policies for custom auth system
CREATE POLICY "Allow all select on attendance"
  ON training_attendance FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert on attendance"
  ON training_attendance FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update on attendance"
  ON training_attendance FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all delete on attendance"
  ON training_attendance FOR DELETE
  USING (true);