#!/bin/bash

# 1. Install/Download ttyd if not present
if [ ! -f "./ttyd" ]; then
    echo "Downloading ttyd..."
    curl -L https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.x86_64 -o ttyd
    chmod +x ttyd
fi

# 2. Initialize Database if not present
if [ ! -f "ciphertech.db" ]; then
    echo "Initializing Database..."
    sqlite3 ciphertech.db < setup_challenge.sql
fi

# 3. Generate Nginx Config for Replit (Non-root)
# Replit doesn't let us write to /etc/nginx, so we make a local config
echo "Generating Nginx Config..."
cat > nginx_replit.conf <<EOF
worker_processes 1;
daemon off;
pid $(pwd)/nginx.pid;
error_log /dev/stderr;

events {
    worker_connections 1024;
}

http {
    access_log /dev/stdout;
    include /nix/store/*-nginx-*/conf/mime.types; # Try to include standard mime types if possible, or fallback
    default_type application/octet-stream;
    
    # Minimal mime types if the above fails
    types {
        text/html html htm shtml;
        text/css css;
        text/xml xml;
        image/gif gif;
        image/jpeg jpeg jpg;
        application/javascript js;
        application/atom+xml atom;
        application/rss+xml rss;
    }

    server {
        listen 8080;
        server_name localhost;
        root $(pwd);
        index index.html;

        location / {
            try_files \$uri \$uri/ =404;
        }

        location /terminal {
            proxy_pass http://127.0.0.1:7681;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
        }
    }
}
EOF

# 4. Start ttyd in background
echo "Starting Terminal (ttyd)..."
./ttyd -p 7681 -b /terminal -W -t fontSize=16 -t theme='{"background":"#0d1117"}' bash &

# 5. Start Nginx in foreground
echo "Starting Nginx..."
nginx -c $(pwd)/nginx_replit.conf
