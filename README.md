# Hospital Assistant Robot — Monorepo

A unified project that combines a **Hospital Management System (HMS)** with a
multi-modal **assistant robot platform** featuring MQTT messaging, voice
interaction, face-verification, firmware control, and supporting web/mobile
applications.

This repository contains all components required to manage hospital workflows
and integrate them with a physical assistant robot for tasks such as
navigation, patient interaction, appointment workflows, and automated services.

---

## 📁 Repository Structure

```
hospital-assistant-robot/
│
├─ HMS/                 # Hospital Management System (Web App)
│  ├─ backend/          # Node.js + Express API
│  ├─ frontend/         # Patient / Doctor UI
│  └─ admin/            # Admin dashboard
│
├─ mobile-app/          # Mobile client (patients / staff)
├─ bot/                 # Robot control & behaviors
├─ firmware/            # Hardware / microcontroller code
├─ mqtt/                # MQTT broker / message utilities
├─ voice-agent/         # Voice interaction / speech agent
├─ face-verification/   # Face recognition / identity validation
└─ .vscode/             # Dev environment settings
```

---

## ✨ Core Features

### 🏥 Hospital Management System (HMS)
- Secure authentication for Users / Doctors / Admins
- Appointment scheduling & management
- Patient records & medical history
- Doctor–patient communication
- Admin dashboard & analytics
- MongoDB-based secure data storage

### 🤖 Assistant Robot Platform
- MQTT-based communication layer
- Robot control & navigation hooks
- Voice agent & command handling
- Optional face-verification workflows
- Firmware layer for hardware control

---

## 🧰 Tech Stack

**Backend**
- Node.js • Express.js
- MongoDB / Mongoose
- JWT Authentication

**Frontend**
- React.js (User / Doctor / Admin portals)

**Robot Platform**
- MQTT
- Firmware (microcontroller code)
- Voice / Face processing modules

---

## 🚀 Getting Started

### 1️⃣ Clone the repository

```bash
git clone <repo-url>
cd hospital-assistant-robot-main
```

---

## 🏥 Setup — HMS (Backend + Frontend)

### Install backend dependencies

```bash
cd HMS/backend
npm install
```

Create an `.env` file:

```
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<secure_random_secret>
PORT=5000
```

Start backend

```bash
npm start
```

---

### Install frontend (patient / doctor)

```bash
cd HMS/frontend
npm install
npm start
```

---

### Install admin dashboard

```bash
cd HMS/admin
npm install
npm start
```

---

## 🤖 Robot / MQTT / Voice Modules

Each module is self-contained with its own scripts:

| Module | Path | Notes |
|--------|------|-------|
| Robot Bot Logic | `/bot` | High-level behaviors & control |
| Firmware | `/firmware` | Upload to microcontroller |
| MQTT Services | `/mqtt` | Message routing utilities |
| Voice Agent | `/voice-agent` | Speech commands / interaction |
| Face Verification | `/face-verification` | Identity recognition workflows |

Open the module folder and check its `README.md` or scripts, then:

```bash
npm install
npm start
```

(or the equivalent command for that module)

---

## 🧑‍💻 Development Notes

- Modules are decoupled to allow independent development
- MQTT is the communication backbone between services
- HMS can operate standalone without the robot platform
- Robot modules can be deployed selectively depending on hardware setup

---

---

## 🙌 Contributions

Pull requests and extensions are welcome — especially around:

- robot navigation & behaviors
- mobile workflows
- hospital workflow automation

---

## 📩 Support

If you are setting up a specific module and need help,
feel free to ask with the module name and your environment details.

