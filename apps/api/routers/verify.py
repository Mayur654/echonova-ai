# EcoNova-ai/apps/api/routers/verify.py
# Field Officer On-site Geo-verification API

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.db import supabase
from datetime import datetime, timezone
import traceback

router = APIRouter(prefix="/verify", tags=["Field Verification"])


class FieldVerificationRequest(BaseModel):
    land_id: str
    gps_lat: float
    gps_lng: float
    inside_boundary: bool
    officer_notes: Optional[str] = None
    device_info: Optional[str] = None   # e.g. "iPhone 15 · Safari 17"


@router.post("/confirm")
def confirm_field_visit(data: FieldVerificationRequest):
    """
    Called by the field inspector's phone after GPS confirmation.
    Records GPS coordinates, timestamp, boundary check result.
    Updates parcel status to 'field_confirmed' — ready for govt officer final approval.
    """
    try:
        # Fetch the parcel
        res  = supabase.table("land_parcels").select("status").eq("id", data.land_id).single().execute()
        land = res.data
        if not land:
            raise HTTPException(status_code=404, detail="Land parcel not found")
        if land["status"] == "approved":
            raise HTTPException(status_code=400, detail="Parcel already approved — field visit not needed")
        if land["status"] == "rejected":
            raise HTTPException(status_code=400, detail="Parcel has been rejected — field visit cannot proceed")

        field_inspection = {
            "gps_lat":          data.gps_lat,
            "gps_lng":          data.gps_lng,
            "inside_boundary":  data.inside_boundary,
            "timestamp":        datetime.now(timezone.utc).isoformat(),
            "officer_notes":    data.officer_notes or "",
            "device_info":      data.device_info or "",
        }

        supabase.table("land_parcels").update({
            "status":           "field_confirmed",
            "field_inspection": field_inspection,
        }).eq("id", data.land_id).execute()

        return {
            "message":          "Field verification recorded successfully",
            "status":           "field_confirmed",
            "inside_boundary":  data.inside_boundary,
            "timestamp":        field_inspection["timestamp"],
        }

    except HTTPException:
        raise
    except Exception as e:
        print("❌ verify/confirm error:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{land_id}")
def get_verification_status(land_id: str):
    """Return current verification status and field inspection data for a parcel."""
    try:
        res  = supabase.table("land_parcels").select("status, field_inspection, blockchain_tx").eq("id", land_id).single().execute()
        land = res.data
        if not land:
            raise HTTPException(status_code=404, detail="Land parcel not found")
        return {
            "land_id":          land_id,
            "status":           land["status"],
            "field_inspection": land.get("field_inspection"),
            "blockchain_tx":    land.get("blockchain_tx"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
