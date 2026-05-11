import { useState, useEffect, useCallback } from 'react'
import AQIMap from './components/AQIMap'
import ChatSidebar from './components/ChatSidebar'
import StationPopup from './components/StationPopup'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL

export default function App() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMsg, setLoadingMsg] = useState('Loading AQI data…')
  const [error, setError] = useState(null)
  const [selectedStation, setSelectedStation] = useState(null)

  useEffect(() => {
    let cancelled = false
    const MAX_ATTEMPTS = 4
    const RETRY_DELAY_MS = 8000

    const attempt = async (n) => {
      try {
        const res = await fetch(`${API_BASE}/api/aqi`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        if (data.length === 0) {
          setError('Air quality data is currently unavailable — the WAQI service may be down. Please try again shortly.')
        } else {
          setStations(data)
        }
        setLoading(false)
      } catch {
        if (cancelled) return
        if (n < MAX_ATTEMPTS) {
          setLoadingMsg('Backend is starting up… please wait')
          setTimeout(() => { if (!cancelled) attempt(n + 1) }, RETRY_DELAY_MS)
        } else {
          setError('Could not reach the backend. Check that VITE_API_URL is set correctly.')
          setLoading(false)
        }
      }
    }

    attempt(1)
    return () => { cancelled = true }
  }, [])

  // useCallback keeps the reference stable so AQIMap's effect doesn't re-run
  const handleStationSelect = useCallback(attrs => setSelectedStation(attrs), [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Texas AQI Monitor</h1>
          <span className="header-subtitle">Real-time air quality data for major Texas cities</span>
        </div>
        <div className="header-badge">
          <span className="live-dot" />
          Live Data
        </div>
      </header>

      <div className="app-body">
        <div className="map-container">
          {loading && (
            <div className="overlay-message">
              <div className="spinner" />
              {loadingMsg}
            </div>
          )}
          {error && (
            <div className="overlay-message error">{error}</div>
          )}
          {!loading && !error && (
            <AQIMap stations={stations} onStationSelect={handleStationSelect} />
          )}
        </div>

        <ChatSidebar apiBase={API_BASE} />
      </div>

      {selectedStation && (
        <StationPopup
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
          apiBase={API_BASE}
        />
      )}
    </div>
  )
}
