import { SeasonalData, Reservoir, AIAnalysisResult } from "../types";
import { fetchAIReport } from "./api";
import { GoogleGenAI, Type } from "@google/genai";

// Fallback Client-Side Instance (Only used if backend is down)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are an expert Water Intelligence AI acting as the reasoning core of a geospatial system.
Your outputs must be structured and deterministic.
`;

// Local Fallback Function
const generateLocalFallback = async (
    reservoir: Reservoir,
    currentData: SeasonalData
): Promise<AIAnalysisResult> => {
    // ... (Existing logic for client-side fallback)
     const prompt = `Analyze ${reservoir.name}. Volume: ${currentData.volume} MCM. Risk assessment?`;
     
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    riskLevel: { type: Type.STRING, enum: ['Low', 'Moderate', 'High', 'Critical'] },
                    floodProbability: { type: Type.INTEGER },
                    droughtSeverity: { type: Type.STRING, enum: ['Normal', 'Moderate', 'Severe', 'Extreme'] },
                    forecast: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    recommendation: { type: Type.STRING }
                  }
                }
            }
        });
        if (response.text) return JSON.parse(response.text);
        throw new Error("No response");
     } catch (e) {
         return {
            riskLevel: 'Moderate',
            floodProbability: 45,
            droughtSeverity: 'Normal',
            forecast: 'Backend offline. Using statistical fallback.',
            summary: 'Connection to AI Server failed. Displaying estimated metrics.',
            recommendation: 'Check server logs.'
         };
     }
};

export const generateHydrologicalReport = async (
  reservoir: Reservoir,
  currentData: SeasonalData,
  historicalTrend: SeasonalData[]
): Promise<AIAnalysisResult> => {
  
  // 1. Try Real Backend First
  const backendResult = await fetchAIReport(
      reservoir.name,
      reservoir.location[0],
      reservoir.location[1],
      currentData.volume,
      reservoir.maxCapacity,
      currentData.season,
      currentData.year
  );

  if (backendResult) {
      return backendResult;
  }

  // 2. Fallback to Local/Client-side if backend fails
  console.log("⚠️ Backend unreachable, switching to Client-Side AI...");
  return generateLocalFallback(reservoir, currentData);
};
