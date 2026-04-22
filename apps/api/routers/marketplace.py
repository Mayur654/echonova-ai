from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.db import supabase
import traceback
import uuid

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


class PurchaseRequest(BaseModel):
    land_id:      str
    co2_tonnes:   float
    amount_inr:   float
    buyer_wallet: Optional[str] = None
    company_name: Optional[str] = None   # ← NEW: stored for ESG reports


@router.get("/")
def get_market():
    """Return all approved land parcels available for purchase."""
    try:
        res = (
            supabase.table("land_parcels")
            .select("*, farmers(name, state, district)")
            .eq("status", "approved")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/buy")
def buy_credit(data: PurchaseRequest):
    """
    Record a carbon credit purchase and return a transaction record.
    Simulates Polygon tx in dev — swap for real web3.py call in production.
    """
    try:
        # 1. Verify parcel is still approved
        res = (
            supabase.table("land_parcels")
            .select("*")
            .eq("id", data.land_id)
            .single()
            .execute()
        )
        land = res.data
        if not land:
            raise HTTPException(status_code=404, detail="Land parcel not found")
        if land["status"] != "approved":
            raise HTTPException(status_code=400, detail="Land parcel is not available for purchase")

        # 2. Simulate blockchain tx hash
        tx_hash = "0x" + uuid.uuid4().hex + uuid.uuid4().hex[:8]

        # 3. Record transaction (with company_name for ESG reports)
        try:
            supabase.table("transactions").insert({
                "land_id":      data.land_id,
                "buyer_wallet": data.buyer_wallet or "demo_wallet",
                "co2_tonnes":   data.co2_tonnes,
                "amount_inr":   data.amount_inr,
                "tx_hash":      tx_hash,
                "company_name": data.company_name or "",   # ← stored here
            }).execute()
        except Exception:
            pass  # Table may not have company_name column yet — run the SQL migration

        return {
            "message":    "Purchase successful",
            "tx_hash":    tx_hash,
            "co2_tonnes": data.co2_tonnes,
            "amount_inr": data.amount_inr,
        }

    except HTTPException:
        raise
    except Exception as e:
        print("❌ Purchase error:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
def get_stats():
    """Aggregate stats for the marketplace landing page."""
    try:
        res = (
            supabase.table("land_parcels")
            .select("predicted_co2, status")
            .execute()
        )
        lands    = res.data or []
        approved = [l for l in lands if l["status"] == "approved"]
        total_co2 = sum(l["predicted_co2"] for l in approved)
        return {
            "total_listings":  len(approved),
            "total_co2":       round(total_co2, 2),
            "total_value_inr": round(total_co2 * 1500, 0),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/esg/{wallet}")
def get_esg_report(wallet: str):
    """
    Return aggregated ESG data for a given buyer wallet.
    The frontend fetches this to build the ESG report — 
    kept here for future API consumers (e.g. third-party ESG platforms).
    """
    try:
        res = (
            supabase.table("transactions")
            .select("*, land_parcels(land_type, area_ha, farmers(name, state, district))")
            .eq("buyer_wallet", wallet)
            .order("created_at", desc=True)
            .execute()
        )
        txns = res.data or []
        if not txns:
            raise HTTPException(status_code=404, detail="No transactions found for this wallet")

        total_co2   = sum(t["co2_tonnes"] for t in txns)
        total_spend = sum(t["amount_inr"] for t in txns)
        states      = list({t["land_parcels"]["farmers"]["state"] for t in txns if t.get("land_parcels") and t["land_parcels"].get("farmers")})
        farmers     = list({t["land_parcels"]["farmers"]["name"]  for t in txns if t.get("land_parcels") and t["land_parcels"].get("farmers")})

        land_types: dict = {}
        for t in txns:
            lt = t.get("land_parcels", {}).get("land_type", "unknown") if t.get("land_parcels") else "unknown"
            land_types[lt] = round(land_types.get(lt, 0) + t["co2_tonnes"], 2)

        return {
            "wallet":             wallet,
            "total_co2_tonnes":   round(total_co2, 2),
            "total_spend_inr":    round(total_spend, 2),
            "credit_count":       len(txns),
            "farmers_supported":  len(farmers),
            "states_impacted":    states,
            "land_type_co2":      land_types,
            "transactions":       txns,
            # Impact equivalents
            "equivalents": {
                "trees_planted":    round(total_co2 * 45),
                "cars_off_road":    round(total_co2 / 4.6, 1),
                "flights_avoided":  round(total_co2 / 0.17),
                "homes_powered":    round(total_co2 / 1.2, 1),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))