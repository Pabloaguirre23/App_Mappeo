import { useEffect, useRef } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { marker, markerClusterGroup, type Map as LeafletMap } from 'leaflet'
import 'leaflet.markercluster'
import type { Bounds } from '../lib/geo.ts'
import { clusterIcon, draftIcon, pinIcon } from '../lib/pins.ts'
import type { Location } from '../lib/types.ts'

export type MapFocus = {
  lat: number
  lng: number
  zoom: number
  token: number
}

type MapViewProps = {
  locations: Location[]
  selectedId: string | null
  placing: boolean
  dark: boolean
  draft: { lat: number; lng: number } | null
  focus: MapFocus | null
  onSelect: (location: Location) => void
  onPick: (lat: number, lng: number) => void
  onDismiss: () => void
  onBounds: (bounds: Bounds) => void
}

const PROVINCE_BOUNDS: [[number, number], [number, number]] = [
  [-41.05, -63.45],
  [-33.25, -56.65],
]

export function MapView({
  locations,
  selectedId,
  placing,
  dark,
  draft,
  focus,
  onSelect,
  onPick,
  onDismiss,
  onBounds,
}: MapViewProps) {
  return (
    <MapContainer
      bounds={PROVINCE_BOUNDS}
      boundsOptions={{ padding: [20, 20] }}
      minZoom={5}
      maxZoom={18}
      maxBounds={[
        [-42.4, -65.5],
        [-32.2, -55.4],
      ]}
      maxBoundsViscosity={0.6}
      zoomControl={false}
      className={dark ? 'map-dark h-full w-full' : 'h-full w-full'}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        subdomains="abc"
        maxZoom={19}
      />
      <MapTheme dark={dark} />
      <ZoomControl position="bottomleft" />
      <MapEvents placing={placing} onPick={onPick} onDismiss={onDismiss} onBounds={onBounds} />
      <FlyTo focus={focus} />
      <ClusteredMarkers
        locations={locations}
        selectedId={selectedId}
        placing={placing}
        onSelect={onSelect}
      />
      {draft ? (
        <Marker
          position={[draft.lat, draft.lng]}
          icon={draftIcon}
          interactive={false}
          keyboard={false}
        />
      ) : null}
    </MapContainer>
  )
}

function MapTheme({ dark }: { dark: boolean }) {
  const map = useMap()
  useEffect(() => {
    map.getContainer().classList.toggle('map-dark', dark)
  }, [map, dark])
  return null
}

function MapEvents({
  placing,
  onPick,
  onDismiss,
  onBounds,
}: {
  placing: boolean
  onPick: (lat: number, lng: number) => void
  onDismiss: () => void
  onBounds: (bounds: Bounds) => void
}) {
  const map = useMap()
  const onPickRef = useRef(onPick)
  const onDismissRef = useRef(onDismiss)
  const onBoundsRef = useRef(onBounds)
  useEffect(() => {
    onPickRef.current = onPick
    onDismissRef.current = onDismiss
    onBoundsRef.current = onBounds
  })

  useMapEvents({
    click(event) {
      if (placing) {
        onPickRef.current(event.latlng.lat, event.latlng.lng)
        return
      }
      const target = event.originalEvent.target
      if (target instanceof Element && target.closest('.leaflet-marker-icon, .leaflet-marker-shadow')) return
      onDismissRef.current()
    },
    moveend() {
      publishBounds(map, onBoundsRef.current)
    },
  })

  useEffect(() => {
    map.getContainer().style.cursor = placing ? 'crosshair' : ''
    if (placing) map.doubleClickZoom.disable()
    else map.doubleClickZoom.enable()
    publishBounds(map, onBoundsRef.current)
    return () => {
      map.getContainer().style.cursor = ''
      map.doubleClickZoom.enable()
    }
  }, [map, placing])

  return null
}

function publishBounds(map: LeafletMap, onBounds: (bounds: Bounds) => void) {
  const bounds = map.getBounds()
  onBounds({
    south: bounds.getSouth(),
    north: bounds.getNorth(),
    west: bounds.getWest(),
    east: bounds.getEast(),
  })
}

function FlyTo({ focus }: { focus: MapFocus | null }) {
  const map = useMap()
  useEffect(() => {
    if (!focus) return
    map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.9 })
  }, [focus, map])
  return null
}

function ClusteredMarkers({
  locations,
  selectedId,
  placing,
  onSelect,
}: {
  locations: Location[]
  selectedId: string | null
  placing: boolean
  onSelect: (location: Location) => void
}) {
  const map = useMap()
  useEffect(() => {
    const group = markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 46,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: !placing,
      iconCreateFunction(cluster) {
        return clusterIcon(cluster.getChildCount())
      },
    })

    for (const location of locations) {
      const point = marker([location.lat, location.lng], {
        icon: pinIcon(location.kind, location.id === selectedId),
        interactive: !placing,
        keyboard: !placing,
        bubblingMouseEvents: false,
        title: location.name,
      })
      point.on('click', () => onSelect(location))
      group.addLayer(point)
    }

    map.addLayer(group)
    return () => {
      group.clearLayers()
      map.removeLayer(group)
    }
  }, [map, locations, selectedId, placing, onSelect])

  return null
}
