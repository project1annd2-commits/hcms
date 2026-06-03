/*
  # Fix Device Tracking RLS Policies

  1. Changes
    - Disable RLS on user_devices table to work with custom authentication
    - This matches the pattern used for other tables in the system (users, teachers, etc.)

  2. Security Notes
    - Application-level security is enforced through the custom auth system
    - Only admins can access the Device Management interface
    - Data access is controlled at the application layer
*/

-- Disable RLS on user_devices to work with custom auth
ALTER TABLE user_devices DISABLE ROW LEVEL SECURITY;

-- Drop existing policies as they're no longer needed
DROP POLICY IF EXISTS "Admins can view all devices" ON user_devices;
DROP POLICY IF EXISTS "Users can view own devices" ON user_devices;
DROP POLICY IF EXISTS "Admins can update device status" ON user_devices;
DROP POLICY IF EXISTS "System can insert device records" ON user_devices;
DROP POLICY IF EXISTS "System can update last login" ON user_devices;
