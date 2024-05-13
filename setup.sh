#!/bin/bash

echo "Updating package lists..."
sudo apt update

echo "Installing Docker..."
sudo apt install -y docker.io

echo "Starting and enabling Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

echo "Installing Nginx..."
sudo apt install -y nginx

echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "Cloning your Node.js application repository..."
git clone https://github.com/mdrijonhossainjibon/wallet-rpc.git
cd wallet-rpc

 
echo "Building Docker image..."
cat <<EOF > Dockerfile
FROM node:14

WORKDIR /app

COPY . .

RUN yarn install && yarn convert

EXPOSE 3000

CMD ["yarn", "server"]
EOF

sudo docker build -t wallet-rpc .

echo "Running Docker container..."
sudo docker run -d --name wallet-rpc -p 3000:3000 wallet-rpc

echo "Configuring Nginx to serve your Node.js app..."
sudo rm /etc/nginx/sites-enabled/default

cat <<EOF | sudo tee /etc/nginx/sites-available/mdrijonhossainjibonyt.xyz
server {
    listen 80;
    server_name  mdrijonhossainjibonyt.xyz;

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

echo "Enabling the site configuration..."
sudo ln -s /etc/nginx/sites-available/mdrijonhossainjibonyt.xyz /etc/nginx/sites-enabled/

echo "Testing Nginx configuration..."
sudo nginx -t

echo "Reloading Nginx to apply changes..."
sudo systemctl reload nginx
sudo systemctl restart nginx

echo "Setup complete!"
