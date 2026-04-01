import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";

import socket from "../socket";
import { useState, useEffect, useContext, useRef } from "react";
import L from "leaflet";

import { RiskContext } from "../context/RiskContext";
import { checkRouteDeviation, getDistance } from "../utils/routeDeviation";

import {
  isNightTime,
  calculateSpeed,
  checkUnsafeZone,
} from "../utils/riskEngine";

function Recenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position);
    }
  }, [position, map]);

  return null;
}

// MapClick has been retired in favor of LocationTagModal

export default function MapView({
  transportType,
  cabNumber,
  driverName,
  driverPhone,
}) {
  const { risk, context, updateRisk, updateContext, emergency, demoMode } =
    useContext(RiskContext);

  const user = JSON.parse(sessionStorage.getItem("user")) || {};
  const workerName = user.name || user.username || "Worker";
  const userId = user?._id || user?.id || "worker-1";
  const enterpriseId = "enterprise-1";

  const overrideKey = `manual_override_${userId}`;

  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem(overrideKey);
    return saved ? JSON.parse(saved) : null;
  });

  const [overrideMode, setOverrideMode] = useState(false);
  
  const [isManuallyLocked, setIsManuallyLocked] = useState(() => {
    return !!localStorage.getItem(overrideKey);
  });
  
  const manualLockRef = useRef(!!localStorage.getItem(overrideKey));

  const [savedLocs, setSavedLocs] = useState([]);

  useEffect(() => {
    const key = `savedLocations_${userId}`;
    const loadSaved = () => {
      setSavedLocs(JSON.parse(localStorage.getItem(key)) || []);
    };
    
    loadSaved();
    window.addEventListener("savedLocationsUpdated", loadSaved);
    return () => window.removeEventListener("savedLocationsUpdated", loadSaved);
  }, [userId]);

  // initial gps
  useEffect(() => {
    // If we have a saved manual override, don't even try to fetch IP or GPS
    if (manualLockRef.current) return;

    const fetchIPLocation = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data.latitude && data.longitude) {
          console.log("Using IP Geolocation fallback:", data.city);
          setPosition([data.latitude, data.longitude]);
        } else {
          setPosition([28.6139, 77.2090]); // Just a central default
        }
      } catch (err) {
        setPosition([28.6139, 77.2090]); 
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.warn("Hardware GPS Failed/Blocked. Trying IP Geolocation...", err);
        fetchIPLocation();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  // demo override
  useEffect(() => {
    window.demoSetPosition = setPosition;
  }, []);

  const lastPositionRef = useRef(null);
  const lastMoveTimeRef = useRef(Date.now());
  const lastUpdateRef = useRef(Date.now());

  const contextRef = useRef(context);
  const emergencyRef = useRef(emergency);
  const transportTypeRef = useRef(transportType);
  const cabNumberRef = useRef(cabNumber);
  const driverNameRef = useRef(driverName);
  const driverPhoneRef = useRef(driverPhone);
  
  const updateRiskRef = useRef(updateRisk);
  const updateContextRef = useRef(updateContext);

  useEffect(() => {
    contextRef.current = context;
    emergencyRef.current = emergency;
    transportTypeRef.current = transportType;
    cabNumberRef.current = cabNumber;
    driverNameRef.current = driverName;
    driverPhoneRef.current = driverPhone;
    updateRiskRef.current = updateRisk;
    updateContextRef.current = updateContext;
  });

  useEffect(() => {
    if (demoMode) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (overrideMode || manualLockRef.current) return; // Disregard GPS if manual override active or locked

        const accuracy = pos.coords.accuracy;
        
        // Ignore extremely bad random triangulation spikes from desktop ISPs
        if (accuracy > 3000 && lastPositionRef.current) {
          console.log(`Ignored bad GPS jump (Accuracy: ${accuracy}m)`);
          return;
        }

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setPosition([lat, lng]);

        const current = { lat, lng };
        const now = Date.now();

        let newRisk = 5;
        let newContext = "Safe";

        let stop = 0;
        let night = 0;
        let unsafe = 0;
        let deviationFlag = 0;

        const lastPosition = lastPositionRef.current;
        const lastMoveTime = lastMoveTimeRef.current;
        const lastUpdate = lastUpdateRef.current;

        if (lastPosition) {
          const dist = getDistance(
            current.lat,
            current.lng,
            lastPosition.lat,
            lastPosition.lng,
          );

          if (dist < 20) {
            const stopped = now - lastMoveTime;

            if (stopped > 60000) {
              stop = 1;
              newRisk = 60;
              newContext = "Worker stationary";
            }
          } else {
            lastMoveTimeRef.current = now;
          }
        }

        const speed = calculateSpeed(lastPosition, current, now - lastUpdate);

        if (isNightTime()) night = 1;

        if (checkUnsafeZone(lat, lng)) {
          unsafe = 1;
          newRisk = 80;
          newContext = "Entered unsafe zone";
        }

        const key = `savedLocations_${user?._id || user?.id}`;
        const saved = JSON.parse(localStorage.getItem(key)) || [];

        const home = saved.find((l) => l.name === "Home");
        const office = saved.find((l) => l.name === "Office");

        if (home && office) {
          const deviation = checkRouteDeviation(
            current,
            { lat: home.lat, lng: home.lng },
            { lat: office.lat, lng: office.lng },
          );

          if (deviation > 600) {
            deviationFlag = 1;
            newRisk = 85;
            newContext = "Route deviation detected";
          }
        }

        if (!emergencyRef.current) {
          updateRiskRef.current(newRisk);
          updateContextRef.current(newContext);
        }

        socket.emit("worker:update", {
          userId: user._id,
          name: workerName,
          lat,
          lng,
          speed,
          stop,
          night,
          unsafe,
          deviation: deviationFlag,
          risk: emergencyRef.current ? 100 : newRisk,
          context: emergencyRef.current ? contextRef.current : newContext,
          transportType: transportTypeRef.current,
          cabNumber: cabNumberRef.current,
          driverName: driverNameRef.current,
          driverPhone: driverPhoneRef.current,
          timestamp: Date.now(),
        });

        lastPositionRef.current = current;
        lastUpdateRef.current = now;
      },
      (err) => {
        console.error("GPS Watch error:", err);
      },
      { 
        enableHighAccuracy: true,
        maximumAge: 10000, 
        timeout: 20000 
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [demoMode, overrideMode, user._id, user.id, workerName]);

  let marker =
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png";

  if (risk > 80)
    marker =
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png";
  else if (risk > 40)
    marker =
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png";

  const icon = new L.Icon({
    iconUrl: marker,
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const savedLocationIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  // Manual Map Click Handler if the device GPS is hopelessly inaccurate
  function ManualLocationPicker() {
    useMapEvents({
      click(e) {
        if (!overrideMode) return;
        setPosition([e.latlng.lat, e.latlng.lng]);
        lastPositionRef.current = { lat: e.latlng.lat, lng: e.latlng.lng };
      },
    });
    return null;
  }

  const confirmManualLocation = () => {
    setOverrideMode(false);
    setIsManuallyLocked(true);
    manualLockRef.current = true;

    if (position) {
      localStorage.setItem(overrideKey, JSON.stringify(position));

      socket.emit("worker:update", {
        userId: user._id,
        name: workerName,
        lat: position[0],
        lng: position[1],
        speed: 0,
        stop: 1,
        night: isNightTime() ? 1 : 0,
        unsafe: checkUnsafeZone(position[0], position[1]) ? 1 : 0,
        deviation: 0,
        risk: emergencyRef.current ? 100 : risk,
        context: emergencyRef.current ? contextRef.current : "Manual Location Override",
        transportType,
        cabNumber,
        driverName,
        driverPhone,
        timestamp: Date.now(),
      });
    }
  };

  const resumeLiveGPS = () => {
    setIsManuallyLocked(false);
    manualLockRef.current = false;
    localStorage.removeItem(overrideKey);
  };

  if (!position) return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-black/40 text-blue-400 font-semibold rounded-xl animate-pulse space-y-4">
      <div>Acquiring High-Precision GPS Lock...</div>
      <button 
        onClick={() => { setPosition([11.0168, 76.9558]); setOverrideMode(true); }}
        className="text-xs bg-blue-500/20 text-blue-300 px-4 py-2 border border-blue-500/30 rounded shadow-lg pointer-events-auto cursor-pointer z-50 hover:bg-blue-500/40"
      >
        GPS Blocked? Default to Location & Set Manually
      </button>
    </div>
  );

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={position}
        zoom={16}
        className={`h-full w-full rounded-xl transition-all duration-300 ${overrideMode ? 'cursor-crosshair brightness-50 border-4 border-yellow-500' : ''}`}
      >
        <Recenter position={position} />

        <TileLayer 
          attribution='&copy; Google Maps' 
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" 
        />

        <Marker position={position} icon={icon}>
          <Popup>
            <div className="font-bold">Risk: {Math.round(risk)}%</div>
            <div className="text-gray-600">{overrideMode ? "Move pin by clicking map" : isManuallyLocked ? "Manual override active" : context}</div>
          </Popup>
        </Marker>

        {savedLocs.map((loc, idx) => (
          <Marker 
            key={idx} 
            position={[loc.lat, loc.lng]} 
            icon={savedLocationIcon}
          >
            <Popup>
              <div className="font-bold text-blue-600">{loc.name}</div>
              <div className="text-xs text-gray-500 text-center border-t mt-1 pt-1 border-gray-200">
                Saved Location
              </div>
            </Popup>
          </Marker>
        ))}

        <ManualLocationPicker />
      </MapContainer>

      {/* Override HUD */}
      <div className="absolute bottom-4 left-4 z-[9999] pointer-events-auto flex gap-3">
        {overrideMode ? (
          <>
            <button
              onClick={confirmManualLocation}
              className="bg-green-500/30 text-green-300 border border-green-500/50 px-5 py-2.5 rounded-xl font-bold tracking-wide shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:bg-green-500/40 transition-all hover:scale-105"
            >
              CONFIRM LOCATION
            </button>
            <button
              onClick={() => setOverrideMode(false)}
              className="bg-red-500/20 text-red-300 border border-red-500/30 px-4 py-2.5 rounded-xl font-semibold hover:bg-red-500/30 transition-all"
            >
              Cancel
            </button>
          </>
        ) : isManuallyLocked ? (
          <button
            onClick={resumeLiveGPS}
            className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-4 py-2 rounded-xl text-sm font-semibold shadow-2xl hover:bg-blue-500/40 transition-all backdrop-blur-md"
          >
            Resume Live GPS Tracking
          </button>
        ) : (
          <button
            onClick={() => setOverrideMode(true)}
            className="bg-black/60 text-gray-300 border border-white/20 px-4 py-2 rounded-xl text-sm font-semibold shadow-2xl hover:bg-black/80 hover:text-white transition-all backdrop-blur-md"
          >
            GPS Inaccurate? Set Manually
          </button>
        )}
      </div>
    </div>
  );
}
