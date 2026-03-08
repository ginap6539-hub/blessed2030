
import { GoogleGenAI } from "@google/genai";

// Safe initialization to prevent build crashes if env is missing
const apiKey = 'PLACEHOLDER_KEY'; 
const ai = new GoogleGenAI({ apiKey });

export const geminiService = {
  generateContent: async (prompt: string) => {
    try {
        return "AI Service Placeholder";
    } catch (e) {
        console.error("AI Error", e);
        return "Error";
    }
  }
};
