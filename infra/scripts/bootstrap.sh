#!/bin/bash
set -e

echo "========================================="
echo "⚙️ Bootstrapping Unggul Axiom Hub VPS..."
echo "========================================="

# 1. Update OS package cache
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install essential packages
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release nginx certbot python3-certbot-nginx awscli unzip

# 3. Install Docker Engine if not installed
if ! [ -x "$(command -v docker)" ]; then
  echo "🐳 Installing Docker..."
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.download.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg || \
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  
  # Allow non-root docker execution (optional, standard for deployment users)
  sudo usermod -aG docker $USER
fi

# 4. Set up directory structures
echo "📂 Creating application directories..."
sudo mkdir -p /var/www/html
sudo mkdir -p /home/ubuntu/unggul-axiom-hub/infra/postgres

# Set permissions
sudo chown -R ubuntu:ubuntu /home/ubuntu/unggul-axiom-hub

echo "✅ VPS Bootstrapped Successfully!"
echo "👉 Next steps:"
echo "1. Configure your domain DNS A Record to point to this Static IP."
echo "2. Run Certbot to generate your SSL certificate: sudo certbot --nginx -d hub.unggulaxiom.com"
echo "3. Run your GitHub Actions pipeline to perform the first deployment."
