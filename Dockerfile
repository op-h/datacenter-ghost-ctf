FROM python:3.9-slim

# Install SQLite3, Nginx, Curl, and tools
RUN apt-get update && apt-get install -y \
    sqlite3 \
    nano \
    less \
    curl \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Download ttyd (Web Terminal)
RUN curl -L https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.x86_64 -o /usr/bin/ttyd \
    && chmod +x /usr/bin/ttyd

WORKDIR /investigation

# Copy files
COPY setup_challenge.sql .
COPY mission_briefing.md .
COPY blueprint.html .
COPY index.html .
COPY viewer.html .
COPY nginx.conf /etc/nginx/sites-available/default

# Initialize Database
RUN sqlite3 ciphertech.db < setup_challenge.sql
RUN rm setup_challenge.sql

# Expose the main web port
EXPOSE 8080

# Start ttyd (in background) and Nginx (in foreground)
# We map the terminal to the URL path '/terminal'
CMD ttyd -p 7681 -b /terminal -W -t fontSize=16 -t theme={'background':'#0d1117'} bash & \
    nginx -g 'daemon off;'
