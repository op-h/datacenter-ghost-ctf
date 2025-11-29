const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const TTYD_PORT = 7681;

// Paths
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'challenge_data');
const DB_PATH = path.join(DATA_DIR, 'ciphertech.db');
const SQL_PATH = path.join(__dirname, 'setup_challenge.sql');
const TTYD_PATH = path.join(__dirname, 'ttyd');

// Ensure Data Directory Exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// --- 1. Setup & Initialization ---

// Download ttyd if missing
if (!fs.existsSync(TTYD_PATH)) {
    console.log("Downloading ttyd...");
    try {
        execSync(`curl -L https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.x86_64 -o "${TTYD_PATH}"`);
        execSync(`chmod +x "${TTYD_PATH}"`);
        console.log("ttyd downloaded and made executable.");
    } catch (e) {
        console.error("Failed to download ttyd:", e.message);
    }
}

// Initialize DB if missing
if (!fs.existsSync(DB_PATH)) {
    console.log("Initializing Database...");
    if (fs.existsSync(SQL_PATH)) {
        try {
            // We use sqlite3 command line tool. Ensure it's installed.
            execSync(`sqlite3 "${DB_PATH}" < "${SQL_PATH}"`);
            console.log("Database initialized.");
        } catch (e) {
            console.error("Failed to initialize database (sqlite3 might be missing):", e.message);
        }
    } else {
        console.error("setup_challenge.sql not found!");
    }
}

// --- 2. Start ttyd (Terminal) ---

console.log("Starting ttyd...");
// We start ttyd in the DATA_DIR so the user only sees files in that folder (the .db file)
const ttyd = spawn(TTYD_PATH, [
    '-p', TTYD_PORT.toString(),
    '-W', // Writable
    '-t', 'fontSize=16',
    '-t', 'fontFamily="Share Tech Mono", monospace',
    '-t', 'theme={"background":"#0d1117", "foreground":"#00ff00", "cursor":"#00ff00"}',
    'bash'
], {
    cwd: DATA_DIR // <--- CRITICAL: Sets the working directory for the terminal session
});

ttyd.stdout.on('data', (data) => {
    console.log(`[ttyd] ${data}`);
});

ttyd.stderr.on('data', (data) => {
    console.error(`[ttyd] ${data}`);
});

ttyd.on('close', (code) => {
    console.log(`ttyd process exited with code ${code}`);
});

// --- 3. Express Server Configuration ---

// Proxy /terminal requests to ttyd
app.use('/terminal', createProxyMiddleware({
    target: `http://127.0.0.1:${TTYD_PORT}`,
    ws: true,
    changeOrigin: true,
    pathRewrite: { '^/terminal': '' },
    logLevel: 'error' // Reduce noise
}));

// Serve static files from 'public' folder
app.use(express.static(PUBLIC_DIR));

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Serving files from: ${PUBLIC_DIR}`);
    console.log(`Terminal workspace: ${DATA_DIR}`);
});
