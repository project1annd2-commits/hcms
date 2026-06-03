/*
  # Employee Daily Tasks Management

  1. New Tables
    - `employee_tasks`
      - `id` (uuid, primary key) - Unique task identifier
      - `employee_id` (uuid, foreign key) - Reference to users table
      - `title` (text) - Task title/description
      - `date` (date) - Task date
      - `time_spent` (integer) - Time spent in minutes
      - `status` (text) - Task status: pending, in_progress, completed
      - `notes` (text, optional) - Additional notes
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `employee_tasks` table
    - Employees can view, create, and update their own tasks
    - Admins can view all tasks

  3. Indexes
    - Index on employee_id for fast lookups
    - Index on date for date-based queries
    - Composite index on employee_id and date for efficient filtering
*/

-- Create employee_tasks table
CREATE TABLE IF NOT EXISTS employee_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time_spent integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_tasks_employee_id ON employee_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_date ON employee_tasks(date);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_employee_date ON employee_tasks(employee_id, date);

-- RLS Policies for employees to manage their own tasks
CREATE POLICY "Employees can view own tasks"
  ON employee_tasks FOR SELECT
  TO authenticated
  USING (
    auth.uid() = employee_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Employees can create own tasks"
  ON employee_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can update own tasks"
  ON employee_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = employee_id)
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can delete own tasks"
  ON employee_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = employee_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employee_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS employee_tasks_updated_at ON employee_tasks;
CREATE TRIGGER employee_tasks_updated_at
  BEFORE UPDATE ON employee_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_tasks_updated_at();
