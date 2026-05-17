import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leafet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom numbered icon generator
const createNumberedIcon = (number) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: var(--accent-primary); color: white; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.5); font-weight: bold; border: 2px solid white;">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

function MapBoundsFitter({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers && markers.length > 0) {
      const validMarkers = markers.filter(m => m.lat && m.lng);
      if (validMarkers.length > 0) {
        const bounds = L.latLngBounds(validMarkers.map(m => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [markers, map]);
  return null;
}

export default function MapComponent({ markers = [] }) {
  const defaultCenter = [51.505, -0.09]; // Fallback

  const validMarkers = markers.filter(m => m.lat && m.lng);
  const initialCenter = validMarkers.length > 0 ? [validMarkers[0].lat, validMarkers[0].lng] : defaultCenter;

  return (
    <MapContainer 
      center={initialCenter} 
      zoom={11} 
      scrollWheelZoom={true} 
      style={{ height: '100%', width: '100%', background: '#0a0e1a' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png${import.meta.env.VITE_STADIA_KEY ? `?api_key=${import.meta.env.VITE_STADIA_KEY}` : ''}`}
        maxZoom={20}
      />
      
      <MapBoundsFitter markers={validMarkers} />

      {validMarkers.map((marker, idx) => (
        <Marker 
          key={idx} 
          position={[marker.lat, marker.lng]}
          icon={createNumberedIcon(idx + 1)}
        >
          <Popup>
            <div style={{ color: '#333' }}>
              <strong style={{ fontSize: '1.1rem' }}>{idx + 1}. {marker.title}</strong>
              {marker.description && <p style={{ margin: '5px 0 0', fontSize: '0.9rem' }}>{marker.description}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
