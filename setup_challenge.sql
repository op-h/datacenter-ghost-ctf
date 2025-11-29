/*
 * ======================================================================================
 * 🛑  CONFIDENTIAL DATASOURCE  |  CIPHERTECH GLOBAL SECURITY  |  INCIDENT #CHIMERA-99
 * ======================================================================================
 * SYSTEM:       Forensic_DB_v2.4
 * CREATED BY:   Auto-Recovery System (ARS)
 * TIMESTAMP:    2023-11-14 14:00:00 UTC
 * DESCRIPTION:  Snapshot of critical systems following data exfiltration incident.
 * CONTAINS CLASSIFIED PERSONNEL AND NETWORK DATA.
 * ======================================================================================
 */

-- 1. DATABASE CONFIGURATION
-- --------------------------------------------------------------------------------------
PRAGMA foreign_keys = ON;   -- Enforce strict relational integrity
BEGIN TRANSACTION;          -- atomic commit for data consistency

-- 2. SYSTEM CLEANUP
-- --------------------------------------------------------------------------------------
DROP TABLE IF EXISTS chat_logs;
DROP TABLE IF EXISTS file_system;
DROP TABLE IF EXISTS email_metadata;
DROP TABLE IF EXISTS network_logs;
DROP TABLE IF EXISTS door_logs;
DROP TABLE IF EXISTS workstations;
DROP TABLE IF EXISTS access_cards;
DROP TABLE IF EXISTS witness_statements;
DROP TABLE IF EXISTS employees;

-- 3. SCHEMA DEFINITION
-- --------------------------------------------------------------------------------------

-- [TABLE] EMPLOYEES: Central HR directory
CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    clearance_level INTEGER DEFAULT 1, -- 1=Standard, 5=Omni/Top Secret
    hire_date DATE NOT NULL,
    status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Terminated', 'Suspended'))
);

-- [TABLE] ACCESS_CARDS: Physical security tokens
CREATE TABLE access_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    card_number TEXT NOT NULL UNIQUE,
    issue_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- [TABLE] WORKSTATIONS: Hardware inventory and assignment
CREATE TABLE workstations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname TEXT NOT NULL UNIQUE,
    ip_address TEXT NOT NULL UNIQUE,
    mac_address TEXT NOT NULL UNIQUE,
    assigned_employee_id INTEGER,
    location TEXT,
    os_version TEXT DEFAULT 'CipherOS v10.4',
    asset_tag TEXT,
    FOREIGN KEY(assigned_employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- [TABLE] DOOR_LOGS: Physical entry/exit telemetry
CREATE TABLE door_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_number TEXT NOT NULL,
    door_location TEXT NOT NULL,
    activity TEXT CHECK(activity IN ('ENTRY', 'EXIT')),
    access_result TEXT DEFAULT 'GRANTED', -- GRANTED or DENIED
    timestamp DATETIME NOT NULL
);

-- [TABLE] NETWORK_LOGS: Packet capture metadata
CREATE TABLE network_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_ip TEXT NOT NULL,
    destination_ip TEXT NOT NULL,
    src_port INTEGER,
    dst_port INTEGER,
    protocol TEXT,
    data_size_mb REAL,
    session_duration_sec INTEGER,
    timestamp DATETIME NOT NULL
);

-- [TABLE] CHAT_LOGS: Internal communication (Slack/Teams equivalent)
CREATE TABLE chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    platform TEXT DEFAULT 'CipherChat',
    timestamp DATETIME NOT NULL,
    FOREIGN KEY(sender_id) REFERENCES employees(id),
    FOREIGN KEY(receiver_id) REFERENCES employees(id)
);

-- [TABLE] FILE_SYSTEM: Server file metadata snapshot
CREATE TABLE file_system (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename_hidden TEXT NOT NULL, -- Base64 Encoded for security
    file_size_mb REAL,
    owner_group TEXT DEFAULT 'root',
    permissions TEXT DEFAULT '-rw-r-----',
    creation_time DATETIME NOT NULL,
    path TEXT NOT NULL
);

-- [TABLE] EMAIL_METADATA: SMTP headers
CREATE TABLE email_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_email TEXT NOT NULL,
    receiver_email TEXT NOT NULL,
    subject TEXT,
    timestamp DATETIME NOT NULL
);

-- [TABLE] WITNESS_STATEMENTS: HR Interview transcripts
CREATE TABLE witness_statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    witness_name TEXT NOT NULL,
    statement TEXT NOT NULL,
    interview_date DATE NOT NULL,
    interviewer TEXT DEFAULT 'HR_Director'
);

-- 4. INDEXING (OPTIMIZATION)
-- --------------------------------------------------------------------------------------
CREATE INDEX idx_door_time ON door_logs(timestamp);
CREATE INDEX idx_net_time ON network_logs(timestamp);
CREATE INDEX idx_chat_time ON chat_logs(timestamp);
CREATE INDEX idx_ip_src ON network_logs(source_ip);
CREATE INDEX idx_card_num ON access_cards(card_number);

-- 5. DATA INGESTION
-- --------------------------------------------------------------------------------------

-- >> Populating Employees
INSERT INTO employees (name, username, email, department, clearance_level, hire_date) VALUES 
('Alice Carter', 'acarter', 'acarter@ciphertech.com', 'Engineering', 3, '2020-03-15'),
('Bob Dawson', 'bdawson', 'bdawson@ciphertech.com', 'Sales', 2, '2019-06-10'),
('Charlie Evans', 'cevans', 'cevans@ciphertech.com', 'IT Support', 4, '2021-08-22'),
('Diana Foster', 'dfoster', 'dfoster@ciphertech.com', 'Research', 5, '2018-11-05'),
('Evan Wright', 'ewright', 'ewright@ciphertech.com', 'Intern', 1, '2023-09-01'),
('Frank Miller', 'fmiller', 'fmiller@ciphertech.com', 'Security', 4, '2015-02-14'),
('Grace Lee', 'glee', 'glee@ciphertech.com', 'Finance', 3, '2022-01-20'),
('Hank Pym', 'hpym', 'hpym@ciphertech.com', 'R&D', 5, '2016-05-30'),
('Ivy Chen', 'ichen', 'ichen@ciphertech.com', 'Legal', 3, '2019-12-12'),
('Jack Ryan', 'jryan', 'jryan@ciphertech.com', 'Analytics', 3, '2021-03-03'),
('Karen Page', 'kpage', 'kpage@ciphertech.com', 'HR', 2, '2017-07-07'),
('Leo Fitz', 'lfitz', 'lfitz@ciphertech.com', 'Engineering', 3, '2020-10-10');

-- >> Populating Access Badges
INSERT INTO access_cards (employee_id, card_number) VALUES 
(1, 'BADGE-1001'), (2, 'BADGE-1002'), (3, 'BADGE-1003'), 
(4, 'BADGE-1004'), (5, 'BADGE-1005'), (6, 'BADGE-1006'), 
(7, 'BADGE-1007'), (8, 'BADGE-1008'), (9, 'BADGE-1009'), 
(10, 'BADGE-1010'), (11, 'BADGE-1011');

-- >> Populating Workstations (Mixed Fleet)
INSERT INTO workstations (hostname, ip_address, mac_address, assigned_employee_id, location, asset_tag, os_version) VALUES
('WS-ENG-01', '192.168.10.101', 'AA:BB:CC:00:01:01', 1, 'Floor 2, Cube 4', 'CT-2023-001', 'CipherOS v11.0'),
('WS-SAL-02', '192.168.10.102', 'AA:BB:CC:00:02:02', 2, 'Floor 1, Cube 10', 'CT-2023-002', 'Windows 11 Pro'),
('WS-IT-03',   '192.168.10.103', 'AA:BB:CC:00:03:03', 3, 'Floor 2, Server Room', 'CT-SRV-003', 'CipherServer v2.0'),
('WS-RES-04', '192.168.10.104', 'AA:BB:CC:00:04:04', 4, 'Floor 2, Lab 1', 'CT-RD-004', 'CipherOS v11.0 (Dev Build)'), -- Target
('WS-INT-05', '192.168.10.105', 'AA:BB:CC:00:05:05', 5, 'Floor 1, Bullpen', 'CT-INT-005', 'Windows 10 Ent'),
('WS-SEC-06', '192.168.10.106', 'AA:BB:CC:00:06:06', 6, 'Floor 1, Guard Post', 'CT-SEC-006', 'SecureLinux v4.4'),
('WS-FIN-07', '192.168.10.107', 'AA:BB:CC:00:07:07', 7, 'Floor 3, Office 2', 'CT-FIN-007', 'Windows 11 Pro'),
('WS-RND-08', '192.168.10.108', 'AA:BB:CC:00:08:08', 8, 'Floor 2, Lab 2', 'CT-RD-008', 'CipherOS v10.4'),
('WS-LEG-09', '192.168.10.109', 'AA:BB:CC:00:09:09', 9, 'Floor 3, Office 5', 'CT-LEG-009', 'macOS Sonoma'),
('WS-HR-10',  '192.168.10.110', 'AA:BB:CC:00:10:10', 10, 'Floor 1, Office 1', 'CT-HR-010', 'Windows 11 Pro'),
('WS-ENG-11', '192.168.10.111', 'AA:BB:CC:00:11:11', 11, 'Floor 2, Cube 5', 'CT-ENG-011', 'Ubuntu 22.04 LTS');

-- >> Populating Door Logs (Morning Routine + Incident + Noise)
INSERT INTO door_logs (card_number, door_location, activity, timestamp, access_result) VALUES
-- Early birds
('BADGE-1006', 'Main Lobby', 'ENTRY', '2023-11-14 07:30:00', 'GRANTED'), -- Frank (Security)
('BADGE-1001', 'Main Lobby', 'ENTRY', '2023-11-14 08:00:00', 'GRANTED'), -- Alice
('BADGE-1004', 'Main Lobby', 'ENTRY', '2023-11-14 08:15:00', 'GRANTED'), -- Diana
('BADGE-1008', 'Main Lobby', 'ENTRY', '2023-11-14 08:20:00', 'GRANTED'), -- Hank
('BADGE-1011', 'Main Lobby', 'ENTRY', '2023-11-14 08:25:00', 'GRANTED'), -- Leo
-- Regular crowd
('BADGE-1002', 'Main Lobby', 'ENTRY', '2023-11-14 08:45:00', 'GRANTED'), -- Bob (Culprit)
('BADGE-1003', 'Main Lobby', 'ENTRY', '2023-11-14 09:00:00', 'GRANTED'), -- Charlie
('BADGE-1007', 'Main Lobby', 'ENTRY', '2023-11-14 09:05:00', 'GRANTED'), -- Grace
-- The Incident Timeline
('BADGE-1004', 'Floor 2 Lab', 'EXIT',  '2023-11-14 09:50:00', 'GRANTED'), -- Diana leaves desk
('BADGE-1001', 'Floor 2 Lab', 'ENTRY', '2023-11-14 09:52:00', 'GRANTED'), -- Alice checks lab
('BADGE-1004', 'Main Lobby',  'EXIT',  '2023-11-14 09:55:00', 'GRANTED'), -- Diana goes for coffee
('BADGE-1001', 'Floor 2 Lab', 'EXIT',  '2023-11-14 09:56:00', 'GRANTED'), -- Alice leaves
('BADGE-1002', 'Floor 2 Lab', 'ENTRY', '2023-11-14 09:58:00', 'GRANTED'), -- Bob enters Lab (Unauthorized area?)
('BADGE-1006', 'Floor 1 Guard', 'ENTRY', '2023-11-14 10:00:00', 'GRANTED'), -- Frank doing rounds
('BADGE-1002', 'Floor 2 Lab', 'EXIT',  '2023-11-14 10:18:00', 'GRANTED'), -- Bob leaves after hack
('BADGE-1002', 'Main Lobby',  'EXIT',  '2023-11-14 10:22:00', 'GRANTED'), -- Bob flees building
('BADGE-1004', 'Main Lobby',  'ENTRY', '2023-11-14 10:30:00', 'GRANTED'), -- Diana returns
('BADGE-1011', 'Floor 2 Lab', 'ENTRY', '2023-11-14 10:32:00', 'GRANTED'),
-- Noise/Context
('BADGE-1005', 'Main Lobby', 'ENTRY', '2023-11-14 10:45:00', 'GRANTED'), -- Evan (Intern) late
('BADGE-1009', 'Main Lobby', 'ENTRY', '2023-11-14 10:50:00', 'GRANTED'); -- Ivy

-- >> Populating Network Logs (Traffic Analysis)
INSERT INTO network_logs (source_ip, destination_ip, src_port, dst_port, protocol, data_size_mb, session_duration_sec, timestamp) VALUES
('192.168.10.101', '172.217.0.0', 54322, 443, 'HTTPS', 1.2, 45, '2023-11-14 09:30:00'),
('192.168.10.106', '10.0.0.5', 44211, 22, 'SSH', 0.1, 120, '2023-11-14 09:45:00'),
-- Red Herring: Cloud Backup
('192.168.10.103', '10.200.200.55', 33012, 873, 'TCP', 5000.0, 600, '2023-11-14 10:14:00'),
-- The Incident: FTP Exfiltration
('192.168.10.104', '198.51.100.88', 49152, 21, 'FTP', 2500.0, 300, '2023-11-14 10:15:00'), 
('192.168.10.107', '8.8.4.4', 51122, 53, 'DNS', 0.01, 1, '2023-11-14 10:16:00'),
('192.168.10.102', '204.79.197.200', 52110, 443, 'HTTPS', 15.0, 200, '2023-11-14 10:30:00'); -- Sales team browsing

-- >> Populating Chat Logs (Social Engineering & Noise)
INSERT INTO chat_logs (sender_id, receiver_id, message, timestamp) VALUES
-- Background Noise
(1, 3, 'Charlie, printer on floor 2 is jamming again.', '2023-11-10 08:45:00'),
(3, 1, 'Did you try turning it off and on again?', '2023-11-10 08:46:00'),
-- Motive Setup
(2, 7, 'Hey Grace, any update on my commission check? I really need it.', '2023-11-10 09:15:00'),
(7, 2, 'Bob, you know the policy. End of month.', '2023-11-10 09:20:00'),
(2, 7, 'I cannot wait that long. seriously.', '2023-11-10 09:21:00'),
-- Victim Coordination
(4, 1, 'Project Chimera is finally stable. Uploading to secure server today.', '2023-11-14 08:00:00'),
-- Social Engineering
(2, 4, 'Hey Di, you taking an early lunch today?', '2023-11-14 09:30:00'),
(4, 2, 'Yeah, heading out around 9:50 to grab coffee. Why?', '2023-11-14 09:32:00'),
(2, 4, 'Just wondering. Might stop by to ask about the specs for a client.', '2023-11-14 09:33:00'),
-- Smoking Gun
(2, 2, 'Draft: Remember to wipe logs after transfer.', '2023-11-14 10:00:00');

-- >> Populating File System (Evidence)
INSERT INTO file_system (filename_hidden, file_size_mb, creation_time, path) VALUES
('U3lzdGVtX0xvZ3NfMjAyMw==', 0.5, '2023-11-01 00:00:00', '/var/log/syslog'), -- System_Logs_2023
('U2FsYXJ5X1JlcG9ydF8yMDIzLnBkZg==', 5.2, '2023-11-14 08:00:00', '/srv/hr/public'), -- Salary_Report
('UHJvamVjdF9DaGltZXJhX1NwZWNzLnppcA==', 2500.0, '2023-11-14 10:10:00', '/srv/research/lab1/restricted'); -- Chimera_Specs

-- >> Populating Emails
INSERT INTO email_metadata (sender_email, receiver_email, subject, timestamp) VALUES
('kpage@ciphertech.com', 'all@ciphertech.com', 'REMINDER: Open Enrollment ends Friday', '2023-11-10 09:00:00'),
('acarter@ciphertech.com', 'dfoster@ciphertech.com', 'Where are you?', '2023-11-14 09:53:00'),
('bdawson@ciphertech.com', 'unknown@darkweb.net', 'Package delivery schedule', '2023-11-13 22:00:00'),
('bdawson@ciphertech.com', 'dfoster@ciphertech.com', 'Meeting reschedule', '2023-11-14 08:30:00'),
('sysadmin@ciphertech.com', 'all@ciphertech.com', 'Scheduled Server Backups at 10:14 AM', '2023-11-13 09:00:00');

-- >> Populating Witness Statements
INSERT INTO witness_statements (witness_name, statement, interview_date) VALUES
('Evan Wright', 'I saw Alice leaving the lab just before 10, looking confused.', '2023-11-15'),
('Alice Carter', 'I went to check with Diana about the specs, but she wasn''t there. I left immediately.', '2023-11-15'),
('Frank Miller', 'Reviewed footage. A tall male in a hoodie entered the lab around 10. Hard to ID.', '2023-11-15'),
('Karen Page', 'Bob from Sales has been asking weird questions about the R&D bonus structure.', '2023-11-16');

-- 6. COMMIT TRANSACTION
-- --------------------------------------------------------------------------------------
COMMIT;