import os
from dotenv import load_dotenv
from supabase import create_client, Client

# ✅ LOAD ENV FILE
load_dotenv()

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_SERVICE_KEY", "")  # service key

if not SUPABASE_URL or not SUPABASE_KEY:
    import warnings
    warnings.warn(
        "⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY not set. "
        "Database operations will fail.",
        RuntimeWarning,
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)