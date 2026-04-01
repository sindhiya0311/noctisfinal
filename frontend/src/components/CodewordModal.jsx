import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X } from "lucide-react";

export default function CodewordModal({ open, onClose }) {
  const [word, setWord] = useState("");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-gradient-to-br from-slate-900 to-[#020617] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Shield className="text-blue-400" />
                Set Emergency Codeword
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Secret Word
                </label>
                <input
                  placeholder="Enter secret word"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                  onChange={(e) => setWord(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-2">
                  This codeword is used to trigger an emergency alert.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 flex justify-end gap-3 mt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-gray-400 font-medium hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const userData = sessionStorage.getItem("user");
                  if (userData) {
                    const user = JSON.parse(userData);
                    const userId = user._id || user.id;
                    localStorage.setItem(`codeword_${userId}`, word.toLowerCase());
                  } else {
                    localStorage.setItem("codeword", word.toLowerCase());
                  }
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold hover:bg-blue-500 hover:text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2"
              >
                Save Codeword
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
