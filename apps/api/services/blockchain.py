import uuid
import secrets
from datetime import datetime, timezone


def mint_carbon_credit(land_id: str, co2: float) -> dict:
    """
    Simulates minting ERC-20 carbon tokens on Polygon.

    In production this calls CarbonCredit.sol via web3.py:
        contract.functions.mint(farmer_wallet, int(co2 * 1e18)).transact()

    Returns a dict that matches the shape stored in land_parcels.blockchain_tx
    """
    # Realistic Polygon-style tx hash (0x + 64 hex chars)
    tx_hash = "0x" + secrets.token_hex(32)

    return {
        "tx_hash":  tx_hash,
        "tokens":   round(co2, 2),
        "land_id":  land_id,
        "network":  "polygon-mumbai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def simulate_land_nft_mint(land_id: str, farmer_wallet: str, area_ha: float, land_type: str) -> dict:
    """
    Simulates minting a LandNFT (ERC-721) for a newly registered parcel.

    In production this calls LandNFT.sol:
        contract.functions.mintLand(farmer_wallet, ipfs_hash, int(area_ha*100), land_type).transact()
    """
    token_id = int(uuid.uuid4().int % 10**9)
    tx_hash  = "0x" + secrets.token_hex(32)

    return {
        "nft_tx_hash":    tx_hash,
        "nft_token_id":   token_id,
        "farmer_wallet":  farmer_wallet,
        "area_ha":        area_ha,
        "land_type":      land_type,
        "network":        "polygon-mumbai",
        "timestamp":      datetime.now(timezone.utc).isoformat(),
    }
