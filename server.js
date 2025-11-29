const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const app = express();
const PORT = process.env.PORT || 8080;
const TTYD_PORT = 7681;

// Paths
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'challenge_data');
const DB_PATH = path.join(DATA_DIR, 'ciphertech.db');
const SQL_PATH = path.join(__dirname, 'setup_challenge.sql');
const TTYD_PATH = path.join(__dirname, 'ttyd');
const SQLITE_ZIP_PATH = path.join(__dirname, 'sqlite.zip');
const SQLITE_BIN_DIR = path.join(__dirname, 'sqlite_tools');
const SQLITE_BIN_PATH = path.join(SQLITE_BIN_DIR, 'sqlite3');

// Ensure Data Directory Exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// --- 1. Setup & Initialization ---

// A. Download ttyd if missing
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

// B. Download SQLite3 if missing (for the terminal user)
if (!fs.existsSync(SQLITE_BIN_PATH)) {
    console.log("Downloading SQLite3...");
    try {
        // Download Linux binary (Zip)
        execSync(`curl -L https://www.sqlite.org/2023/sqlite-tools-linux-x64-3440000.zip -o "${SQLITE_ZIP_PATH}"`);

        // Unzip
        const zip = new AdmZip(SQLITE_ZIP_PATH);
        zip.extractAllTo(__dirname, true);

        // Rename folder to predictable name (zip extracts to sqlite-tools-linux-x64-3440000)
        const entries = fs.readdirSync(__dirname);
        const extractedDir = entries.find(e => e.startsWith('sqlite-tools-linux'));

        if (extractedDir) {
            console.log(`Found extracted directory: ${extractedDir}`);
            if (fs.existsSync(SQLITE_BIN_DIR)) fs.rmSync(SQLITE_BIN_DIR, { recursive: true });
            fs.renameSync(path.join(__dirname, extractedDir), SQLITE_BIN_DIR);
        } else {
            console.error("Could not find extracted sqlite directory. Contents:", entries);
        }

        // Cleanup Zip
        fs.unlinkSync(SQLITE_ZIP_PATH);

        // Make executable
        if (fs.existsSync(SQLITE_BIN_PATH)) {
            execSync(`chmod +x "${SQLITE_BIN_PATH}"`);
            console.log(`SQLite3 installed at: ${SQLITE_BIN_PATH}`);
        } else {
            console.error(`SQLite3 binary not found at: ${SQLITE_BIN_PATH}`);
        }
    } catch (e) {
        console.error("Failed to setup SQLite3:", e.message);
    }
}

// C. Initialize DB if missing
if (!fs.existsSync(DB_PATH)) {
    console.log("Initializing Database...");
    if (fs.existsSync(SQL_PATH)) {
        try {
            // Use the downloaded sqlite3 if available, otherwise try system
            const sqliteCmd = fs.existsSync(SQLITE_BIN_PATH) ? `"${SQLITE_BIN_PATH}"` : 'sqlite3';
            console.log(`Using SQLite command: ${sqliteCmd}`);
            execSync(`${sqliteCmd} "${DB_PATH}" < "${SQL_PATH}"`);
            console.log("Database initialized.");
        } catch (e) {
            console.error("Failed to initialize database:", e.message);
            // Fallback: Create empty file so at least it exists
            fs.writeFileSync(DB_PATH, '');
        }
    } else {
        console.error("setup_challenge.sql not found!");
    }
}

// --- 2. Start ttyd (Terminal) ---

console.log("Starting ttyd...");
// Custom bash prompt
const bashInit = `
export PS1="\\[\\033[01;32m\\]ghost$ \\[\\033[00m\\]"
export PATH=$PATH:${SQLITE_BIN_DIR}
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
    // '-W', // Removed: Deprecated/Unknown option in newer ttyd versions
    '-t', 'fontSize=14',
    '-t', 'fontFamily="Menlo, Consolas, monospace"',
    '-t', 'theme={"background":"#0d1117", "foreground":"#c9d1d9", "cursor":"#00ff00"}',
    'bash', '--rcfile', '.bashrc'
], {
    cwd: DATA_DIR,
    env: { ...process.env, PATH: `${process.env.PATH}:${SQLITE_BIN_DIR}` } // Add sqlite to PATH
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
