import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Coffee, Compass, Phone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { getApiUrl } from "../lib/api";

interface Message {
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

export default function AiChatWidget({ userName = "Tamu Rahasia" }: { userName?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isWidgetVisible, setIsWidgetVisible] = useState(true);
  const [sessionId] = useState(() => "chat-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6));
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Halo kawan! Selamat datang di Tampa Seduh. Kita asisten kopi virtual di sini. Mau bertanya tentang racikan biji kopi unik 'Liberica Kotabunan', menu andalan, lokasi kedai, atau cara delivery order? Tulis jo disini kawan!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  if (!isWidgetVisible) {
    return <div style={{ display: 'none' }} />;
  }

  const quickQuestions = [
    { label: "📍 Lokasi Kedai", text: "Di mana alamat atau lokasi lengkap kedai Tampa Seduh?" },
    { label: "🎒 Menu Favorit", text: "Apa menu terlaris dingin dan kopi tradisional di sini?" },
    { label: "🍃 Kopi Khas Boltim", text: "Bisa jelaskan rasa unik Biji Kopi Liberica Kotabunan?" },
    { label: "🛵 Cara Pesan Kopi", text: "Bagaimana cara memesan kopi untuk diantar ke rumah?" }
  ];

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Polling to catch admin handoff messages
  useEffect(() => {
    if (!isOpen) return;
    const poll = async () => {
      try {
        const res = await fetch(getApiUrl(`/api/chat-admin/poll/${sessionId}`));
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > messages.length - 1) { // -1 for initial welcome msg
            // If the server has more messages (e.g. from admin), sync them!
            // To prevent overwriting our own immediate messages, we only append new ones from admin
            // Simple sync: if server length > our length (ignoring initial welcome message), replace
            const serverMsgs = data.messages.map((m: any) => ({
              role: m.sender === "user" ? "user" : "model",
              text: m.text,
              timestamp: new Date(m.timestamp)
            }));
            
            // Reconstruct full messages including welcome message
            const initialWelcome = messages[0];
            setMessages([initialWelcome, ...serverMsgs]);
          }
        }
      } catch (err) {}
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [isOpen, sessionId, messages.length]);

  // Listen for admin chat triggers from outside
  useEffect(() => {
    const handleTrigger = async () => {
      setIsWidgetVisible(true);
      setIsOpen(true);
      
      // Send a ping message first to ensure session is created if it hasn't been
      await fetch(getApiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", text: "Halo Admin!" }], sessionId, userName })
      }).catch(() => {});

      // Sabotage session automatically to connect to admin
      await fetch(getApiUrl("/api/chat-admin/sabotage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sabotage: true })
      });
      setMessages((prev) => [...prev, {
        role: "model",
        text: "Memanggil Admin Tampa Seduh... Pesan Anda akan langsung dibalas oleh tim kami.",
        timestamp: new Date()
      }]);
    };
    window.addEventListener('trigger-admin-chat', handleTrigger);
    return () => window.removeEventListener('trigger-admin-chat', handleTrigger);
  }, [sessionId, userName]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch(getApiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: chatHistory, 
          sessionId, 
          userName 
        })
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil respon AI");
      }

      const data = await response.json();
      
      if (!data.sabotaged) {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: data.text,
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Aduh kawan, jaringan server sedang sibuk menyeduh kopi. Coba ketik ulang kembali beberapa saat lagi, atau hubungi kami langsung via Whatsapp di 085696224448!",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-[90vw] sm:w-[400px] h-[550px] bg-white dark:bg-zinc-900 border border-amber-900/10 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-amber-900 via-amber-950 to-amber-900 text-amber-50 flex justify-between items-center relative">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-800/60 rounded-full border border-amber-500/20">
                  <Coffee className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-serif font-bold tracking-wide">Asisten Tampa Seduh</h4>
                  <p className="text-[10px] text-green-300 flex items-center gap-1.5 font-sans font-medium">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                    GPT-5.4-mini Active
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-amber-200 hover:bg-white/10 transition-colors"
                id="btn-close-chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-amber-50/20 dark:bg-zinc-950/20">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      m.role === "user"
                        ? "bg-amber-900 text-amber-50 rounded-br-none"
                        : "bg-white dark:bg-zinc-800 border border-amber-900/5 text-zinc-800 dark:text-zinc-200 rounded-bl-none"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    <span className="block text-[9px] mt-1 text-right opacity-60 font-mono">
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-zinc-800 border border-amber-900/5 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Mencari inspirasi seduh...</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-800 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-amber-800 rounded-full animate-bounce delay-100"></span>
                      <span className="w-1.5 h-1.5 bg-amber-800 rounded-full animate-bounce delay-200"></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length < 4 && (
              <div className="p-3 bg-amber-50/40 dark:bg-zinc-900/40 border-t border-amber-900/5">
                <p className="text-[10px] uppercase font-bold text-amber-900/60 dark:text-zinc-400 mb-2 tracking-wider">Mungkin kawan ingin tahu:</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((q, qidx) => (
                    <button
                      key={qidx}
                      onClick={() => handleSend(q.text)}
                      className="text-xs py-1 px-2.5 bg-white dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-zinc-700 text-amber-900 dark:text-amber-300 rounded-full border border-amber-900/10 dark:border-zinc-700 transition-all text-left cursor-pointer"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Box */}
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-2 bg-white dark:bg-zinc-900">
              <input
                type="text"
                placeholder="Tulis pesan atau tanya seputar kopi..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-800"
              />
              <button
                onClick={() => handleSend(input)}
                className="p-3 rounded-xl bg-amber-900 hover:bg-amber-800 text-amber-50 cursor-pointer transition-colors"
                id="btn-send-message"
              >
                <Send className="w-5 h-5 text-amber-300" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-end gap-2">
        {/* Tombol X untuk menghilangkan widget seluruhnya */}
        {!isOpen && (
          <button 
            onClick={() => setIsWidgetVisible(false)}
            className="p-1.5 bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-700 rounded-full shadow-sm text-zinc-500 transition-colors"
            title="Hilangkan Chat Widget"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 bg-gradient-to-r from-amber-800 to-amber-950 text-amber-50 rounded-full shadow-2xl hover:shadow-amber-900/30 border border-amber-400/20 cursor-pointer flex items-center justify-center gap-2 font-serif font-bold text-sm"
          id="btn-toggle-chatbot"
        >
          <MessageSquare className="w-6 h-6 text-amber-300" />
          {isOpen ? "Tutup Chat" : "Tanya Emat"}
        </motion.button>
      </div>
    </div>
  );
}
