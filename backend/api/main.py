from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .schemas import PatientInput, WhatIfRequest
import pandas as pd
import numpy as np
import joblib
import shap
import os
import json

app = FastAPI(title="CardioViz3D API", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Serve training plots as static files
PLOTS_DIR = os.path.join(os.path.dirname(__file__), '../models/saved/plots')
if os.path.exists(PLOTS_DIR):
    app.mount("/plots", StaticFiles(directory=PLOTS_DIR), name="plots")

# ──────────────────────────────────────────────
# Model Loading
# ──────────────────────────────────────────────
MODELS = {}
EXPLAINERS = {}
FEATURE_NAMES = []
model_dir = os.path.join(os.path.dirname(__file__), '../models/saved')

def _extract_base_pipeline(pipeline):
    """
    Safely unwrap a CalibratedClassifierCV to get the underlying ImbPipeline.
    Works whether calibrated_classifiers_ or calibrated_estimators_ is populated.
    """
    if hasattr(pipeline, 'calibrated_classifiers_') and pipeline.calibrated_classifiers_:
        return pipeline.calibrated_classifiers_[0].estimator
    if hasattr(pipeline, 'calibrated_estimators_') and pipeline.calibrated_estimators_:
        return pipeline.calibrated_estimators_[0].estimator
    if hasattr(pipeline, 'estimator'):
        return pipeline.estimator
    return pipeline  # Already a plain pipeline

def _get_tree_estimator(classifier):
    """
    From a classifier (possibly a StackingClassifier), extract the first
    tree-based model that TreeExplainer can handle.
    """
    if hasattr(classifier, 'estimators_'):
        # StackingClassifier: prefer RF/XGB/LGBM over LR/SVM
        for est in classifier.estimators_:
            name = type(est).__name__
            if any(k in name for k in ('RandomForest', 'XGB', 'LGBM')):
                return est
        return classifier.estimators_[0]
    return classifier

for target in ['CAD', 'LAD', 'LCX', 'RCA']:
    path = os.path.join(model_dir, f'xgb_{target}_calibrated.pkl')
    if os.path.exists(path):
        pipeline = joblib.load(path)
        MODELS[target] = pipeline

        base_pipeline = _extract_base_pipeline(pipeline)

        # Feature names (only need to extract once)
        if not FEATURE_NAMES:
            try:
                preprocessor = base_pipeline.named_steps['preprocessor']
                FEATURE_NAMES = [f.split('__')[-1] for f in preprocessor.get_feature_names_out()]
            except Exception as e:
                print(f"Warning: Could not extract feature names: {e}")

        # SHAP explainer for each target
        try:
            classifier = base_pipeline.named_steps['classifier']
            tree_est = _get_tree_estimator(classifier)

            name = type(tree_est).__name__
            if 'LogisticRegression' in name or 'SVC' in name:
                class LinearModelExplainer:
                    def __init__(self, model):
                        self.model = model
                        self.expected_value = float(model.intercept_[0]) if hasattr(model, 'intercept_') else 0.0
                    def shap_values(self, X, **kwargs):
                        return (self.model.coef_[0] * X)
                EXPLAINERS[target] = LinearModelExplainer(tree_est)
            else:
                EXPLAINERS[target] = shap.TreeExplainer(tree_est)
            print(f"SHAP explainer for {target} loaded successfully.")
        except Exception as e:
            print(f"Warning: Could not create SHAP explainer for {target}: {e}")
            EXPLAINERS[target] = None

# Load Classifier Chain if available
CHAIN_PIPELINE = None
chain_path = os.path.join(model_dir, 'classifier_chain.pkl')
if os.path.exists(chain_path):
    try:
        CHAIN_PIPELINE = joblib.load(chain_path)
        print("Classifier chain loaded successfully.")
    except Exception as e:
        print(f"Warning: Could not load classifier chain: {e}")

# ──────────────────────────────────────────────
# Feature Preparation
# ──────────────────────────────────────────────
COLUMN_MAPPING = {
    'Current_Smoker': 'Current Smoker',
    'Ex_Smoker': 'EX-Smoker',
    'Airway_Disease': 'Airway disease',
    'Thyroid_Disease': 'Thyroid Disease',
    'Weak_Peripheral_Pulse': 'Weak Peripheral Pulse',
    'Lung_Rales': 'Lung rales',
    'Systolic_Murmur': 'Systolic Murmur',
    'Diastolic_Murmur': 'Diastolic Murmur',
    'Typical_Chest_Pain': 'Typical Chest Pain',
    'Function_Class': 'Function Class',
    'Non_anginal_CP': 'Nonanginal',
    'Exertional_CP': 'Exertional CP',
    'LowTH_Ang': 'LowTH Ang',
    'Q_Wave': 'Q Wave',
    'ST_Elevation': 'St Elevation',
    'ST_Depression': 'St Depression',
    'T_Inversion': 'Tinversion',
    'Poor_R_Progression': 'Poor R Progression',
    'Cr': 'CR',
    'EF_TTE': 'EF-TTE',
    'Region_with_RWMA': 'Region RWMA',
}

NUMERIC_FEATURES = {
    'Age', 'Weight', 'Length', 'BMI', 'DM', 'HTN', 'Current Smoker', 'EX-Smoker',
    'FH', 'BP', 'PR', 'Edema', 'Typical Chest Pain', 'Function Class', 'Q Wave',
    'St Elevation', 'St Depression', 'Tinversion', 'FBS', 'CR', 'TG', 'LDL',
    'HDL', 'BUN', 'ESR', 'HB', 'K', 'Na', 'WBC', 'Lymph', 'Neut', 'PLT',
    'EF-TTE', 'Region RWMA'
}

EXPECTED_COLS = [
    'Age', 'Weight', 'Length', 'BMI', 'DM', 'HTN', 'Current Smoker', 'EX-Smoker',
    'FH', 'BP', 'PR', 'Edema', 'Typical Chest Pain', 'Function Class', 'Q Wave',
    'St Elevation', 'St Depression', 'Tinversion', 'FBS', 'CR', 'TG', 'LDL',
    'HDL', 'BUN', 'ESR', 'HB', 'K', 'Na', 'WBC', 'Lymph', 'Neut', 'PLT',
    'EF-TTE', 'Region RWMA', 'Sex', 'Obesity', 'CRF', 'CVA', 'Airway disease',
    'Thyroid Disease', 'CHF', 'DLP', 'Weak Peripheral Pulse', 'Lung rales',
    'Systolic Murmur', 'Diastolic Murmur', 'Dyspnea', 'Atypical', 'Nonanginal',
    'Exertional CP', 'LowTH Ang', 'LVH', 'Poor R Progression', 'BBB', 'VHD'
]

def prepare_features(patient_dict: dict) -> pd.DataFrame:
    renamed = {}
    for k, v in patient_dict.items():
        renamed[COLUMN_MAPPING.get(k, k)] = v

    renamed.setdefault('Length', 170.0)
    renamed.setdefault('BBB', 'N')
    renamed.setdefault('VHD', 'N')

    for k, v in list(renamed.items()):
        if k in NUMERIC_FEATURES and isinstance(v, str):
            if v.upper() == 'Y':
                renamed[k] = 1
            elif v.upper() == 'N':
                renamed[k] = 0
            elif k == 'Function Class':
                renamed[k] = {'I': 0, 'II': 1, 'III': 2, 'IV': 3}.get(v, 0)
            else:
                try:
                    renamed[k] = float(v)
                except ValueError:
                    renamed[k] = 0

    df = pd.DataFrame([renamed])
    for col in EXPECTED_COLS:
        if col not in df.columns:
            df[col] = 0
    return df[EXPECTED_COLS]

# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────
@app.post("/predict")
def predict(patient: PatientInput):
    patient_dict = patient.model_dump()
    mode = patient_dict.get('mode', 'independent')
    X_df = prepare_features(patient_dict)
    results = {}

    if mode == 'chain' and CHAIN_PIPELINE is not None:
        try:
            # First predict CAD using independent model
            if 'CAD' in MODELS:
                prob_cad = float(MODELS['CAD'].predict_proba(X_df)[0][1])
                results['CAD'] = {'probability': round(prob_cad, 4), 'prediction': int(prob_cad >= 0.5)}
            
            # Predict LAD, LCX, RCA via chain
            chain_targets = ['LAD', 'LCX', 'RCA']
            # Chain pipeline predict_proba gives prob for each binary target in chain
            chain_probs = CHAIN_PIPELINE.predict_proba(X_df)[0]
            for i, target in enumerate(chain_targets):
                prob = float(chain_probs[i])
                results[target] = {
                    'probability': round(prob, 4),
                    'prediction': int(prob >= 0.5),
                    'chain_order': f"Stage {i+1}: {target}"
                }
            return results
        except Exception as e:
            print(f"Chain prediction fallback due to error: {e}")

    for target, pipeline in MODELS.items():
        try:
            prob = float(pipeline.predict_proba(X_df)[0][1])
            pred = int(prob >= 0.5)
            results[target] = {'probability': round(prob, 4), 'prediction': pred}
        except Exception as e:
            results[target] = {'error': str(e)}
    return results


@app.post("/explain/{target}")
def explain(target: str, patient: PatientInput):
    if target not in MODELS:
        raise HTTPException(status_code=404, detail=f"Model for {target} not found")
    if target not in EXPLAINERS or EXPLAINERS[target] is None:
        raise HTTPException(status_code=503, detail=f"SHAP explainer not available for {target}")

    pipeline = MODELS[target]
    explainer = EXPLAINERS[target]
    X_df = prepare_features(patient.model_dump())

    # Transform through the full base pipeline's preprocessor (not the CalibratedClassifierCV)
    base_pipeline = _extract_base_pipeline(pipeline)
    X_transformed = base_pipeline.named_steps['preprocessor'].transform(X_df)

    try:
        shap_vals = explainer.shap_values(X_transformed, check_additivity=False)
    except TypeError:
        shap_vals = explainer.shap_values(X_transformed)

    # Normalise output shape — handle Explainer objects that return SHAP Explanation objects
    if hasattr(shap_vals, 'values'):
        shap_vals = shap_vals.values
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[1] if len(shap_vals) > 1 else shap_vals[0]

    shap_arr = np.array(shap_vals)

    # Flatten: (1, n_features, 2) → (n_features,)  or  (1, n_features) → (n_features,)
    if shap_arr.ndim == 3:
        shap_arr = shap_arr[:, :, 1] if shap_arr.shape[2] > 1 else shap_arr[:, :, 0]
    if shap_arr.ndim == 2:
        shap_arr = shap_arr[0]

    # Top 15 by absolute magnitude
    fn = FEATURE_NAMES if FEATURE_NAMES else [f"f{i}" for i in range(len(shap_arr))]
    pairs = sorted(zip(fn, shap_arr.tolist()), key=lambda x: abs(x[1]), reverse=True)[:15]
    contribs = {k: round(float(v), 6) for k, v in pairs}

    base_val = explainer.expected_value
    if isinstance(base_val, (list, np.ndarray)):
        base_val = base_val[1] if len(base_val) > 1 else base_val[0]

    return {'shap_values': contribs, 'base_value': float(base_val)}


@app.post("/whatif")
def whatif(request: WhatIfRequest):
    """Apply delta modifications to a patient profile and re-predict."""
    patient_data = request.patient.model_dump()
    modified = {**patient_data, **request.modifications}
    # Coerce numeric types that may have come in as strings through modifications
    return predict(PatientInput(**modified))


@app.get("/metrics")
def metrics():
    path = os.path.join(model_dir, 'metrics.json')
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Metrics file not found. Run training first.")


@app.get("/plots/{target}/{plot_type}")
def get_plot_url(target: str, plot_type: str):
    """Return the URL for a saved training plot."""
    valid_targets = ['CAD', 'LAD', 'LCX', 'RCA']
    valid_types = ['roc_curve', 'pr_curve', 'confusion_matrix', 'calibration_curve', 'learning_curve']
    if target not in valid_targets or plot_type not in valid_types:
        raise HTTPException(status_code=404, detail="Plot not found")
    filename = f"{target}_{plot_type}.png"
    full_path = os.path.join(PLOTS_DIR, filename)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail=f"Plot file {filename} not found")
    return {"url": f"/plots/{filename}"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": list(MODELS.keys()),
        "explainers_loaded": [k for k, v in EXPLAINERS.items() if v is not None],
        "feature_count": len(FEATURE_NAMES)
    }
