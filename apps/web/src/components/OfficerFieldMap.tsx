"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";

type Props = {
  farmerPolygon: any;                                    // GeoJSON from DB
  onSubmit: (path: [number, number][], inside: boolean | null) => void;
  onCancel: () => void;
};

function FlyTo({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, Math.max(map.getZoom(), 17), { animate: true, duration: 0.8 });
  }, [pos, map]);
  return null;
}

function extractPolygonPositions(geojson: any): [number, number][] {
  try {
    const coords: [number, number][] =
      geojson?.coordinates?.[0] ?? geojson?.geometry?.coordinates?.[0] ?? [];
    return coords.map(([lng, lat]: [number, number]) => [lat, lng]);
  } catch { return []; }
}

function polygonCenter(positions: [number, number][]): [number, number] {
  if (!positions.length) return [20.5937, 78.9629];
  const lat = positions.reduce((s, p) => s + p[0], 0) / positions.length;
  const lng = positions.reduce((s, p) => s + p[1], 0) / positions.length;
  return [lat, lng];
}

// Ray-cast point-in-polygon
function pointInGeoJSON(point: [number, number], geojson: any): boolean {
  try {
    const coords: [number, number][] =
      geojson?.coordinates?.[0] ?? geojson?.geometry?.coordinates?.[0] ?? [];
    const [px, py] = [point[1], point[0]]; // [lng, lat]
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const [xi, yi] = coords[i];
      const [xj, yj] = coords[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  } catch { return false; }
}

export default function OfficerFieldMap({ farmerPolygon, onSubmit, onCancel }: Props) {
  const [mounted,      setMounted]      = useState(false);
  const [tracking,     setTracking]     = useState(false);
  const [officerPath,  setOfficerPath]  = useState<[number, number][]>([]);
  const [currentPos,   setCurrentPos]   = useState<[number, number] | null>(null);
  const [accuracy,     setAccuracy]     = useState<number | null>(null);
  const [lastInside,   setLastInside]   = useState<boolean | null>(null);
  const [gpsError,     setGpsError]     = useState("");
  const watchRef = useRef<number | null>(null);

  const farmerPositions = extractPolygonPositions(farmerPolygon);
  const center = polygonCenter(farmerPositions);

  useEffect(() => {
    setMounted(true);
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  function startTracking() {
    if (!navigator.geolocation) { setGpsError("GPS not supported on this browser."); return; }
    setGpsError(""); setOfficerPath([]); setTracking(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCurrentPos(pt); setOfficerPath([pt]);
        setLastInside(pointInGeoJSON(pt, farmerPolygon));
        setAccuracy(Math.round(pos.coords.accuracy));

        watchRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const np: [number, number] = [p.coords.latitude, p.coords.longitude];
            setCurrentPos(np);
            setAccuracy(Math.round(p.coords.accuracy));
            setLastInside(pointInGeoJSON(np, farmerPolygon));
            setOfficerPath((prev) => {
              if (prev.length > 0) {
                const [la, lo] = prev[prev.length - 1];
                const dLat = (np[0] - la) * 111000;
                const dLng = (np[1] - lo) * 111000 * Math.cos(la * Math.PI / 180);
                const dist  = Math.sqrt(dLat * dLat + dLng * dLng);
                if (dist < 3) return prev; // ignore < 3m jitter
              }
              return [...prev, np];
            });
          },
          (err) => { setGpsError("GPS error: " + err.message); },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        );
      },
      (err) => {
        const msg = err.code === 1 ? "Location permission denied." : err.code === 2 ? "Location unavailable." : "GPS timed out.";
        setGpsError(msg); setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function stopTracking() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setTracking(false);
  }

  if (!mounted) {
    return <div style={{ height: 400, background: "var(--gov-bg)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gov-text-3)", fontSize: 14 }}>Loading map…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--gov-text-2)" }}>
          <div style={{ width: 16, height: 4, background: "#22c55e", borderRadius: 2 }} />
          Farmer's submitted boundary
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--gov-text-2)" }}>
          <div style={{ width: 16, height: 4, background: "#818cf8", borderRadius: 2 }} />
          Officer GPS trace
        </div>
        {currentPos && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: lastInside ? "#4ade80" : "#fbbf24" }}>
            <span className="anim-pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: lastInside ? "#4ade80" : "#fbbf24", display: "inline-block" }} />
            {lastInside ? "Inside boundary" : "Outside boundary"}
            {accuracy !== null && <span style={{ color: "var(--gov-text-3)" }}>· ±{accuracy}m</span>}
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ height: 380, borderRadius: 14, overflow: "hidden", border: "1px solid var(--gov-border)" }}>
        <MapContainer
          center={center} zoom={15}
          style={{ height: "100%", width: "100%" }}
          touchZoom doubleClickZoom={false}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Esri World Imagery"
          />

          {/* Farmer polygon — green */}
          {farmerPositions.length > 0 && (
            <Polygon
              positions={farmerPositions}
              pathOptions={{ color: "#22c55e", fillColor: "rgba(34,197,94,0.15)", weight: 2.5, dashArray: "6 4" }}
            />
          )}

          {/* Officer trace — purple polyline */}
          {officerPath.length > 1 && (
            <Polyline
              positions={officerPath}
              pathOptions={{ color: "#818cf8", weight: 3, opacity: 0.9 }}
            />
          )}

          {/* Officer's current dot */}
          {currentPos && (
            <CircleMarker
              center={currentPos} radius={9}
              pathOptions={{ color: "#818cf8", fillColor: "#818cf8", fillOpacity: 1, weight: 3 }}
            />
          )}

          {currentPos && <FlyTo pos={currentPos} />}
        </MapContainer>
      </div>

      {/* GPS points count */}
      {officerPath.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--gov-text-3)", textAlign: "center" }}>
          {officerPath.length} GPS points recorded along your path
        </div>
      )}

      {/* GPS error */}
      {gpsError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>
          {gpsError}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={onCancel} className="btn btn-gov-ghost" style={{ flex: 1 }}>
          Cancel
        </button>

        {!tracking ? (
          <button onClick={startTracking} className="btn btn-gov" style={{ flex: 2 }}>
            📍 Start Walking GPS Trace
          </button>
        ) : (
          <button
            onClick={stopTracking}
            style={{ flex: 2, padding: "10px 20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#f87171", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            ⏹ Stop Recording
          </button>
        )}

        <button
          onClick={() => onSubmit(officerPath, lastInside)}
          disabled={officerPath.length === 0 && lastInside === null}
          className="btn btn-gov"
          style={{ flex: 2, opacity: officerPath.length === 0 ? 0.5 : 1 }}
        >
          ✓ Submit Verification
        </button>
      </div>

      <p style={{ fontSize: 11, color: "var(--gov-text-3)", textAlign: "center" }}>
        Walk around the field — your trace will appear in purple on the map. You can skip GPS and submit directly.
      </p>
    </div>
  );
}
