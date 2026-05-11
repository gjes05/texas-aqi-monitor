import { useState, useEffect, useRef } from 'react'
import './AQIMap.css'

const CATEGORY_COLORS = {
  'Good': '#00e400',
  'Moderate': '#ffff00',
  'Unhealthy for Sensitive Groups': '#ff7e00',
  'Unhealthy': '#ff0000',
}

const LEGEND_ITEMS = [
  { label: 'Good', range: '0–50', color: '#00e400' },
  { label: 'Moderate', range: '51–100', color: '#ffff00' },
  { label: 'Unhealthy for Sensitive Groups', range: '101–150', color: '#ff7e00' },
  { label: 'Unhealthy', range: '151+', color: '#ff0000' },
]

export default function AQIMap({ stations, onStationSelect }) {
  const mapRef = useRef(null)
  const viewRef = useRef(null)
  const [mapError, setMapError] = useState(null)

  // Keep a stable ref to the callback so the map effect doesn't re-run on every render
  const onSelectRef = useRef(onStationSelect)
  useEffect(() => { onSelectRef.current = onStationSelect })

  useEffect(() => {
    if (!stations.length || !mapRef.current) return

    let cancelled = false
    setMapError(null)

    window.require(
      [
        'esri/config',
        'esri/Map',
        'esri/views/MapView',
        'esri/layers/GraphicsLayer',
        'esri/Graphic',
        'esri/symbols/SimpleMarkerSymbol',
        'esri/symbols/TextSymbol',
        'esri/geometry/Point',
      ],
      (esriConfig, Map, MapView, GraphicsLayer, Graphic, SimpleMarkerSymbol, TextSymbol, Point) => {
        if (cancelled) return

        const arcgisKey = import.meta.env.VITE_ARCGIS_API_KEY
        if (arcgisKey) esriConfig.apiKey = arcgisKey

        const map = new Map({ basemap: 'streets-navigation-vector' })

        const view = new MapView({
          container: mapRef.current,
          map,
          center: [-99.5, 31.5],
          zoom: 6,
          ui: { components: ['zoom'] },
        })

        // We show our own React popup — disable the built-in one
        view.popup.autoOpenEnabled = false
        viewRef.current = view

        const markerLayer = new GraphicsLayer({ title: 'AQI Stations' })
        const labelLayer = new GraphicsLayer({ title: 'AQI Labels' })
        map.addMany([markerLayer, labelLayer])

        stations.forEach(station => {
          const color = CATEGORY_COLORS[station.category] ?? '#888888'
          const pt = new Point({ longitude: station.lon, latitude: station.lat })

          markerLayer.add(new Graphic({
            geometry: pt,
            symbol: new SimpleMarkerSymbol({
              color,
              size: 22,
              outline: { color: [20, 20, 30, 0.9], width: 1.5 },
            }),
            attributes: {
              name: station.name,
              uid: station.uid,
              aqi: station.aqi,
              category: station.category,
            },
          }))

          labelLayer.add(new Graphic({
            geometry: pt,
            symbol: new TextSymbol({
              text: String(station.aqi),
              color: station.category === 'Moderate' ? '#1a1a1a' : '#ffffff',
              font: { size: 9, weight: 'bold' },
              yoffset: -4,
            }),
          }))
        })

        // Show custom popup on marker click
        view.on('click', async event => {
          const { results } = await view.hitTest(event, { include: [markerLayer] })
          const hit = results[0]
          if (hit?.graphic) {
            onSelectRef.current(hit.graphic.attributes)
          }
        })

        // Pointer cursor when hovering a marker
        view.on('pointer-move', async event => {
          const { results } = await view.hitTest(event, { include: [markerLayer] })
          mapRef.current.style.cursor = results.length ? 'pointer' : 'default'
        })
      },
      err => {
        if (!cancelled) {
          console.error('[ArcGIS]', err)
          setMapError('Map failed to load. Check your internet connection and ArcGIS API key.')
        }
      }
    )

    return () => {
      cancelled = true
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [stations])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {mapError && (
        <div className="map-error-overlay">
          <span className="map-error-icon">⚠</span>
          {mapError}
        </div>
      )}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      <div className="aqi-legend">
        <p className="legend-title">Air Quality Index · click a marker</p>
        {LEGEND_ITEMS.map(({ label, range, color }) => (
          <div key={label} className="legend-row">
            <span className="legend-swatch" style={{ background: color }} />
            <span className="legend-label">{label}</span>
            <span className="legend-range">{range}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
