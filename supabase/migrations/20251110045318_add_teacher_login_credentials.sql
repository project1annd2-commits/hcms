/*
  # Add Teacher Login Credentials

  ## Changes
  1. Add columns to teachers table:
     - `username` (text, unique) - Login username for teacher
     - `password_hash` (text) - Hashed password for authentication
     - `is_active_login` (boolean) - Whether teacher can login

  ## Purpose
  Allow teachers to login and view their own profiles, training assignments,
  and attendance records.

  ## Security
  - Passwords are stored as SHA-256 hashes
  - Username must be unique
  - Login can be disabled per teacher
*/

-- Add login credential columns to teachers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'username'
  ) THEN
    ALTER TABLE teachers ADD COLUMN username text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE teachers ADD COLUMN password_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'is_active_login'
  ) THEN
    ALTER TABLE teachers ADD COLUMN is_active_login boolean DEFAULT true;
  END IF;
END $$;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_teachers_username ON teachers(username);