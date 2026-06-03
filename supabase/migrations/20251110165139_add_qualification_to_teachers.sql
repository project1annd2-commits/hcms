/*
  # Add Qualification Field to Teachers

  ## Changes
  1. Add qualification column to teachers table
     - Stores teacher's educational qualification (e.g., B.Ed, M.Ed, Ph.D)
     - Text field, optional

  ## Purpose
  Track teacher qualifications for better record management and reporting
*/

-- Add qualification column to teachers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'qualification'
  ) THEN
    ALTER TABLE teachers ADD COLUMN qualification text;
  END IF;
END $$;
