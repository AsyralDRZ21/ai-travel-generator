import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
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

// Custom numbered icon generator with Wise Green styling
const createNumberedIcon = (number) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #163300; color: #9FE870; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 4px 10px rgba(22,51,0,0.4); font-weight: 800; font-size: 13px; border: 2.5px solid #ffffff;">${number}</div>`,
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
      style={{ height: '100%', width: '100%', background: '#eef2ea', borderRadius: '16px' }}
    >
      {/* 
        Free, reliable, high-performance travel map tile layer from CARTO Voyager / OpenStreetMap.
        Does not require any API keys and never throws 401 authentication errors on deployed sites.
      */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        maxZoom={20}
        subdomains="abcd"
      />
      
      <MapBoundsFitter markers={validMarkers} />

      {validMarkers.map((marker, idx) => (
        <Marker 
          key={idx} 
          position={[marker.lat, marker.lng]}
          icon={createNumberedIcon(idx + 1)}
        >
          <Popup>
            <div style={{ color: '#163300', padding: '4px' }}>
              <strong style={{ fontSize: '1rem', color: '#163300' }}>{idx + 1}. {marker.title}</strong>
              {marker.description && <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#556b4a', lineHeight: 1.4 }}>{marker.description}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
