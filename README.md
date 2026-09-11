# ThermalTrace
**AI-Powered Geospatial Thermal Intelligence**

ThermalTrace is a full-stack platform for detecting, classifying, analyzing, and monitoring industrial thermal anomalies across India using satellite telemetry (NASA FIRMS), machine learning (XGBoost), and AI intelligence.

---

## 🏗️ Production Architecture

```
React 18 + TypeScript + MapLibre GL JS (:5173)
                   │
                   ▼
Express / Node.js Primary Backend (:8080)
   ├── PostgreSQL / PostGIS (Database & Spatial Queries)
   ├── Redis 7 (Caching, FIRMS Locks, Rate Limiting)
   ├── NASA FIRMS 6-Hour Background Sync Scheduler
   └── Python ML Inference Service (:8001)
             │
             ▼
   thermalwatch_model.joblib (8-feature XGBoost)
```

---

## 🚀 Component Stack Overview

- **Frontend**: React 18, Vite, TypeScript, MapLibre GL JS (port 5173)
- **Primary Backend**: Node.js, Express, TypeScript (port 8080)
- **ML Service**: Python 3.11, FastAPI, XGBoost (`thermalwatch_model.joblib`) (port 8001)
- **Database**: PostgreSQL + PostGIS (Supabase / Remote PostGIS)
- **Cache & Locks**: Redis 7 (rate limiting, analytics cache, FIRMS distributed lock)
- **AI Intelligence**: Native Express multi-turn LLM Provider with PostgreSQL database tools

---

## 🐳 Running ThermalTrace with Docker Compose

### 1. Configure Environment
Create a root `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL`, `FIRMS_MAP_KEY`, and optional `GEMINI_API_KEY` / `OPENROUTER_API_KEY` are configured.

### 2. Build & Launch Stack
```bash
docker compose build
docker compose up -d
```

### 3. Service Endpoints
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Express Backend API**: [http://localhost:8080/api/v1](http://localhost:8080/api/v1)
- **Express Health Check**: [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- **Python ML Service Health**: [http://localhost:8001/health](http://localhost:8001/health)

---

## 💻 Running ThermalTrace Locally (Non-Docker)

### 1. Prerequisites
- Node.js 18+
- Python 3.11+
- Redis Server (`redis-server` running on `localhost:6379`)

### 2. Launch Services
```bash
# 1. Start Python ML Service (port 8001)
cd ml-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001

# 2. Start Express Backend (port 8080)
cd backend-node
npm install
npm run build && npm start

# 3. Start React Frontend (port 5173)
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing & Validation

### Express Backend Test Suite
```bash
cd backend-node
npm test
```

### Python ML Service Pytest Suite
```bash
cd ml-service
PYTHONPATH=. pytest
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run build
```
