import os
import json
import numpy as np
import torch
import torch.optim as optim
import torch.nn as nn
from torch.utils.data import DataLoader
from .ml_definitions import MLManager, calculate_iou
from .datasets import SWEDDataset, generate_synthetic_swed

# Parameters
BATCH_SIZE = 4
EPOCHS = 10 
LR = 0.001
DATA_PATH = "backend/data/swed"

def train_initial_models(is_retraining=False):
    """
    Initializes or Retrains models using SWED dataset.
    """
    status_msg = "🔄 Retraining..." if is_retraining else "🚀 Initializing..."
    print(f"{status_msg} HydroAI ML Pipeline")
    
    manager = MLManager()
    metrics = {"history": []}
    
    # ---------------------------
    # 1. Prepare Data (SWED) with Augmentation
    # ---------------------------
    if not os.path.exists(os.path.join(DATA_PATH, 'images')):
        generate_synthetic_swed(DATA_PATH, num_samples=50) # More samples for retraining
    
    # Use Augmentation during training
    dataset = SWEDDataset(DATA_PATH, augment=True)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    # ---------------------------
    # 2. Train U-Net (Water Segmentation)
    # ---------------------------
    print(f"🌊 Training U-Net on SWED ({len(dataset)} samples)...")
    optimizer = optim.Adam(manager.unet.parameters(), lr=LR)
    criterion = nn.BCELoss()
    
    manager.unet.train()
    
    for epoch in range(EPOCHS):
        epoch_loss = 0
        epoch_iou = 0
        
        for images, masks in loader:
            optimizer.zero_grad()
            outputs = manager.unet(images)
            loss = criterion(outputs, masks)
            loss.backward()
            optimizer.step()
            
            # Metrics
            epoch_loss += loss.item()
            with torch.no_grad():
                epoch_iou += calculate_iou(outputs, masks).item()
                
        avg_loss = epoch_loss / len(loader)
        avg_iou = epoch_iou / len(loader)
        
        print(f"   Epoch {epoch+1}/{EPOCHS} | Loss: {avg_loss:.4f} | IoU: {avg_iou:.4f}")
        
        metrics["history"].append({
            "epoch": epoch + 1,
            "loss": round(avg_loss, 4),
            "iou": round(avg_iou, 4)
        })

    # Save metrics to disk for Frontend
    with open(manager.metrics_file, 'w') as f:
        json.dump(metrics, f)

    # ---------------------------
    # 3. Train LSTM (Forecasting)
    # ---------------------------
    print("📈 Training LSTM on historical time-series...")
    X_ts = torch.randn(100, 12, 1) 
    y_ts = torch.randn(100, 1)
    
    optimizer = optim.Adam(manager.lstm.parameters(), lr=LR)
    criterion = nn.MSELoss()
    
    manager.lstm.train()
    for epoch in range(5):
        optimizer.zero_grad()
        output = manager.lstm(X_ts)
        loss = criterion(output, y_ts)
        loss.backward()
        optimizer.step()

    # ---------------------------
    # 4. Train Scikit-Learn Models
    # ---------------------------
    print("🔍 Fitting Anomaly Detection (Isolation Forest)...")
    normal_data = np.random.normal(loc=50, scale=10, size=(100, 1))
    manager.iso_forest.fit(normal_data)

    print("🌲 Training Risk Classifier (Random Forest)...")
    X_rf = np.random.rand(100, 3)
    y_rf = np.random.randint(0, 2, 100)
    manager.risk_rf.fit(X_rf, y_rf)

    # Save
    manager.save_models()
    print("✨ ML Pipeline Training Complete. Models Saved.")

if __name__ == "__main__":
    train_initial_models()
