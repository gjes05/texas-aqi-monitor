import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, ResponsiveContainer,
} from 'recharts'
import './StationPopup.css'

const POLLUTANT_LABELS = {
  pm25: 'PM₂.₅', pm10: 'PM₁₀', o3: 'O₃',
  no2: 'NO₂', so2: 'SO₂', co: 'CO', uvi: 'UV Index',
}

function aqiColor(val) {
  if (val == null) return '#888888'
  if (val <= 50)  return '#00e400'
  if (val <= 100) return '#ffff00'
  if (val <= 150) return '#ff7e00'
  return '#ff0000'
}

function formatPollutant(key) {
  return POLLUTANT_LABELS[key] ?? key?.toUpperCase() ?? '—'
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-date">{d.date}</p>
      <p>AQI: <strong style={{ color: aqiColor(d.aqi) }}>{d.aqi ?? '—'}</strong></p>
      {d.dominant_pollutant && (
        <p>Dominant: <strong>{formatPollutant(d.dominant_pollutant)}</strong></p>
      )}
    </div>
  )
}

function AqiDot(props) {
  const { cx, cy, payload } = props
  if (payload.aqi == null || isNaN(cx) || isNaN(cy)) return null
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill={aqiColor(payload.aqi)}
      stroke="#0f172a"
      strokeWidth={1.5}
    />
  )
}

export default function StationPopup({ station, onClose }) {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!station?.uid) return
    setLoading(true)
    setError(null)
    setHistory(null)

    fetch(`/api/history/${station.uid}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => { setHistory(data); setLoading(false) })
      .catch(err => { setError(`Failed to load trend data: ${err.message}`); setLoading(false) })
  }, [station?.uid])

  const trend = history?.trend ?? []
  const yMax = Math.max(200, ...trend.map(d => d.aqi ?? 0)) + 40

  return (
    <div className="popup-backdrop" onClick={onClose}>
      <div className="popup-card" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="popup-header">
          <div>
            <h2 className="popup-city">{station.name}</h2>
            <p className="popup-meta">
              Current AQI:{' '}
              <span style={{ color: aqiColor(station.aqi), fontWeight: 700 }}>{station.aqi}</span>
              <span className="popup-sep">·</span>
              <span className="popup-category">{station.category}</span>
            </p>
          </div>
          <button className="popup-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Chart area */}
        <div className="popup-body">
          <p className="section-label">7-Day AQI Trend</p>

          {loading && (
            <div className="chart-state">
              <div className="popup-spinner" />
              Loading trend data…
            </div>
          )}

          {error && <div className="chart-state chart-error">{error}</div>}

          {!loading && !error && trend.length === 0 && (
            <div className="chart-state chart-error">
              No historical forecast data available for this station.
            </div>
          )}

          {!loading && !error && trend.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>

                {/* AQI category color bands */}
                <ReferenceArea y1={0}   y2={50}   fill="#00e400" fillOpacity={0.10} />
                <ReferenceArea y1={50}  y2={100}  fill="#ffff00" fillOpacity={0.10} />
                <ReferenceArea y1={100} y2={150}  fill="#ff7e00" fillOpacity={0.10} />
                <ReferenceArea y1={150} y2={yMax} fill="#ff0000" fillOpacity={0.10} />

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={v => v.slice(5)}
                  tickLine={false}
                  axisLine={{ stroke: '#1e293b' }}
                />
                <YAxis
                  domain={[0, yMax]}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />

                <Tooltip content={<CustomTooltip />} />

                <Line
                  type="monotone"
                  dataKey="aqi"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={<AqiDot />}
                  activeDot={{ r: 7, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Dominant pollutant footer */}
          {!loading && !error && history && (
            <div className="popup-footer">
              <span className="footer-label">Dominant pollutant today:</span>
              <strong className="footer-value">
                {formatPollutant(history.dominant_pollutant)}
              </strong>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
