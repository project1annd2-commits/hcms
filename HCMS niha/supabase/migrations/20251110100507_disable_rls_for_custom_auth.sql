/*
  # Disable RLS for Custom Authentication

  This application uses custom authentication (not Supabase Auth), which means
  auth.uid() is always NULL and RLS policies will always fail.
  
  Since the application handles authorization at the application level through
  the permissions table and role checks, we're temporarily disabling RLS on
  tables that need it.
  
  ## Changes
  1. Disable RLS on school_assignments table
  
  ## Security Note
  The application still enforces permissions through:
  - User role checks (admin, employee)
  - Permissions table (can_manage_schools, etc.)
  - Frontend authorization guards
  
  ## Future Enhancement
  Consider migrating to Supabase Auth for proper RLS support.
*/

-- Disable RLS on school_assignments since we use custom auth
ALTER TABLE school_assignments DISABLE ROW LEVEL SECURITY;

-- Drop existing policies as they won't work with custom auth
DROP POLICY IF EXISTS "Admins can manage all school assignments" ON school_assignments;
DROP POLICY IF EXISTS "Employees with manage_schools permission can manage assignments" ON school_assignments;
DROP POLICY IF EXISTS "Employees can view their assigned schools" ON school_assignments;
