#!/bin/bash

echo "Updating package lists..."
sudo apt update

# Check if Docker is installed
if ! command -v docker &>/dev/null; then
    echo "Docker is not installed. Please install Docker manually."
    echo "Installing Docker..."
    sudo apt install -y docker.io
    echo "Starting and enabling Docker service..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi

# Check if Nginx is installed
if ! dpkg -s nginx &>/dev/null; then
    echo "Nginx is not installed. Please install Nginx manually."
     
    echo "Installing Nginx..."
    sudo apt install -y nginx
fi


# Remove existing wallet-rpc directory if present
#if [ -d "wallet-rpc" ]; then
    #echo "Removing existing wallet-rpc directory..."
    #sudo rm -rf wallet-rpc
#fi



#chmod +x setup.sh 

#echo "Cloning your Node.js application repository..."
#git clone https://github.com/mdrijonhossainjibon/wallet-rpc.git
#cd wallet-rpc

echo "Stopping and removing existing Docker container..."
sudo docker stop wallet-rpc &>/dev/null
sudo docker rm wallet-rpc &>/dev/null

# Remove Nginx site configuration if present
echo "Removing existing Nginx site configuration..."
sudo rm -f /etc/nginx/sites-enabled/mdrijonhossainjibonyt.xyz
 
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
