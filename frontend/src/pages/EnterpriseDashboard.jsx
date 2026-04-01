import { useEffect, useState, useRef, useMemo } from "react";
import socket from "../socket";
import axios from "axios";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Users, Car, ShieldAlert, Navigation } from "lucide-react";

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

export default function EnterpriseDashboard() {
  const [workers, setWorkers] = useState({});
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [activeTab, setActiveTab] = useState("workers"); // Default to workers

  const audioRef = useRef(null);

  const user = useMemo(() => {
    const userData = sessionStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  }, []);

  const logout = () => {
    sessionStorage.removeItem("user");
    window.location.href = "/";
  };

  const sendRequest = async () => {
    if (!user) return;
    try {
      await axios.post("https://noctisfinal.onrender.com/api/requests/send", {
        fromUser: user.id,
        email,
        type: "enterprise",
      });
      setMsg(`Request sent to ${email}`);
      setEmail("");
    } catch {
      setMsg("User not found");
    }
  };

  useEffect(() => {
    socket.off("workers:update");
    socket.off("worker:alert");

    socket.on("workers:update", (data) => {
      setWorkers(data);
    });

    socket.on("worker:alert", (data) => {
      setAlerts((prev) => [data, ...prev.slice(0, 4)]);
      audioRef.current?.play().catch(() => {}); // FIX
    });

    return () => {
      socket.off("workers:update");
      socket.off("worker:alert");
    };
  }, []);

  const getIcon = (risk) => {
    let marker =
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png";
    if (risk > 80)
      marker =
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png";
    else if (risk > 40)
      marker =
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png";

    return new L.Icon({
      iconUrl: marker,
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
  };

  const workerList = Object.values(workers);
  const cabList = workerList.filter((w) => w.transportType === "office");

  if (!user)
    return (
      <div className="h-screen bg-[#020617] text-white p-6">Loading...</div>
    );

  return (
    <div className="h-screen flex bg-[#020617] text-white">
      <button
        onClick={logout}
        className="absolute top-4 right-4 bg-red-500/20 border border-red-500/40 px-4 py-1.5 rounded-lg hover:bg-red-500/30 transition-all backdrop-blur-xl z-[9999]"
      >
        Logout
      </button>

      {/* SIDEBAR */}
      <div className="w-96 bg-gradient-to-b from-[#020617]/95 to-[#030a1a]/95 backdrop-blur-3xl border-r border-white/10 p-6 flex flex-col shadow-2xl z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
            <Building2 className="text-blue-400" size={24} />
          </div>
          <div>
            <div className="text-xl font-bold tracking-wider text-white">ENTERPRISE</div>
            <div className="text-xs text-blue-400 tracking-widest font-semibold uppercase">Command Center</div>
          </div>
        </div>

        <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="text-sm text-gray-400 font-semibold uppercase tracking-wider mb-3">Add Worker</div>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Worker Email ID"
              className="flex-1 p-2.5 bg-black/40 rounded-xl border border-white/10 focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-600 font-mono text-sm"
            />
            <button
              onClick={sendRequest}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Send
            </button>
          </div>
          {msg && <div className="text-xs mt-3 text-blue-400">{msg}</div>}
        </div>

        <div className="flex gap-2 p-1 bg-black/40 rounded-xl mb-6 border border-white/5">
          <button
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              activeTab === "workers"
                ? "bg-white/10 text-white shadow-lg"
                : "text-gray-500 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("workers")}
          >
            <Users size={16} /> Workers
          </button>
          <button
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
              activeTab === "cabs"
                ? "bg-white/10 text-white shadow-lg"
                : "text-gray-500 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("cabs")}
          >
            <Car size={16} /> Office Cabs
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === "workers" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="text-sm text-gray-400 font-semibold uppercase tracking-wider mb-2 flex justify-between items-center">
                Active Staff <span className="bg-white/10 px-2 py-0.5 rounded-full text-white">{workerList.length}</span>
              </div>
              
              {workerList.length === 0 && (
                <div className="text-sm text-gray-600 italic text-center py-10 border border-dashed border-white/10 rounded-xl">No workers online</div>
              )}

              {workerList.map((w) => (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={w.name || w.userId}
                  onClick={() => setSelectedWorker(w)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    selectedWorker?.userId === w.userId
                      ? "bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                      : "bg-gradient-to-br from-white/5 to-white/0 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-lg">{w.name || w.userId}</span>
                    <span className="relative flex h-3 w-3">
                      {w.risk >= 80 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${w.risk >= 80 ? 'bg-red-500' : w.risk >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-1.5 flex-1 bg-black/40 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${w.risk >= 80 ? 'bg-red-500' : w.risk >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(w.risk, 100)}%` }} />
                    </div>
                    <span className="text-xs font-mono w-10 text-right">{Math.round(w.risk)}%</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{w.context}</div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === "cabs" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="text-sm text-gray-400 font-semibold uppercase tracking-wider mb-2 flex justify-between items-center">
                Office Cabs <span className="bg-white/10 px-2 py-0.5 rounded-full text-white">{cabList.length}</span>
              </div>
              
              {cabList.length === 0 && (
                <div className="text-sm text-gray-600 italic text-center py-10 border border-dashed border-white/10 rounded-xl">No cabs active</div>
              )}

              {cabList.map((w) => (
                <div
                  key={w.name || w.userId}
                  className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 p-4 rounded-xl shadow-lg relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${w.driverRisk >= 70 ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <div className="font-semibold text-lg mb-1">{w.name || w.userId}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-black/30 p-2 rounded">
                      <div className="text-gray-500 mb-0.5">Cab Number</div>
                      <div className="font-mono text-gray-300">{w.cabNumber || "N/A"}</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded">
                      <div className="text-gray-500 mb-0.5">Driver</div>
                      <div className="text-gray-300 truncate">{w.driverName || "N/A"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* MAP AREA */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {alerts.map((a, i) => (
              <motion.div
                key={a.userId + i}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="pointer-events-auto bg-gradient-to-r from-red-600/90 to-red-500/90 backdrop-blur-md text-white p-4 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.4)] border border-red-400/50 flex items-center gap-4 min-w-[300px]"
              >
                <div className="bg-white/20 p-2 rounded-full animate-pulse">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-red-100 font-bold">Emergency Alert</div>
                  <div className="font-semibold">{a.name || a.userId} • Risk <span className="text-red-100 font-black">{Math.round(a.risk)}%</span></div>
                  <div className="text-sm opacity-90 truncate max-w-[200px]">{a.context}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <MapContainer
          center={[12.9716, 80.2345]}
          zoom={13}
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <Recenter
            position={
              selectedWorker ? [selectedWorker.lat, selectedWorker.lng] : null
            }
          />

          {workerList.map((worker) => (
            <Marker
              key={worker.userId}
              position={[worker.lat, worker.lng]}
              icon={getIcon(worker.risk)}
            >
              <Popup>
                <div className="font-semibold">
                  Worker: {worker.name || worker.userId}
                </div>
                Risk: {Math.round(worker.risk)}%
                <br />
                {worker.context}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <audio
          ref={audioRef}
          src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg"
        />
      </div>
    </div>
  );
}
