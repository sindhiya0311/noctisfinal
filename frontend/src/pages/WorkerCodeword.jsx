import { useState, useEffect } from "react";
import { Mic, ShieldAlert, Lock, Save, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WorkerCodeword() {
  const user = JSON.parse(sessionStorage.getItem("user")) || {};
  const storageKey = `codeword_${user?._id || user?.id}`;

  const [word, setWord] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setWord(localStorage.getItem(storageKey) || "");
  }, [storageKey]);

  const saveCodeword = () => {
    if (!word.trim()) return;
    localStorage.setItem(storageKey, word.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl h-full flex flex-col relative overflow-hidden min-h-[500px]">
      {/* Background design accents */}
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex items-center gap-4 mb-10 border-b border-white/10 pb-6 relative z-10">
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 p-3.5 rounded-2xl border border-red-500/20 shadow-lg">
          <Mic className="text-red-400" size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-wide">Voice Triggered SOS</h2>
          <div className="text-sm text-gray-400 mt-1">Configure your covert emergency activation phrase.</div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-10 flex items-start gap-5 shadow-inner">
          <ShieldAlert className="text-red-400 shrink-0 mt-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" size={28} />
          <div>
            <h3 className="font-bold text-red-300 mb-2 tracking-wide">Background Audio Analysis Active</h3>
            <p className="text-sm text-red-200/80 leading-relaxed font-medium">
              Noctis continuously monitors your microphone for your secret codeword. If your phone is locked, seized, or out of reach during a physical altercation, shouting this specific phrase will instantly broadcast a max-level SOS alert to the Enterprise Command Center and your attached Family Contacts.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Secret Activation Phrase</label>
          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-400 transition-colors" size={22} />
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g. 'pineapple' or 'code red'"
              className="w-full pl-14 pr-4 py-4 bg-black/40 border-2 border-white/5 focus:bg-black/60 focus:border-red-500/50 rounded-2xl outline-none transition-all placeholder:text-gray-600 font-bold text-lg text-white shadow-inner"
            />
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button
            onClick={saveCodeword}
            disabled={!word.trim()}
            className={`px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(239,68,68,0.2)] ${word.trim() ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white hover:shadow-[0_4px_25px_rgba(239,68,68,0.5)] active:scale-95 cursor-pointer border border-red-500/50" : "bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"}`}
          >
            <AnimatePresence mode="wait">
              {isSaved ? (
                <motion.div key="saved" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  Voice Profile Locked
                </motion.div>
              ) : (
                <motion.div key="save" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                  <Save size={18} />
                  Lock Codeword Parameter
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </div>
  );
}
