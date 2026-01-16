import { GoogleGenAI } from "@google/genai";
import { UserLocation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateEmergencyMessage = async (
  customMessage: string,
  location: UserLocation | null,
  batteryLevel: number
): Promise<string> => {
  try {
    const locString = location 
      ? `Latitude: ${location.latitude}, Longitude: ${location.longitude} (Accuracy: ${location.accuracy}m)` 
      : "Location unavailable";

    const prompt = `
      Create a concise, urgent emergency SMS message (max 160 characters if possible, but prioritize clarity).
      
      Context:
      - The user failed to check in to their safety app.
      - User's Custom Note: "${customMessage}"
      - Current Coordinates: ${locString}
      - Battery Level: ${Math.round(batteryLevel * 100)}%
      
      The message should be written in first person ("I am..."). It is being sent to police and emergency contacts.
      Include the location link if possible.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "EMERGENCY: User failed to check in. Last known location: " + locString;
  } catch (error) {
    console.error("Gemini generation failed", error);
    return `EMERGENCY: User check-in missed. ${customMessage}. Location: ${location ? `${location.latitude}, ${location.longitude}` : 'Unknown'}`;
  }
};

export const generateSafetyTips = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Give me 3 short, bulleted general personal safety tips for walking alone at night. Keep it under 50 words.",
    });
    return response.text || "Stay aware of your surroundings.";
  } catch (e) {
    return "Stay aware of your surroundings.";
  }
};