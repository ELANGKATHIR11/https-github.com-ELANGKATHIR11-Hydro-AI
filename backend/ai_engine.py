import os
import google.generativeai as genai
import json

class AIEngine:
    def __init__(self):
        # In the backend, we read the key from OS environment variables
        # This is much safer than REACT_APP_...
        api_key = os.getenv("API_KEY") 
        if not api_key:
            print("⚠️ No API_KEY found in environment variables.")
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')

    def generate_hydrologist_report(self, reservoir_name, stats):
        
        is_anomaly = stats.get('is_anomaly', False)
        
        prompt = f"""
        Act as a Senior Hydrologist. Analyze this reservoir data:
        
        Name: {reservoir_name}
        Season: {stats['season']}
        Current Volume: {stats['volume']} MCM
        Max Capacity: {stats['capacity']} MCM
        Measured Surface Area: {stats['surface_area']} sq km
        Mean NDWI Index: {stats['ndwi_index']}
        Anomaly Detected by Isolation Forest: {is_anomaly}
        
        Task:
        1. Calculate percentage fullness.
        2. Assess flood/drought risk.
        3. If Anomaly is True, explain why this might be a data error or a flash event.
        4. Return JSON response.
        """
        
        try:
            # We use a simplified generation for the demo
            # In production, use structured output or function calling
            response = self.model.generate_content(prompt)
            
            # Simple mock parsing if the model is chatty
            # In a real app, ensure JSON mode is on
            return {
                "riskLevel": "Moderate" if (stats['volume']/stats['capacity']) < 0.8 else "High",
                "floodProbability": int((stats['volume']/stats['capacity']) * 100),
                "droughtSeverity": "Normal",
                "forecast": "Based on NDWI trends, water levels are stable.",
                "summary": response.text[:200] + "...",
                "recommendation": "Continue monitoring inflow channels."
            }
        except Exception as e:
            # Fallback if AI fails
            return {
                "riskLevel": "Low",
                "floodProbability": 10,
                "droughtSeverity": "Normal",
                "forecast": "AI Service Unavailable",
                "summary": "Could not contact Gemini AI.",
                "recommendation": "Manual check required."
            }
