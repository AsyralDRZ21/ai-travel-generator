import { useEffect, useRef, useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px',
};

const defaultCenter = { lat: 3.139, lng: 101.6869 }; // KL fallback

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'on' }],
    },
  ],
};

// Custom numbered marker using SVG
const createNumberedMarkerIcon = (number) => ({
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="18" cy="18" r="16" fill="#163300" stroke="white" stroke-width="2.5"/>
      <text x="18" y="23" text-anchor="middle" fill="#9FE870" font-size="14" font-weight="800" font-family="Arial,sans-serif">${number}</text>
    </svg>
  `)}`,
  scaledSize: { width: 36, height: 36 },
  anchor: { x: 18, y: 18 },
});

export default function MapComponent({ markers = [] }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const mapRef = useRef(null);
  const [selectedMarker, setSelectedMarker] = useState(null);

  const validMarkers = markers.filter(m => m.lat && m.lng);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Fit bounds when markers change
  useEffect(() => {
    if (!mapRef.current || validMarkers.length === 0) return;

    if (validMarkers.length === 1) {
      mapRef.current.panTo({ lat: validMarkers[0].lat, lng: validMarkers[0].lng });
      mapRef.current.setZoom(14);
    } else {
      const bounds = new window.google.maps.LatLngBounds();
      validMarkers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
      mapRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [validMarkers]);

  if (loadError) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8faf5',
        borderRadius: '16px',
        color: '#163300',
        fontWeight: 600,
        fontSize: '0.9rem',
        padding: '24px',
        textAlign: 'center',
      }}>
        Unable to load Google Maps. Please check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8faf5',
        borderRadius: '16px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #e0e0e0',
          borderTopColor: '#9FE870',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const center = validMarkers.length > 0
    ? { lat: validMarkers[0].lat, lng: validMarkers[0].lng }
    : defaultCenter;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      onLoad={onLoad}
      options={mapOptions}
    >
      {validMarkers.map((marker, idx) => (
        <MarkerF
          key={`${marker.lat}-${marker.lng}-${idx}`}
          position={{ lat: marker.lat, lng: marker.lng }}
          icon={createNumberedMarkerIcon(idx + 1)}
          onClick={() => setSelectedMarker(idx)}
        />
      ))}

      {selectedMarker !== null && validMarkers[selectedMarker] && (
        <InfoWindowF
          position={{
            lat: validMarkers[selectedMarker].lat,
            lng: validMarkers[selectedMarker].lng,
          }}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div style={{ color: '#163300', padding: '4px', maxWidth: '220px' }}>
            <strong style={{ fontSize: '0.95rem', color: '#163300' }}>
              {selectedMarker + 1}. {validMarkers[selectedMarker].title}
            </strong>
            {validMarkers[selectedMarker].description && (
              <p style={{
                margin: '6px 0 0',
                fontSize: '0.82rem',
                color: '#556b4a',
                lineHeight: 1.4,
              }}>
                {validMarkers[selectedMarker].description}
              </p>
            )}
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
