import { useState, useEffect } from "react";
import { Phone, User, ShieldAlert, Plus, Trash2, ShieldCheck, Siren } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

export default function WorkerEmergencyContacts() {
  const user = JSON.parse(sessionStorage.getItem("user")) || {};
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadContacts = async () => {
    const userId = user?._id || user?.id;
    if (!userId) return;
    try {
      const res = await axios.get(`https://noctisfinal.onrender.com/api/users/contacts/${userId}`);
      setContacts(res.data);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    // Validate integer-based Indian phone number loosely (10 digits)
    const rawNumber = phone.replace(/\D/g, "");
    if (rawNumber.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const userId = user?._id || user?.id;
    try {
      setLoading(true);
      const res = await axios.post(`https://noctisfinal.onrender.com/api/users/contacts/${userId}`, {
        name: name.trim(),
        phone: rawNumber.slice(-10), // Take last 10 digits
      });
      setContacts(res.data);
      setName("");
      setPhone("");
      setError("");
    } catch (err) {
      setError("Failed to add contact.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (contactId) => {
    const userId = user?._id || user?.id;
    try {
      setLoading(true);
      const res = await axios.delete(`https://noctisfinal.onrender.com/api/users/contacts/${userId}/${contactId}`);
      setContacts(res.data);
    } catch (err) {
      console.error("Failed to delete contact:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl h-full flex flex-col relative overflow-hidden min-h-[500px]">
      {/* Background design accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6 relative z-10">
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 p-3.5 rounded-2xl border border-red-500/20 shadow-lg">
          <Phone className="text-red-400" size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-wide">Emergency Protocol Contacts</h2>
          <div className="text-sm text-gray-400 mt-1">Configure automated WhatsApp SOS dispatch recipients.</div>
        </div>
      </div>

      <div className="relative z-10 flex-1 grid md:grid-cols-2 gap-10">
        
        {/* LEFT COLUMN: INFO & FORM */}
        <div className="space-y-8 flex flex-col justify-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col gap-3 shadow-inner">
            <h3 className="font-bold text-red-300 flex items-center gap-2 tracking-wide">
              <Siren size={18} /> Automated Dispatch Active
            </h3>
            <p className="text-sm text-red-200/80 leading-relaxed font-medium">
              When a 100% Risk SOS is triggered (via manual button or voice codeword), NOCTIS will instantly broadcast a WhatsApp distress message containing your live GPS location to all contacts listed here.
            </p>
          </div>

          <form onSubmit={handleAdd} className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-2">Register New Contact</h3>
            
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-400 transition-colors" size={20} />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name (e.g. John Doe)"
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 focus:bg-black/60 focus:border-red-500/50 rounded-xl outline-none transition-all placeholder:text-gray-600 font-medium shadow-inner text-white"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold max-w-fit flex items-center gap-1 group-focus-within:text-red-400 transition-colors">
                 <span>🇮🇳</span> <span className="text-sm ml-1">+91</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full pl-20 pr-4 py-3.5 bg-white/5 border border-white/10 focus:bg-black/60 focus:border-red-500/50 rounded-xl outline-none transition-all placeholder:text-gray-600 font-medium shadow-inner text-white"
                required
              />
            </div>

            {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs font-bold px-1">{error}</motion.div>}

            <button
              type="submit"
              disabled={loading || !name.trim() || !phone.trim()}
              className="w-full mt-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_25px_rgba(239,68,68,0.4)] active:scale-95 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} /> Add Secure Contact
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: CONTACT LIST */}
        <div className="bg-black/30 border border-white/5 rounded-2xl p-6 flex flex-col h-full overflow-hidden">
           <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-6 flex items-center gap-2">
             <ShieldCheck size={16} className="text-blue-400" /> Authorized SOS Recipients ({contacts.length})
           </h3>

           <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
             {loading && contacts.length === 0 ? (
               <div className="flex items-center justify-center h-40">
                 <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-l-2 border-red-500" />
               </div>
             ) : contacts.length === 0 ? (
               <div className="text-center py-10 px-6 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-3">
                 <ShieldAlert size={32} className="text-gray-600" />
                 <p className="text-sm font-medium text-gray-400">No emergency contacts registered.</p>
                 <p className="text-xs text-gray-500">Please add your trusted family/friends to route automated SOS intercepts.</p>
               </div>
             ) : (
               <AnimatePresence>
                 {contacts.map((contact) => (
                   <motion.div
                     key={contact._id}
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95, height: 0 }}
                     className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors group shadow-md"
                   >
                     <div className="flex items-center gap-4">
                       <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center font-bold text-lg text-gray-300 border border-white/5">
                         {contact.name.charAt(0).toUpperCase()}
                       </div>
                       <div>
                         <div className="font-bold text-gray-200">{contact.name}</div>
                         <div className="text-sm font-mono text-gray-400 flex items-center gap-1 mt-0.5">
                           <span>🇮🇳</span> +91 {contact.phone.replace(/(\d{5})(\d{5})/, "$1-$2")}
                         </div>
                       </div>
                     </div>

                     <button
                       onClick={() => handleRemove(contact._id)}
                       className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                       title="Revoke clearance"
                     >
                       <Trash2 size={18} />
                     </button>
                   </motion.div>
                 ))}
               </AnimatePresence>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}
