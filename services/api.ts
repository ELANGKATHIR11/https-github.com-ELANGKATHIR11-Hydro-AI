import { AIAnalysisResult } from "../types";

const BACKEND_URL = 'http://localhost:8000/api';

export const fetchSatelliteAnalysis = async (
  reservoirName: string,
  lat: number,
  lng: number,
  date: string
) => {
  try {
    const response = await fetch(`${BACKEND_URL}/satellite/water-spread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservoir_name: reservoirName,
        location: { lat, lng },
        date: date,
        season: "Current", 
        current_volume: 0, 
        max_capacity: 0    
      })
    });
    if (!response.ok) throw new Error('Backend unavailable');
    return await response.json();
  } catch (error) {
    console.error("Satellite API Error:", error);
    return null;
  }
};

export const fetchAIReport = async (
  reservoirName: string,
  lat: number,
  lng: number,
  currentVol: number,
  maxCap: number,
  season: string,
  year: number
): Promise<AIAnalysisResult | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/ai/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservoir_name: reservoirName,
        location: { lat, lng },
        date: `${year}-01-01`,
        season: season,
        current_volume: currentVol,
        max_capacity: maxCap
      })
    });
    
    if (!response.ok) throw new Error('AI Backend unavailable');
    return await response.json();
  } catch (error) {
    console.warn("Using local fallback due to backend error:", error);
    return null;
  }
};

export const fetchMLForecast = async (historicalVolumes: number[]) => {
    try {
        const response = await fetch(`${BACKEND_URL}/ml/forecast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ historical_volumes: historicalVolumes })
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
};

export const checkMLAnomaly = async (currentVolume: number) => {
    // In a real call, we'd pass more context
    try {
        const response = await fetch(`${BACKEND_URL}/ml/anomaly`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reservoir_name: "Test",
                location: {lat:0, lng:0},
                date: "2024-01-01",
                season: "Current",
                current_volume: currentVolume,
                max_capacity: 100
             })
        });
        return await response.json();
    } catch(e) {
        return { is_anomaly: false, model: "Isolation Forest (Offline)" }; 
    }
};

export const fetchModelMetrics = async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/ml/metrics`);
        if (!response.ok) return { history: [] };
        return await response.json();
    } catch (e) {
        return { history: [] };
    }
};

export const retrainModel = async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/ml/retrain`, { method: 'POST' });
        return response.ok;
    } catch (e) {
        return false;
    }
};
