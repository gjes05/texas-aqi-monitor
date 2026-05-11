# Texas AQI Monitor

A full-stack air quality monitoring application for 10 major Texas cities. Built with **FastAPI**, **React + Vite**, **ArcGIS JS SDK**, and **Google Gemini**.

## Features

- Live AQI data fetched from the [WAQI API](https://waqi.info) for Houston, Dallas, Austin, San Antonio, El Paso, Fort Worth, Lubbock, Midland, Beaumont, and Corpus Christi
- Interactive ArcGIS map with color-coded station markers (green → yellow → orange → red)
- AQI value labels rendered directly on each marker
- Clickable popups showing station name, AQI value, and health category
- AI-powered chat sidebar (Gemini 1.5 Flash) that answers natural language questions grounded in live data

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- API keys for [WAQI](https://aqicn.org/data-platform/token/), [Gemini](https://aistudio.google.com/apikey), and [ArcGIS](https://developers.arcgis.com/)

## Setup

### 1. Clone and configure keys

```bash
# Copy the example and fill in your keys
cp .env.example backend/.env
cp .env.example frontend/.env
```

Edit `backend/.env` — keep only these two lines:
```
WAQI_TOKEN=your_waqi_token
GEMINI_API_KEY=your_gemini_api_key
```

Edit `frontend/.env` — keep only this line:
```
VITE_ARCGIS_API_KEY=your_arcgis_api_key
```

> **Tip:** `WAQI_TOKEN=demo` works out of the box for testing, but is rate-limited.  
> ArcGIS keys need the **Basemaps** scope enabled in your developer dashboard.

### 2. Backend

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

The API is now available at `http://localhost:8000`.

- `GET  /api/aqi` — returns live AQI data for all 10 cities
- `POST /api/chat` — accepts `{ "question": "..." }`, returns `{ "answer": "..." }`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

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
│   ├── main.py          # FastAPI app (AQI + Chat endpoints)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── AQIMap.jsx       # ArcGIS map with markers and legend
│   │   │   └── ChatSidebar.jsx  # Gemini-powered chat UI
│   └── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```
