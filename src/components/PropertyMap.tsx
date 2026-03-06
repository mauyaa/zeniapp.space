import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { logger } from '../lib/logger';
import type { Property } from '../utils/mockData';
import { isWithinKenya } from '../utils/geo';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const SelectedIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [32, 52],
  iconAnchor: [16, 52],
  popupAnchor: [1, -44],
  shadowSize: [52, 52],
});

const isValidCoordinate = (lat?: number, lng?: number) => {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return false;
  if (lat === 0 && lng === 0) return false;
  return true;
};

interface PropertyMapProps {
  properties: Property[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBoundsChange?: (payload: { center: [number, number]; radiusKm: number }) => void;
  center?: [number, number];
  zoom?: number;
}

const FLY_DURATION = 2.2;
const FLY_EASE = 0.2;

function MapController({
  center,
  zoom,
  skipInitialFly,
  fitBoundsWhenNoSelection,
  bounds,
}: {
  center: [number, number];
  zoom: number;
  skipInitialFly?: boolean;
  fitBoundsWhenNoSelection?: boolean;
  bounds?: L.LatLngBoundsLiteral | null;
}) {
  const map = useMap();
  const prevCenterRef = useRef<[number, number] | null>(null);
  const hasFlownRef = useRef(false);

  useEffect(() => {
    if (fitBoundsWhenNoSelection && bounds && Array.isArray(bounds) && bounds.length === 2) {
      try {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 });
      } catch (e) {
        // ignore
      }
      return;
    }
    if (!Array.isArray(center) || center.length !== 2 || !isValidCoordinate(center[0], center[1])) {
      return;
    }
    const doFly = () => {
      try {
        map.flyTo(center, zoom, {
          duration: FLY_DURATION,
          easeLinearity: FLY_EASE,
        });
      } catch (error) {
        logger.error('Map flyTo error', { error, center, zoom });
      }
    };
    if (skipInitialFly && !hasFlownRef.current) {
      hasFlownRef.current = true;
      prevCenterRef.current = center;
      return;
    }
    const prev = prevCenterRef.current;
    if (prev && prev[0] === center[0] && prev[1] === center[1]) return;
    prevCenterRef.current = center;
    doFly();
  }, [center, zoom, map, skipInitialFly, fitBoundsWhenNoSelection, bounds]);

  return null;
}

export function PropertyMap({
  properties,
  selectedId,
  onSelect,
  onBoundsChange,
  center,
  zoom,
}: PropertyMapProps) {
  const selectedProperty = properties.find((p) => p.id === selectedId);
  const hasValidSelectedLocation =
    selectedProperty &&
    isValidCoordinate(selectedProperty.location?.lat, selectedProperty.location?.lng);
  const hasOverrideCenter =
    Array.isArray(center) && center.length === 2 && isValidCoordinate(center[0], center[1]);

  const overrideCenter = hasOverrideCenter ? (center as [number, number]) : null;

  const resolvedCenter: [number, number] = overrideCenter
    ? overrideCenter
    : hasValidSelectedLocation &&
        selectedProperty?.location?.lat !== undefined &&
        selectedProperty?.location?.lng !== undefined
      ? [selectedProperty.location.lat, selectedProperty.location.lng]
      : [-1.2921, 36.8219];
  const resolvedZoom = overrideCenter ? (zoom ?? 13) : hasValidSelectedLocation ? 15 : 13;
  const skipInitialFly = !selectedId;
  const fitBoundsWhenNoSelection =
    !selectedId &&
    properties.filter((p) => isValidCoordinate(p.location?.lat, p.location?.lng)).length > 0;
  const bounds: L.LatLngBoundsLiteral | null =
    fitBoundsWhenNoSelection && properties.length > 0
      ? (() => {
          const valid = properties.filter((p) =>
            isValidCoordinate(p.location?.lat, p.location?.lng)
          );
          if (valid.length === 0) return null;
          const lats = valid.map((p) => p.location?.lat ?? 0);
          const lngs = valid.map((p) => p.location?.lng ?? 0);
          return [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ];
        })()
      : null;

  return (
    <div className="h-full w-full bg-[#F7F2EA] relative z-0 rounded-2xl overflow-hidden">
      <MapContainer
        center={resolvedCenter}
        zoom={resolvedZoom}
        style={{ height: '100%', width: '100%' }}
        preferCanvas={true}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
        <MapController
          center={resolvedCenter}
          zoom={resolvedZoom}
          skipInitialFly={skipInitialFly}
          fitBoundsWhenNoSelection={fitBoundsWhenNoSelection}
          bounds={bounds}
        />
        {onBoundsChange && <MapBoundsWatcher onBoundsChange={onBoundsChange} />}
        {properties
          .filter(
            (p) =>
              isValidCoordinate(p.location?.lat, p.location?.lng) &&
              isWithinKenya(p.location?.lat, p.location?.lng)
          )
          .map((property) => {
            const isSelected = selectedId === property.id;
            return (
              <Marker
                key={property.id}
                position={[property.location?.lat ?? 0, property.location?.lng ?? 0]}
                icon={isSelected ? SelectedIcon : DefaultIcon}
                eventHandlers={{
                  click: () => onSelect(property.id),
                }}
                opacity={selectedId && !isSelected ? 0.7 : 1}
                zIndexOffset={isSelected ? 1000 : 0}
              >
                <Popup>
                  <div className="p-1 min-w-[150px]">
                    <img
                      src={property.imageUrl}
                      alt={property.title}
                      className="w-full h-24 object-cover rounded-md mb-2"
                    />
                    <div className="font-semibold text-sm mb-1">
                      {property.currency} {property.price.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{property.title}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}

function MapBoundsWatcher({
  onBoundsChange,
}: {
  onBoundsChange: (payload: { center: [number, number]; radiusKm: number }) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const handler = () => {
      const b = map.getBounds();
      const center = b.getCenter();
      const radiusMeters = map.distance(center, b.getNorthEast());
      onBoundsChange({ center: [center.lat, center.lng], radiusKm: radiusMeters / 1000 });
    };
    map.on('moveend', handler);
    handler(); // initial
    return () => {
      map.off('moveend', handler);
    };
  }, [map, onBoundsChange]);
  return null;
}
