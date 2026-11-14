# Developer Guide — ProjectShelf

This guide explains how to run, develop, and test ProjectShelf locally.

---

## 1. Prerequisites
- **Java 21 LTS**
- **Node.js 24+**
- **Python 3.11+**
- **MySQL 8.4** (or portable MySQL located in `.tools/mysql`)

---

## 2. Local Startup Steps

### Step 1: Start MySQL Database
```powershell
.tools/mysql/bin/mysqld --no-defaults --basedir=.tools/mysql --datadir=.tools/mysql-data --port=3306 --bind-address=127.0.0.1 --mysqlx=OFF
```

### Step 2: Start Spring Boot Backend (Port 8080)
```powershell
cd backend
# Loads environment variables from ../.env and runs jar
java -jar target/backend-1.0.0.jar
```
*Note: The backend automatically bootstraps the admin account on first startup using `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.*

### Step 3: Start AI Microservice (Port 8000)
```powershell
cd ai-service
.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Step 4: Start Next.js Frontend (Port 3000)
```powershell
cd frontend
npm run dev
```

Visit **http://localhost:3000** in your web browser.

---

## 3. Running Automated Test Suites

### Backend Unit & Integration Tests:
```powershell
cd backend
..\.tools\maven\bin\mvn.cmd test
```

### AI Service Tests (FastAPI + Anthropic Mock):
```powershell
cd ai-service
.venv\Scripts\pytest -v tests/test_main.py
```

### Frontend Typechecking & Production Build:
```powershell
cd frontend
npm run build
```

