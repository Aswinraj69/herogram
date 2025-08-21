#!/bin/bash

# DigitalOcean Deployment Script for AI Painting Generator
# Run this script on your DigitalOcean Droplet as root

set -e  # Exit on any error

echo "🚀 Starting deployment of AI Painting Generator..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Step 1: Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install Node.js
print_status "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Step 3: Install PM2
print_status "Installing PM2..."
npm install -g pm2

# Step 4: Install Nginx
print_status "Installing Nginx..."
apt install -y nginx

# Step 5: Install Git
print_status "Installing Git..."
apt install -y git

# Step 6: Create project directory
print_status "Setting up project directory..."
mkdir -p /var/www
cd /var/www

# Step 7: Clone repository (if not already present)
if [ ! -d "herogram" ]; then
    print_status "Cloning repository..."
    git clone https://github.com/Aswinraj69/herogram.git
else
    print_status "Repository already exists, pulling latest changes..."
    cd herogram
    git pull origin main
    cd ..
fi

cd herogram

# Step 8: Install dependencies
print_status "Installing Node.js dependencies..."
npm install

# Step 9: Create uploads directory
print_status "Creating uploads directory..."
mkdir -p uploads
chmod 755 uploads

# Step 10: Set permissions
print_status "Setting file permissions..."
chown -R root:root /var/www/herogram
chmod -R 755 /var/www/herogram

# Step 11: Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file..."
    cat > .env << EOF
# AI API Keys
OPENAI_API_KEY=your_openai_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Server Configuration
PORT=3000
SERVER_IP=$(curl -s ifconfig.me)

# Database Configuration (SQLite by default)
# Leave these empty to use SQLite
# DB_HOST=
# DB_USER=
# DB_PASSWORD=
# DB_NAME=

# JWT Secret (generate a random string)
JWT_SECRET=$(openssl rand -base64 32)
EOF
    print_warning "Please edit .env file with your actual API keys:"
    print_warning "nano /var/www/herogram/.env"
else
    print_status ".env file already exists"
fi

# Step 12: Create Nginx configuration
print_status "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/herogram << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    # Serve static files (frontend)
    location / {
        root /var/www/herogram;
        index index.html;
        try_files $uri /index.html;
    }

    # Proxy API requests
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Required for Server-Sent Events (SSE)
        proxy_buffering off;
        chunked_transfer_encoding off;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }

    # Serve uploaded images
    location /uploads/ {
        alias /var/www/herogram/uploads/;
        autoindex off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Step 13: Enable Nginx site
print_status "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/herogram /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if nginx -t; then
    print_status "Nginx configuration is valid"
    systemctl reload nginx
else
    print_error "Nginx configuration is invalid"
    exit 1
fi

# Step 14: Start application with PM2
print_status "Starting application with PM2..."
cd /var/www/herogram

# Stop existing process if running
pm2 stop herogram 2>/dev/null || true
pm2 delete herogram 2>/dev/null || true

# Start new process
pm2 start server.js --name "herogram"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

# Step 15: Configure firewall
print_status "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Step 16: Final status check
print_status "Checking deployment status..."

# Check PM2 status
if pm2 list | grep -q "herogram.*online"; then
    print_status "✅ Application is running with PM2"
else
    print_error "❌ Application failed to start with PM2"
    pm2 logs herogram --lines 10
fi

# Check Nginx status
if systemctl is-active --quiet nginx; then
    print_status "✅ Nginx is running"
else
    print_error "❌ Nginx is not running"
fi

# Check if port 3000 is listening
if netstat -tulpn | grep -q ":3000"; then
    print_status "✅ Application is listening on port 3000"
else
    print_error "❌ Application is not listening on port 3000"
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit your .env file with actual API keys:"
echo "   nano /var/www/herogram/.env"
echo ""
echo "2. Test your application:"
echo "   curl http://$SERVER_IP"
echo ""
echo "3. View application logs:"
echo "   pm2 logs herogram"
echo ""
echo "4. Monitor your application:"
echo "   pm2 monit"
echo ""
echo "🌐 Your application should be accessible at:"
echo "   http://$SERVER_IP"
echo ""
echo "📚 For more information, see deployment-guide.md"
echo ""
