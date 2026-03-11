import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Cooldown management
const COOLDOWN_SECONDS = 60;
let lastRequestTime = 0;

export function getGeminiCooldown() {
  const now = Date.now();
  const elapsed = (now - lastRequestTime) / 1000;
  return Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsed));
}

export async function generateBusinessReport(data: any) {
  const cooldown = getGeminiCooldown();
  if (cooldown > 0) {
    throw new Error(`COOLDOWN:${cooldown}`);
  }

  try {
    lastRequestTime = Date.now();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse les données de vente suivantes pour Orchidée Nature et génère un rapport professionnel en français. 
      Inclus : 
      1. Résumé des performances
      2. Top 3 produits
      3. Recommandations de stock
      4. Analyse des marges
      
      Données : ${JSON.stringify(data)}`,
      config: {
        systemInstruction: "Tu es un expert en analyse de données commerciales pour une boutique de cosmétiques et épices. Ton ton est professionnel et tes conseils sont actionnables.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            topProducts: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  sales: { type: Type.NUMBER }
                }
              }
            },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            marginAnalysis: { type: Type.STRING }
          },
          required: ["summary", "topProducts", "recommendations", "marginAnalysis"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Report Error:", error);
    throw error;
  }
}
