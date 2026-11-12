/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Sparkles,
  Download,
  BookOpen,
  Bookmark,
  Share2,
  RefreshCw,
  Plus,
  Trash2,
  ListMusic,
  Mic,
  Sliders,
  Radio,
  Clock,
  Heart,
  Globe,
  CheckCircle2,
  FileText,
  HelpCircle,
  FolderDown,
  WifiOff,
  Wand2,
  UserCheck
} from "lucide-react";

interface Character {
  name: string;
  role: string;
  voiceGender: string;
  pitch: string;
  description: string;
  geminiVoice?: string;
  emotionalStyle?: string;
}

interface DialogueLine {
  id: string;
  speaker: string;
  sepediText: string;
  englishTranslation: string;
  soundEffect?: string;
  pauseAfterMs?: number;
}

interface DramaScript {
  id?: string;
  title: string;
  englishTitle: string;
  genre: string;
  synopsis: string;
  proverb: {
    sepedi: string;
    english: string;
  };
  characters: Character[];
  dialogues: DialogueLine[];
  createdAt?: string;
  isOfflineSaved?: boolean;
}

const GEMINI_VOICES = [
  { id: "Kore", label: "Kore (Warm & Expressive Female)" },
  { id: "Puck", label: "Puck (Bright & Energetic Male)" },
  { id: "Fenrir", label: "Fenrir (Deep & Authoritative Male)" },
  { id: "Charon", label: "Charon (Calm & Wise Mentor)" },
  { id: "Zephyr", label: "Zephyr (Soft & Cinematic Narrator)" }
];

const PRESET_PROMPTS = [
  {
    title: "The Taxi Rank Rhythm",
    genre: "Township Drama / Urban Life",
    tone: "Lively & Authentic",
    prompt: "A bustling morning at a Johannesburg taxi rank where Bra Themba, a veteran driver, helps a young entrepreneur catch her big break while sorting out morning commuter chaos."
  },
  {
    title: "Braai Smoke and Sunday Stories",
    genre: "Family & Community",
    tone: "Warm & Heartfelt",
    prompt: "A Sunday afternoon family braai in Soweto where Gogo Zodwa shares generational wisdom about resilience, community, and the secret to her famous chakalaka."
  },
  {
    title: "The Secret of Maboneng",
    genre: "Urban Mystery",
    tone: "Suspenseful & Clever",
    prompt: "Two friends investigating an old vintage record store in Maboneng stumble upon a lost jazz master tape from the 1960s."
  },
  {
    title: "Karoo Stargazing",
    genre: "Rural Tales / Small Town",
    tone: "Peaceful & Reflective",
    prompt: "A quiet evening under the vast Karoo stars in Sutherland where an astronomer and a local storyteller discuss the folklore of the southern sky."
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"generator" | "player" | "library" | "about">("generator");
  
  // Generator State
  const [promptInput, setPromptInput] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Township Drama / Urban Life");
  const [selectedTone, setSelectedTone] = useState("Heartfelt & Inspiring");
  const [characterCount, setCharacterCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");

  // Current Drama Script & Library
  const [currentDrama, setCurrentDrama] = useState<DramaScript | null>(null);
  const [library, setLibrary] = useState<DramaScript[]>([]);

  // Audio Player & Gemini TTS State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [ambientSound, setAmbientSound] = useState<string>("none");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});

  // Refs
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const ambientTimerRef = useRef<any>(null);

  // Load library on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("local_english_drama_library");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setLibrary(parsed);
          if (parsed.length > 0 && !currentDrama) {
            setCurrentDrama(parsed[0]);
          }
        } catch (e) {
          console.error("Failed to parse library", e);
        }
      } else {
        loadDefaultDrama();
      }
    }
    return () => {
      stopPlayback();
      stopAmbientSound();
    };
  }, []);

  const saveLibraryToStorage = (updated: DramaScript[]) => {
    setLibrary(updated);
    localStorage.setItem("local_english_drama_library", JSON.stringify(updated));
  };

  const loadDefaultDrama = async () => {
    const defaultDrama: DramaScript = {
      id: "preset-1",
      title: "The Taxi Rank Rhythm",
      englishTitle: "Morning Rush in Jozi",
      genre: "Township Drama / Urban Life",
      synopsis: "A bustling morning at a Johannesburg taxi rank where Bra Themba helps a young entrepreneur catch her big break.",
      proverb: {
        sepedi: "Umuntu ngumuntu ngabantu (A person is a person through other people).",
        english: "Community and mutual support enrich our lives."
      },
      characters: [
        { name: "Bra Themba", role: "Veteran Taxi Driver", voiceGender: "male", pitch: "low", description: "Wise, warm-hearted taxi rank veteran with endless local wisdom", geminiVoice: "Fenrir" },
        { name: "Lerato", role: "Young Entrepreneur", voiceGender: "female", pitch: "medium", description: "Determined young designer heading to her first big pitch", geminiVoice: "Kore" },
        { name: "Narrator", role: "Storyteller", voiceGender: "male", pitch: "medium", description: "Smooth, cinematic voice guiding the listener", geminiVoice: "Zephyr" }
      ],
      dialogues: [
        { id: "1", speaker: "Narrator", sepediText: "Early morning in downtown Johannesburg, the sun crests over Ponte City as commuters stream into the taxi rank.", englishTranslation: "Scene setting", soundEffect: "[Township street chatter and cars hooting]" },
        { id: "2", speaker: "Bra Themba", sepediText: "Aweh my sister! You looking sharp today. Don't stress about the morning traffic, we will get you to Sandton on time.", englishTranslation: "Encouraging greeting", soundEffect: "[Taxi engine revving]" },
        { id: "3", speaker: "Lerato", sepediText: "Thanks Bra Themba! I really need this client meeting to go well. It's make or break for my clothing brand.", englishTranslation: "Expressing hope" },
        { id: "4", speaker: "Bra Themba", sepediText: "Eish, just remember where you come from. When your heart is in the right place, everything falls into line. Sharp sharp!", englishTranslation: "Giving local wisdom" }
      ],
      createdAt: new Date().toISOString(),
      isOfflineSaved: true
    };
    setCurrentDrama(defaultDrama);
    saveLibraryToStorage([defaultDrama]);
  };

  // Generate Drama via backend API
  const handleGenerateDrama = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim()) return;

    setIsGenerating(true);
    setGenerationError("");

    try {
      const res = await fetch("/api/generate-drama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptInput,
          genre: selectedGenre,
          tone: selectedTone,
          characterCount
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate voice drama");
      }

      const voices = ["Kore", "Puck", "Fenrir", "Charon", "Zephyr"];
      const enhancedCharacters = (data.drama.characters || []).map((c: any, idx: number) => ({
        ...c,
        geminiVoice: voices[idx % voices.length]
      }));

      const newDrama: DramaScript = {
        id: "drama-" + Date.now(),
        ...data.drama,
        characters: enhancedCharacters,
        createdAt: new Date().toISOString(),
        isOfflineSaved: true
      };

      setCurrentDrama(newDrama);
      saveLibraryToStorage([newDrama, ...library]);
      setAudioCache({});
      setActiveTab("player");
      setPromptInput("");
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Generation error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Web Audio Ambient Sound Generator
  const startAmbientSound = (type: string) => {
    stopAmbientSound();
    if (type === "none") return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.value = 0.15 * volume;
      gain.connect(ctx.destination);
      ambientGainRef.current = gain;

      if (type === "rain") {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1000;

        noise.connect(filter);
        filter.connect(gain);
        noise.start();
      } else if (type === "wind") {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2) * 0.1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 300;
        filter.Q.value = 3;

        noise.connect(filter);
        filter.connect(gain);
        noise.start();
      } else if (type === "drums") {
        const playBeat = () => {
          if (!audioCtxRef.current) return;
          const osc = audioCtxRef.current.createOscillator();
          const dGain = audioCtxRef.current.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(90, audioCtxRef.current.currentTime);
          osc.frequency.exponentialRampToValueAtTime(30, audioCtxRef.current.currentTime + 0.15);

          dGain.gain.setValueAtTime(0.3 * volume, audioCtxRef.current.currentTime);
          dGain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.3);

          osc.connect(dGain);
          dGain.connect(audioCtxRef.current.destination);
          osc.start();
          osc.stop(audioCtxRef.current.currentTime + 0.3);
        };
        playBeat();
        ambientTimerRef.current = setInterval(playBeat, 1200);
      }
    } catch (e) {
      console.error("Ambient audio error", e);
    }
  };

  const stopAmbientSound = () => {
    if (ambientTimerRef.current) {
      clearInterval(ambientTimerRef.current);
      ambientTimerRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    if (ambientSound !== "none") {
      startAmbientSound(ambientSound);
    } else {
      stopAmbientSound();
    }
  }, [ambientSound]);

  // Playback using Gemini TTS backend (/api/synthesize-line)
  const playDrama = () => {
    if (!currentDrama) return;
    if (isPlaying) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (audioElementRef.current && audioElementRef.current.paused && audioElementRef.current.currentTime > 0) {
      audioElementRef.current.play();
      setIsPlaying(true);
      return;
    }

    playLine(currentLineIndex);
  };

  const playLine = async (index: number) => {
    if (!currentDrama) return;
    if (index >= currentDrama.dialogues.length) {
      setIsPlaying(false);
      setCurrentLineIndex(0);
      return;
    }

    setCurrentLineIndex(index);
    const line = currentDrama.dialogues[index];
    const char = currentDrama.characters.find(c => c.name === line.speaker);
    const voiceName = char?.geminiVoice || "Kore";

    let base64Wav = audioCache[line.id];

    if (!base64Wav) {
      setIsSynthesizing(true);
      try {
        const res = await fetch("/api/synthesize-line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: line.sepediText,
            speaker: line.speaker,
            style: `Expressive South African Local English voice acting for character ${line.speaker} (${char?.role || 'Actor'}), warm, engaging and natural cadence`,
            voiceName
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "TTS failed");

        base64Wav = data.audioBase64;
        setAudioCache(prev => ({ ...prev, [line.id]: base64Wav }));
      } catch (err) {
        console.error("Gemini TTS synthesis failed, using browser SpeechSynthesis fallback:", err);
        fallbackBrowserSpeech(line, index);
        setIsSynthesizing(false);
        return;
      } finally {
        setIsSynthesizing(false);
      }
    }

    if (base64Wav) {
      const audioUrl = `data:audio/wav;base64,${base64Wav}`;
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackRate;
      audio.volume = volume;
      audioElementRef.current = audio;

      audio.onended = () => {
        const pause = line.pauseAfterMs || 500;
        setTimeout(() => {
          if (index + 1 < currentDrama.dialogues.length) {
            playLine(index + 1);
          } else {
            setIsPlaying(false);
            setCurrentLineIndex(0);
          }
        }, pause);
      };

      audio.onerror = (e) => {
        console.error("Audio playback error", e);
        setIsPlaying(false);
      };

      try {
        await audio.play();
        setIsPlaying(true);
      } catch (playErr) {
        console.error("Audio play error:", playErr);
        setIsPlaying(false);
      }
    }
  };

  const fallbackBrowserSpeech = (line: DialogueLine, index: number) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(line.sepediText.replace(/\[.*?\]/g, ""));
    utterance.rate = playbackRate;
    utterance.volume = volume;

    utterance.onend = () => {
      setTimeout(() => {
        if (index + 1 < currentDrama!.dialogues.length) {
          playLine(index + 1);
        } else {
          setIsPlaying(false);
          setCurrentLineIndex(0);
        }
      }, 500);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setCurrentLineIndex(0);
    setIsSynthesizing(false);
  };

  const jumpToLine = (index: number) => {
    stopPlayback();
    setCurrentLineIndex(index);
    playLine(index);
  };

  const updateCharacterVoice = (charName: string, voiceName: string) => {
    if (!currentDrama) return;
    const updatedChars = currentDrama.characters.map(c => 
      c.name === charName ? { ...c, geminiVoice: voiceName } : c
    );
    setCurrentDrama({ ...currentDrama, characters: updatedChars });
    setAudioCache({});
  };

  const downloadScriptJson = () => {
    if (!currentDrama) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentDrama, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${currentDrama.title.replace(/\s+/g, "_")}_script.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const downloadScriptText = () => {
    if (!currentDrama) return;
    let txt = `LOCAL ENGLISH VOICE DRAMA SCRIPT\n`;
    txt += `Title: ${currentDrama.title} (${currentDrama.englishTitle})\n`;
    txt += `Genre: ${currentDrama.genre}\n`;
    txt += `Synopsis: ${currentDrama.synopsis}\n\n`;
    txt += `LOCAL SAYING / PROVERB:\n- ${currentDrama.proverb.sepedi} (${currentDrama.proverb.english})\n\n`;
    txt += `CHARACTERS:\n`;
    currentDrama.characters.forEach(c => {
      txt += `- ${c.name} (${c.role}) [Voice: ${c.geminiVoice || 'Kore'}]: ${c.description}\n`;
    });
    txt += `\n--- DIALOGUE SCRIPT ---\n\n`;
    currentDrama.dialogues.forEach(d => {
      txt += `[${d.speaker}]: ${d.sepediText}\n`;
      if (d.soundEffect) txt += `   *Cue: ${d.soundEffect}*\n`;
      txt += `\n`;
    });

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${currentDrama.title.replace(/\s+/g, "_")}_script.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleOfflineSave = (dramaId: string) => {
    const updated = library.map(item => {
      if (item.id === dramaId) {
        return { ...item, isOfflineSaved: !item.isOfflineSaved };
      }
      return item;
    });
    saveLibraryToStorage(updated);
    if (currentDrama && currentDrama.id === dramaId) {
      setCurrentDrama({ ...currentDrama, isOfflineSaved: !currentDrama.isOfflineSaved });
    }
  };

  const deleteDrama = (dramaId: string) => {
    const updated = library.filter(item => item.id !== dramaId);
    saveLibraryToStorage(updated);
    if (currentDrama?.id === dramaId) {
      setCurrentDrama(updated.length > 0 ? updated[0] : null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-stone-800 bg-stone-900/80 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("generator")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg shadow-amber-900/30 text-white font-bold text-xl">
            🎙️
          </div>
          <div>
            <h1 className="font-bold text-lg lg:text-xl tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-500 bg-clip-text text-transparent">
              Local English Voice Drama Studio
            </h1>
            <p className="text-xs text-stone-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              South African Local English Neural TTS & Offline Player
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 bg-stone-950/60 p-1.5 rounded-2xl border border-stone-800">
          <button
            onClick={() => setActiveTab("generator")}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "generator"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
                : "text-stone-400 hover:text-white hover:bg-stone-950"
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline">Studio Generator</span>
          </button>
          <button
            onClick={() => setActiveTab("player")}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "player"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
                : "text-stone-400 hover:text-white hover:bg-stone-950"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span className="hidden sm:inline">Neural Player</span>
            {currentDrama && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "library"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
                : "text-stone-400 hover:text-white hover:bg-stone-950"
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span className="hidden sm:inline">Offline Library</span>
            <span className="bg-stone-800 text-stone-300 text-xs px-1.5 py-0.5 rounded-full">
              {library.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "about"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
                : "text-stone-400 hover:text-white hover:bg-stone-950"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">About</span>
          </button>
        </nav>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        
        {/* --- GENERATOR TAB --- */}
        {activeTab === "generator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left: Input & Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-stone-900/70 border border-stone-800/80 rounded-3xl p-6 lg:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-stone-100">Create Local English Voice Drama</h2>
                    <p className="text-sm text-stone-400">Describe a plot or choose a local South African preset to generate a realistic multi-character script.</p>
                  </div>
                </div>

                <form onSubmit={handleGenerateDrama} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                      Story Prompt / Plot Idea
                    </label>
                    <textarea
                      rows={4}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="e.g. A busy Saturday afternoon braai in Durban where neighbors share stories and solve a neighborhood mystery..."
                      className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-4 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-all text-sm leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                        Genre / Style
                      </label>
                      <select
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 focus:outline-none focus:border-amber-600"
                      >
                        <option value="Township Drama / Urban Life">Township Drama / Urban Life</option>
                        <option value="Family & Community">Family & Community</option>
                        <option value="Urban Mystery">Urban Mystery</option>
                        <option value="Rural Tales / Small Town">Rural Tales / Small Town</option>
                        <option value="Comedy & Everyday Life">Comedy & Everyday Life</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                        Emotional Tone
                      </label>
                      <select
                        value={selectedTone}
                        onChange={(e) => setSelectedTone(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-stone-200 focus:outline-none focus:border-amber-600"
                      >
                        <option value="Heartfelt & Inspiring">Heartfelt & Inspiring</option>
                        <option value="Lively & Energetic">Lively & Energetic</option>
                        <option value="Suspenseful & Clever">Suspenseful & Clever</option>
                        <option value="Warm & Nostalgic">Warm & Nostalgic</option>
                        <option value="Humorous & Friendly">Humorous & Friendly</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                      Character Roles ({characterCount})
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={5}
                      value={characterCount}
                      onChange={(e) => setCharacterCount(parseInt(e.target.value))}
                      className="w-full accent-amber-600 bg-stone-950 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-stone-500 mt-1">
                      <span>2 Roles (Duet)</span>
                      <span>3 Roles</span>
                      <span>4 Roles</span>
                      <span>5 Roles (Full Cast)</span>
                    </div>
                  </div>

                  {generationError && (
                    <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs">
                      {generationError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isGenerating || !promptInput.trim()}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-amber-900/30 flex items-center justify-center gap-3 transition-all cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating Local English Drama...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Voice Drama Script & Neural Audio
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Presets */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-stone-900/70 border border-stone-800/80 rounded-3xl p-6 lg:p-8 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-stone-200">Local Story Presets</h3>
                </div>
                <p className="text-xs text-stone-400 mb-6">
                  Tap any preset to instantly generate an authentic South African Local English radio drama with multi-character neural voice mapping.
                </p>

                <div className="space-y-3">
                  {PRESET_PROMPTS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setPromptInput(preset.prompt);
                        setSelectedGenre(preset.genre);
                        setSelectedTone(preset.tone);
                      }}
                      className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 hover:border-amber-600/50 hover:bg-stone-900 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-stone-200 group-hover:text-amber-400 text-sm">
                          {preset.title}
                        </h4>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {preset.genre.split("/")[0]}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-2 line-clamp-2">
                        {preset.prompt}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-amber-950/20 border border-amber-900/30 flex items-start gap-3">
                  <WifiOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200/80">
                    <span className="font-semibold text-amber-400 block mb-1">Offline Playback Ready</span>
                    All generated dramas are automatically saved to your browser storage for playback even without internet connection.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- AUDIO PLAYER TAB --- */}
        {activeTab === "player" && currentDrama && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Left: Script Viewer & Dialogue Highlights */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-stone-900/70 border border-stone-800 rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col h-[750px]">
                {/* Drama Header */}
                <div className="border-b border-stone-800 pb-5 mb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        {currentDrama.genre}
                      </span>
                      <h2 className="text-2xl font-bold text-stone-100 mt-2">{currentDrama.title}</h2>
                      <p className="text-sm text-stone-400 italic">{currentDrama.englishTitle}</p>
                    </div>
                    <button
                      onClick={() => toggleOfflineSave(currentDrama.id || "")}
                      className={`p-3 rounded-2xl border transition-all ${
                        currentDrama.isOfflineSaved
                          ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30"
                          : "bg-stone-950 text-stone-400 border-stone-800 hover:text-white"
                      }`}
                      title={currentDrama.isOfflineSaved ? "Saved for offline" : "Save offline"}
                    >
                      <Bookmark className="w-5 h-5 fill-current" />
                    </button>
                  </div>

                  <p className="text-xs text-stone-300 mt-4 leading-relaxed bg-stone-950/50 p-3 rounded-xl border border-stone-800">
                    {currentDrama.synopsis}
                  </p>

                  {/* Local Proverb / Saying Card */}
                  {currentDrama.proverb && (
                    <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-950/40 to-stone-950 border border-amber-900/30 text-xs flex items-center gap-3">
                      <span className="text-lg">🇿🇦</span>
                      <div>
                        <p className="font-medium text-amber-300">Local Saying: "{currentDrama.proverb.sepedi}"</p>
                        <p className="text-stone-400 text-[11px] mt-0.5">{currentDrama.proverb.english}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Character Voice Customization */}
                <div className="mb-4 p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-500" /> Character Neural Voice Assigner
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentDrama.characters.map((c, idx) => (
                      <div key={idx} className="bg-stone-900 p-2.5 rounded-xl border border-stone-800 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-200">{c.name}</span>
                          <span className="text-[10px] text-stone-500">{c.role}</span>
                        </div>
                        <select
                          value={c.geminiVoice || "Kore"}
                          onChange={(e) => updateCharacterVoice(c.name, e.target.value)}
                          className="bg-stone-950 border border-stone-800 rounded-lg p-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-600"
                        >
                          {GEMINI_VOICES.map(v => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dialogue Lines Scroll Area */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {currentDrama.dialogues.map((line, index) => {
                    const isCurrent = currentLineIndex === index && isPlaying;
                    return (
                      <div
                        key={line.id || index}
                        onClick={() => jumpToLine(index)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-amber-950/30 border-amber-500/80 shadow-lg shadow-amber-950/50 ring-1 ring-amber-500"
                            : "bg-stone-950/50 border-stone-800 hover:border-stone-700 hover:bg-stone-950"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-bold ${isCurrent ? "text-amber-400" : "text-stone-400"}`}>
                            {line.speaker}
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">Line {index + 1}</span>
                        </div>
                        <p className="text-sm font-medium text-stone-100 mb-1 leading-relaxed">
                          {line.sepediText}
                        </p>
                        {line.soundEffect && (
                          <div className="mt-2 text-[11px] text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block">
                            🔊 {line.soundEffect}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Audio Player Controls & Export */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-stone-900/70 border border-stone-800 rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
                <h3 className="font-semibold text-stone-200 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-amber-500" />
                  Gemini Neural TTS & Soundscapes
                </h3>

                {/* Big Play / Pause Controller */}
                <div className="bg-stone-950 border border-stone-800 rounded-3xl p-6 text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg shadow-amber-900/50 text-white relative">
                    {isSynthesizing ? (
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    ) : isPlaying ? (
                      <Volume2 className="w-10 h-10 animate-pulse" />
                    ) : (
                      <Mic className="w-10 h-10" />
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-stone-100 text-base">{currentDrama.title}</h4>
                    <p className="text-xs text-stone-400 mt-1">
                      {isSynthesizing ? "Synthesizing neural voice..." : isPlaying ? `Playing line ${currentLineIndex + 1} of ${currentDrama.dialogues.length}` : "Ready to play"}
                    </p>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={stopPlayback}
                      className="p-3 rounded-2xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 transition-all cursor-pointer"
                      title="Stop"
                    >
                      <Square className="w-5 h-5" />
                    </button>
                    <button
                      onClick={playDrama}
                      disabled={isSynthesizing}
                      className="px-6 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-amber-900/40 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-5 h-5" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 fill-current" /> Play Drama
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Ambient Soundscapes */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Ambient Soundscape
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "none", label: "🔇 Silent", desc: "No background" },
                      { id: "drums", label: "🪘 Township Groove", desc: "Local rhythm" },
                      { id: "rain", label: "🌧️ Summer Rain", desc: "Soothing downpour" },
                      { id: "wind", label: "💨 Karoo Breeze", desc: "Gentle wind" }
                    ].map(snd => (
                      <button
                        key={snd.id}
                        onClick={() => setAmbientSound(snd.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          ambientSound === snd.id
                            ? "bg-amber-600/20 border-amber-500 text-amber-300"
                            : "bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900"
                        }`}
                      >
                        <div className="font-medium text-xs text-stone-200">{snd.label}</div>
                        <div className="text-[10px] text-stone-500">{snd.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed & Volume Sliders */}
                <div className="space-y-4 pt-2 border-t border-stone-800">
                  <div>
                    <div className="flex justify-between text-xs text-stone-400 mb-1">
                      <span>Playback Speed</span>
                      <span className="font-mono text-amber-400">{playbackRate}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.75}
                      max={1.5}
                      step={0.25}
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 bg-stone-950 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-stone-400 mb-1">
                      <span>Volume</span>
                      <span className="font-mono text-amber-400">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.1}
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 bg-stone-950 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Mobile Export Options */}
                <div className="pt-2 border-t border-stone-800 space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Export & Mobile Share
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={downloadScriptText}
                      className="py-3 px-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-600 text-stone-200 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-amber-500" />
                      Export Script (.txt)
                    </button>
                    <button
                      onClick={downloadScriptJson}
                      className="py-3 px-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-600 text-stone-200 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-amber-500" />
                      Export Data (.json)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- LIBRARY TAB --- */}
        {activeTab === "library" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-stone-100">Offline Drama Library</h2>
                <p className="text-sm text-stone-400">Access and play your saved Local English voice dramas offline anytime.</p>
              </div>
              <button
                onClick={() => setActiveTab("generator")}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> New Drama
              </button>
            </div>

            {library.length === 0 ? (
              <div className="bg-stone-900/70 border border-stone-800 rounded-3xl p-12 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center text-2xl">
                  📚
                </div>
                <h3 className="font-semibold text-stone-200 text-lg">Your library is empty</h3>
                <p className="text-stone-400 text-xs max-w-md mx-auto">
                  Generate your first Local English voice drama script using the Studio Generator tab.
                </p>
                <button
                  onClick={() => setActiveTab("generator")}
                  className="px-6 py-3 rounded-2xl bg-amber-600 text-white text-xs font-semibold"
                >
                  Go to Generator
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {library.map((item) => (
                  <div
                    key={item.id}
                    className="bg-stone-900/70 border border-stone-800 rounded-3xl p-6 flex flex-col justify-between hover:border-amber-600/50 transition-all group shadow-xl"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
                          {item.genre.split("/")[0]}
                        </span>
                        <button
                          onClick={() => toggleOfflineSave(item.id || "")}
                          className={`p-1.5 rounded-xl transition-all ${
                            item.isOfflineSaved
                              ? "text-amber-500 bg-amber-500/10"
                              : "text-stone-600 hover:text-stone-400"
                          }`}
                          title="Offline Saved"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                      </div>

                      <h3 className="font-bold text-stone-100 group-hover:text-amber-400 text-base transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-stone-400 italic">{item.englishTitle}</p>
                      <p className="text-xs text-stone-300 line-clamp-3 leading-relaxed">
                        {item.synopsis}
                      </p>
                    </div>

                    <div className="pt-5 mt-5 border-t border-stone-800 flex items-center justify-between gap-3">
                      <div className="text-[11px] text-stone-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.dialogues?.length || 0} lines
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCurrentDrama(item);
                            setAudioCache({});
                            setActiveTab("player");
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-900/20 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Play
                        </button>
                        <button
                          onClick={() => deleteDrama(item.id || "")}
                          className="p-2 rounded-xl bg-stone-950 border border-stone-800 hover:border-red-900 text-stone-500 hover:text-red-400 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- ABOUT TAB --- */}
        {activeTab === "about" && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-stone-900/70 border border-stone-800 rounded-3xl p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-100">About Local English Voice Drama Studio</h2>
                  <p className="text-sm text-stone-400">South African Local English dramatic storytelling powered by Gemini Neural TTS.</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-stone-300 leading-relaxed">
                <p>
                  <strong>Local English Voice Drama Studio</strong> creates rich audio dramas in authentic South African Local English, featuring everyday community life, township stories, urban mysteries, and cultural warmth.
                </p>
                <h3 className="font-semibold text-amber-400 pt-2">Key Highlights:</h3>
                <ul className="list-disc pl-5 space-y-2 text-stone-300 text-xs">
                  <li><strong>Local English Storytelling:</strong> Generates gripping scripts tailored to South African culture, idiom, and warmth.</li>
                  <li><strong>Gemini Neural TTS:</strong> Professional-grade voice acting across multiple character personas.</li>
                  <li><strong>Offline Playback & Export:</strong> Save dramas to your browser library and export scripts instantly.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800 bg-stone-900/50 py-4 px-6 text-center text-xs text-stone-500">
        Local English Voice Drama Studio &bull; Powered by Gemini Neural TTS
      </footer>
    </div>
  );
}
