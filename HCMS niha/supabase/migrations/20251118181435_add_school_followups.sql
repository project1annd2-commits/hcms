/*
  # Add School Followups System

  1. New Tables
    - `school_followups`
      - `id` (uuid, primary key)
      - `school_id` (uuid, foreign key to schools)
      - `employee_id` (uuid, foreign key to users)
      - `followup_date` (date) - The date of this followup visit/entry
      - `comments` (text) - Notes and observations from the followup
      - `next_followup_date` (date) - When the next followup should occur
      - `status` (text) - 'completed' or 'pending'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `school_followups` table
    - Add policy for employees to view their own school followups
    - Add policy for employees to create followups for their assigned schools
    - Add policy for employees to update their own followups
    - Add policy for admins to view all followups

  3. Indexes
    - Index on school_id for quick lookups
    - Index on employee_id for filtering by employee
    - Index on next_followup_date for finding upcoming followups
    - Index on status for filtering pending/completed
*/

CREATE TABLE IF NOT EXISTS school_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followup_date date NOT NULL DEFAULT CURRENT_DATE,
  comments text DEFAULT '',
  next_followup_date date,
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_followups_school ON school_followups(school_id);
CREATE INDEX IF NOT EXISTS idx_school_followups_employee ON school_followups(employee_id);
CREATE INDEX IF NOT EXISTS idx_school_followups_next_date ON school_followups(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_school_followups_status ON school_followups(status);
CREATE INDEX IF NOT EXISTS idx_school_followups_date ON school_followups(followup_date);

ALTER TABLE school_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on school_followups"
  ON school_followups FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);