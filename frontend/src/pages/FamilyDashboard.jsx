import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Siren, Radar, Users, MapPin, Radio, Activity, Phone } from "lucide-react";
import { useContext, useState, useEffect, useRef, useMemo } from "react";
import { RiskContext } from "../context/RiskContext";
import { startNoctisDemo } from "../demo/demoScenario";
import MapView from "../components/MapView";
import WorkerSavedLocations from "./WorkerSavedLocations";
import WorkerHeatmap from "./WorkerHeatmap";
import WorkerCodeword from "./WorkerCodeword";
import WorkerEmergencyContacts from "./WorkerEmergencyContacts";
import CodewordModal from "../components/CodewordModal";
import FamilyMultiTracker from "../components/FamilyMultiTracker";

import axios from "axios";
import socket from "../socket";

export default function FamilyDashboard() {
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
  const [familyEmail, setFamilyEmail] = useState("");
  const [familyMsg, setFamilyMsg] = useState("");
  const [tripMode, setTripMode] = useState(false);

  const recognitionRef = useRef(null);

  /* CODEWORD DETECTION */
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !user) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let isStarted = false;

    recognition.onstart = () => {
      isStarted = true;
    };

    recognition.onend = () => {
      isStarted = false;
      setTimeout(() => {
        if (!isStarted) {
          try { recognition.start(); } catch (err) {}
        }
      }, 300);
    };

    recognition.onerror = () => { isStarted = false; };

    recognition.onresult = (event) => {
      const storageKey = `codeword_${user?._id || user?.id}`;
      const savedWord = localStorage.getItem(storageKey);
      if (!savedWord) return;
      const codeword = savedWord.toLowerCase().trim();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        if (transcript.includes(codeword)) {
          triggerCodewordSOS();
          setShowCodewordPopup(true);
          setTimeout(() => setShowCodewordPopup(false), 5000);
          socket.emit("worker:sos", { userId: user?._id || user?.id });
          recognition.stop();
          break;
        }
      }
    };

    try { recognition.start(); } catch (err) {}

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [triggerCodewordSOS, user]);

  useEffect(() => {
    if (user && (user.id || user._id)) loadRequests();
    const storageKey = `codeword_${user?._id || user?.id}`;
    const word = localStorage.getItem(storageKey);
    if (!word) setOpenCodeword(true);
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    const userId = user._id || user.id;
    const res = await axios.get(`http://localhost:5000/api/requests/${userId}`);
    // Family users manage their *own* incoming requests if someone wants to track THEM
    setRequests(res.data.filter((r) => r.type === "family"));
  };

  const acceptRequest = async (id) => {
    await axios.post("http://localhost:5000/api/requests/accept", { requestId: id });
    loadRequests();
  };

  const rejectRequest = async (id) => {
    await axios.post("http://localhost:5000/api/requests/reject", { requestId: id });
    loadRequests();
  };

  const sendFamilyRequest = async () => {
    if (!user) return;
    const userId = user._id || user.id;
    try {
      await axios.post("http://localhost:5000/api/requests/send", {
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

  if (!user) return <div className="min-h-screen bg-[#020617] text-white p-10">Redirecting...</div>;

  const riskColor = riskLevel === "emergency" ? "text-red-400" : riskLevel === "warning" ? "text-yellow-400" : "text-green-400";

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
        socket.emit("worker:sos", { userId: user?._id || user?.id });
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col md:flex-row pb-16 md:pb-0">
      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex w-72 bg-gradient-to-b from-[#020617]/90 to-[#030a1a]/90 backdrop-blur-3xl border-r border-white/10 p-6 shadow-2xl z-20 flex-col justify-between h-screen sticky top-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-10 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="text-blue-400" size={28} />
            NOCTIS
          </h1>

          <div className="space-y-3 text-sm font-medium cursor-pointer">
            {[
              ["dashboard", "My Dashboard", <Radar size={18}/>],
              ["tracked-members", "Tracked Members", <Users size={18}/>],
              ["locations", "Saved Locations", <MapPin size={18}/>],
              ["contacts", "Emergency Contacts", <Phone size={18}/>],
              ["codeword", "Codeword Engine", <Radio size={18}/>],
              ["family", "Family Connections", <Users size={18}/>],
            ].map(([key, label, icon]) => (
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
                {icon} {label}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          {/* Enhanced Glassmorphic Trip Mode Toggle */}
          <div className="mb-6">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 mb-3 flex items-center justify-between">
              <span>Tracking Mode</span>
              {tripMode ? <span className="text-blue-400 flex"><MapPin size={14} className="mr-1"/>Active</span> : <span className="text-green-400 flex"><Activity size={14} className="mr-1"/>Active</span>}
            </div>
            <div 
              className="bg-black/60 border border-white/10 rounded-2xl p-1 relative flex items-center cursor-pointer overflow-hidden shadow-inner h-12" 
              onClick={() => setTripMode(!tripMode)}
            >
              <motion.div 
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-400/50 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.5)] z-0"
                animate={{ left: tripMode ? "calc(50% + 2px)" : "4px" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              <div className={`flex-1 text-center text-sm font-bold z-10 transition-all duration-300 ${!tripMode ? "text-white" : "text-gray-500"}`}>Routine</div>
              <div className={`flex-1 text-center text-sm font-bold z-10 transition-all duration-300 ${tripMode ? "text-white" : "text-gray-500"}`}>Trip</div>
            </div>
          </div>

          <button
            onClick={triggerManualSOS}
            className="px-4 py-3 rounded-xl text-red-400 font-semibold border border-red-500/20 hover:bg-red-500/20 transition-all flex justify-center items-center gap-2 w-full shadow-lg"
          >
            <Siren size={18} /> Emergency SOS
          </button>
        </div>
      </div>

      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#020617]/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <h1 className="text-xl font-bold tracking-widest bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
          <Shield className="text-blue-400" size={24} />
          NOCTIS
        </h1>
        <button
          onClick={() => {
            triggerManualSOS();
            socket.emit("worker:sos", { userId: user?._id || user?.id });
          }}
          className="px-3 py-1.5 rounded-lg text-red-100 bg-red-500/20 font-semibold border border-red-500/30 active:bg-red-500/40 flex justify-center items-center gap-2 shadow-lg"
        >
          <Siren size={16} className={risk >= 80 ? 'animate-pulse' : ''} /> SOS
        </button>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#020617]/95 backdrop-blur-xl border-t border-white/10 z-50 flex items-center justify-around px-2 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {[
          ["dashboard", <Radar size={22}/>],
          ["tracked-members", <Users size={22}/>],
          ["locations", <MapPin size={22}/>],
          ["contacts", <Phone size={22}/>],
          ["codeword", <Radio size={22}/>],
          ["family", <Shield size={22}/>],
        ].map(([key, icon]) => (
          <div
            key={key}
            onClick={() => setPage(key)}
            className={`p-3 rounded-xl transition-all ${
              page === key ? "bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {icon}
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-4 md:p-8 relative overflow-x-hidden flex flex-col min-h-[calc(100vh-[140px])] md:min-h-screen">
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
            className="flex-1 flex flex-col"
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Personal Workspace</h2>
                <div className="text-gray-400 mt-1 text-sm md:text-base">Live AI tracking & telemetry</div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={logout}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 md:px-5 py-2 rounded-xl hover:bg-red-500/20 font-medium transition text-sm md:text-base"
                >
                  Logout
                </button>

                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`bg-opacity-20 px-4 md:px-5 py-2 rounded-xl text-xs md:text-sm font-medium flex items-center gap-2 border shadow-lg backdrop-blur-md ${risk >= 80 ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-red-500/20' : 'bg-green-500/20 text-green-400 border-green-500/30 shadow-green-500/20'}`}
                >
                  <Radar size={16} className={risk >= 80 ? 'animate-spin' : ''} />
                  {risk >= 80 ? "EMERGENCY OVERRIDE" : "Live Shield Active"}
                </motion.div>
              </div>
            </div>

            <div className="flex flex-col xl:grid xl:grid-cols-12 gap-8 flex-1">
              <div className="xl:col-span-8 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-2 md:p-3 h-[350px] md:h-[480px] shadow-2xl backdrop-blur-2xl relative overflow-hidden group">
                <MapView tripMode={tripMode} />
                {/* Visual Glass Overlay */}
                <div className="absolute inset-0 pointer-events-none rounded-3xl border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]" />
              </div>

              <div className="xl:col-span-4 space-y-4 md:space-y-6 flex flex-col justify-start">
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
                      className={`text-4xl md:text-5xl font-bold tracking-tight ${riskColor}`}
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
                      socket.emit("worker:sos", { userId: user?._id || user?.id });
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

        {page === "tracked-members" && (
          <motion.div
            key="tracked-members"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="flex-1 w-full h-full relative"
          >
             <FamilyMultiTracker />
          </motion.div>
        )}

        {page === "family" && (
          <motion.div
            key="family"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-4 md:p-8 rounded-3xl w-full max-w-[700px] shadow-2xl backdrop-blur-xl mx-auto mt-6 md:mt-10 relative overflow-hidden"
          >
            <h2 className="text-xl md:text-2xl font-bold tracking-wide mb-6">Manage Connections</h2>

            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-4 md:p-5 rounded-2xl border border-blue-500/20 mb-6 md:mb-8">
              <h3 className="font-semibold text-blue-300 mb-2 md:mb-3">Request to Track Someone</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={familyEmail}
                  onChange={(e) => setFamilyEmail(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500 outline-none transition-colors shadow-inner"
                  placeholder="Enter their email..."
                />
                <button
                  onClick={sendFamilyRequest}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg whitespace-nowrap"
                >
                  Send Request
                </button>
              </div>
              {familyMsg && <div className="mt-4 text-sm text-blue-300 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">{familyMsg}</div>}
            </div>

            <div>
              <h3 className="font-semibold text-gray-300 mb-4 border-b border-white/10 pb-2">Pending Inbound Requests (To Track You)</h3>
              {requests.length === 0 ? (
                <div className="text-center p-6 bg-black/20 rounded-2xl border border-dashed border-white/10 flex items-center justify-center gap-2">
                  <Shield size={16} className="text-gray-500" />
                  <p className="text-gray-400">No pending inbound requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                {requests.map((r) => (
                  <div
                    key={r._id}
                    className="p-4 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all"
                  >
                    <span className="font-medium text-gray-200">
                      <span className="text-blue-400 font-bold">{r.fromUserEmail || "A user"}</span> wants to monitor your safety
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => acceptRequest(r._id)}
                        className="bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white px-4 py-2 rounded-xl font-semibold border border-green-500/30 transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectRequest(r._id)}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-semibold border border-red-500/30 transition-all"
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
            className="h-full w-full max-w-4xl mx-auto"
          >
            <WorkerSavedLocations />
          </motion.div>
        )}

        {page === "contacts" && (
          <motion.div
            key="contacts"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full max-w-5xl mx-auto"
          >
             <div className="h-[600px] mt-6">
                <WorkerEmergencyContacts />
             </div>
          </motion.div>
        )}

        {page === "codeword" && (
          <motion.div
            key="codeword"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="h-full max-w-4xl mx-auto flex flex-col justify-center"
          >
            <WorkerCodeword />
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
              <div className="text-red-200 text-sm font-semibold">Broadcasting emergency SOS protocol to dispatch...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
