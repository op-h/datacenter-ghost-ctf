# 📂 CASE FILE: #CHIMERA-99
**CLASSIFICATION:** TOP SECRET // EYES ONLY  
**DATE:** November 14, 2023  
**LOCATION:** CipherTech HQ  
**STATUS:** ACTIVE INVESTIGATION

---

## 🚨 THE INCIDENT
At **10:15 AM**, the Intrusion Detection System (IDS) at **CipherTech** flagged a critical anomaly. A massive data packet was exfiltrated from the internal network containing the blueprints for **"Project Chimera,"** our prototype quantum processor.

> **INTELLIGENCE REPORT:**
> The firewall logs indicate the file name was **obfuscated (encoded)**, suggesting a sophisticated insider attack. The attacker was **inside the building** and used a physical workstation to bypass the external firewall.

Your mission is to act as the **Lead Digital Forensics Investigator**. You must sift through the physical and digital noise to identify the traitor before they escape jurisdiction.

---

## 🗺️ TACTICAL MAP
We have recovered the digital blueprints for the facility. You will need this to correlate physical movement logs with the digital crime.

> **⚠️ ACTION REQUIRED** > Open **`blueprint.html`** in your browser immediately.  
> Use this map to trace suspect movements found in the `door_logs`. Pay close attention to **Restricted vs. Public** zones.

---

## 💾 THE EVIDENCE LOCKER
You have been granted `root` access to the central SQL database (`ciphertech.db`). It contains the following forensic datasets:

| Table Name | Description |
| :--- | :--- |
| **`employees`** | Staff directory (ID, Name, Role, Hire Date). |
| **`access_cards`** | Links employees to their physical badge IDs. |
| **`door_logs`** | Entry/Exit timestamps for all secure doors. |
| **`workstations`** | Inventory of computers, IPs, and assigned owners. |
| **`network_logs`** | Network traffic (Source, Dest, Protocol, Size). |
| **`chat_logs`** | **(NEW)** Internal messaging history (Slack/Teams). |
| **`file_system`** | **(NEW)** Metadata of files created/modified on servers. |
| **`email_metadata`** | Internal and external email headers. |
| **`witness_statements`** | HR interviews with potential witnesses. |

---

## 🎯 MISSION OBJECTIVES
To close this case and capture the flag, you must answer these five specific questions:

1.  **The Machine:** What is the `ip_address` of the computer used for the hack?
2.  **The Owner:** What is the `username` of the employee assigned to that machine?
3.  **The Culprit:** What is the `username` of the person who *actually* performed the hack?
4.  **The Escape:** What is the `id` of the door log where the culprit exited the building?
5.  **The Destination:** What is the `destination_ip` where the stolen data was sent?

---

## 🚩 SUBMISSION PROTOCOL (THE FLAG)
Construct the flag by concatenating your findings with underscores.

**Format:**
`CTF{MachineIP_OwnerUsername_CulpritUsername_EscapeLogID_DestIP}`

**Example:**
> If the IP was `10.0.0.5`, Owner was `alice`, Culprit was `bob`, Escape Log ID was `99`, and the destination was `1.1.1.1`:
>
> **Flag:** `CTF{10.0.0.5_alice_bob_99_1.1.1.1}`

*Trust no one. Verify everything.*
