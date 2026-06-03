/*
  # Add School Assignment System

  1. New Tables
    - `school_assignments`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `employee_id` (uuid, foreign key to users)
      - `assigned_by` (uuid, foreign key to users)
      - `assigned_at` (timestamptz)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `school_assignments` table
    - Add policies for admins to manage assignments
    - Add policies for employees to view their assigned schools
    
  3. Changes to Existing Tables
    - No structural changes needed
    - School ownership tracking already exists via created_by field
    - This new table allows multiple employees to be assigned to the same school
*/

CREATE TABLE IF NOT EXISTS school_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES users(id) NOT NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(school_id, employee_id)
);

ALTER TABLE school_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all school assignments"
  ON school_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

CREATE POLICY "Employees with manage_schools permission can manage assignments"
  ON school_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN permissions ON permissions.user_id = users.id
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND permissions.can_manage_schools = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      JOIN permissions ON permissions.user_id = users.id
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND permissions.can_manage_schools = true
    )
  );

CREATE POLICY "Employees can view their assigned schools"
  ON school_assignments FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_school_assignments_school_id ON school_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_school_assignments_employee_id ON school_assignments(employee_id);
