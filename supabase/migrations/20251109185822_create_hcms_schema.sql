/*
  # Hauna Central Management System - Complete Database Schema

  ## Overview
  Creates the complete database structure for HCMS including user management,
  educational entities, training programs, and analytics.

  ## 1. New Tables

  ### Users & Authentication
  - `users`
    - `id` (uuid, primary key) - Unique user identifier
    - `username` (text, unique) - Login username
    - `password_hash` (text) - Hashed password
    - `full_name` (text) - User's full name
    - `role` (text) - User role: 'admin', 'employee', 'viewer'
    - `is_active` (boolean) - Account status
    - `created_at` (timestamptz) - Account creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  ### Permissions
  - `permissions`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key) - References users
    - `can_delete_schools` (boolean)
    - `can_manage_users` (boolean)
    - `can_assign_training` (boolean)
    - `can_view_reports` (boolean)
    - `can_manage_schools` (boolean)
    - `can_manage_teachers` (boolean)
    - `can_manage_mentors` (boolean)
    - `can_manage_admin_personnel` (boolean)
    - `can_manage_training_programs` (boolean)

  ### Schools
  - `schools`
    - `id` (uuid, primary key)
    - `name` (text) - School name
    - `code` (text, unique) - School code
    - `address` (text)
    - `phone` (text)
    - `email` (text)
    - `enrollment_count` (integer)
    - `principal_name` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Teachers
  - `teachers`
    - `id` (uuid, primary key)
    - `first_name` (text)
    - `last_name` (text)
    - `email` (text)
    - `phone` (text)
    - `school_id` (uuid, foreign key) - References schools
    - `subject_specialization` (text)
    - `hire_date` (date)
    - `status` (text) - 'active', 'on_leave', 'inactive'
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Mentors
  - `mentors`
    - `id` (uuid, primary key)
    - `first_name` (text)
    - `last_name` (text)
    - `email` (text)
    - `phone` (text)
    - `specialization` (text)
    - `years_of_experience` (integer)
    - `status` (text) - 'active', 'inactive'
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Mentor-School Assignments (Many-to-Many)
  - `mentor_schools`
    - `id` (uuid, primary key)
    - `mentor_id` (uuid, foreign key) - References mentors
    - `school_id` (uuid, foreign key) - References schools
    - `assigned_at` (timestamptz)

  ### Administrative Personnel
  - `admin_personnel`
    - `id` (uuid, primary key)
    - `first_name` (text)
    - `last_name` (text)
    - `email` (text)
    - `phone` (text)
    - `position` (text)
    - `department` (text)
    - `hire_date` (date)
    - `status` (text) - 'active', 'inactive'
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Training Programs
  - `training_programs`
    - `id` (uuid, primary key)
    - `title` (text)
    - `description` (text)
    - `duration_hours` (integer)
    - `category` (text)
    - `status` (text) - 'active', 'archived'
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### Training Assignments
  - `training_assignments`
    - `id` (uuid, primary key)
    - `training_program_id` (uuid, foreign key) - References training_programs
    - `teacher_id` (uuid, foreign key) - References teachers
    - `assigned_date` (timestamptz)
    - `due_date` (date)
    - `completion_date` (date, nullable)
    - `status` (text) - 'assigned', 'in_progress', 'completed', 'overdue'
    - `progress_percentage` (integer)
    - `score` (integer, nullable)

  ## 2. Security
  - Enable RLS on all tables
  - Since no authentication is used, policies allow all operations
  - In production, implement proper authentication and restrictive policies

  ## 3. Indexes
  - Added indexes on foreign keys for performance
  - Added indexes on frequently queried fields (username, school_code, email)
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'employee', 'viewer')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  can_delete_schools boolean DEFAULT false,
  can_manage_users boolean DEFAULT false,
  can_assign_training boolean DEFAULT false,
  can_view_reports boolean DEFAULT false,
  can_manage_schools boolean DEFAULT false,
  can_manage_teachers boolean DEFAULT false,
  can_manage_mentors boolean DEFAULT false,
  can_manage_admin_personnel boolean DEFAULT false,
  can_manage_training_programs boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON permissions(user_id);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  enrollment_count integer DEFAULT 0,
  principal_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_code ON schools(code);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  subject_specialization text DEFAULT '',
  hire_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);
CREATE INDEX IF NOT EXISTS idx_teachers_name ON teachers(last_name, first_name);

-- Mentors table
CREATE TABLE IF NOT EXISTS mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  specialization text DEFAULT '',
  years_of_experience integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentors_status ON mentors(status);
CREATE INDEX IF NOT EXISTS idx_mentors_name ON mentors(last_name, first_name);

-- Mentor-School assignments (many-to-many)
CREATE TABLE IF NOT EXISTS mentor_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid REFERENCES mentors(id) ON DELETE CASCADE NOT NULL,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(mentor_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_schools_mentor_id ON mentor_schools(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_schools_school_id ON mentor_schools(school_id);

-- Administrative Personnel table
CREATE TABLE IF NOT EXISTS admin_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  position text DEFAULT '',
  department text DEFAULT '',
  hire_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_personnel_status ON admin_personnel(status);
CREATE INDEX IF NOT EXISTS idx_admin_personnel_department ON admin_personnel(department);
CREATE INDEX IF NOT EXISTS idx_admin_personnel_name ON admin_personnel(last_name, first_name);

-- Training Programs table
CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  duration_hours integer DEFAULT 0,
  category text DEFAULT '',
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_programs_status ON training_programs(status);
CREATE INDEX IF NOT EXISTS idx_training_programs_category ON training_programs(category);

-- Training Assignments table
CREATE TABLE IF NOT EXISTS training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_program_id uuid REFERENCES training_programs(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  assigned_date timestamptz DEFAULT now(),
  due_date date,
  completion_date date,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  score integer CHECK (score >= 0 AND score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_training_assignments_training_id ON training_assignments(training_program_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_teacher_id ON training_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (no authentication required as per requirements)
-- Note: In production with proper auth, these should be restrictive

CREATE POLICY "Allow all operations on users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on permissions"
  ON permissions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on schools"
  ON schools FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on teachers"
  ON teachers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on mentors"
  ON mentors FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on mentor_schools"
  ON mentor_schools FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on admin_personnel"
  ON admin_personnel FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on training_programs"
  ON training_programs FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on training_assignments"
  ON training_assignments FOR ALL
  USING (true)
  WITH CHECK (true);