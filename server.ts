import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API endpoint to generate a Sepedi voice drama
app.post("/api/generate-drama", async (req, res) => {
  try {
    const { prompt, genre, tone, characterCount = 3 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const systemInstruction = `You are a master South African dramatist, storyteller, and scriptwriter specializing in authentic Local English voice dramas (South African English with local flavor, colloquialisms, warmth, and vivid narrative depth).
Your task is to create a rich, realistic audio drama script in Local English.
The script must have multiple characters with distinct personalities, tones, and voice descriptions.
Include ambient sound effect cues (e.g., [Township street chatter], [Taxi hooter blowing], [Crickets chirping at dusk], [Traditional guitar strumming]), emotional cues, and a local South African idiom or proverb with its meaning.

Return ONLY valid JSON matching this schema:
{
  "title": "Drama Title in Local English",
  "englishTitle": "Subtitle or Alternative Title",
  "genre": "${genre || 'Local Drama / Township Stories'}",
  "synopsis": "Brief synopsis of the drama",
  "proverb": {
    "sepedi": "Local South African saying or idiom",
    "english": "Meaning / Explanation"
  },
  "characters": [
    {
      "name": "Character Name (e.g. Bra Themba / Gogo Zodwa)",
      "role": "e.g. Wise Mentor / Taxi Driver / Young Entrepreneur",
      "voiceGender": "female" or "male",
      "pitch": "low" | "medium" | "high",
      "description": "Short personality description"
    }
  ],
  "dialogues": [
    {
      "id": "d1",
      "speaker": "Character Name",
      "sepediText": "Spoken dialogue line in authentic Local South African English (with natural local cadence, slang or warmth if appropriate)",
      "englishTranslation": "Context or nuance note",
      "soundEffect": "Optional background sound or cue (e.g. [distant jazz music] or [rain pouring on tin roof])",
      "pauseAfterMs": 500
    }
  ]
}`;

    const userPrompt = `Create a gripping Local South African English voice drama script about: "${prompt}". 
Genre: ${genre || 'Local Drama'}
Tone: ${tone || 'Heartfelt & Inspiring'}
Number of characters: ${characterCount}
Ensure authentic South African storytelling flair, relatable characters, and engaging dialogue.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      },
    });

    const textOutput = response.text || "{}";
    let dramaData;
    try {
      dramaData = JSON.parse(textOutput);
    } catch (parseErr) {
      // Fallback cleanup if markdown blocks were included
      const cleaned = textoutputClean(textOutput);
      dramaData = JSON.parse(cleaned);
    }

    return res.json({ success: true, drama: dramaData });
  } catch (error: any) {
    console.error("Error generating drama:", error);
    return res.status(500).json({ error: error.message || "Failed to generate voice drama" });
  }
});

function textoutputClean(text: string): string {
  let s = text.trim();
  if (s.startsWith("```json")) {
    s = s.replace(/^```json/, "").replace(/```$/, "");
  } else if (s.startsWith("```")) {
    s = s.replace(/^```/, "").replace(/```$/, "");
  }
  return s.trim();
}

// API endpoint for realistic Text-to-Speech (TTS) using Gemini TTS models
app.post("/api/synthesize-line", async (req, res) => {
  try {
    const { text, style, voiceName } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: text,
              speechMetadata: {
                style: style || "Dramatic, emotive voice actor narrating African traditional folklore in Sepedi with natural cadence",
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio generated from Gemini TTS");
    }

    return res.json({ success: true, audioBase64: base64Audio });
  } catch (err: any) {
    console.error("TTS generation error:", err);
    return res.status(500).json({ error: err.message || "Failed to synthesize speech" });
  }
});

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
