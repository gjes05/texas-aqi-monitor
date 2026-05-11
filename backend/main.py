from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from datetime import date
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = FastAPI(title="Texas AQI Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WAQI_TOKEN = os.getenv("WAQI_TOKEN", "demo")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

TEXAS_CITIES = [
    "Houston", "Dallas", "Austin", "San Antonio", "El Paso",
    "Fort Worth", "Lubbock", "Midland", "Beaumont", "Corpus Christi",
]


def categorize_aqi(aqi: int) -> tuple[str, str]:
    if aqi <= 50:
        return "Good", "#00e400"
    elif aqi <= 100:
        return "Moderate", "#ffff00"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups", "#ff7e00"
    else:
        return "Unhealthy", "#ff0000"


@app.get("/api/aqi")
async def get_aqi():
    stations = []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            for city in TEXAS_CITIES:
                try:
                    resp = await client.get(
                        "https://api.waqi.info/feed/{}/".format(city),
                        params={"token": WAQI_TOKEN},
                    )
                    data = resp.json()
                    if data.get("status") != "ok":
                        continue
                    d = data["data"]
                    aqi_val = d.get("aqi")
                    if not isinstance(aqi_val, (int, float)) or aqi_val < 0:
                        continue
                    aqi_val = int(aqi_val)
                    geo = d.get("city", {}).get("geo", [None, None])
                    if None in geo or len(geo) < 2:
                        continue
                    category, color = categorize_aqi(aqi_val)
                    stations.append({
                        "name": city,
                        "uid": str(d.get("idx", "")),
                        "aqi": aqi_val,
                        "lat": float(geo[0]),
                        "lon": float(geo[1]),
                        "category": category,
                        "color": color,
                    })
                except Exception as exc:
                    print(f"[WARN] {city}: {exc}")
    except httpx.TimeoutException:
        print("[ERROR] WAQI API timed out")
    except httpx.RequestError as exc:
        print(f"[ERROR] WAQI request failed: {exc}")
    return stations


class ChatRequest(BaseModel):
    question: str


@app.post("/api/chat")
async def chat(request: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")

    stations = await get_aqi()
    context_lines = "\n".join(
        f"- {s['name']}: AQI {s['aqi']} ({s['category']})" for s in stations
    ) or "No AQI data available at this time."

    prompt = f"""You are an air quality expert assistant for Texas.

Current real-time AQI data for major Texas cities:
{context_lines}

AQI scale:
- Good (0-50): Air quality is satisfactory, minimal health risk
- Moderate (51-100): Acceptable; some pollutants may affect sensitive individuals
- Unhealthy for Sensitive Groups (101-150): Children, elderly, and people with respiratory conditions may experience health effects
- Unhealthy (151+): Everyone may begin to experience health effects

Answer the following question in 2-4 sentences using the data above:
{request.question}"""

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as exc:
        print(f"[ERROR] Gemini failed: {exc}")
        raise HTTPException(status_code=503, detail="AI service unavailable")


@app.get("/api/history/{station_uid}")
async def get_history(station_uid: str):
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"https://api.waqi.info/feed/@{station_uid}/",
                params={"token": WAQI_TOKEN},
            )
            data = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=503, detail="WAQI API timed out")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"WAQI request failed: {exc}")

    if data.get("status") != "ok":
        raise HTTPException(status_code=404, detail=f"Station @{station_uid} not found")

    d = data["data"]
    forecast_daily = d.get("forecast", {}).get("daily", {})
    today = date.today().isoformat()

    # Collect per-day AQI values for each pollutant in the forecast window
    days: dict[str, dict[str, float]] = {}
    for pollutant, readings in forecast_daily.items():
        for r in readings:
            day_str = r.get("day")
            avg = r.get("avg")
            if day_str and avg is not None:
                days.setdefault(day_str, {})[pollutant] = float(avg)

    # Keep only past days (≤ today), sort chronologically, take most recent 7
    past = [(d_str, pols) for d_str, pols in sorted(days.items()) if d_str <= today]
    window = past[-7:]

    trend = []
    for day_str, pollutants in window:
        dominant = max(pollutants, key=pollutants.get) if pollutants else None
        aqi_val = round(pollutants[dominant]) if dominant else None
        trend.append({
            "date": day_str,
            "aqi": aqi_val,
            "dominant_pollutant": dominant,
        })

    return {
        "station_uid": station_uid,
        "trend": trend,
        "current_aqi": d.get("aqi"),
        "dominant_pollutant": d.get("dominentpol"),
    }
