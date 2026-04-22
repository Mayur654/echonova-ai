from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/ml", tags=["ML"])


class PredictionRequest(BaseModel):
    area_ha:   float
    land_type: str
    state:     str
    ndvi:      float = 0.3


# NDVI classification thresholds
# < 0.10 → water / shadow / built-up
# 0.10–0.20 → bare soil, rock, concrete, dry sand
# 0.20–0.30 → sparse / stressed / dying vegetation
# 0.30–0.50 → moderate vegetation (typical cropland)
# 0.50–0.70 → healthy vegetation
# > 0.70 → dense forest / thick canopy

NDVI_CLASSES = {
    "none":    (float("-inf"), 0.10),
    "barren":  (0.10, 0.20),
    "sparse":  (0.20, 0.30),
    "moderate":(0.30, 0.50),
    "healthy": (0.50, 0.70),
    "dense":   (0.70, float("inf")),
}

# Expected minimum NDVI for each land type
# If the actual NDVI is well below this, the registered land type is likely wrong
# and we warn the officer
LAND_TYPE_MIN_NDVI = {
    "forest":    0.45,
    "cropland":  0.20,
    "grassland": 0.18,
    "wetland":   0.15,
    "shrubland": 0.18,
}

BASE_FACTORS = {
    "forest":    30,
    "cropland":  12,
    "grassland": 8,
    "wetland":   18,
    "shrubland": 10,
}


def classify_ndvi(ndvi: float) -> str:
    for cls, (lo, hi) in NDVI_CLASSES.items():
        if lo <= ndvi < hi:
            return cls
    return "dense"


@router.post("/predict-carbon")
def predict(data: PredictionRequest):
    try:
        ndvi      = max(0.0, min(1.0, data.ndvi if data.ndvi is not None else 0.3))
        ndvi_cls  = classify_ndvi(ndvi)
        land_type = data.land_type.lower()
        factor    = BASE_FACTORS.get(land_type, 12)
        min_ndvi  = LAND_TYPE_MIN_NDVI.get(land_type, 0.20)

        warnings = []

        # ── Hard block: clearly non-vegetated ─────────────────────────────────
        if ndvi_cls == "none":
            return {
                "co2_tonnes":   0,
                "value_inr":    0,
                "ndvi_used":    round(ndvi, 3),
                "carbon_class": "None",
                "ndvi_class":   ndvi_cls,
                "warning":      (
                    f"NDVI {ndvi:.3f} indicates water, concrete, or shadow — "
                    "no carbon sequestration is possible. "
                    "Please check the field location; this appears to be a non-vegetated area."
                ),
            }

        # ── Soft block: bare soil / urban ──────────────────────────────────────
        if ndvi_cls == "barren":
            return {
                "co2_tonnes":   round(data.area_ha * factor * 0.05, 2),
                "value_inr":    round(data.area_ha * factor * 0.05 * 1500, 0),
                "ndvi_used":    round(ndvi, 3),
                "carbon_class": "Negligible",
                "ndvi_class":   ndvi_cls,
                "warning":      (
                    f"NDVI {ndvi:.3f} indicates bare soil, dry land, or urban area. "
                    "Carbon sequestration is negligible. "
                    "If this is agricultural land, ensure the field is captured during the growing season."
                ),
            }

        # ── Mismatch warning: land type doesn't match NDVI ────────────────────
        if ndvi < min_ndvi:
            warnings.append(
                f"NDVI {ndvi:.3f} is below the expected minimum ({min_ndvi}) for {land_type}. "
                f"The land may be dry, fallow, or misclassified."
            )

        # ── NDVI multiplier (calibrated per class) ────────────────────────────
        # sparse:   0.30 → low production
        # moderate: 0.55 → standard
        # healthy:  0.80 → above average
        # dense:    1.10 → premium forest
        multiplier_map = {
            "sparse":   0.3 + ndvi * 0.5,
            "moderate": 0.5 + ndvi * 0.8,
            "healthy":  0.6 + ndvi * 1.0,
            "dense":    0.7 + ndvi * 1.2,
        }
        multiplier = multiplier_map.get(ndvi_cls, 0.5 + ndvi)

        co2 = data.area_ha * factor * multiplier

        # Carbon class
        if co2 < 10:    carbon_class = "Low"
        elif co2 < 40:  carbon_class = "Medium"
        elif co2 < 100: carbon_class = "High"
        else:           carbon_class = "Very High"

        return {
            "co2_tonnes":   round(co2, 2),
            "value_inr":    round(co2 * 1500, 0),
            "ndvi_used":    round(ndvi, 3),
            "carbon_class": carbon_class,
            "ndvi_class":   ndvi_cls,
            "warning":      warnings[0] if warnings else None,
        }

    except Exception as e:
        return {"error": str(e), "co2_tonnes": 0, "value_inr": 0}
