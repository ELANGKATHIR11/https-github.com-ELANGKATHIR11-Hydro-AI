import os
import torch
from torch.utils.data import Dataset
import numpy as np
import rasterio
from rasterio.transform import from_origin
import random

class SWEDDataset(Dataset):
    """
    PyTorch Dataset for the Sentinel-2 Water Edges Dataset (SWED).
    Expects structure:
    root/
      images/ (GeoTIFFs with bands)
      labels/ (GeoTIFFs with binary mask)
    """
    def __init__(self, root_dir, augment=False):
        self.root_dir = root_dir
        self.augment = augment
        self.image_dir = os.path.join(root_dir, 'images')
        self.label_dir = os.path.join(root_dir, 'labels')
        
        # List files
        if os.path.exists(self.image_dir):
            self.filenames = [f for f in os.listdir(self.image_dir) if f.endswith('.tif')]
        else:
            self.filenames = []

    def __len__(self):
        return len(self.filenames)

    def __getitem__(self, idx):
        img_name = self.filenames[idx]
        img_path = os.path.join(self.image_dir, img_name)
        lbl_path = os.path.join(self.label_dir, img_name)

        try:
            # Read Sentinel-2 Image (Multi-band)
            with rasterio.open(img_path) as src:
                # Read specific bands: Red(3), Green(2), Blue(1), NIR(8)
                image = src.read([1, 2, 3, 4]) # Shape: (4, H, W)
                image = image.astype(np.float32) / 255.0 # Normalize

            # Read Label (Water Mask)
            with rasterio.open(lbl_path) as src:
                label = src.read(1) # Shape: (H, W)
                label = label.astype(np.float32)

            # --- Data Augmentation (Runtime) ---
            if self.augment:
                # 1. Horizontal Flip
                if random.random() > 0.5:
                    image = np.flip(image, axis=2).copy()
                    label = np.flip(label, axis=1).copy()
                
                # 2. Vertical Flip
                if random.random() > 0.5:
                    image = np.flip(image, axis=1).copy()
                    label = np.flip(label, axis=0).copy()

            # Convert to Tensor
            image_t = torch.from_numpy(image)
            label_t = torch.from_numpy(label).unsqueeze(0) # (1, H, W)

            return image_t, label_t
        except Exception as e:
            print(f"Error loading {img_name}: {e}")
            return torch.zeros(4, 128, 128), torch.zeros(1, 128, 128)

def generate_synthetic_swed(root_dir, num_samples=20):
    """
    Generates synthetic GeoTIFF data mimicking SWED structure.
    Used to initialize the pipeline without downloading the 15GB dataset.
    """
    print(f"⚠️ SWED Dataset not found at {root_dir}. Generating SYNTHETIC data for pipeline validation...")
    
    img_dir = os.path.join(root_dir, 'images')
    lbl_dir = os.path.join(root_dir, 'labels')
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(lbl_dir, exist_ok=True)

    transform = from_origin(0, 0, 10, 10) # Dummy transform

    for i in range(num_samples):
        # Generate Fake Sentinel-2 Data (4 bands: R, G, B, NIR)
        # Shape: 128x128
        data = np.random.randint(0, 255, (4, 128, 128), dtype=np.uint8)
        
        # Create a fake "water" feature (circle/blob) in NIR band
        y, x = np.ogrid[:128, :128]
        mask = (x - 64)**2 + (y - 64)**2 < 30**2
        
        # Set water pixels: Low NIR, High Blue/Green
        data[3, mask] = 10   # NIR Low
        data[1, mask] = 200  # Green High
        data[2, mask] = 220  # Blue High

        # Add some noise for robustness
        noise = np.random.randint(0, 20, (4, 128, 128), dtype=np.uint8)
        data = np.clip(data + noise, 0, 255)

        # Create Label
        label = mask.astype(np.uint8)

        # Write Image
        with rasterio.open(
            os.path.join(img_dir, f'sample_{i}.tif'),
            'w',
            driver='GTiff',
            height=128,
            width=128,
            count=4,
            dtype=data.dtype,
            crs='+proj=latlong',
            transform=transform,
        ) as dst:
            dst.write(data)

        # Write Label
        with rasterio.open(
            os.path.join(lbl_dir, f'sample_{i}.tif'),
            'w',
            driver='GTiff',
            height=128,
            width=128,
            count=1,
            dtype=label.dtype,
            crs='+proj=latlong',
            transform=transform,
        ) as dst:
            dst.write(label, 1)

    print(f"✅ Generated {num_samples} synthetic SWED samples in {root_dir}")
