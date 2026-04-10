/*
  # Add Alumni Status for Teachers

  1. Changes
    - Add `is_alumni` boolean field to teachers table
    - Add `alumni_date` timestamp field to track when teacher became alumni
    - Add `alumni_reason` text field for notes about why teacher left
    - Update existing teachers to default is_alumni = false

  2. Security
    - Maintains existing table policies
    - Alumni status is managed by employees and admins only

  3. Purpose
    - Track teachers who have left schools
    - Maintain historical records
    - Prevent alumni teachers from logging in
    - Display alumni list to all users for reference
*/

-- Add alumni-related columns to teachers table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teachers' AND column_name = 'is_alumni'
  ) THEN
    ALTER TABLE teachers ADD COLUMN is_alumni boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teachers' AND column_name = 'alumni_date'
  ) THEN
    ALTER TABLE teachers ADD COLUMN alumni_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teachers' AND column_name = 'alumni_reason'
  ) THEN
    ALTER TABLE teachers ADD COLUMN alumni_reason text;
  END IF;
END $$;

-- Update existing teachers to set is_alumni to false if null
UPDATE teachers SET is_alumni = false WHERE is_alumni IS NULL;

-- Create index for faster alumni queries
CREATE INDEX IF NOT EXISTS idx_teachers_is_alumni ON teachers(is_alumni);
