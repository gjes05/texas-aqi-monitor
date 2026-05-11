import { useState, useEffect, useCallback } from 'react'
import AQIMap from './components/AQIMap'
import ChatSidebar from './components/ChatSidebar'
import StationPopup from './components/StationPopup'
import './App.css'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export default function App() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedStation, setSelectedStation] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/aqi`)
      .then(res => {
        if (!res.ok) throw new Error('API error')
        return res.json()
      })
      .then(data => {
        if (data.length === 0) {
          setError('Air quality data is currently unavailable — the WAQI service may be down. Please try again shortly.')
        } else {
          setStations(data)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not reach the backend. Make sure it is running on port 8000.')
        setLoading(false)
      })
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
              Loading AQI data&hellip;
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
