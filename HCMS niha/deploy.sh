#!/bin/bash

echo "🚀 Deploy started..."

cd /home/ec2-user/lessonplan/HCMS\ niha

# Pull latest code
git pull origin main

# Increase memory (fix build crash)
export NODE_OPTIONS="--max-old-space-size=4096"

# Install dependencies
npm install

# Build project
npm run build

# Ensure directory exists
sudo mkdir -p /var/www/lessonplan/dist

# Clean old files
sudo rm -rf /var/www/lessonplan/dist/*

# Copy new build
sudo cp -r dist/* /var/www/lessonplan/dist/

# Restart nginx
sudo systemctl restart nginx

echo "✅ Deploy completed successfully!"