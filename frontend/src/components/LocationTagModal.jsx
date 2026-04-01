import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { X, MapPin } from "lucide-react";

const customIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MiniMapClick({ setTagLocation }) {
  useMapEvents({
    click(e) {
      setTagLocation([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position, map]);
  return null;
}

export default function LocationTagModal({ isOpen, onClose, onSave }) {
  const [tagName, setTagName] = useState("");
  const [tagLocation, setTagLocation] = useState(null);

  // Default to a generic location or previous saved one if the browser hasn't fetched GPS yet
  const defaultLocation = [11.0168, 76.9558]; // Generic fallback

  useEffect(() => {
    if (isOpen) {
      setTagName("");
      setTagLocation(null);
      // Try to get a fast GPS position to center the mini map
      navigator.geolocation.getCurrentPosition(
        (pos) => setTagLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!tagName.trim()) {
      alert("Please enter a name for this tag.");
      return;
    }
    if (!tagLocation) {
      alert("Please tap on the map to place the pin.");
      return;
    }

    onSave({
      name: tagName.trim(),
      lat: tagLocation[0],
      lng: tagLocation[1],
    });

    onClose();
  };

  return (
    <AnimatePresence>
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
          className="bg-gradient-to-br from-slate-900 to-[#020617] border border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MapPin className="text-blue-400" />
              Add Location Tag
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
              <label className="block text-sm font-medium text-gray-400 mb-2">Tag Name (e.g., Home, Warehouse A)</label>
              <input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                autoFocus
                placeholder="Enter tag name..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Drop Pin <span className="text-xs text-gray-500">(Click map to set exact location)</span>
              </label>
              <div className="h-[250px] w-full rounded-2xl overflow-hidden border border-white/10 relative">
                <MapContainer
                  center={tagLocation || defaultLocation}
                  zoom={12}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; Google Maps'
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  />
                  {tagLocation && (
                    <Marker position={tagLocation} icon={customIcon} />
                  )}
                  {tagLocation && <RecenterMap position={tagLocation} />}
                  <MiniMapClick setTagLocation={setTagLocation} />
                </MapContainer>
                
                {!tagLocation && (
                  <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full border border-blue-500/30 text-sm font-medium shadow-xl">
                      Tap anywhere on the map to place pin
                    </div>
                  </div>
                )}
              </div>
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
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold hover:bg-blue-500 hover:text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2"
            >
              Save Tag
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
