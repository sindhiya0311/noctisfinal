import { useState, useEffect } from "react";
import { MapPin, Plus, Trash } from "lucide-react";
import LocationTagModal from "../components/LocationTagModal";

export default function WorkerSavedLocations() {
  const [locations, setLocations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    load();

    const reload = () => load();
    window.addEventListener("savedLocationsUpdated", reload);

    return () => window.removeEventListener("savedLocationsUpdated", reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getKey = () => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    return `savedLocations_${user?._id || user?.id}`;
  };

  const load = () => {
    const saved = JSON.parse(localStorage.getItem(getKey())) || [];
    setLocations(saved);
  };

  const deleteLocation = (i) => {
    const updated = [...locations];
    updated.splice(i, 1);

    localStorage.setItem(getKey(), JSON.stringify(updated));
    setLocations(updated);
    window.dispatchEvent(new Event("savedLocationsUpdated"));
  };

  const handleSaveTag = (tagData) => {
    const saved = JSON.parse(localStorage.getItem(getKey())) || [];
    saved.push(tagData);
    localStorage.setItem(getKey(), JSON.stringify(saved));
    setLocations(saved);
    window.dispatchEvent(new Event("savedLocationsUpdated"));
  };

  return (
    <div
      className="bg-gradient-to-br from-white/5 to-white/0 
  border border-white/10 rounded-3xl p-6 
  backdrop-blur-xl shadow-2xl h-full flex flex-col relative"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl flex gap-2 items-center font-bold tracking-wide">
          <MapPin size={22} className="text-blue-400" />
          Location Tags
        </h2>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/30 font-semibold px-4 py-2 rounded-xl flex gap-2 items-center shadow-lg hover:bg-blue-500 hover:text-white hover:scale-105 transition-all"
        >
          <Plus size={16} />
          Add Tag
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {locations.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
            No tagged locations yet. Click "Add Tag" to drop a pin.
          </div>
        ) : (
          locations.map((loc, i) => (
            <div
              key={i}
              className="bg-black/20 border border-white/10 p-4 rounded-2xl flex justify-between items-center hover:border-blue-500/30 hover:bg-white/5 transition-all shadow-lg group"
            >
              <div>
                <div className="font-bold text-lg">{loc.name}</div>
                {loc.lat && (
                  <div className="text-sm font-mono text-gray-400 mt-1 flex items-center gap-1 opacity-70">
                    <MapPin size={12} />
                    {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                  </div>
                )}
              </div>

              <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => deleteLocation(i)}
                  className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <LocationTagModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTag}
      />
    </div>
  );
}
