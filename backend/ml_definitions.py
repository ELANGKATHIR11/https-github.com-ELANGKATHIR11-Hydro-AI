import torch
import torch.nn as nn
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
import joblib
import os
import json

# ==========================================
# Helper: IoU Metric Calculation
# ==========================================
def calculate_iou(pred, target, threshold=0.5):
    """
    Calculates Intersection over Union for binary segmentation.
    """
    pred_bin = (pred > threshold).float()
    intersection = (pred_bin * target).sum()
    union = pred_bin.sum() + target.sum() - intersection
    
    if union == 0:
        return 1.0
    return intersection / union

# ==========================================
# 1. U-Net for Water Segmentation (Deep Learning)
# ==========================================
class DoubleConv(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, 3, padding=1),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.conv(x)

class WaterUNet(nn.Module):
    """
    U-Net adapted for Sentinel-2 Inputs.
    Input: 4 Channels (Red, Green, Blue, NIR)
    Output: 1 Channel (Probability of Water)
    """
    def __init__(self, n_channels=4, n_classes=1):
        super(WaterUNet, self).__init__()
        self.inc = DoubleConv(n_channels, 32)
        self.down1 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(32, 64))
        self.down2 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(64, 128))
        self.up1 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.up_conv1 = DoubleConv(128, 64) 
        self.up2 = nn.ConvTranspose2d(64, 32, 2, stride=2)
        self.up_conv2 = DoubleConv(64, 32)
        self.outc = nn.Conv2d(32, n_classes, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        
        x = self.up1(x3)
        x = torch.cat([x, x2], dim=1)
        x = self.up_conv1(x)
        
        x = self.up2(x)
        x = torch.cat([x, x1], dim=1)
        x = self.up_conv2(x)
        
        logits = self.outc(x)
        return self.sigmoid(logits)

# ==========================================
# 2. LSTM for Seasonal Forecasting (Time Series)
# ==========================================
class ReservoirLSTM(nn.Module):
    def __init__(self, input_size=1, hidden_size=50, num_layers=1, output_size=1):
        super(ReservoirLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out

# ==========================================
# 3. Model Manager (Loader/Saver)
# ==========================================
class MLManager:
    def __init__(self, model_dir="backend/models"):
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        self.metrics_file = os.path.join(model_dir, "training_metrics.json")
        
        # Initialize with 4 channels for Sentinel-2 (R,G,B,NIR)
        self.unet = WaterUNet(n_channels=4) 
        self.lstm = ReservoirLSTM()
        self.iso_forest = IsolationForest(contamination=0.1)
        self.risk_rf = RandomForestClassifier(n_estimators=100)
        
    def save_models(self):
        torch.save(self.unet.state_dict(), f"{self.model_dir}/unet_swed.pth")
        torch.save(self.lstm.state_dict(), f"{self.model_dir}/lstm_forecast.pth")
        joblib.dump(self.iso_forest, f"{self.model_dir}/iso_forest.joblib")
        joblib.dump(self.risk_rf, f"{self.model_dir}/risk_rf.joblib")
        print("✅ Models saved to disk.")

    def load_models(self):
        try:
            self.unet.load_state_dict(torch.load(f"{self.model_dir}/unet_swed.pth"))
            self.unet.eval()
            
            self.lstm.load_state_dict(torch.load(f"{self.model_dir}/lstm_forecast.pth"))
            self.lstm.eval()
            
            self.iso_forest = joblib.load(f"{self.model_dir}/iso_forest.joblib")
            self.risk_rf = joblib.load(f"{self.model_dir}/risk_rf.joblib")
            print("✅ Models loaded from disk.")
            return True
        except FileNotFoundError:
            print("⚠️ Models not found. Training initialization required.")
            return False

    def get_metrics(self):
        if os.path.exists(self.metrics_file):
            with open(self.metrics_file, 'r') as f:
                return json.load(f)
        return {"history": []}
