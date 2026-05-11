# Texas AQI Monitor

**Live demo: [texas-aqi-monitor.vercel.app](https://texas-aqi-monitor.vercel.app)**
<img width="1919" height="906" alt="Screenshot 2026-05-11 001548" src="https://github.com/user-attachments/assets/022066c7-6425-478b-bb1c-5dfb359cf2bb" />

A full-stack air quality monitoring application for 10 major Texas cities.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, deployed on **Vercel** |
| Backend | FastAPI + Uvicorn, deployed on **Render** |
| Map | ArcGIS JS SDK 4.29 (CDN) |
| AI chat | Google Gemini 2.5 Flash |
| AQI data | WAQI (World Air Quality Index) API |
| Charts | Recharts |

## Screenshots

> Add screenshots to a `docs/screenshots/` folder and update the paths below.

| Map view | Station popup | AI chat |
|---|---|---|
| ![Map](docs/screenshots/map.png) | ![Popup](docs/screenshots/popup.png) | ![Chat](docs/screenshots/chat.png) |

## Features

- Live AQI data for Houston, Dallas, Austin, San Antonio, El Paso, Fort Worth, Lubbock, Midland, Beaumont, and Corpus Christi
- Interactive ArcGIS map with color-coded markers (green → yellow → orange → red) and AQI value labels
- Click any marker to open a 7-day trend chart with color-coded AQI bands and dominant pollutant info
- AI-powered chat sidebar (Gemini) that answers natural language questions grounded in live data

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- API keys for [WAQI](https://aqicn.org/data-platform/token/), [Gemini](https://aistudio.google.com/apikey), and [ArcGIS](https://developers.arcgis.com/)

## Local Development

### 1. Configure backend keys

```bash
cp .env.example backend/.env
```

Edit `backend/.env`:
```
WAQI_TOKEN=demo
GEMINI_API_KEY=your_gemini_api_key
```

> `WAQI_TOKEN=demo` works for testing but is rate-limited.
> ArcGIS keys need the **Basemaps** scope enabled.

### 2. Run the backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000`.

| Endpoint | Description |
|---|---|
| `GET /api/aqi` | Live AQI data for all 10 cities |
| `GET /api/history/{uid}` | 7-day forecast trend for a station |
| `POST /api/chat` | Gemini answer grounded in live AQI data |
| `GET /health` | Health check |

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to `localhost:8000` automatically — no environment variables needed.

## Deployment

### Backend → Render

1. Create a new **Web Service** pointed at the `backend/` directory
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables: `WAQI_TOKEN`, `GEMINI_API_KEY`
5. Set health check path to `/health`

### Frontend → Vercel

1. Create a new project pointed at the `frontend/` directory
2. No environment variables required — `vercel.json` proxies `/api/*` to the Render backend

## AQI Categories

| Category | AQI Range | Color |
|---|---|---|
| Good | 0–50 | Green |
| Moderate | 51–100 | Yellow |
| Unhealthy for Sensitive Groups | 101–150 | Orange |
| Unhealthy | 151+ | Red |

## Project Structure

```
texas-aqi-app/
├── backend/
│   ├── main.py              # FastAPI: /api/aqi, /api/chat, /api/history, /health
│   └── requirements.txt
├── frontend/
│   ├── vercel.json          # Proxies /api/* to Render backend
│   ├── vite.config.js       # Proxies /api/* to localhost:8000 in dev
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── AQIMap.jsx       # ArcGIS map, markers, legend, click handler
│           ├── ChatSidebar.jsx  # Gemini chat UI
│           └── StationPopup.jsx # 7-day trend chart (Recharts)
├── .env.example
├── .gitignore
└── README.md
```
