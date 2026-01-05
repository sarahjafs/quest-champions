import { GoogleGenAI, Type } from "@google/genai";

// Standard initialization as per Google GenAI SDK guidelines
// This relies on process.env.API_KEY being injected by the build tool (Vite) or the hosting provider.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function suggestChore(childAge: number, keywords: string = "") {
  try {
    const prompt = `Suggest 4 unique and fun chores/missions for a child aged ${childAge}. 
    ${keywords ? `The parent specifically wants to focus on: ${keywords}.` : ""}
    Return in JSON format. Use diverse icons. Suggested coins should be 10-50 and XP 20-100.
    Available frequencies: 'Daily', 'Weekly', 'Fortnightly', 'One-off'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              suggestedCoins: { type: Type.NUMBER },
              suggestedXp: { type: Type.NUMBER },
              frequency: { type: Type.STRING },
              icon: { type: Type.STRING }
            },
            required: ["title", "description", "suggestedCoins", "suggestedXp", "frequency", "icon"]
          }
        }
      }
    });
    
    // In @google/genai, response.text is a property.
    const text = response.text;
    return JSON.parse(text || '[]');
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
}
