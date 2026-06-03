/*
  # Add Date Range and Meeting Link to Training Programs

  ## Changes
  1. Add new columns to training_programs table:
     - `start_date` (date) - Training program start date
     - `end_date` (date) - Training program end date
     - `meeting_link` (text) - URL for online meeting/training session

  ## Purpose
  Allow training programs to have scheduled date ranges and provide meeting links
  for virtual training sessions.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_programs' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE training_programs ADD COLUMN start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_programs' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE training_programs ADD COLUMN end_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_programs' AND column_name = 'meeting_link'
  ) THEN
    ALTER TABLE training_programs ADD COLUMN meeting_link text DEFAULT '';
  END IF;
END $$;