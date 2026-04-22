#!/bin/bash

KEY="C:\\Users\\5410\\Downloads\\HCMS.pem"
IP="13.51.48.107"

echo "📦 Building frontend..."
cd "E:\\documents\\hcm12.03.2025\\HCM 12.03.2025\\HCMS123-main\\HCMS niha"
npm run build

echo "📤 Uploading dist to EC2..."
scp -i "$KEY" -r dist ec2-user@$IP:/home/ec2-user/

echo "🚀 Deploying..."
ssh -i "$KEY" ec2-user@$IP "
    rm -rf /home/ec2-user/hcm12.03.2025/HCM\ 12.03.2025/HCMS123-main/HCMS\ niha/dist
    cp -r /home/ec2-user/dist /home/ec2-user/hcm12.03.2025/HCM\ 12.03.2025/HCMS123-main/HCMS\ niha/
    sudo rm -rf /var/www/lessonplan/dist
    sudo cp -r /home/ec2-user/dist /var/www/lessonplan/
    pm2 restart all
    sudo systemctl restart nginx
"

echo "✅ Deployment complete!"