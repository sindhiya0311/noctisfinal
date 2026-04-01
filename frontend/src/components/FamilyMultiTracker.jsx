import { useEffect, useState, useRef } from "react";
import socket from "../socket";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Activity } from "lucide-react";
import axios from "axios";

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position);
  }, [position, map]);
  return null;
}

export default function FamilyMultiTracker() {
  const [trackedMembers, setTrackedMembers] = useState({});
  const [focusedMemberId, setFocusedMemberId] = useState(null);
  const [alert, setAlert] = useState(false);
  const audioRef = useRef(null);
  const [allowedIds, setAllowedIds] = useState([]);

  useEffect(() => {
    const fetchLinked = async () => {
      try {
        const userData = sessionStorage.getItem("user");
        if (!userData) return;
        const user = JSON.parse(userData);
        const userId = user._id || user.id;
        const res = await axios.get(`https://noctisfinal.onrender.com/api/requests/linked/${userId}`);
        
        const ids = [];
        const initialMembers = {};

        res.data.forEach((r) => {
          ids.push(r.counterpartId);
          initialMembers[r.counterpartId] = {
            userId: r.counterpartId,
            name: r.counterpartName,
            risk: 0,
            context: "Offline / Disconnected",
            lat: 28.6139,
            lng: 77.2090, // Map default fallback
          };
        });

        setAllowedIds(ids);
        setTrackedMembers((prev) => ({ ...initialMembers, ...prev }));
      } catch (err) {
        console.error("Error fetching family list:", err);
      }
    };
    fetchLinked();
  }, []);

  useEffect(() => {
    const handleUpdate = (workers) => {
      setTrackedMembers((prev) => {
        const merged = { ...prev };
        for (const [id, worker] of Object.entries(workers)) {
          // For socket updates: only update if part of our allowed lists
          if (allowedIds.includes(id)) {
            const existingName = prev[id]?.name;
            merged[id] = { ...worker };
            // Prevent the internal MapView fallback from hiding the real name
            if (worker.name === "Worker" || !worker.name) {
               merged[id].name = existingName || "Unknown Member";
            }
          }
        }
        
        const hasEmergency = Object.values(merged).some((w) => w.risk >= 80);
        if (hasEmergency) {
          setAlert(true);
          audioRef.current?.play().catch(() => {});
        } else {
          setAlert(false);
        }

        return merged;
      });
    };

    socket.on("workers:update", handleUpdate);

    // Explicitly ask server for current worker states (in case we missed them while loading API)
    if (allowedIds.length > 0) {
      socket.emit("get:workers");
    }

    socket.on("worker:alert", (w) => {
      if (allowedIds.includes(w.userId)) {
        setTrackedMembers((prev) => {
          const existingName = prev[w.userId]?.name;
          const merged = { ...prev, [w.userId]: { ...w } };
          merged[w.userId].name = existingName || w.name;
          return merged;
        });
        setAlert(true);
        audioRef.current?.play().catch(() => {});
      }
    });

    return () => {
      socket.off("workers:update", handleUpdate);
      socket.off("worker:alert");
    };
  }, [allowedIds]);

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
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
  };

  const members = Object.values(trackedMembers);
  const activeMember = focusedMemberId ? trackedMembers[focusedMemberId] : members[0];
  const emergencyMembers = members.filter((m) => m.risk >= 80);

  if (members.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl shadow-2xl relative">
        <div className="bg-black/40 backdrop-blur-xl p-10 rounded-3xl border border-white/10 flex flex-col items-center gap-4">
          <Shield className="text-blue-500 animate-pulse" size={48} />
          <div className="text-gray-300 font-medium tracking-wide">
            Waiting for family member locations...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-[#020617] flex flex-col-reverse md:flex-row overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
      {/* INTERNAL SIDEBAR */}
      <div className="w-full h-[40%] md:h-full md:w-80 bg-gradient-to-b from-[#020617]/95 to-[#030a1a]/95 backdrop-blur-3xl border-t md:border-t-0 md:border-r border-white/10 flex flex-col z-[10] shadow-[0_-20px_40px_rgba(0,0,0,0.5)] md:shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="text-sm text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <Activity size={16} className="text-blue-400" /> Tracked Members
          </div>
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
          {members.map((member) => {
            const isDanger = member.risk >= 80;
            const isWarning = member.risk >= 40 && !isDanger;
            const isFocused =
              focusedMemberId === member.userId ||
              (!focusedMemberId && activeMember?.userId === member.userId);

            return (
              <motion.div
                key={member.userId}
                onClick={() => setFocusedMemberId(member.userId)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                  isFocused
                    ? "bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/40 shadow-[0_10px_30px_rgba(59,130,246,0.15)]"
                    : "bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/20"
                } ${
                  isDanger
                    ? "!bg-red-500/10 !border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse"
                    : ""
                }`}
              >
                {/* Visual Indicator lines */}
                {isFocused && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                )}
                {isDanger && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl shadow-[0_0_20px_rgba(239,68,68,1)]" />
                )}

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div
                      className={`font-bold text-lg tracking-wide ${
                        isDanger ? "text-red-100" : "text-white"
                      }`}
                    >
                      {member.name || member.userId}
                    </div>
                  </div>
                  <div
                    className={`text-2xl font-black ${
                      isDanger
                        ? "text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                        : isWarning
                        ? "text-yellow-400"
                        : "text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                    }`}
                  >
                    {Math.round(member.risk)}
                    <span className="text-xs opacity-50">%</span>
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 group-hover:bg-black/50 transition-colors">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                    Live Context Status
                  </div>
                  <div
                    className={`text-xs font-semibold leading-tight ${
                      isDanger
                        ? "text-red-300 animate-pulse"
                        : isWarning
                        ? "text-yellow-300"
                        : "text-gray-300"
                    }`}
                  >
                    {member.context}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* EMERGENCY OVERLAY */}
      <AnimatePresence>
        {alert && emergencyMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-80 right-0 bg-gradient-to-b from-red-600/90 to-red-600/0 backdrop-blur-sm text-white font-bold tracking-widest text-center py-6 shadow-2xl z-[50] flex flex-col justify-center items-center pointer-events-none"
          >
            <div className="flex items-center gap-3 uppercase text-2xl drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
              <AlertTriangle className="animate-pulse" size={32} />
              EMERGENCY OVERRIDE
              <AlertTriangle className="animate-pulse" size={32} />
            </div>
            <div className="mt-2 text-red-100 text-sm font-medium">
              {emergencyMembers.map((m) => m.name || m.userId).join(", ")}{" "}
              {emergencyMembers.length > 1 ? "are" : "is"} currently in grave
              danger.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAP VIEW */}
      <div className="flex-1 relative z-0 bg-black">
        <MapContainer
          center={[activeMember.lat, activeMember.lng]}
          zoom={16}
          className="h-full w-full"
        >
          <Recenter position={[activeMember.lat, activeMember.lng]} />
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            attribution="&copy; Google Maps"
          />

          {members.map((member) => (
            <Marker
              key={member.userId}
              position={[member.lat, member.lng]}
              icon={getIcon(member.risk)}
            >
              <Popup className="custom-popup">
                <div className="p-1">
                  <div className="font-bold text-gray-900 border-b pb-1 mb-1">
                    {member.name || member.userId}
                  </div>
                  <div
                    className={`font-black ${
                      member.risk >= 80
                        ? "text-red-500"
                        : member.risk >= 40
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    Risk: {Math.round(member.risk)}%
                  </div>
                  <div className="text-xs mt-1 text-gray-600 font-medium leading-tight">
                    {member.context}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Subtle vignette for the map to blend with dark mode */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(2,6,23,0.8)] z-[20]" />
      </div>

      <audio
        ref={audioRef}
        src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg"
      />
    </div>
  );
}
