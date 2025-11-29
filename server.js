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
            // Try using sqlite3 to create the DB from SQL
            execSync(`sqlite3 "${DB_PATH}" < "${SQL_PATH}"`);
            console.log("Database initialized via sqlite3.");
        } catch (e) {
            console.error("Failed to initialize database via sqlite3:", e.message);
            console.log("Attempting to create empty DB file...");
            fs.writeFileSync(DB_PATH, '');
        }
    } else {
        console.error("setup_challenge.sql not found!");
    }
}

// --- 2. Start ttyd (Terminal) ---

console.log("Starting ttyd...");
// Custom bash prompt to be smaller: "ghost$ "
const bashInit = `
export PS1="\\[\\033[01;32m\\]ghost$ \\[\\033[00m\\]"
alias ls='ls --color=auto'
clear
echo "Connected to Secure Shell..."
echo "Type 'ls' to see files."
`;

// Write init script
const initScriptPath = path.join(DATA_DIR, '.bashrc');
fs.writeFileSync(initScriptPath, bashInit);

const ttyd = spawn(TTYD_PATH, [
    '-p', TTYD_PORT.toString(),
    '-W', // Writable
    '-t', 'fontSize=14', // Smaller font
    '-t', 'fontFamily="Menlo, Consolas, monospace"',
    '-t', 'theme={"background":"#0d1117", "foreground":"#c9d1d9", "cursor":"#00ff00"}',
    'bash', '--rcfile', '.bashrc'
], {
    cwd: DATA_DIR
});

ttyd.stdout.on('data', (data) => {
    console.log(`[ttyd] ${data}`);
});

ttyd.stderr.on('data', (data) => {
    console.error(`[ttyd] ${data}`);
});

// --- 3. Express Server Configuration ---

app.use('/terminal', createProxyMiddleware({
    target: `http://127.0.0.1:${TTYD_PORT}`,
    ws: true,
    changeOrigin: true,
    pathRewrite: { '^/terminal': '' },
    logLevel: 'error'
}));

app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Serving files from: ${PUBLIC_DIR}`);
    console.log(`Terminal workspace: ${DATA_DIR}`);
});
