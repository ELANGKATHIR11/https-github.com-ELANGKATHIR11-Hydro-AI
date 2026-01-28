import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap, LayersControl, Marker, Tooltip } from 'react-leaflet';
import { Reservoir, SeasonalData } from '../types';
import { generateWaterPolygon, RESERVOIRS } from '../services/mockData';
import L from 'leaflet';

// Fix for default Leaflet icons in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface MapVisualizerProps {
  reservoir: Reservoir;
  data: SeasonalData;
  label?: string; 
  isSimulation?: boolean; // New prop to indicate data source
  onReservoirSelect?: (id: string) => void;
}

const isValidCoordinate = (coord: any): coord is [number, number] => {
  return Array.isArray(coord) && 
         coord.length === 2 && 
         typeof coord[0] === 'number' && Number.isFinite(coord[0]) && 
         typeof coord[1] === 'number' && Number.isFinite(coord[1]);
};

const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (isValidCoordinate(center)) {
       try {
         map.flyTo(center, 12, { duration: 2 });
       } catch (e) {
         console.warn("Leaflet flyTo failed:", e);
       }
    }
  }, [center, map]);
  return null;
};

const MapVisualizer: React.FC<MapVisualizerProps> = ({ reservoir, data, label, isSimulation = true, onReservoirSelect }) => {
  
  const safeReservoirLocation = useMemo((): [number, number] => {
    if (reservoir && isValidCoordinate(reservoir.location)) {
        return reservoir.location;
    }
    return [13.0089, 80.0573]; 
  }, [reservoir]);

  const inletLocation = useMemo((): [number, number] | null => {
    if (!isValidCoordinate(safeReservoirLocation)) return null;
    const lat = safeReservoirLocation[0] + 0.015;
    const lng = safeReservoirLocation[1] - 0.015;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    return null;
  }, [safeReservoirLocation]);

  const waterPolygon = useMemo(() => {
    if (!data || typeof data.volume !== 'number' || !reservoir || !reservoir.maxCapacity) return [];
    if (!isValidCoordinate(safeReservoirLocation)) return [];

    let volPct = (data.volume / reservoir.maxCapacity) * 100;
    if (!Number.isFinite(volPct)) volPct = 0;
    
    // If we have real surface area data, we could ideally shape the polygon differently.
    // For now, we scale the mock polygon generation to match the backend area if provided, 
    // or fallback to volume percentage.
    // Note: generateWaterPolygon logic relies on volume percentage, so we keep that correlation for the visual.
    
    const poly = generateWaterPolygon(safeReservoirLocation, volPct);
    return poly.filter(p => isValidCoordinate(p));
  }, [reservoir, data, safeReservoirLocation]);

  const volumePercentage = useMemo(() => {
    if (!data?.volume || !reservoir?.maxCapacity) return 0;
    const pct = (data.volume / reservoir.maxCapacity) * 100;
    return Number.isFinite(pct) ? pct : 0;
  }, [data, reservoir]);

  const mapOptions = useMemo(() => {
    let fillColor, strokeColor;
    if (volumePercentage >= 80) {
      fillColor = '#1e40af'; 
      strokeColor = '#172554';
    } else if (volumePercentage >= 60) {
      fillColor = '#2563eb';
      strokeColor = '#1e3a8a';
    } else if (volumePercentage >= 40) {
      fillColor = '#3b82f6';
      strokeColor = '#1d4ed8';
    } else if (volumePercentage >= 20) {
      fillColor = '#60a5fa';
      strokeColor = '#2563eb';
    } else {
      fillColor = '#93c5fd';
      strokeColor = '#3b82f6';
    }
    return { fillColor, fillOpacity: 0.65, color: strokeColor, weight: 2 };
  }, [volumePercentage]);

  if (!isValidCoordinate(safeReservoirLocation)) {
      return <div className="h-full w-full bg-slate-900 flex items-center justify-center text-slate-500">Invalid Coordinates</div>;
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative bg-slate-900">
      <MapContainer 
        key={`${reservoir?.id}-${data?.year}-${data?.season}`} 
        center={safeReservoirLocation} 
        zoom={12} 
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        scrollWheelZoom={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Dark Matter (Data)">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite (Esri)">
            <TileLayer
              attribution='Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap (Standard)">
             <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        <MapUpdater center={safeReservoirLocation} />

        {/* Other Reservoirs Markers */}
        {onReservoirSelect && RESERVOIRS.map(res => {
            if (res.id === reservoir.id) return null; // Skip active one
            if (!isValidCoordinate(res.location)) return null;

            return (
                <CircleMarker
                    key={res.id}
                    center={res.location}
                    radius={6}
                    pathOptions={{
                        color: '#64748b',
                        weight: 2,
                        fillColor: '#cbd5e1',
                        fillOpacity: 0.6
                    }}
                    eventHandlers={{
                        click: () => onReservoirSelect(res.id),
                        mouseover: (e) => e.target.setStyle({ color: '#38bdf8', fillColor: '#e0f2fe', fillOpacity: 1 }),
                        mouseout: (e) => e.target.setStyle({ color: '#64748b', fillColor: '#cbd5e1', fillOpacity: 0.6 })
                    }}
                >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                        <div className="text-center">
                            <span className="font-bold text-slate-900">{res.name}</span>
                            <br/>
                            <span className="text-[10px] text-slate-500">Click to Select</span>
                        </div>
                    </Tooltip>
                </CircleMarker>
            );
        })}

        {waterPolygon.length > 0 && (
          <Polygon positions={waterPolygon as any} pathOptions={mapOptions}>
             <Popup>
              <div className="text-slate-900 text-sm">
                <strong className="text-base">{reservoir?.name || 'Reservoir'}</strong>
                <div className="text-[10px] text-slate-500 mb-1">
                   {isSimulation ? '(Simulated Physics)' : '(Sentinel-2 Analysis)'}
                </div>
                <hr className="my-1 border-slate-300"/>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                   <span>Water Area:</span> <span className="font-mono">{data?.surfaceArea} km²</span>
                   <span>Volume:</span> <span className="font-mono">{data?.volume} MCM</span>
                   <span>Capacity:</span> <span className="font-mono">{Math.round(volumePercentage)}%</span>
                </div>
              </div>
            </Popup>
          </Polygon>
        )}

        <CircleMarker center={safeReservoirLocation} radius={4} pathOptions={{color: 'white', opacity: 0.8, fillColor: 'white', fillOpacity: 1}}>
             <Tooltip direction="top" offset={[0, -5]} opacity={1} permanent>
                Depth Probe
             </Tooltip>
        </CircleMarker>
      </MapContainer>
      
      {/* Live Data Overlay */}
      <div className="absolute top-4 left-14 z-[400] bg-slate-900/90 backdrop-blur-md p-3 rounded-lg border border-slate-600 text-xs shadow-xl print:hidden">
         {label && (
             <div className="mb-2 pb-2 border-b border-slate-700">
                 <h4 className="font-bold text-white uppercase tracking-wider">{label}</h4>
             </div>
         )}
         <h4 className={`font-bold flex items-center gap-2 ${isSimulation ? 'text-orange-400' : 'text-emerald-400'}`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSimulation ? 'bg-orange-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulation ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
            </span>
            {isSimulation ? 'Physics Engine (Sim)' : 'Sentinel-2 Live Feed'}
         </h4>
         {!isSimulation && <p className="text-slate-300 mt-1">Provider: Google Earth Engine</p>}
         <p className="text-slate-400 mt-0.5">Processing: {isSimulation ? 'Local' : 'Backend U-Net'}</p>
      </div>
    </div>
  );
};

export default MapVisualizer;