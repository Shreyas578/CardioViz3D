import os
import json
import joblib
import pandas as pd
import numpy as np
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import PatientInput, WhatIfRequest

app = FastAPI(title="CardioViz3D Vercel API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Global Model & Explainer Caching
# ──────────────────────────────────────────────
MODELS = {}
EXPLAINERS = {}
FEATURE_NAMES = []

model_dir = os.path.join(os.path.dirname(__file__), 'models/saved')

def _extract_base_pipeline(pipeline):
    if hasattr(pipeline, 'calibrated_classifiers_') and pipeline.calibrated_classifiers_:
        return pipeline.calibrated_classifiers_[0].estimator
    if hasattr(pipeline, 'calibrated_estimators_') and pipeline.calibrated_estimators_:
        return pipeline.calibrated_estimators_[0].estimator
    if hasattr(pipeline, 'estimator'):
        return pipeline.estimator
    return pipeline

def _get_tree_estimator(classifier):
    if hasattr(classifier, 'estimators_'):
        for est in classifier.estimators_:
            name = type(est).__name__
            if any(k in name for k in ('RandomForest', 'XGB', 'LGBM')):
                return est
        return classifier.estimators_[0]
    return classifier

# Load calibrated models on startup
for target in ['CAD', 'LAD', 'LCX', 'RCA']:
    path = os.path.join(model_dir, f'xgb_{target}_calibrated.pkl')
    if os.path.exists(path):
        try:
            pipeline = joblib.load(path)
            MODELS[target] = pipeline

            base_pipeline = _extract_base_pipeline(pipeline)

            if not FEATURE_NAMES:
                try:
                    preprocessor = base_pipeline.named_steps['preprocessor']
                    FEATURE_NAMES = [f.split('__')[-1] for f in preprocessor.get_feature_names_out()]
                except Exception as e:
                    pass

            # TreeExplainer on base classifier
            try:
                classifier = base_pipeline.named_steps['classifier']
                tree_model = _get_tree_estimator(classifier)
                EXPLAINERS[target] = shap.TreeExplainer(tree_model)
            except Exception as e:
                EXPLAINERS[target] = None
        except Exception as e:
            print(f"Error loading {target} model: {e}")

# Load classifier chain
chain_path = os.path.join(model_dir, 'classifier_chain.pkl')
CLASSIFIER_CHAIN = None
if os.path.exists(chain_path):
    try:
        CLASSIFIER_CHAIN = joblib.load(chain_path)
    except Exception as e:
        print(f"Error loading classifier chain: {e}")


@app.get("/api/health")
@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": list(MODELS.keys()),
        "explainers_loaded": [k for k, v in EXPLAINERS.items() if v is not None],
        "feature_count": len(FEATURE_NAMES)
    }


@app.get("/api/metrics")
@app.get("/metrics")
def metrics():
    path = os.path.join(model_dir, 'metrics.json')
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Metrics file not found")


@app.post("/api/predict")
@app.post("/predict")
def predict(patient: PatientInput):
    patient_dict = patient.dict()
    mode = patient_dict.pop('mode', 'independent')
    df = pd.DataFrame([patient_dict])

    result = {}

    if mode == 'chain' and CLASSIFIER_CHAIN is not None:
        try:
            base_pipeline = _extract_base_pipeline(MODELS.get('CAD', list(MODELS.values())[0]))
            preprocessor = base_pipeline.named_steps['preprocessor']
            X_trans = preprocessor.transform(df)

            chain_preds = CLASSIFIER_CHAIN.predict(X_trans)[0]
            chain_probs = CLASSIFIER_CHAIN.predict_proba(X_trans)[0]

            targets = ['CAD', 'LAD', 'LCX', 'RCA']
            for i, target in enumerate(targets):
                prob = float(chain_probs[i])
                pred = int(chain_preds[i])
                tier = 'high' if prob > 0.65 else ('medium' if prob > 0.35 else 'low')
                confidence = float(np.max([prob, 1.0 - prob]))
                result[target] = {
                    'probability': round(prob, 4),
                    'stenosis_detected': bool(pred == 1),
                    'risk_tier': tier,
                    'confidence': round(confidence, 4),
                    'mode': 'chain'
                }
            return result
        except Exception as e:
            # Fall back to independent on error
            pass

    # Independent calibrated models mode
    for target in ['CAD', 'LAD', 'LCX', 'RCA']:
        if target not in MODELS:
            continue
        model = MODELS[target]
        try:
            prob = float(model.predict_proba(df)[0][1])
            pred = int(model.predict(df)[0])
            tier = 'high' if prob > 0.65 else ('medium' if prob > 0.35 else 'low')
            confidence = float(np.max(model.predict_proba(df)[0]))

            shap_values = []
            if EXPLAINERS.get(target) is not None:
                try:
                    base_pipe = _extract_base_pipeline(model)
                    X_transformed = base_pipe.named_steps['preprocessor'].transform(df)
                    sv = EXPLAINERS[target].shap_values(X_transformed)

                    if isinstance(sv, list):
                        vals = sv[1][0] if len(sv) > 1 else sv[0][0]
                    elif isinstance(sv, np.ndarray) and sv.ndim == 3:
                        vals = sv[0, :, 1]
                    else:
                        vals = sv[0]

                    shap_pairs = [
                        {'feature': FEATURE_NAMES[i], 'value': round(float(vals[i]), 4)}
                        for i in range(len(FEATURE_NAMES))
                    ]
                    shap_pairs.sort(key=lambda x: abs(x['value']), reverse=True)
                    shap_values = shap_pairs[:10]
                except Exception as e:
                    pass

            result[target] = {
                'probability': round(prob, 4),
                'stenosis_detected': bool(pred == 1),
                'risk_tier': tier,
                'confidence': round(confidence, 4),
                'top_features': shap_values,
                'mode': 'independent'
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Prediction error for {target}: {str(e)}")

    return result


@app.post("/api/whatif")
@app.post("/whatif")
def what_if(request: WhatIfRequest):
    patient_dict = request.patient.dict()
    modified = dict(patient_dict)
    for k, v in request.modifications.items():
        if k in modified:
            if isinstance(patient_dict[k], float):
                modified[k] = float(v)
            elif isinstance(patient_dict[k], int):
                modified[k] = int(v)
            else:
                modified[k] = v

    return predict(PatientInput(**modified))
