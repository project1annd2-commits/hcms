/*
  # Add Device Tracking for Employee Accounts

  1. New Tables
    - `user_devices`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users table)
      - `device_id` (text, unique identifier for device)
      - `device_model` (text, device model/name)
      - `device_type` (text, mobile/desktop/tablet)
      - `browser` (text, browser information)
      - `os` (text, operating system)
      - `ip_address` (text, IP address)
      - `is_blocked` (boolean, default false)
      - `first_login` (timestamptz, first login from this device)
      - `last_login` (timestamptz, last login from this device)
      - `last_location` (text, optional location info)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_devices` table
    - Add policy for admins to view all devices
    - Add policy for users to view their own devices
    - Add policy for admins to update device status (block/unblock)

  3. Notes
    - Device tracking helps monitor account security
    - Admins can block suspicious devices
    - Employees can see what devices are logged into their account
*/

CREATE TABLE IF NOT EXISTS user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_model text,
  device_type text,
  browser text,
  os text,
  ip_address text,
  is_blocked boolean DEFAULT false,
  first_login timestamptz DEFAULT now(),
  last_login timestamptz DEFAULT now(),
  last_location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_is_blocked ON user_devices(is_blocked);

-- Enable RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all devices
CREATE POLICY "Admins can view all devices"
  ON user_devices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE username = current_user)
      AND users.role = 'admin'
    )
  );

-- Policy: Users can view their own devices
CREATE POLICY "Users can view own devices"
  ON user_devices
  FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE username = current_user)
  );

-- Policy: Admins can update device status
CREATE POLICY "Admins can update device status"
  ON user_devices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE username = current_user)
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE username = current_user)
      AND users.role = 'admin'
    )
  );

-- Policy: System can insert device records (for login tracking)
CREATE POLICY "System can insert device records"
  ON user_devices
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can update device records (for login tracking)
CREATE POLICY "System can update last login"
  ON user_devices
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
