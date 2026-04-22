"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";

type Props = {
  polygon: any;           // GeoJSON polygon from Supabase
  gps: { lat: number; lng: number } | null;
};

function FlyTo({ gps }: { gps: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (gps) map.flyTo([gps.lat, gps.lng], Math.max(map.getZoom(), 16), { animate: true, duration: 1 });
  }, [gps, map]);
  return null;
}

function extractPositions(geojson: any): [number, number][] {
  try {
    const coords = geojson?.coordinates?.[0] ?? geojson?.geometry?.coordinates?.[0] ?? [];
    return coords.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
  } catch { return []; }
}

function polygonCenter(positions: [number, number][]): [number, number] {
  if (!positions.length) return [20.5937, 78.9629];
  const lat = positions.reduce((s, p) => s + p[0], 0) / positions.length;
  const lng = positions.reduce((s, p) => s + p[1], 0) / positions.length;
  return [lat, lng];
}

export default function InspectorMap({ polygon, gps }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  if (!mounted) return <div style={{ height: "100%", background: "#081009", display:"flex", alignItems:"center", justifyContent:"center", color:"#527056", fontSize:13 }}>Loading map…</div>;

  const positions = extractPositions(polygon);
  const center    = gps ? [gps.lat, gps.lng] as [number,number] : polygonCenter(positions);

  return (
    <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Esri World Imagery"
      />

      {/* Farmer's submitted polygon */}
      {positions.length > 0 && (
        <Polygon
          positions={positions}
          pathOptions={{ color: "#22c55e", fillColor: "rgba(34,197,94,0.15)", weight: 2.5, dashArray: "6 4" }}
        />
      )}

      {/* Inspector's live GPS position */}
      {gps && (
        <CircleMarker
          center={[gps.lat, gps.lng]}
          radius={10}
          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.8, weight: 2 }}
        />
      )}

      <FlyTo gps={gps} />
    </MapContainer>
  );
}
