import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2, X, Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InstructorVoiceAssistantProps {
  instructorName: string;
  employeeId: string;
  trainingArea: string;
  connectedCarsCount: number;
  selectedCar: string | null;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const InstructorVoiceAssistant = ({
  instructorName, employeeId, trainingArea, connectedCarsCount, selectedCar, onClose,
}: InstructorVoiceAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      synthRef.current.cancel();
    };
  }, []);

  const speak = useCallback((text: string) => {
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-SA";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const voices = synthRef.current.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith("ar"));
    if (arabicVoice) utterance.voice = arabicVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, []);

  const sendToAI = useCallback(async (userText: string) => {
    const userMsg: Message = { role: "user", content: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("instructor-assistant", {
        body: {
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          context: { instructorName, employeeId, trainingArea, connectedCarsCount, selectedCar },
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const reply = data?.reply || "عذراً، لم أستطع الرد.";
      const assistantMsg: Message = { role: "assistant", content: reply };
      setMessages(prev => [...prev, assistantMsg]);
      speak(reply);
    } catch (e: any) {
      console.error("AI error:", e);
      setError(e.message || "حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  }, [messages, instructorName, employeeId, trainingArea, connectedCarsCount, selectedCar, speak]);

  const startListening = useCallback(() => {
    setError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("المتصفح لا يدعم التعرف على الصوت");
      return;
    }
    synthRef.current.cancel();
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => { setIsListening(true); setTranscript(""); };
    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        else interimText += event.results[i][0].transcript;
      }
      setTranscript(finalText || interimText);
    };
    recognition.onend = () => {
      setIsListening(false);
      setTimeout(() => {
        const el = document.getElementById("instructor-voice-transcript");
        const text = el?.textContent || "";
        if (text.trim()) sendToAI(text.trim());
      }, 100);
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error !== "aborted") setError(`خطأ في التعرف على الصوت: ${event.error}`);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sendToAI]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const quickCommands = [
    "قل للطالب يحط حزام الأمان",
    "خبره يشغل الإشارة اليمين",
    "قله يهدي السرعة شوي",
    "قله يوقف بأمان على الجنب",
    "خبره يراجع المرايات الثلاث",
    "قله يغير المسار بأمان",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-600/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-white text-sm font-bold block">مساعد المدرب</span>
            <span className="text-neutral-500 text-[10px]">أعطِ أوامرك وسأنقلها للطالب • {instructorName}</span>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-amber-600/20 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-white font-bold mb-1">مرحباً يا مدرب! 👋</p>
            <p className="text-neutral-500 text-sm mb-4">أعطني أمراً وسأحوله لتعليمات واضحة للطالب</p>
            <p className="text-amber-400/70 text-xs mb-6">⚡ مثال بالعامي: "قل للطالب يحط الحزام"</p>

            <div className="grid grid-cols-2 gap-2">
              {quickCommands.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendToAI(q)}
                  className="bg-neutral-900 border border-amber-700/30 rounded-xl px-3 py-2.5 text-neutral-300 text-xs text-right hover:bg-neutral-800 hover:border-amber-600/50 transition-colors"
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
                ? "bg-amber-600 text-white"
                : "bg-neutral-800 text-neutral-200 border border-amber-700/30"
            }`}>
              <p className="text-sm leading-relaxed" dir="rtl">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 border border-amber-700/30 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-neutral-400 text-sm">شوي أصيغ التعليمة... 💭</span>
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

      {/* Transcript */}
      {(isListening || transcript) && (
        <div className="px-4 py-2 border-t border-neutral-800">
          <p id="instructor-voice-transcript" className="text-neutral-400 text-sm text-center" dir="rtl">
            {transcript || "🎤 جاري الاستماع..."}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="px-4 py-4 border-t border-neutral-800 flex items-center justify-center gap-4">
        {isSpeaking && (
          <button
            onClick={() => synthRef.current.cancel()}
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
              : "bg-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.3)]"
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

export default InstructorVoiceAssistant;
