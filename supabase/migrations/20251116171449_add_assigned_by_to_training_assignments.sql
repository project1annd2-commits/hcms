/*
  # Add Assigned By Tracking to Training Assignments

  ## Changes
  - Add `assigned_by` column to track which employee assigned the training
  - References the users table
  - This allows tracking who assigned each teacher to a training program

  ## New Column
  - `assigned_by` (uuid, nullable) - References users(id)
    - Tracks which employee created the training assignment
    - Nullable for historical data that doesn't have this info
*/

-- Add assigned_by column to training_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_assignments' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE training_assignments 
    ADD COLUMN assigned_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_training_assignments_assigned_by 
ON training_assignments(assigned_by);