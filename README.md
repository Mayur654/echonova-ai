# 🌱 EcoNova AI 
### AI-Powered Carbon Credit Platform for Regenerative Agriculture

[![Project Status: Alpha](https://img.shields.io/badge/Project%20Status-Alpha-orange.svg)]()
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ecf8e.svg)](https://supabase.com/)
[![Google Earth Engine](https://img.shields.io/badge/Data-Earth%20Engine-4285F4.svg)](https://earthengine.google.com/)

**EcoNova AI** is a full-stack platform designed to bridge the gap between Indian smallholder farmers and global carbon markets. By combining **Satellite Imagery (NDVI)**, **Machine Learning**, and **Blockchain**, we provide a transparent, verifiable solution for carbon credit generation and field monitoring.

---

## 🚀 Key Features

- **📡 Precision Satellite Monitoring**: Real-time NDVI (Normalized Difference Vegetation Index) analysis using Google Earth Engine.
- **🧠 ML-Driven Yield Prediction**: Proprietary models to estimate carbon sequestration potential based on soil and crop data.
- **🔗 On-Chain Transparency**: Immutable logging of field verifications and credit issuance via Supabase (ready for blockchain integration).
- **🚜 Farmer-First Portal**: Simple, mobile-responsive dashboard for farmers to map their fields and track their ESG scores.
- **🏢 Government / Inspector Portal**: Field verification tools with live GPS tracing and automated land audit reports.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14, React, Tailwind CSS, Lucide Icons, Leaflet Maps |
| **Backend** | FastAPI (Python 3.10+), Uvicorn |
| **Database** | Supabase (PostgreSQL), GeoJSON storage |
| **AI/GIS** | Google Earth Engine API, MODIS Satellite Data, Turf.js |
| **Authentication** | Supabase Auth (JWT) |

---

## 📂 Project Structure

```bash
carbonx-ai/
├── apps/
│   ├── api/          # FastAPI Backend (Satellite processing & ML)
│   │   ├── routers/  # Modular API endpoints
│   │   └── services/ # Business logic & Database connectors
│   └── web/          # Next.js Frontend (Dashboards & Mapping)
│       ├── src/      # React components & hooks
│       └── public/   # Static assets
└── .gitignore        # Strictly protects secrets & internal keys
```

---

## 🛡️ Privacy & Security
This public repository showcases the application's architecture and logic. Sensitive service account keys, environment variables, and private database credentials are **excluded** via security-hardened `.gitignore` policies.

---

## 👤 Author
**Mayur** - [GitHub](https://github.com/Mayur654)

---
*Developed as part of a mission to empower farmers through sustainable technology.*
