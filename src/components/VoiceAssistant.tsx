import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2, X, Bot, Loader2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VoiceAssistantProps {
  carNumber: string;
  trainingArea: string;
  currentSession: string;
  remainingTime: string;
  shift: string;
  ramadanDay: number | null;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LANGUAGES = [
  { code: "ar", label: "العربية (عامي)", flag: "🇸🇦", speechLang: "ar-AE", greeting: "هلا والله! 👋", subtitle: "أنا رفيقك الذكي بسيارة التدريب" },
  { code: "en", label: "English", flag: "🇬🇧", speechLang: "en-US", greeting: "Hello! 👋", subtitle: "I'm your smart assistant" },
  { code: "ur", label: "اردو", flag: "🇵🇰", speechLang: "ur-PK", greeting: "!خوش آمدید 👋", subtitle: "میں آپ کا ذہین معاون ہوں" },
  { code: "ps", label: "پښتو", flag: "🇦🇫", speechLang: "ps-AF", greeting: "!ښه راغلاست 👋", subtitle: "زه ستاسو هوښیار مرستیال یم" },
  { code: "ml", label: "മലയാളം", flag: "🇮🇳", speechLang: "ml-IN", greeting: "സ്വാഗതം! 👋", subtitle: "ഞാൻ നിങ്ങളുടെ സ്മാർട്ട് അസിസ്റ്റൻ്റ്" },
];

const VoiceAssistant = ({
  carNumber, trainingArea, currentSession, remainingTime, shift, ramadanDay, onClose,
}: VoiceAssistantProps) => {
  const [selectedLang, setSelectedLang] = useState<typeof LANGUAGES[0] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!selectedLang) return;
    stopSpeaking();
    setIsSpeaking(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, language: selectedLang.code }),
        }
      );

      if (!response.ok) {
        console.error("ElevenLabs TTS failed:", response.status);
        setIsSpeaking(false);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch (e) {
      console.error("TTS error:", e);
      setIsSpeaking(false);
    }
  }, [selectedLang, stopSpeaking]);

  const sendToAI = useCallback(async (userText: string) => {
    if (!selectedLang) return;
    const userMsg: Message = { role: "user", content: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("car-assistant", {
        body: {
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          context: { carNumber, trainingArea, currentSession, remainingTime, shift, ramadanDay },
          language: selectedLang.code,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const reply = data?.reply || "...";
      const assistantMsg: Message = { role: "assistant", content: reply };
      setMessages(prev => [...prev, assistantMsg]);
      speak(reply);
    } catch (e: any) {
      console.error("AI error:", e);
      setError(e.message || "Error");
    } finally {
      setIsLoading(false);
    }
  }, [messages, carNumber, trainingArea, currentSession, remainingTime, shift, ramadanDay, speak, selectedLang]);

  const startListening = useCallback(() => {
    if (!selectedLang) return;
    setError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Browser doesn't support speech recognition");
      return;
    }

    stopSpeaking();

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang.speechLang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => { setIsListening(true); setTranscript(""); };
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      setTranscript(finalText || interimText);
    };
    recognition.onend = () => {
      setIsListening(false);
      setTimeout(() => {
        const el = document.getElementById("voice-transcript");
        const text = el?.textContent || "";
        if (text.trim()) sendToAI(text.trim());
      }, 100);
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error !== "aborted") setError(`Speech error: ${event.error}`);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [selectedLang, sendToAI]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const quickQuestions: Record<string, string[]> = {
    ar: ["كم باقي على انتهاء الحصة؟", "شو الحصة الحالية؟", "عطني نصيحة للقيادة", "متى تخلص الفترة؟"],
    en: ["How much time is left?", "What's the current session?", "Give me a driving tip", "When does the shift end?"],
    ur: ["حصے کا کتنا وقت باقی ہے؟", "موجودہ حصہ کون سا ہے؟", "ڈرائیونگ کی نصیحت دیں", "شفٹ کب ختم ہوگی؟"],
    ps: ["د حصې څومره وخت پاتې دی؟", "اوسنی حصه کومه ده؟", "د چلولو نصیحت راکړئ", "شفټ کله پای ته رسیږي؟"],
    ml: ["ക്ലാസിന് എത്ര സമയം ബാക്കിയുണ്ട്?", "ഇപ്പോഴത്തെ സെഷൻ ഏതാണ്?", "ഡ്രൈവിംഗ് ടിപ്പ് തരൂ", "ഷിഫ്റ്റ് എപ്പോൾ തീരും?"],
  };

  // Language selection screen
  if (!selectedLang) {
    return (
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-white text-sm font-bold">Select Language</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center mb-6">
            <Bot className="w-10 h-10 text-blue-400" />
          </div>
          <p className="text-white text-lg font-bold mb-1">اختر اللغة / Choose Language</p>
          <p className="text-neutral-500 text-sm mb-8">Select your preferred language</p>

          <div className="w-full max-w-sm space-y-3">
            {LANGUAGES.map((lang) => (
              <motion.button
                key={lang.code}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedLang(lang)}
                className="w-full flex items-center gap-4 bg-neutral-900/80 border border-neutral-700 hover:border-blue-500/50 hover:bg-neutral-800/80 rounded-2xl px-5 py-4 transition-all"
              >
                <span className="text-3xl">{lang.flag}</span>
                <span className="text-white text-base font-semibold flex-1 text-left">{lang.label}</span>
                <div className="w-5 h-5 rounded-full border-2 border-neutral-600" />
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  const isRtl = ["ar", "ur", "ps"].includes(selectedLang.code);

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-white text-sm font-bold block">{selectedLang.greeting.replace(" 👋", "")}</span>
            <span className="text-neutral-500 text-[10px]">{selectedLang.flag} {selectedLang.label} • {carNumber}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setSelectedLang(null); setMessages([]); setTranscript(""); }} className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
            <Globe className="w-4 h-4 text-neutral-400" />
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-white font-bold mb-1">{selectedLang.greeting}</p>
            <p className="text-neutral-500 text-sm mb-6">{selectedLang.subtitle}</p>

            <div className="grid grid-cols-2 gap-2">
              {(quickQuestions[selectedLang.code] || quickQuestions.en).map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendToAI(q)}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-neutral-300 text-xs hover:bg-neutral-800 transition-colors"
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-neutral-800 text-neutral-200 border border-neutral-700"
            }`}>
              <p className="text-sm leading-relaxed" dir={isRtl ? "rtl" : "ltr"}>{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-neutral-400 text-sm" dir="rtl">شوي أفكر... 🤔</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-2 text-center">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Transcript display */}
      {(isListening || transcript) && (
        <div className="px-4 py-2 border-t border-neutral-800">
          <p id="voice-transcript" className="text-neutral-400 text-sm text-center" dir={isRtl ? "rtl" : "ltr"}>
            {transcript || "🎤 ..."}
          </p>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="px-4 py-4 border-t border-neutral-800 flex items-center justify-center gap-4">
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center"
          >
            <Volume2 className="w-5 h-5 text-neutral-400" />
          </button>
        )}

        <motion.button
          onPointerDown={(e) => { e.preventDefault(); startListening(); }}
          onPointerUp={(e) => { e.preventDefault(); stopListening(); }}
          onPointerLeave={stopListening}
          onTouchStart={(e) => { e.preventDefault(); startListening(); }}
          onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
          onContextMenu={(e) => e.preventDefault()}
          whileTap={{ scale: 0.9 }}
          disabled={isLoading}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all touch-none select-none ${
            isListening
              ? "bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.5)]"
              : isLoading
              ? "bg-neutral-700 cursor-not-allowed"
              : "bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          }`}
        >
          {isListening ? (
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
              <Mic className="w-8 h-8 text-white" />
            </motion.div>
          ) : isLoading ? (
            <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </motion.button>

        {messages.length > 0 && !isListening && (
          <button
            onClick={() => { setMessages([]); setTranscript(""); setError(null); }}
            className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        )}
      </div>

      {/* Listening waves */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-1"
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full bg-red-500"
                animate={{ height: [8, 24, 8] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VoiceAssistant;
