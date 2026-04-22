"use client";

import { MapContainer, TileLayer, Polygon, Marker, FeatureGroup, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import { useState, useRef, useEffect } from "react";
import * as turf from "@turf/turf";
import L from "leaflet";

type Props = { onDraw: (geojson: any, areaHa: string) => void };

// ── Detect mobile & HTTPS ─────────────────────────────────────────────────────

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
}

function isSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

// ── Map auto-resize helper ────────────────────────────────────────────────────

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const fix = () => setTimeout(() => map.invalidateSize(), 150);
    fix();
    window.addEventListener("resize", fix);
    window.addEventListener("orientationchange", fix);
    return () => { window.removeEventListener("resize", fix); window.removeEventListener("orientationchange", fix); };
  }, [map]);
  return null;
}

// ── Fix GPS map center when GPS updates ──────────────────────────────────────

function GPSCenter({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, Math.max(map.getZoom(), 16), { animate: true, duration: 0.8 });
  }, [pos, map]);
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FieldMap({ onDraw }: Props) {
  const mobile  = typeof window !== "undefined" ? isMobile() : false;
  const secure  = typeof window !== "undefined" ? isSecureContext() : true;

  // Default to GPS mode on mobile (easier than polygon drawing on touchscreen)
  const [mode,      setMode]      = useState<"draw" | "gps">(mobile ? "gps" : "draw");
  const [mounted,   setMounted]   = useState(false);
  const [positions, setPositions] = useState<[number, number][]>([]);
  const [gpsPos,    setGpsPos]    = useState<[number, number] | null>(null);
  const [tracking,  setTracking]  = useState(false);
  const [gpsError,  setGpsError]  = useState("");
  const [accuracy,  setAccuracy]  = useState<number | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    // Fix Leaflet default marker icons
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  if (!mounted) {
    return (
      <div style={{ height: mapHeight(), background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 14 }}>
        Loading map…
      </div>
    );
  }

  function mapHeight() {
    if (typeof window === "undefined") return 440;
    return window.innerWidth < 500 ? 320 : 440;
  }

  function startTracking() {
    setGpsError("");

    if (!navigator.geolocation) {
      setGpsError("GPS not supported on this browser.");
      return;
    }

    if (!secure) {
      setGpsError(
        "GPS requires a secure connection (HTTPS). " +
        "To enable on mobile: either open the app via localhost on your computer, " +
        "or ask your developer to run 'next dev --experimental-https'."
      );
      return;
    }

    setPositions([]);
    setTracking(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latLng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setGpsPos(latLng);
        setPositions([latLng]);
        setAccuracy(Math.round(pos.coords.accuracy));

        watchRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const pt: [number, number] = [p.coords.latitude, p.coords.longitude];
            setGpsPos(pt);
            setAccuracy(Math.round(p.coords.accuracy));
            setPositions((prev) => {
              // Avoid duplicate/very close points (< 2 metres apart)
              if (prev.length > 0) {
                const last  = prev[prev.length - 1];
                const distM = turf.distance(turf.point([last[1], last[0]]), turf.point([p.coords.longitude, p.coords.latitude]), { units: "kilometers" }) * 1000;
                if (distM < 2) return prev;
              }
              return [...prev, pt];
            });
          },
          (err) => {
            setGpsError("GPS error: " + err.message);
            setTracking(false);
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        );
      },
      (err) => {
        const msg = err.code === 1
          ? "Location permission denied. Please allow location access in your browser settings."
          : err.code === 2
          ? "Location unavailable. Make sure GPS is enabled on your device."
          : "GPS timed out. Move to an open area and try again.";
        setGpsError(msg);
        setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  }

  function stopTracking() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setTracking(false);

    if (positions.length < 3) {
      setGpsError("Need at least 3 GPS points to define a boundary. Walk further around your field.");
      return;
    }

    const closed = [...positions, positions[0]];
    const polygon = turf.polygon([[...closed.map(([lat, lng]) => [lng, lat])]]);
    const areaHa  = (turf.area(polygon) / 10000).toFixed(2);
    onDraw(polygon.geometry, areaHa);
  }

  function handleCreated(e: any) {
    const geojson = e.layer.toGeoJSON();
    const areaHa  = (turf.area(geojson) / 10000).toFixed(2);
    onDraw(geojson.geometry ?? geojson, areaHa);
  }

  const center: [number, number] = gpsPos ?? (positions.length > 0 ? positions[0] : [20.5937, 78.9629]);
  const zoom = gpsPos ? 17 : 6;

  const btnBase: React.CSSProperties = {
    flex: 1, padding: "10px 0", borderRadius: 9, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s", minHeight: 44,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{ ...btnBase, background: mode === "draw" ? "var(--green-dim)" : "var(--bg-card)", border: `1px solid ${mode === "draw" ? "var(--green-dim)" : "var(--border)"}`, color: mode === "draw" ? "#fff" : "var(--text-2)" }}
          onClick={() => { setMode("draw"); setPositions([]); setTracking(false); if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; } }}
        >
          ✏️ Draw Polygon
        </button>
        <button
          style={{ ...btnBase, background: mode === "gps" ? "var(--green-dim)" : "var(--bg-card)", border: `1px solid ${mode === "gps" ? "var(--green-dim)" : "var(--border)"}`, color: mode === "gps" ? "#fff" : "var(--text-2)" }}
          onClick={() => setMode("gps")}
        >
          📍 Walk GPS Boundary
        </button>
      </div>

      {/* HTTPS warning for GPS mode */}
      {mode === "gps" && !secure && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)", marginBottom: 4 }}>⚠️ HTTPS Required for GPS on Mobile</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
            Mobile browsers block GPS on non-secure connections. Options:<br />
            1. Open on your laptop at <code>localhost:3000</code><br />
            2. Run <code>npx next dev --experimental-https</code> for HTTPS locally<br />
            3. Use draw mode above to outline manually
          </div>
        </div>
      )}

      {/* GPS controls */}
      {mode === "gps" && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {!tracking ? (
            <button
              onClick={startTracking}
              disabled={!secure}
              style={{ ...btnBase, flex: "none", padding: "10px 20px", background: secure ? "var(--green-dim)" : "var(--bg-card)", border: `1px solid ${secure ? "var(--green-dim)" : "var(--border)"}`, color: secure ? "#fff" : "var(--text-3)", opacity: secure ? 1 : 0.5 }}
            >
              ▶ Start GPS Tracking
            </button>
          ) : (
            <button
              onClick={stopTracking}
              style={{ ...btnBase, flex: "none", padding: "10px 20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
            >
              ⏹ Stop & Use Boundary
            </button>
          )}

          {tracking && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--amber)" }}>
              <span className="anim-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} />
              {positions.length} points recorded
              {accuracy !== null && <span style={{ color: "var(--text-3)", fontSize: 11 }}>· ±{accuracy}m</span>}
            </div>
          )}
        </div>
      )}

      {/* GPS error */}
      {gpsError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>
          {gpsError}
        </div>
      )}

      {/* Map */}
      <div style={{ height: mapHeight(), borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
        <MapContainer
          key={`${mode}-${center.join(",")}`}
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          // Mobile touch improvements
          
          touchZoom={true}
          doubleClickZoom={false}
        >
          <MapResizer />
          {gpsPos && <GPSCenter pos={gpsPos} />}

          <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles © Esri"
          />

          {/* GPS markers and polygon */}
          {positions.length > 0 && positions.map((p, i) => (
            <Marker key={i} position={p} />
          ))}
          {positions.length > 2 && (
            <Polygon
              positions={positions}
              pathOptions={{ color: "#22c55e", fillColor: "rgba(34,197,94,0.12)", weight: 2.5 }}
            />
          )}

          {/* Draw tool (desktop / draw mode) */}
          {mode === "draw" && (
            <FeatureGroup>
              <EditControl
                position="topright"
                onCreated={handleCreated}
                draw={{
                  rectangle:    false,
                  circle:       false,
                  circlemarker: false,
                  marker:       false,
                  polyline:     false,
                }}
                edit={undefined}
              />
            </FeatureGroup>
          )}
        </MapContainer>
      </div>

      {/* Instructions */}
      <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", lineHeight: 1.5 }}>
        {mode === "draw"
          ? "Tap the polygon tool (top-right of map) → tap each corner of your field → close the shape"
          : tracking
          ? "Walk slowly around the edge of your field. Tap Stop when you return to your starting point."
          : "Tap Start GPS, then walk around your field boundary. GPS mode works best outdoors."}
      </p>
    </div>
  );
}
