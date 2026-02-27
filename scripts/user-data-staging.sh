#!/bin/bash
set -e

# Install and enable nginx
sudo dnf install -y nginx || sudo yum install -y nginx
sudo systemctl enable nginx

# Get instance metadata using IMDSv2
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
AVAILABILITY_ZONE=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)

# Create custom HTML page
cat <<'EOF' | sudo tee /usr/share/nginx/html/index.html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AWS Highly Available Architecture - STAGING</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 3rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 800px;
            margin: 2rem;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 0.5rem 1.5rem;
            border-radius: 50px;
            font-size: 0.9rem;
            font-weight: bold;
            margin: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .badge.staging {
            background: #f59e0b;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        .info-card {
            background: rgba(255, 255, 255, 0.15);
            padding: 1.5rem;
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .info-card h3 {
            font-size: 0.9rem;
            opacity: 0.8;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .info-card p {
            font-size: 1.2rem;
            font-weight: bold;
            word-break: break-all;
        }
        .footer {
            margin-top: 2rem;
            opacity: 0.8;
            font-size: 0.9rem;
        }
        .status {
            display: inline-block;
            width: 12px;
            height: 12px;
            background: #10b981;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 AWS Highly Available Architecture</h1>
        <div>
            <span class="badge staging">Staging Environment</span>
            <span class="badge"><span class="status"></span>Online</span>
        </div>
        
        <div class="info-grid">
            <div class="info-card">
                <h3>Instance ID</h3>
                <p>INSTANCE_ID_PLACEHOLDER</p>
            </div>
            <div class="info-card">
                <h3>Availability Zone</h3>
                <p>AVAILABILITY_ZONE_PLACEHOLDER</p>
            </div>
            <div class="info-card">
                <h3>Region</h3>
                <p>us-east-1</p>
            </div>
            <div class="info-card">
                <h3>Architecture</h3>
                <p>Multi-AZ 2-Tier</p>
            </div>
            <div class="info-card">
                <h3>Load Balancer</h3>
                <p>Application LB</p>
            </div>
            <div class="info-card">
                <h3>Auto Scaling</h3>
                <p>Enabled</p>
            </div>
        </div>
        
        <div class="footer">
            <p>✨ Deployed with AWS CDK</p>
        </div>
    </div>
</body>
</html>
EOF

# Replace placeholders with actual values
sudo sed -i "s/INSTANCE_ID_PLACEHOLDER/$INSTANCE_ID/g" /usr/share/nginx/html/index.html
sudo sed -i "s/AVAILABILITY_ZONE_PLACEHOLDER/$AVAILABILITY_ZONE/g" /usr/share/nginx/html/index.html

# Start nginx
sudo systemctl start nginx
