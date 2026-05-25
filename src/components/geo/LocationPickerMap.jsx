"use client";
/**
 * Leaflet-based interactive map for predio location.
 * Uses vanilla Leaflet (no react-leaflet) to avoid ESM/React-18 conflicts.
 * Must be dynamically imported with { ssr: false } in the parent.
 */
import { useEffect, useRef, useState, useCallback } from "react";

// ── Nominatim geocoding ───────────────────────────────────────────────────
async function nominatimSearch(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=co`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "es", "User-Agent": "HydroStack-SITARD/1.0" },
  });
  return res.json();
}

async function nominatimReverse(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "es", "User-Agent": "HydroStack-SITARD/1.0" },
  });
  return res.json();
}

// ── Styles ────────────────────────────────────────────────────────────────
const S = {
  root: { display: "flex", flexDirection: "column", gap: "8px" },
  searchRow: { display: "flex", gap: "6px" },
  searchInp: {
    flex: 1, background: "#041820", border: "1px solid #1a4060",
    borderRadius: "4px", color: "#e2f0f7", fontSize: "11px",
    padding: "7px 10px", fontFamily: "'IBM Plex Sans',system-ui,sans-serif",
    outline: "none",
  },
  searchBtn: {
    background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)",
    color: "#00d4ff", fontSize: "10px", fontWeight: "700", borderRadius: "4px",
    padding: "0 12px", cursor: "pointer", whiteSpace: "nowrap",
    fontFamily: "'IBM Plex Mono',monospace",
  },
  results: {
    background: "#041820", border: "1px solid #1a4060", borderRadius: "4px",
    maxHeight: "160px", overflowY: "auto",
  },
  resultItem: {
    padding: "7px 10px", fontSize: "10px", color: "#a0c8d8", cursor: "pointer",
    borderBottom: "1px solid #0d2035", lineHeight: "1.4",
  },
  mapWrap: { borderRadius: "6px", overflow: "hidden", border: "1px solid #1a4060" },
  coords: {
    display: "flex", gap: "8px", flexWrap: "wrap",
    background: "#041820", border: "1px solid #0d2035",
    borderRadius: "4px", padding: "8px 10px",
  },
  coordPill: {
    fontSize: "10px", color: "#4a7fa5",
    fontFamily: "'IBM Plex Mono',monospace",
  },
  coordVal: { color: "#00d4ff", fontWeight: "700" },
  hint: { fontSize: "9px", color: "#1e4060", marginTop: "2px" },
};

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────
export default function LocationPickerMap({ value, onChange, height = 340 }) {
  const defaultCenter = [4.711, -74.072]; // Colombia
  const mapElRef      = useRef(null);
  const mapRef        = useRef(null);   // Leaflet map instance
  const markerRef     = useRef(null);   // Leaflet marker instance
  const LRef          = useRef(null);   // Leaflet lib reference

  const [position, setPosition] = useState(value ? [value.lat, value.lon] : null);
  const [address,  setAddress]  = useState(value?.address ?? "");
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);

  // Keep a ref to current values so callbacks don't stale-close
  const posRef  = useRef(position);
  const addrRef = useRef(address);
  posRef.current  = position;
  addrRef.current = address;

  const applyLocation = useCallback(async (lat, lon) => {
    setPosition([lat, lon]);
    let addr = addrRef.current;
    try {
      const rev = await nominatimReverse(lat, lon);
      addr = rev.display_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      setAddress(addr);
    } catch (_) { /* keep previous */ }
    onChange?.({ lat, lon, address: addr });

    // Update or create marker
    const L   = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    } else {
      const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        applyLocation(p.lat, p.lng);
      });
      markerRef.current = marker;
    }
    map.setView([lat, lon], 15);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;

    // Inject Leaflet CSS dynamically
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id   = "leaflet-css";
      link.rel  = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      LRef.current = L;

      // Fix default marker icon path issue in webpack/Next.js
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapElRef.current) return;
      // Guard against React Strict Mode / HMR double-init
      if (mapElRef.current._leaflet_id) return;
      const map = L.map(mapElRef.current).setView(
        posRef.current ?? defaultCenter,
        posRef.current ? 15 : 7
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e) => {
        applyLocation(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;

      // Restore existing position if provided
      if (posRef.current) {
        const [lat, lon] = posRef.current;
        const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          applyLocation(p.lat, p.lng);
        });
        markerRef.current = marker;
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      // Ensure Leaflet's container flag is cleared for React Strict Mode remounts
      if (mapElRef.current) {
        delete mapElRef.current._leaflet_id;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await nominatimSearch(query);
      setResults(data);
    } catch (_) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const selectResult = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setResults([]);
    applyLocation(lat, lon);
  };

  return (
    <div style={S.root}>
      {/* Search bar */}
      <div style={S.searchRow}>
        <input
          style={S.searchInp}
          placeholder="Buscar dirección, vereda, municipio en Colombia..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
        />
        <button style={S.searchBtn} onClick={handleSearch} disabled={loading}>
          {loading ? "…" : "Buscar"}
        </button>
      </div>

      {/* Search results dropdown */}
      {results.length > 0 && (
        <div style={S.results}>
          {results.map((r, i) => (
            <div
              key={i}
              style={S.resultItem}
              onClick={() => selectResult(r)}
              onMouseEnter={e => { e.currentTarget.style.background = "#0d2035"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}

      {/* Map container */}
      <div style={{ ...S.mapWrap, height }}>
        <div ref={mapElRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Coordinate display */}
      <div style={S.coords}>
        {position ? (
          <>
            <span style={S.coordPill}>
              Lat: <span style={S.coordVal}>{position[0].toFixed(6)}°</span>
            </span>
            <span style={S.coordPill}>
              Lon: <span style={S.coordVal}>{position[1].toFixed(6)}°</span>
            </span>
            <span style={S.coordPill}>
              MAGNA-SIRGAS: <span style={S.coordVal}>{position[0].toFixed(6)}°N {Math.abs(position[1]).toFixed(6)}°W</span>
            </span>
            {address && (
              <span style={{ ...S.coordPill, flex: 1, minWidth: "100%", color: "#7ab0d0" }}>
                📍 {address.length > 100 ? address.slice(0, 97) + "…" : address}
              </span>
            )}
          </>
        ) : (
          <span style={S.coordPill}>Sin ubicación — haz clic en el mapa para fijar el punto</span>
        )}
      </div>
      <div style={S.hint}>
        Clic en mapa para fijar · Arrastrar marcador para ajustar · Sistema: WGS84 ≡ MAGNA-SIRGAS geográfico (EPSG:4686)
      </div>
    </div>
  );
}
