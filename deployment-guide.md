# DigitalOcean Deployment Guide for AI Painting Generator

## Prerequisites
- DigitalOcean account
- Domain name (optional but recommended)
- OpenAI API key
- OpenRouter API key

## Step 1: Create a DigitalOcean Droplet

1. Log into DigitalOcean
2. Click "Create" → "Droplets"
3. Choose:
   - **Distribution**: Ubuntu 22.04 LTS
   - **Plan**: Basic (1GB RAM, 1 vCPU, 25GB SSD)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH Key (recommended) or Password
4. Click "Create Droplet"

## Step 2: Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

## Step 3: Update System and Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git

# Verify installations
node --version
npm --version
pm2 --version
nginx -v
```

## Step 4: Clone Your Repository

```bash
# Create directory
mkdir -p /var/www
cd /var/www

# Clone your repository
git clone https://github.com/Aswinraj69/herogram.git
cd herogram

# Install dependencies
npm install
```

## Step 5: Create Environment Configuration

```bash
# Create .env file
nano .env
```

Add the following content (replace with your actual values):

```env
# AI API Keys
OPENAI_API_KEY=your_openai_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Server Configuration
PORT=3000
SERVER_IP=your_droplet_ip_or_domain

# Database Configuration (SQLite by default)
# Leave these empty to use SQLite
# DB_HOST=
# DB_USER=
# DB_PASSWORD=
# DB_NAME=

# JWT Secret (generate a random string)
JWT_SECRET=your_jwt_secret_here
```

## Step 6: Create Uploads Directory

```bash
# Create uploads directory
mkdir -p /var/www/herogram/uploads

# Set proper permissions
chown -R root:root /var/www/herogram
chmod -R 755 /var/www/herogram
```

## Step 7: Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/herogram
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;

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
```

Enable the site:

```bash
# Enable the site
ln -s /etc/nginx/sites-available/herogram /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

## Step 8: Start Application with PM2

```bash
# Navigate to project directory
cd /var/www/herogram

# Start the application
pm2 start server.js --name "herogram"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

# Check status
pm2 status
pm2 logs herogram
```

## Step 9: Configure Firewall

```bash
# Allow SSH
ufw allow OpenSSH

# Allow HTTP and HTTPS
ufw allow 'Nginx Full'

# Enable firewall
ufw enable

# Check status
ufw status
```

## Step 10: Setup HTTPS (Optional but Recommended)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d your-domain.com --redirect -m your-email@example.com --agree-tos --no-eff-email

# Test auto-renewal
certbot renew --dry-run
```

## Step 11: Test Your Deployment

1. **Check PM2 status:**
   ```bash
   pm2 status
   pm2 logs herogram
   ```

2. **Check Nginx status:**
   ```bash
   systemctl status nginx
   ```

3. **Test the application:**
   ```bash
   curl http://localhost:3000
   curl http://your-domain-or-ip
   ```

## Step 12: Monitoring and Maintenance

### View Logs
```bash
# Application logs
pm2 logs herogram

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx
```

### Restart Services
```bash
# Restart application
pm2 restart herogram

# Reload Nginx
systemctl reload nginx

# Restart everything
pm2 restart herogram && systemctl reload nginx
```

### Update Application
```bash
cd /var/www/herogram
git pull origin main
npm install
pm2 restart herogram
```

## Troubleshooting

### Common Issues

1. **PM2 not found:**
   ```bash
   npm install -g pm2
   ```

2. **Permission denied:**
   ```bash
   chown -R root:root /var/www/herogram
   chmod -R 755 /var/www/herogram
   ```

3. **Port already in use:**
   ```bash
   netstat -tulpn | grep :3000
   kill -9 <PID>
   ```

4. **Database issues:**
   ```bash
   # Check if SQLite file exists
   ls -la /var/www/herogram/painting_generator.db
   
   # Check permissions
   chmod 666 /var/www/herogram/painting_generator.db
   ```

5. **Uploads not working:**
   ```bash
   # Create uploads directory
   mkdir -p /var/www/herogram/uploads
   chmod 755 /var/www/herogram/uploads
   ```

### Performance Monitoring

```bash
# Monitor system resources
htop

# Monitor PM2 processes
pm2 monit

# Check disk usage
df -h

# Check memory usage
free -h
```

## Security Considerations

1. **Keep system updated:**
   ```bash
   apt update && apt upgrade -y
   ```

2. **Regular backups:**
   ```bash
   # Backup database
   cp /var/www/herogram/painting_generator.db /backup/
   
   # Backup uploads
   tar -czf /backup/uploads-$(date +%Y%m%d).tar.gz /var/www/herogram/uploads/
   ```

3. **Monitor logs for suspicious activity:**
   ```bash
   tail -f /var/log/auth.log
   ```

## Success!

Your AI Painting Generator should now be running at:
- **HTTP**: http://your-domain-or-ip
- **HTTPS**: https://your-domain.com (if configured)

The application will automatically:
- Start on system boot
- Restart if it crashes
- Handle multiple users
- Serve uploaded images
- Provide real-time updates via SSE
