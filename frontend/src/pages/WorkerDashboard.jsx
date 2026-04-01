import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Siren, Radar, Car, Bus, Navigation, Briefcase, User, Phone } from "lucide-react";
import { getUserStorage, setUserStorage } from "../utils/storage";
import { useContext, useState, useEffect, useRef, useMemo } from "react";
import { RiskContext } from "../context/RiskContext";
import { startNoctisDemo } from "../demo/demoScenario";
import MapView from "../components/MapView";
import WorkerSavedLocations from "./WorkerSavedLocations";
import WorkerHeatmap from "./WorkerHeatmap";
import WorkerCodeword from "./WorkerCodeword";
import WorkerEmergencyContacts from "./WorkerEmergencyContacts";
import CodewordModal from "../components/CodewordModal";

import axios from "axios";
import socket from "../socket";
export default function WorkerDashboard() {
  const {
    risk,
    context,
    riskLevel,
    triggerManualSOS,
    triggerCodewordSOS,
    updateRisk,
    updateContext,
    startDemoMode,
  } = useContext(RiskContext);
  const user = useMemo(() => {
    const userData = sessionStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  }, []);

  const logout = () => {
    sessionStorage.removeItem("user");
    window.location.href = "/";
  };

  const [page, setPage] = useState("dashboard");
  const [openCodeword, setOpenCodeword] = useState(false);
  const [showCodewordPopup, setShowCodewordPopup] = useState(false);
  const [requests, setRequests] = useState([]);

  const [transportType, setTransportType] = useState("personal");
  const [cabNumber, setCabNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  const [familyEmail, setFamilyEmail] = useState("");
  const [familyMsg, setFamilyMsg] = useState("");

  const recognitionRef = useRef(null);

  /* -------------------- FIXED: CODEWORD DETECTION -------------------- */
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition || !user) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let isStarted = false;

    recognition.onstart = () => {
      isStarted = true;
      console.log("Voice monitoring active...");
    };

    recognition.onend = () => {
      isStarted = false;
      // Faster auto-restart logic
      setTimeout(() => {
        if (!isStarted) {
          try {
            recognition.start();
          } catch (err) {
            console.error("Failed to restart recognition:", err);
          }
        }
      }, 300);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        console.error("Microphone permission denied.");
      }
      isStarted = false;
    };

    recognition.onresult = (event) => {
      // FIX: Ensure key matches WorkerCodeword.jsx (using _id or id consistently)
      const storageKey = `codeword_${user?._id || user?.id}`;
      const savedWord = localStorage.getItem(storageKey);

      if (!savedWord) return;
      const codeword = savedWord.toLowerCase().trim();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();

        // Immediate check on interim or final results for high speed
        if (transcript.includes(codeword)) {
          console.log("!!! CODEWORD MATCHED !!!", codeword);

          triggerCodewordSOS();
          setShowCodewordPopup(true);
          setTimeout(() => setShowCodewordPopup(false), 5000);

          // 🔥 ADD THIS LINE
          socket.emit("worker:sos", {
            userId: user?._id || user?.id,
          });

          recognition.stop();
          break;
        }
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Initial start failed:", err);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [triggerCodewordSOS, user]);
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (user && (user.id || user._id)) loadRequests();

    const storageKey = `codeword_${user?._id || user?.id}`;
    const word = localStorage.getItem(storageKey);
    if (!word) setOpenCodeword(true);
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    const userId = user._id || user.id;
    const res = await axios.get(`https://noctisfinal.onrender.com/api/requests/${userId}`);
    setRequests(res.data.filter((r) => r.type === "enterprise"));
  };

  const acceptRequest = async (id) => {
    await axios.post("https://noctisfinal.onrender.com/api/requests/accept", {
      requestId: id,
    });
    loadRequests();
  };

  const rejectRequest = async (id) => {
    await axios.post("https://noctisfinal.onrender.com/api/requests/reject", {
      requestId: id,
    });
    loadRequests();
  };

  const sendFamilyRequest = async () => {
    if (!user) return;
    const userId = user._id || user.id;
    try {
      await axios.post("https://noctisfinal.onrender.com/api/requests/send", {
        fromUser: userId,
        email: familyEmail,
        type: "family",
      });

      setFamilyMsg(`Request sent to ${familyEmail}`);
      setFamilyEmail("");
    } catch {
      setFamilyMsg("User not found");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-10">
        Redirecting...
      </div>
    );
  }

  const riskColor =
    riskLevel === "emergency"
      ? "text-red-400"
      : riskLevel === "warning"
        ? "text-yellow-400"
        : "text-green-400";

  const startDemo = () => {
    startDemoMode();

    startNoctisDemo({
      setRisk: updateRisk,
      pushContext: updateContext,
      setDriverState: () => {},
      setDriverRisk: () => {},
      triggerMildAlert: () => {},
      triggerStrongAlert: () => {},
      triggerEmergency: () => {
        triggerManualSOS();

        socket.emit("worker:sos", {
          userId: user?._id || user?.id,
        });
      },
    });
  };
  return (
    <div className="min-h-screen bg-[#020617] text-white flex">
      {/* SIDEBAR */}
      <div className="w-72 bg-gradient-to-b from-[#020617]/90 to-[#030a1a]/90 backdrop-blur-3xl border-r border-white/10 p-6 shadow-2xl z-10 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-10 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="text-blue-400" size={28} />
            NOCTIS
          </h1>

          <div className="space-y-3 text-sm font-medium cursor-pointer">
            {[
              ["dashboard", "Dashboard"],
              ["locations", "Saved Locations"],
              ["contacts", "Emergency Contacts"],
              ["codeword", "Codeword Engine"],
              ["transport", "Transport Tracking"],
              ["family", "Family Sharing"],
              ["requests", "Enterprise Sync"],
            ].map(([key, label]) => (
              <div
                key={key}
                onClick={() => setPage(key)}
                className={`px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-3
              ${
                page === key
                  ? "bg-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] border border-blue-500/30"
                  : "hover:bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent"
              }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={triggerManualSOS}
          className="mt-8 px-4 py-3 rounded-xl text-red-400 font-semibold border border-red-500/20 hover:bg-red-500/20 transition-all flex justify-center items-center gap-2 w-full shadow-lg"
        >
          <Siren size={18} /> Emergency SOS
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-8 relative overflow-hidden">
        {/* Dynamic Background Glow */}
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000 ${risk >= 80 ? 'bg-red-500' : risk >= 40 ? 'bg-yellow-500' : 'bg-blue-500'}`} />

        <AnimatePresence mode="wait">
        {page === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="h-full flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Worker Workspace</h2>
                <div className="text-gray-400 mt-1">Live AI safety tracking and telemetry</div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={logout}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 px-5 py-2 rounded-xl hover:bg-red-500/20 font-medium transition"
                >
                  Logout
                </button>

                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`bg-opacity-20 px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border shadow-lg backdrop-blur-md ${risk >= 80 ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-red-500/20' : 'bg-green-500/20 text-green-400 border-green-500/30 shadow-green-500/20'}`}
                >
                  <Radar size={16} className={risk >= 80 ? 'animate-spin' : ''} />
                  {risk >= 80 ? "EMERGENCY OVERRIDE" : "Live Shield Active"}
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8 flex-1">
              <div className="col-span-8 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-3 h-[600px] shadow-2xl backdrop-blur-2xl relative overflow-hidden group">
                <MapView
                  transportType={transportType}
                  cabNumber={cabNumber}
                  driverName={driverName}
                  driverPhone={driverPhone}
                />
                
                {/* Visual Glass Overlay */}
                <div className="absolute inset-0 pointer-events-none rounded-3xl border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]" />
              </div>

              <div className="col-span-4 space-y-6 flex flex-col justify-start">
                <motion.div 
                  animate={risk >= 80 ? { boxShadow: ["0px 0px 0px rgba(239,68,68,0)", "0px 0px 40px rgba(239,68,68,0.5)", "0px 0px 0px rgba(239,68,68,0)"] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-xl flex items-center justify-between"
                >
                  <div>
                    <div className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={16} /> Compute Risk</div>
                    <motion.div
                      key={risk}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`text-5xl font-bold tracking-tight ${riskColor}`}
                    >
                      {Math.round(risk)}%
                    </motion.div>
                  </div>
                  
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center bg-opacity-10 ${riskColor.replace('text', 'bg')} border border-current shadow-inner`}>
                    <Shield size={32} />
                  </div>
                </motion.div>

                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-xl">
                  <div className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider flex items-center gap-2"><Radar size={16} /> Live Context</div>
                  <div className="text-xl font-medium leading-relaxed">{context}</div>
                </div>

                <div className="pt-4 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      triggerManualSOS();

                      socket.emit("worker:sos", {
                        userId: user?._id || user?.id,
                      });
                    }}
                    className="col-span-2 bg-gradient-to-r from-red-500/20 to-red-600/30 border border-red-500/50 rounded-2xl p-5 flex gap-3 text-lg font-semibold w-full justify-center hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                  >
                    <Siren size={24} className={risk >= 80 ? 'animate-pulse' : ''} />
                    TRIGGER SOS
                  </button>
                  <button
                    onClick={startDemo}
                    className="col-span-2 bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/40 rounded-2xl p-4 flex gap-2 font-medium w-full justify-center hover:bg-blue-500/30 transition-all duration-200 shadow-lg"
                  >
                    Force Demo Scenario
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {page === "transport" && (
          <motion.div
            key="transport"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-8 rounded-3xl w-full max-w-2xl shadow-2xl backdrop-blur-xl mx-auto mt-10 relative overflow-hidden"
          >
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6 relative z-10">
              <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-3.5 rounded-2xl border border-blue-500/20 shadow-lg">
                <Navigation className="text-blue-400" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-wide">Transport Telemetry</h2>
                <div className="text-sm text-gray-400 mt-1">Configure your active transit mode for AI route analysis.</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
              {[
                { id: "personal", label: "Personal Vehicle", icon: Car },
                { id: "office", label: "Office Cab", icon: Briefcase },
                { id: "public", label: "Public Transport", icon: Bus },
                { id: "walk", label: "Walking", icon: Navigation },
              ].map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => setTransportType(mode.id)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
                    transportType === mode.id
                      ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] text-blue-400 scale-[1.02]"
                      : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/20 text-gray-400 hover:scale-[1.01]"
                  }`}
                >
                  <mode.icon size={32} className={transportType === mode.id ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" : ""} />
                  <span className="font-semibold tracking-wide">{mode.label}</span>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {transportType === "office" && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="space-y-4 overflow-hidden relative z-10"
                >
                  <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-5">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Shield size={14} className="text-indigo-400" />
                      Driver Manifest
                    </h3>
                    
                    <div className="relative group">
                      <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                      <input
                        placeholder="Vehicle Registration (e.g. TN-38-BZ-109)"
                        value={cabNumber}
                        onChange={(e) => setCabNumber(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 focus:bg-white/10 focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-gray-600 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                          placeholder="Driver Full Name"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 focus:bg-white/10 focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-gray-600 font-medium"
                        />
                      </div>

                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                          placeholder="Contact Number"
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 focus:bg-white/10 focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-gray-600 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="mt-8 flex justify-end relative z-10">
               <button onClick={() => setPage("dashboard")} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.5)] active:scale-95 transition-all flex items-center gap-2">
                 <Shield size={18} />
                 Confirm & Apply Shield
               </button>
            </div>
          </motion.div>
        )}

        {page === "family" && (
          <motion.div
            key="family"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-10 rounded-3xl w-[700px] shadow-2xl backdrop-blur-xl mx-auto mt-12 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
            <h2 className="text-3xl font-bold tracking-wide mb-8 relative z-10">Family Sharing</h2>

            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-6 rounded-2xl border border-blue-500/20 mb-8 relative z-10 shadow-lg">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">Invite a Family Member</h3>
              <p className="text-sm text-gray-400 mb-6">Give a trusted loved one access to your live safety telemetry.</p>
              
              <div className="flex gap-4">
                <input
                  value={familyEmail}
                  onChange={(e) => setFamilyEmail(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-5 py-3.5 focus:border-blue-500 focus:bg-white/5 outline-none transition-all shadow-inner placeholder:text-gray-600 font-medium"
                  placeholder="Enter their email address..."
                />
                <button
                  onClick={sendFamilyRequest}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg whitespace-nowrap active:scale-95"
                >
                  Send Invite
                </button>
              </div>
              {familyMsg && <div className="mt-5 text-sm font-medium text-blue-300 bg-blue-500/10 px-4 py-3 rounded-xl border border-blue-500/20 inline-block">{familyMsg}</div>}
            </div>

            <div className="bg-black/20 border border-white/5 p-6 rounded-2xl relative z-10">
               <h3 className="font-semibold text-gray-300 mb-2 flex items-center gap-2">
                 <Shield size={18} className="text-gray-400" />
                 How Family Sharing Works
               </h3>
               <p className="text-sm text-gray-500 leading-relaxed">
                 By inviting a family member, they will be given access to your Live Shield dashboard. If your risk context crosses critical thresholds or you activate an emergency SOS codeword, their dashboard will enter override mode with alarms to ensure immediate awareness.
               </p>
            </div>
          </motion.div>
        )}

        {page === "requests" && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-10 rounded-3xl w-[700px] shadow-2xl backdrop-blur-xl mx-auto mt-12 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
            <h2 className="text-3xl font-bold tracking-wide mb-8 relative z-10">Enterprise Connections</h2>

            <div className="relative z-10">
              <h3 className="font-semibold text-gray-300 mb-6 border-b border-white/10 pb-3 uppercase tracking-widest text-sm">Pending Inbound Requests</h3>
              {requests.length === 0 ? (
                <div className="text-center py-10 px-6 bg-black/20 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3">
                  <Briefcase size={32} className="text-gray-600 mb-2" />
                  <p className="text-gray-400 font-medium">No pending enterprise sync requests.</p>
                  <p className="text-xs text-gray-500">Your organization has not requested telemetry access.</p>
                </div>
              ) : (
                <div className="space-y-4">
                {requests.map((r) => (
                  <div
                    key={r._id}
                    className="p-5 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all shadow-lg"
                  >
                    <div>
                      <span className="font-bold text-gray-200 block text-lg mb-1">Enterprise Dashboard</span>
                      <span className="text-xs text-indigo-300 font-medium uppercase tracking-wider">Awaits Approval</span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => acceptRequest(r._id)}
                        className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white px-6 py-2.5 rounded-xl font-bold border border-green-500/30 transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)] hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectRequest(r._id)}
                        className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-6 py-2.5 rounded-xl font-bold border border-red-500/20 transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {page === "locations" && (
          <motion.div
            key="locations"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="h-[600px] w-full max-w-4xl mx-auto mt-6"
          >
            <WorkerSavedLocations />
          </motion.div>
        )}

        {page === "heatmap" && (
          <motion.div
            key="heatmap"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="w-full h-[600px] max-w-6xl mx-auto mt-6"
          >
            <WorkerHeatmap />
          </motion.div>
        )}

        {page === "codeword" && (
          <motion.div
            key="codeword"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto mt-6"
          >
            <WorkerCodeword />
          </motion.div>
        )}

        {page === "contacts" && (
          <motion.div
            key="contacts"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="max-w-5xl mx-auto mt-6 h-[700px]"
          >
            <WorkerEmergencyContacts />
          </motion.div>
        )}
        </AnimatePresence>

      </div>

      <CodewordModal
        open={openCodeword}
        onClose={() => setOpenCodeword(false)}
      />

      <AnimatePresence>
        {showCodewordPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.8)] border-2 border-red-400 z-50 flex items-center gap-4 will-change-transform"
          >
            <Siren size={32} className="animate-pulse" />
            <div>
              <div className="text-xl font-black tracking-widest uppercase">Codeword Detected!</div>
              <div className="text-red-200 text-sm font-semibold">Broadcasting emergency SOS protocol to family & dispatch...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
