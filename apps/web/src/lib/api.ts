// apps/web/src/lib/api.ts
// Centralised FastAPI client functions used across the app.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Health ───────────────────────────────────────────────────────────────────

export async function getBackendStatus(): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error("Backend not reachable");
  return res.json();
}

// ── NDVI ─────────────────────────────────────────────────────────────────────

export async function getNDVI(geojson: object): Promise<{
  mean_ndvi: number;
  max_ndvi?: number;
  min_ndvi?: number;
  source?: string;
  error?: string;
}> {
  const res = await fetch(`${API_URL}/ndvi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geojson }),
  });
  return res.json();
}

// ── ML prediction ─────────────────────────────────────────────────────────────

export async function predictCarbon(data: {
  area_ha: number;
  land_type: string;
  state: string;
  ndvi: number;
}): Promise<{
  co2_tonnes: number;
  value_inr: number;
  ndvi_used: number;
  carbon_class: string;
  error?: string;
}> {
  const res = await fetch(`${API_URL}/ml/predict-carbon`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ── Land ─────────────────────────────────────────────────────────────────────

export async function registerLand(data: {
  farmer_id: string;
  area_ha: number;
  polygon_geojson: object;
  predicted_co2: number;
  land_type: string;
  crop_type?: string | null;
}): Promise<{ message: string; data: any[] }> {
  const res = await fetch(`${API_URL}/land/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Land registration failed");
  }
  return res.json();
}

export async function getMyLands(farmerId: string): Promise<any[]> {
  const res = await fetch(`${API_URL}/land/my-lands/${farmerId}`);
  if (!res.ok) throw new Error("Failed to fetch lands");
  return res.json();
}

export async function getAllLands(): Promise<any[]> {
  const res = await fetch(`${API_URL}/land/all`);
  if (!res.ok) throw new Error("Failed to fetch all lands");
  return res.json();
}

export async function approveLand(landId: string): Promise<{ message: string; tx: any }> {
  const res = await fetch(`${API_URL}/land/approve/${landId}`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function rejectLand(landId: string, reason: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/land/reject/${landId}?reason=${encodeURIComponent(reason)}`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Marketplace ───────────────────────────────────────────────────────────────

export async function buyCredits(data: {
  land_id: string;
  co2_tonnes: number;
  amount_inr: number;
  buyer_wallet?: string;
}): Promise<{ message: string; tx_hash: string }> {
  const res = await fetch(`${API_URL}/marketplace/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export { API_URL };
