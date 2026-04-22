from fastapi import APIRouter
from pydantic import BaseModel
import datetime
import os
import random

router = APIRouter(prefix="/ndvi", tags=["NDVI"])

# ─── Earth Engine init (graceful fallback) ───────────────────────────────────
_ee_ready = False

SERVICE_ACCOUNT = os.getenv("GEE_SERVICE_ACCOUNT", "earth-engine-sa@cloud-dataset.iam.gserviceaccount.com")
KEY_PATH        = os.path.join(os.path.dirname(__file__), "../keys/earth-engine-key.json")
GEE_JSON_STR    = os.getenv("GEE_JSON_KEY_CONTENT") # For cloud deployment (Render/Vercel)

try:
    import ee
    import json
    
    if os.path.exists(KEY_PATH):
        credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, KEY_PATH)
        ee.Initialize(credentials)
        _ee_ready = True
        print("✅ Earth Engine initialized with service account (file)")
    elif GEE_JSON_STR:
        # Load from environment variable (JSON string)
        key_dict = json.loads(GEE_JSON_STR)
        credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, key_data=key_dict)
        ee.Initialize(credentials)
        _ee_ready = True
        print("✅ Earth Engine initialized with service account (env var)")
    else:
        print("⚠️  earth-engine-key.json or GEE_JSON_KEY_CONTENT not found — NDVI will use simulation fallback")
except Exception as e:
    print(f"⚠️  Earth Engine init failed ({e}) — NDVI will use simulation fallback")


# ─── Request model ────────────────────────────────────────────────────────────

class NDVIRequest(BaseModel):
    geojson: dict


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _simulate_ndvi(geojson: dict) -> dict:
    """
    Returns a plausible simulated NDVI for demo/dev environments.
    Uses the polygon coordinate count as a seed so results are stable
    for the same polygon.
    """
    coords = geojson.get("coordinates", [[]])
    seed   = len(str(coords))
    random.seed(seed)
    mean = round(random.uniform(0.30, 0.82), 3)
    return {
        "mean_ndvi": mean,
        "max_ndvi":  round(min(1.0, mean + random.uniform(0.05, 0.15)), 3),
        "min_ndvi":  round(max(0.0, mean - random.uniform(0.05, 0.15)), 3),
        "source":    "simulated",
    }


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/")
def get_ndvi(data: NDVIRequest):
    coords = data.geojson.get("coordinates")
    if not coords:
        return {"mean_ndvi": 0.3, "max_ndvi": 0.4, "min_ndvi": 0.2, "error": "Invalid GeoJSON — no coordinates"}

    # Use real Earth Engine if available
    if _ee_ready:
        try:
            import ee
            polygon  = ee.Geometry.Polygon(coords)
            end_date = datetime.date.today()
            start_date = end_date - datetime.timedelta(days=90)

            dataset = (
                ee.ImageCollection("MODIS/006/MOD13Q1")
                .filterDate(str(start_date), str(end_date))
                .select("NDVI")
                .mean()
            )
            ndvi   = dataset.multiply(0.0001)
            stats  = ndvi.reduceRegion(
                reducer=ee.Reducer.mean()
                        .combine(ee.Reducer.max(), "", True)
                        .combine(ee.Reducer.min(), "", True),
                geometry=polygon,
                scale=250,
                maxPixels=1e9,
            )
            result     = stats.getInfo() or {}
            mean_ndvi  = result.get("NDVI_mean", 0.3)
            max_ndvi   = result.get("NDVI_max",  0.5)
            min_ndvi   = result.get("NDVI_min",  0.2)
            return {
                "mean_ndvi": round(mean_ndvi, 3),
                "max_ndvi":  round(max_ndvi,  3),
                "min_ndvi":  round(min_ndvi,  3),
                "source":    "google-earth-engine",
            }
        except Exception as e:
            print(f"❌ Earth Engine query failed: {e} — falling back to simulation")

    # Simulation fallback
    return _simulate_ndvi(data.geojson)
