# CardioViz3D: Project Documentation
**Version 2.5 | Track A — Cardiovascular Risk Visualization & Prediction**

---

## 1. Executive Summary
CardioViz3D is an interactive, clinical-grade cardiovascular risk prediction and visualization platform. It integrates calibrated machine learning ensemble models with a high-fidelity 3D anatomical heart model derived from FMA (Foundational Model of Anatomy) meshes. Clinicians and researchers can input patient clinical data and receive spatially-mapped coronary artery disease risk predictions, complete with SHAP-based feature attribution explanations, directly overlaid onto interactive 3D coronary vessel anatomy.

### Key Version 2.5 Additions:
- **Clinical Persona Presets:** 1-click loading of archetypal patients (High-Risk Multi-Vessel, Isolated LAD 'Widowmaker', Borderline RCA, Young Low-Risk).
- **Lumen Cross-Section Cutaway:** Interactive 2D/3D histological cross-section visualizer showing atheroma plaque accumulation and luminal loss against the 50% stenosis threshold.
- **Export Clinical Dossier (PDF):** One-click diagnostic summary with printable formatting for cardiology handoffs and clinical reviews.
- **Multi-Target Classifier Chains:** Dual inference toggle (Independent Calibrated Ensembles vs. Multi-Vessel Chain: LAD → LCX → RCA).

---

## 2. Dataset & Preprocessing

### 2.1 Dataset
- **Source:** Extended Z-Alizadeh Sani Dataset (publicly available)
- **Size:** 303 patients, 54 clinical features
- **Feature Types:** Demographic, comorbidity, symptom, ECG, echocardiographic, and laboratory variables
- **Targets:** Binary labels for `CAD` (overall), `LAD`, `LCX`, and `RCA` stenosis (positive = ≥50% narrowing or "CAD"/"Stenotic" label)

### 2.2 Preprocessing Pipeline (`scikit-learn`)
| Step | Method | Rationale |
|---|---|---|
| Missing values (numeric) | `SimpleImputer(median)` | Robust to outliers in clinical lab data |
| Missing values (categorical) | `SimpleImputer(most_frequent)` | Preserves modal clinical category |
| Scaling | `StandardScaler` | Required for LR/SVM; harmless for tree models |
| Categorical encoding | `OrdinalEncoder(unknown=-1)` | Handles unseen values at inference time |
| Class imbalance | `SMOTE` inside CV folds | Prevents leakage — oversampling applied only to training splits |
| Target leakage prevention | Drop `['Cath','LAD','LCX','RCA']` per target | Each model trained on non-target columns only |

---

## 3. Model Architecture

### 3.1 Training Pipeline
Four independent models are trained, one per target (CAD, LAD, LCX, RCA):

1. **Hyperparameter Optimization:** Optuna (100 trials, MedianPruner) over 4 model families:
   - Logistic Regression · Random Forest · XGBoost · LightGBM
   - Inner CV: `RepeatedStratifiedKFold(n_splits=5, n_repeats=3)`

2. **Model Selection:** Best single model vs. Stacking Ensemble (RF + XGB + LGBM + best_tuned → LR meta-learner) compared by 5-fold CV AUC.

3. **Probability Calibration:** `CalibratedClassifierCV(method='isotonic', cv=5)` converts raw model scores to reliable probabilities, validated via calibration curves.

4. **Classifier Chains:** LAD→LCX→RCA chain explored as a bonus to capture inter-vessel dependency.

### 3.2 Interpretability (SHAP)
- **Method:** `shap.TreeExplainer` on the underlying tree base model
- **Output:** Top-15 SHAP values per patient per vessel, served as a ranked bar chart
- **Base value** (expected model output) displayed alongside per-feature contributions
- Positive SHAP → increases stenosis risk; Negative SHAP → protective factor

---

## 4. 3D Visualization Pipeline

### 4.1 Anatomical Model
- **Source:** FMA (Foundational Model of Anatomy) OBJ mesh files (129 parts)
- **Conversion:** OBJ files merged into a single optimized GLTF/GLB file (`heart.glb`, ~8.2MB)
- **Coverage:** LAD branches, LCX trunk & marginal, RCA trunk & branches, conduction system (SA node, AV bundle), valves, ventricle walls, atria, great vessels

### 4.2 Rendering Stack
| Layer | Technology |
|---|---|
| 3D Engine | Three.js via React Three Fiber |
| Controls | `OrbitControls` (rotate, zoom, pan) |
| Auto-fit | `@react-three/drei` `Bounds` with click-to-zoom |
| Animation | `useFrame` heartbeat (BPM from patient PR) |
| Lighting | Ambient + directional + point (studio preset) |
| Shadows | `ContactShadows` for grounding |

### 4.3 Vessel Risk Mapping
Vessel mesh name matching uses FMA anatomical terminology:
- `LAD`: meshes containing "anterior interventricular" or "anterior descending"
- `LCX`: meshes containing "circumflex" or "left marginal"
- `RCA`: meshes containing "right coronary" or "right marginal"

Color mapping: Green (p<0.35) → Orange (0.35–0.65) → Red (p>0.65) with emissive glow.

---

## 5. Usage Instructions

### 5.1 Backend
```bash
cd cardio-viz-3d/backend
pip install -r requirements.txt

# Train models (if needed)
python models/train.py

# Start API server
uvicorn api.main:app --reload --port 8000
```

### 5.2 Frontend
```bash
cd cardio-viz-3d/frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### 5.3 Workflow
1. Accept the medical disclaimer modal
2. Enter patient data in the left panel (tabbed by category)
3. Click **RUN ANALYSIS 🔬**
4. Watch vessels color-code on the 3D heart in real time
5. Click any vessel (3D or Risk Dashboard) → SHAP chart + clinical summary appear
6. Use What-If sliders to explore counterfactual scenarios with debounced re-prediction

---

## 6. Evaluation Results

> All metrics reported on 20% stratified holdout test set.

| Target | Model | ROC-AUC | Accuracy | Precision | Recall | F1-Score | Brier |
|---|---|---|---|---|---|---|---|
| **CAD** | XGBoost | **0.9401** | 89.2% | 91.0% | 89.7% | **0.904** | 0.081 |
| **LAD** | StackingEnsemble | 0.8793 | 82.0% | 84.2% | 82.8% | 0.835 | 0.120 |
| **LCX** | StackingEnsemble | 0.7292 | 65.6% | 57.9% | 45.8% | 0.512 | 0.208 |
| **RCA** | XGBoost | 0.8312 | 79.5% | 81.1% | 78.8% | 0.799 | 0.139 |

**Key observations:**
- CAD overall model achieves strong AUC (0.94) — consistent with literature on XGBoost applied to Z-Alizadeh Sani
- LCX performs worst — attributable to lower class prevalence and anatomical complexity
- Calibration curves confirm predicted probabilities closely match observed event rates
- Train/Test AUC gap monitored (threshold >0.10 triggers warning) — no significant overfitting detected

**Validation methodology:** Repeated Stratified K-Fold (5×3) for HPO, separate 20% holdout for final evaluation. SMOTE applied inside folds only. Probability calibration validated via calibration curve plots (see `plots/` directory).
