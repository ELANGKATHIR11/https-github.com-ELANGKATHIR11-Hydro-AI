import os
import contextlib
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import torch
import numpy as np

# Import engines
from .satellite_engine import SatelliteEngine
from .ai_engine import AIEngine
from .ml_definitions import MLManager
from .train_init import train_initial_models

# Application Lifecycle Manager
@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load ML Models
    ml_manager = MLManager()
    if not ml_manager.load_models():
        print("⚠️ Models missing. Triggering initial training...")
        train_initial_models()
        ml_manager.load_models()
    
    # Attach manager to app state for endpoints to use
    app.state.ml_manager = ml_manager
    yield
    # Shutdown logic (if needed)

app = FastAPI(title="HydroAI Backend", lifespan=lifespan)

# Enable CORS for React Frontend (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Engines
sat_engine = SatelliteEngine()
ai_engine = AIEngine()

# --- Pydantic Models ---
class Coordinates(BaseModel):
    lat: float
    lng: float

class AnalysisRequest(BaseModel):
    reservoir_name: str
    location: Coordinates
    date: str
    season: str
    current_volume: float
    max_capacity: float

class FeedbackRequest(BaseModel):
    reservoir_name: str
    original_risk: str
    corrected_risk: str
    notes: Optional[str] = None

class ForecastRequest(BaseModel):
    historical_volumes: List[float] # Last 12 months

# --- Routes ---

@app.get("/")
def health_check():
    return {"status": "HydroAI Backend Online", "ml_status": "Active"}

@app.post("/api/satellite/water-spread")
def get_water_spread(req: AnalysisRequest):
    try:
        # Use ML manager for segmentation if image data available (simulated here)
        result = sat_engine.analyze_water_spread(
            lat=req.location.lat, 
            lng=req.location.lng, 
            date_str=req.date
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/forecast")
def get_ml_forecast(req: ForecastRequest):
    """
    Uses the LSTM model to predict next month's volume.
    """
    try:
        model = app.state.ml_manager.lstm
        
        # Prepare input: (1, 12, 1)
        input_seq = torch.tensor(req.historical_volumes[-12:]).float().view(1, 12, 1)
        
        with torch.no_grad():
            prediction = model(input_seq).item()
            
        return {
            "predicted_volume": max(0, prediction), # No negative volume
            "model": "LSTM (PyTorch)"
        }
    except Exception as e:
        print(e)
        return {"predicted_volume": req.historical_volumes[-1], "model": "Fallback"}

@app.post("/api/ml/anomaly")
def check_anomaly(req: AnalysisRequest):
    """
    Uses Isolation Forest to check if current volume is anomalous.
    """
    try:
        model = app.state.ml_manager.iso_forest
        
        # Reshape for sklearn (1, -1)
        # Using volume as the feature
        score = model.predict([[req.current_volume]])
        
        is_anomaly = score[0] == -1
        return {"is_anomaly": bool(is_anomaly), "model": "Isolation Forest"}
    except Exception as e:
        return {"is_anomaly": False, "error": str(e)}

@app.get("/api/ml/metrics")
def get_model_metrics():
    """
    Returns training history (Loss, IoU) for frontend visualization.
    """
    try:
        return app.state.ml_manager.get_metrics()
    except Exception as e:
        return {"history": []}

@app.post("/api/ml/retrain")
async def trigger_retraining(background_tasks: BackgroundTasks):
    """
    Triggers model retraining in the background.
    """
    background_tasks.add_task(train_initial_models, is_retraining=True)
    return {"status": "Retraining started", "message": "Check metrics endpoint for updates."}

@app.post("/api/ai/generate-report")
def generate_report(req: AnalysisRequest):
    try:
        # 1. Get Satellite Data
        sat_data = sat_engine.analyze_water_spread(
            req.location.lat, req.location.lng, req.date
        )
        
        # 2. Check Anomaly
        ml_anomaly = app.state.ml_manager.iso_forest.predict([[req.current_volume]])[0] == -1

        # 3. Pass combined data to Gemini
        report = ai_engine.generate_hydrologist_report(
            reservoir_name=req.reservoir_name,
            stats={
                "volume": req.current_volume,
                "capacity": req.max_capacity,
                "surface_area": sat_data["surface_area_km2"],
                "ndwi_index": sat_data["mean_ndwi"],
                "season": req.season,
                "is_anomaly": ml_anomaly
            }
        )
        report["isAnomaly"] = bool(ml_anomaly)
        return report
    except Exception as e:
        print(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/feedback")
def submit_rlhf_feedback(feedback: FeedbackRequest):
    # Log feedback for retraining
    entry = {
        "reservoir": feedback.reservoir_name,
        "original": feedback.original_risk,
        "corrected": feedback.corrected_risk,
        "timestamp": "2024-01-29T12:00:00Z"
    }
    with open("backend/rlhf_logs.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")
    return {"status": "success"}
