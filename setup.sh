#!/bin/bash

set -e

# Step 1: Update package list
echo "Updating package list..."
sudo apt-get update -y

# Step 2: Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker not found. Installing Docker..."
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    newgrp docker
else
    echo "Docker is already installed."
fi

# Step 3: Check if Nginx is installed
if ! command -v nginx &> /dev/null
then
    echo "Nginx not found. Installing Nginx..."
    sudo apt-get install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
else
    echo "Nginx is already installed."
fi

# Step 4: Pull and run MongoDB Docker image with authentication
echo "Running MongoDB Docker container with authentication..."
sudo docker pull mongo
sudo docker run -d \
    --name mongodb \
    -e MONGO_INITDB_ROOT_USERNAME=root \
    -e MONGO_INITDB_ROOT_PASSWORD=123456 \
    -p 27017:27017 \
    mongo

# Step 5: Check if Postfix is installed and send a test mail
if ! command -v postfix &> /dev/null
then
    echo "Postfix not found. Installing Postfix..."
    sudo debconf-set-selections <<< "postfix postfix/mailname string your.hostname.com"
    sudo debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Internet Site'"
    sudo apt-get install -y postfix mailutils
    sudo systemctl start postfix
    sudo systemctl enable postfix
else
    echo "Postfix is already installed."
fi

# Step 6: Obtain SSL certificate for Nginx
echo "Installing Certbot for SSL..."
sudo apt-get install -y certbot python3-certbot-nginx

echo "Obtaining SSL certificate..."
sudo certbot --nginx -d mdrijonhossainjibonyt.xyz

# Step 7: Configure Nginx for Node.js app with SSL
echo "Configuring Nginx to serve Node.js app with SSL..."

# Remove default Nginx configuration
sudo rm /etc/nginx/sites-enabled/default


cat <<EOF | sudo tee /etc/nginx/sites-available/mdrijonhossainjibonyt.xyz
server {
    listen 80;
    server_name mdrijonhossainjibonyt.xyz;

    # Redirect all HTTP requests to HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name mdrijonhossainjibonyt.xyz;

    ssl_certificate /etc/letsencrypt/live/mdrijonhossainjibonyt.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mdrijonhossainjibonyt.xyz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the Nginx configuration
echo "Enabling Nginx configuration..."
sudo ln -s /etc/nginx/sites-available/mdrijonhossainjibonyt.xyz /etc/nginx/sites-enabled/


# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Nginx has been configured to serve your Node.js app with SSL."

# Step 8: Build Docker image for Node.js app
echo "Building Docker image..."
cat <<EOF > Dockerfile
FROM node:alpine

WORKDIR /app

COPY . .

RUN yarn install && yarn convert

EXPOSE 3000

CMD ["yarn", "server"]
EOF

sudo docker build -t wallet-rpc .

# Step 9: Run Docker container for Node.js app
echo "Running Docker container for Node.js app..."
sudo docker run -d --name nodeapp -p 3000:3000 wallet-rpc

echo "Setup complete."
