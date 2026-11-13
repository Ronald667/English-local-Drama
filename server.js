var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_supabase_js = require("@supabase/supabase-js");
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json());
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
var supabaseServer = supabaseUrl && supabaseKey ? (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey) : null;
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
  "genre": "${genre || "Local Drama / Township Stories"}",
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
Genre: ${genre || "Local Drama"}
Tone: ${tone || "Heartfelt & Inspiring"}
Number of characters: ${characterCount}
Ensure authentic South African storytelling flair, relatable characters, and engaging dialogue.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: import_genai.ThinkingLevel.MEDIUM }
      }
    });
    const textOutput = response.text || "{}";
    let dramaData;
    try {
      dramaData = JSON.parse(textOutput);
    } catch (parseErr) {
      const cleaned = textoutputClean(textOutput);
      dramaData = JSON.parse(cleaned);
    }
    return res.json({ success: true, drama: dramaData });
  } catch (error) {
    console.error("Error generating drama:", error);
    return res.status(500).json({ error: error.message || "Failed to generate voice drama" });
  }
});
function textoutputClean(text) {
  let s = text.trim();
  if (s.startsWith("```json")) {
    s = s.replace(/^```json/, "").replace(/```$/, "");
  } else if (s.startsWith("```")) {
    s = s.replace(/^```/, "").replace(/```$/, "");
  }
  return s.trim();
}
app.post("/api/synthesize-line", async (req, res) => {
  try {
    const { text, style, voiceName, emotionalIntensity } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    let intensityDesc = "moderate emotional expression";
    if (emotionalIntensity !== void 0) {
      const val = parseInt(emotionalIntensity, 10);
      if (val >= 4) intensityDesc = "very high emotional intensity, deeply passionate, dramatic, and emphatic performance";
      else if (val === 3) intensityDesc = "balanced emotional expression, engaging and natural storytelling tone";
      else intensityDesc = "calm, understated, and gentle tone";
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text,
              speechMetadata: {
                style: `${style || "Expressive voice acting"}, with ${intensityDesc}`
              }
            }
          ]
        }
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" }
          }
        }
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio generated from Gemini TTS");
    }
    return res.json({ success: true, audioBase64: base64Audio });
  } catch (err) {
    console.error("TTS generation error:", err);
    return res.status(500).json({ error: err.message || "Failed to synthesize speech" });
  }
});
app.get("/api/dramas", async (req, res) => {
  if (!supabaseServer) {
    return res.json({ success: true, dramas: [], source: "local" });
  }
  try {
    const { data, error } = await supabaseServer.from("dramas").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ success: true, dramas: data || [], source: "supabase" });
  } catch (err) {
    console.error("Supabase fetch error:", err);
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/dramas", async (req, res) => {
  if (!supabaseServer) {
    return res.json({ success: true, message: "Supabase not configured, saved locally" });
  }
  try {
    const drama = req.body;
    const { data, error } = await supabaseServer.from("dramas").upsert([drama]).select();
    if (error) throw error;
    return res.json({ success: true, drama: data?.[0], source: "supabase" });
  } catch (err) {
    console.error("Supabase save error:", err);
    return res.status(500).json({ error: err.message });
  }
});
async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(import_express.default.static("dist"));
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
