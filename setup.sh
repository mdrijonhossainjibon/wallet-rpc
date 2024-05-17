#!/bin/bash

# Function to update progress bar
update_progress() {
    local progress=$1
    local total=$2
    local width=50
    local percent=$((progress * 100 / total))
    local done=$((width * progress / total))
    local left=$((width - done))
    printf "\rProgress: [%-${width}s] %d%%" "$(printf "%0.s#" $(seq 1 $done))" "$percent"
}

total_steps=15
current_step=0

# Step 1: Update package lists
echo "Updating package lists..."
sudo apt update
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 2: Check if Docker is installed
if ! command -v docker &>/dev/null; then
    echo "Docker is not installed. Please install Docker manually."
    echo "Installing Docker..."
    sudo apt install -y docker.io
    echo "Starting and enabling Docker service..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 3: Check if Nginx is installed
if ! dpkg -s nginx &>/dev/null; then
    echo "Nginx is not installed. Please install Nginx manually."
    echo "Installing Nginx..."
    sudo apt install -y nginx
fi
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 4: Uninstall existing MongoDB if installed
if dpkg -s mongodb &>/dev/null || dpkg -s mongodb-org &>/dev/null; then
    echo "MongoDB is installed. Uninstalling MongoDB..."
    sudo systemctl stop mongod
    sudo apt-get purge -y mongodb mongodb-org
    sudo apt-get autoremove -y
    sudo rm -r /var/log/mongodb
    sudo rm -r /var/lib/mongodb
fi
current_step=$((current_step + 1))
update_progress $current_step $total_steps
# Step 5: Pull and run MongoDB Docker image
echo "Pulling MongoDB Docker image..."
sudo docker pull mongo

echo "Running MongoDB Docker container..."
sudo docker run -d --name mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD=123456 mongo
 

current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 6: Check if Postfix is installed
if ! dpkg -s postfix &>/dev/null; then
    echo "Postfix is not installed. Please install Postfix manually."
    echo "Installing Postfix..."
    sudo apt install -y postfix
fi
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 7: Configure Postfix as an SMTP server with authentication
echo "Configuring Postfix as an SMTP server with authentication..."
sudo postconf -e 'smtpd_sasl_type = dovecot'
sudo postconf -e 'smtpd_sasl_path = private/auth'
sudo postconf -e 'smtpd_sasl_auth_enable = yes'
sudo postconf -e 'smtpd_recipient_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination'
sudo postconf -e 'inet_interfaces = all'
sudo postconf -e 'inet_protocols = all'

sudo tee -a /etc/dovecot/conf.d/10-master.conf > /dev/null <<EOT
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
EOT

sudo tee -a /etc/dovecot/conf.d/10-auth.conf > /dev/null <<EOT
disable_plaintext_auth = yes
auth_mechanisms = plain login
EOT

sudo tee -a /etc/dovecot/conf.d/10-mail.conf > /dev/null <<EOT
mail_location = maildir:~/Maildir
EOT

sudo systemctl restart postfix
sudo systemctl restart dovecot
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 8: Stop and remove existing Docker container
echo "Stopping and removing existing Docker container..."
sudo docker stop wallet-rpc &>/dev/null
sudo docker rm wallet-rpc &>/dev/null
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 9: Remove existing Nginx site configuration
echo "Removing existing Nginx site configuration..."
sudo rm -f /etc/nginx/sites-enabled/mdrijonhossainjibonyt.xyz
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 10: Build Docker image
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
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 11: Run Docker container
echo "Running Docker container..."
sudo docker run -d --name wallet-rpc -p 3000:3000 wallet-rpc
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 12: Configure Nginx to serve your Node.js app with SSL
sudo apt install -y certbot python3-certbot-nginx
current_step=$((current_step + 1))
update_progress $current_step $total_steps

cat <<EOF | sudo tee /etc/nginx/sites-available/mdrijonhossainjibonyt.xyz
server {
    listen 80;
    server_name mdrijonhossainjibonyt.xyz;

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
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 13: Enable the site configuration
sudo ln -s /etc/nginx/sites-available/mdrijonhossainjibonyt.xyz /etc/nginx/sites-enabled/
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 14: Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t
current_step=$((current_step + 1))
update_progress $current_step $total_steps

# Step 15: Reload Nginx to apply changes and obtain SSL certificate
echo "Reloading Nginx to apply changes..."
sudo systemctl reload nginx
sudo certbot --nginx -d mdrijonhossainjibonyt.xyz --non-interactive --agree-tos --email your-email@example.com
current_step=$((current_step + 1))
update_progress $current_step $total_steps

echo -e "\nSetup complete!"
