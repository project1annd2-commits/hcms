/*
  # Fix Teachers Username Constraint

  ## Changes
  - Remove UNIQUE constraint on teachers.username column
  - Teachers don't need unique usernames for regular operations
  - Username is only used for optional teacher login feature
  - This allows multiple teachers to be added without username conflicts

  ## Reason
  The unique constraint on username was preventing teachers from being added
  to the same school when usernames were not provided or were duplicated.
*/

-- Drop the unique constraint on username
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teachers_username_key'
    AND table_name = 'teachers'
  ) THEN
    ALTER TABLE teachers DROP CONSTRAINT teachers_username_key;
  END IF;
END $$;

-- Add a partial unique index instead - only enforce uniqueness when username is NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_username_unique 
ON teachers(username) 
WHERE username IS NOT NULL AND username != '';