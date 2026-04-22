# EcoNova-ai/apps/api/main.py

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import land, ml, marketplace, ndvi, verify

app = FastAPI(
    title="EcoNova AI API",
    description="AI + Blockchain carbon credit platform for Indian farmers",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# In production: replace "*" with your actual Vercel deployment URLs
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(ndvi.router)        # POST /ndvi
app.include_router(ml.router)          # POST /ml/predict-carbon
app.include_router(land.router)        # GET/POST /land/*
app.include_router(marketplace.router) # GET/POST /marketplace/*
app.include_router(verify.router)      # POST /verify/confirm, GET /verify/status/{id}

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "EcoNova AI API running 🚀", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}
