/*
  # Add School Ownership Tracking

  ## Changes
  1. Add column to schools table:
     - `created_by` (uuid) - References users table, tracks who created the school

  ## Purpose
  Track which employee created each school so that schools are only visible
  to the employee who created them (except for admins who see all).

  ## Security
  - Employees can only see and manage schools they created
  - Admins can see and manage all schools
*/

-- Add created_by column to schools table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE schools ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_schools_created_by ON schools(created_by);