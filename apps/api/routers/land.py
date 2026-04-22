# EcoNova-ai/apps/api/routers/land.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.db import supabase
from services.blockchain import mint_carbon_credit
import traceback

router = APIRouter(prefix="/land", tags=["Land"])


class LandRequest(BaseModel):
    farmer_id: str
    area_ha: float
    polygon_geojson: dict
    predicted_co2: float
    land_type: str = "cropland"
    crop_type: Optional[str] = None


@router.post("/register")
def register_land(data: LandRequest):
    """Register a new land parcel — called by farmer after AI prediction."""
    try:
        payload = {
            "farmer_id":       data.farmer_id,
            "area_ha":         data.area_ha,
            "polygon_geojson": data.polygon_geojson or {},
            "predicted_co2":   data.predicted_co2,
            "land_type":       data.land_type,
            "crop_type":       data.crop_type,
            "status":          "pending",
        }
        res = supabase.table("land_parcels").insert(payload).execute()
        return { "message": "Land registered successfully", "data": res.data }

    except Exception as e:
        print("❌ register_land error:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
def get_all_lands():
    """
    Return all parcels with farmer details for the government dashboard.
    Uses Supabase foreign key join: land_parcels.farmer_id → farmers.id
    Make sure your Supabase table has farmer_id as an FK to farmers(id).
    """
    try:
        res = (
            supabase.table("land_parcels")
            .select("*, farmers!land_parcels_farmer_id_fkey(name, phone, state, district)")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data

    except Exception as e:
        # Fallback: if FK join fails (e.g. FK not set up), return without farmer details
        print(f"⚠️  FK join failed ({e}), falling back to plain query")
        try:
            res = supabase.table("land_parcels").select("*").order("created_at", desc=True).execute()
            return res.data
        except Exception as e2:
            raise HTTPException(status_code=500, detail=str(e2))


@router.get("/my-lands/{farmer_id}")
def get_lands(farmer_id: str):
    """Return all parcels for a specific farmer."""
    try:
        res = (
            supabase.table("land_parcels")
            .select("*")
            .eq("farmer_id", farmer_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve/{land_id}")
def approve_land(land_id: str):
    """
    Government officer approves a land parcel.
    Triggers simulated ERC-20 token minting on Polygon.
    Parcel must be in 'pending' or 'field_confirmed' status.
    """
    try:
        res  = supabase.table("land_parcels").select("*").eq("id", land_id).single().execute()
        land = res.data

        if not land:
            raise HTTPException(status_code=404, detail="Land parcel not found")

        if land["status"] == "approved":
            raise HTTPException(status_code=400, detail="Parcel already approved")

        if land["status"] not in ("pending", "field_confirmed"):
            raise HTTPException(status_code=400, detail=f"Cannot approve parcel with status '{land['status']}'")

        # Simulate blockchain mint (replace with real web3.py call in production)
        tx = mint_carbon_credit(land_id=land_id, co2=land["predicted_co2"])

        supabase.table("land_parcels").update({
            "status":        "approved",
            "blockchain_tx": tx,
        }).eq("id", land_id).execute()

        return { "message": "Parcel approved — carbon tokens minted", "tx": tx }

    except HTTPException:
        raise
    except Exception as e:
        print("❌ approve_land error:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reject/{land_id}")
def reject_land(land_id: str, reason: Optional[str] = None):
    """Government officer rejects a land parcel with optional reason."""
    try:
        res = supabase.table("land_parcels").select("status").eq("id", land_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Land parcel not found")
        if res.data["status"] == "approved":
            raise HTTPException(status_code=400, detail="Cannot reject an already-approved parcel")

        supabase.table("land_parcels").update({
            "status":           "rejected",
            "rejection_reason": reason or "Rejected by government officer",
        }).eq("id", land_id).execute()

        return { "message": "Parcel rejected", "reason": reason }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
