# CardioViz3D: 3D Cardiovascular Risk Visualization & XAI Suite

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r160+-black.svg?style=flat&logo=three.js)](https://threejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?style=flat&logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**CardioViz3D** is a medical-grade web workstation uniting calibrated machine learning ensembles, game-theoretic explainable AI (SHAP attributions), and real-time 3D anatomical coronary tree modeling derived from the Foundational Model of Anatomy (FMA).

It empowers clinicians and researchers to input 54 patient biomarkers and receive spatial, multi-vessel stenosis risk predictions (CAD, LAD, LCX, RCA) mapped directly onto an interactive 3D heart, inspect isolated vessels under angiographic projections, and simulate counterfactual clinical interventions ("What-If" scenarios) in real time.

---

## 📖 Complete Technical Documentation

> Detailed algorithmic formulas, clinical preprocessing steps, model training scripts, FMA 3D mesh compilation, calibration curves, and holdout evaluation metrics are provided in:
> - **[DOCUMENTATION.md](DOCUMENTATION.md)** (Repository Root)
> - **[docs/DOCUMENTATION.md](docs/DOCUMENTATION.md)** (`docs/` Folder)

---

## 🚀 Key Features

- **Multi-Territory Risk Prediction:** Predicts individual stenosis probabilities for:
  - **CAD:** Overall Coronary Artery Disease ($\ge 50\%$ stenosis in $\ge 1$ vessel).
  - **LAD:** Left Anterior Descending Artery ("Widowmaker" lesion detection).
  - **LCX:** Left Circumflex Artery.
  - **RCA:** Right Coronary Artery.
- **Calibrated Stacking & Tree Ensembles:** Tuned via Optuna across XGBoost, LightGBM, Random Forest, and regularized meta-learners with Isotonic probability calibration (`CalibratedClassifierCV`).
- **Multi-Target Classifier Chains:** Captures downstream hemodynamic vessel dependencies ($LAD \rightarrow LCX \rightarrow RCA$).
- **Interactive 3D Anatomical Heart (Three.js / FMA):** 129 merged anatomical meshes with realistic myocardial opacity, beating pulse animation, and territorial vessel glow.
- **Isolated Vessel & Luminal Cutaway:** Inspect isolated coronary branches with 360° studio lighting, angiographic projection angles (Anterior, RAO, LAO), and IVUS-simulated atheroma cross-sections.
- **Explainable AI (XAI):** Real-time local feature attribution powered by `shap.TreeExplainer` and linear explainers showing risk-promoting vs. protective biomarkers.
- **What-If Counterfactual Simulator:** Interactively adjust blood pressure, cholesterol, smoking status, or ejection fraction to visualize risk reduction.
- **Clinical Persona Presets:** One-click loading of archetypal profiles (High-Risk Multi-Vessel, Isolated LAD, Borderline RCA, Young Low-Risk).
- **Clinical PDF Export:** Generate and export a formatted clinical diagnostic dossier with one click.

---

## 🏗️ Repository Architecture

```
cardio-viz-3d/
├── DOCUMENTATION.md           # 6-Page Comprehensive Technical & Evaluation Spec
├── docs/
│   └── DOCUMENTATION.md       # Backup / Reference Technical Spec
├── README.md                  # Project Quickstart & Overview (This file)
├── backend/
│   ├── api/
│   │   └── main.py            # FastAPI Application (Endpoints: /predict, /explain, /whatif)
│   ├── models/
│   │   ├── saved/             # Calibrated models (*.pkl) & classifier chain
│   │   ├── train.py           # Optuna HPO, Ensemble Stacking & Calibration Pipeline
│   │   └── train_chain.py     # Multi-target Classifier Chain training script
│   ├── data/                  # Cleaned Z-Alizadeh Sani datasets
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HeartScene.jsx         # 3D Main Heart Canvas (Three.js / Fiber)
│   │   │   ├── IsolatedVesselScene.jsx# 3D Isolated Vessel & Luminal Cutaway
│   │   │   ├── ShapChart.jsx          # XAI Waterfall & Bar Attributions
│   │   │   ├── PatientForm.jsx        # 54-feature tabbed clinical input form
│   │   │   ├── RiskPanel.jsx          # Risk gauges & prediction cards
│   │   │   ├── WhatIfSimulator.jsx    # Counterfactual intervention sliders
│   │   │   └── ClinicalReportModal.jsx# PDF Dossier export generator
│   │   ├── App.jsx            # Main workstation dashboard layout
│   │   └── config.js          # API endpoints & connection config
│   ├── public/
│   │   └── models/
│   │       └── heart.glb      # High-fidelity 8.2MB FMA 3D Cardiac Mesh
│   └── package.json           # Node / Vite dependencies
└── notebooks/
    └── eda.py                 # Exploratory data analysis & statistical validation
```

---

## ⚡ Quickstart Guide (How to Run Locally)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**
- **Git**

---

### Step 1: Start the Backend (FastAPI Engine)

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd cardio-viz-3d/backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows:
   python -m venv venv
   .\venv\Scripts\activate

   # Linux / macOS:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the Uvicorn ASGI server:
   ```bash
   python -m uvicorn api.main:app --reload --port 8000
   ```

> 💡 **Verify:** Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) in your browser. You should see FastAPI's interactive Swagger documentation.

---

### Step 2: Start the Frontend (Vite + React Workstation)

1. Open a **second terminal** and navigate to the frontend directory:
   ```bash
   cd cardio-viz-3d/frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 📊 Model Benchmark Summary (Holdout Test Set)

Evaluated on an independent $20\%$ stratified holdout split ($n=61$):

| Target | Model Family | ROC-AUC | Accuracy | Precision | Recall | F1-Score | Brier Score |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **CAD (Overall)** | Calibrated XGBoost | **0.9401** | **89.2%** | **91.0%** | **89.7%** | **0.9035** | **0.0812** |
| **LAD** | Calibrated Stacking Ensemble | **0.8793** | **82.0%** | **84.2%** | **82.8%** | **0.8349** | **0.1204** |
| **RCA** | Calibrated XGBoost | **0.8312** | **79.5%** | **81.1%** | **78.8%** | **0.7993** | **0.1389** |
| **LCX** | Calibrated Stacking Ensemble | **0.7292** | **65.6%** | **57.9%** | **45.8%** | **0.5116** | **0.2078** |

*For in-depth analysis of training dynamics, cross-validation setup, and visual Brier / ROC curves, see [DOCUMENTATION.md](DOCUMENTATION.md).*

---

## 🌐 Production Deployment on Vercel

The application is fully prepared for one-click deployment on **Vercel**:

### Option A: Deploying Frontend on Vercel (Recommended)
1. **Push Repository:** Push `cardio-viz-3d` to your GitHub / GitLab account.
2. **Import into Vercel:**
   - **Root Directory:** Set to `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. **Configure Environment Variables:**
   - In Vercel Project Settings $\rightarrow$ **Environment Variables**, add:
     - `VITE_API_URL`: Your hosted backend URL (e.g. `https://cardioviz3d-api.onrender.com` or Railway / Fly.io).
4. **Proxy & Routing:** The included [frontend/vercel.json](frontend/vercel.json) automatically handles client-side SPA routing and API rewriting.

### Option B: Deploying Backend
Deploy the FastAPI backend to **Render**, **Railway**, or **Fly.io**:
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- Once live, copy its URL into your Vercel `VITE_API_URL` environment variable.

---

## 📦 What to Push to Git

When pushing to your Git remote (e.g., GitHub or GitLab), push from the **`cardio-viz-3d`** root directory:

```bash
cd D:\Projects\Heart\cardio-viz-3d
git add .
git commit -m "feat: complete CardioViz3D workstation with 3D FMA rendering, XAI, and 6-page technical documentation"
git push origin main
```

---

## 📄 License & Clinical Disclaimer

- **License:** Distributed under the MIT License.
- **Medical Disclaimer:** CardioViz3D is designed strictly for research, educational, and investigational decision support. It does not replace professional clinical evaluation, catheterization laboratory angiography, or emergency medical diagnosis.
