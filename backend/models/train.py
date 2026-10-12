import pandas as pd
import numpy as np
import joblib
import json
import shap
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from sklearn.impute import SimpleImputer
from sklearn.model_selection import RepeatedStratifiedKFold, train_test_split, learning_curve
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import (roc_auc_score, accuracy_score, precision_score, 
                             recall_score, f1_score, confusion_matrix, 
                             brier_score_loss, precision_recall_curve, 
                             average_precision_score, roc_curve)
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

import optuna
from optuna.pruners import MedianPruner

from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.multioutput import ClassifierChain
from sklearn.base import clone

import warnings
warnings.filterwarnings("ignore")

# ==========================================
# CONFIGURATION & CONSTANTS
# ==========================================
DATA_PATH = 'data/raw/extention of Z-Alizadeh sani dataset.xlsx'
SAVE_DIR = 'models/saved'
PLOTS_DIR = os.path.join(SAVE_DIR, 'plots')

os.makedirs(SAVE_DIR, exist_ok=True)
os.makedirs(PLOTS_DIR, exist_ok=True)

# Define columns that leak the target for CAD, LAD, LCX, RCA
LEAKAGE_COLUMNS = ['Cath', 'LAD', 'LCX', 'RCA']

TARGET_MAP = {
    'CAD':  {'target': 'Cath'},
    'LAD':  {'target': 'LAD'},
    'LCX':  {'target': 'LCX'},
    'RCA':  {'target': 'RCA'},
}

N_TRIALS = 100

# ==========================================
# PLOTTING FUNCTIONS
# ==========================================
def plot_confusion_matrix(y_true, y_pred, target_name):
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
    plt.title(f'Confusion Matrix: {target_name}')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, f'{target_name}_confusion_matrix.png'), dpi=150)
    plt.close()

def plot_roc_curve(y_true, y_prob, target_name):
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    auc = roc_auc_score(y_true, y_prob)
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, label=f'AUC = {auc:.3f}')
    plt.plot([0, 1], [0, 1], 'r--')
    plt.title(f'ROC Curve: {target_name}')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, f'{target_name}_roc_curve.png'), dpi=150)
    plt.close()

def plot_pr_curve(y_true, y_prob, target_name):
    precision, recall, _ = precision_recall_curve(y_true, y_prob)
    ap = average_precision_score(y_true, y_prob)
    plt.figure(figsize=(6, 5))
    plt.plot(recall, precision, label=f'AP = {ap:.3f}')
    plt.title(f'Precision-Recall Curve: {target_name}')
    plt.xlabel('Recall')
    plt.ylabel('Precision')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, f'{target_name}_pr_curve.png'), dpi=150)
    plt.close()

def plot_calibration_curve_fig(y_true, y_prob, target_name):
    fraction_of_positives, mean_predicted_value = calibration_curve(y_true, y_prob, n_bins=10)
    plt.figure(figsize=(6, 5))
    plt.plot(mean_predicted_value, fraction_of_positives, "s-", label="Calibrated model")
    plt.plot([0, 1], [0, 1], "k:", label="Perfectly calibrated")
    plt.title(f'Calibration Curve: {target_name}')
    plt.xlabel('Mean Predicted Probability')
    plt.ylabel('Fraction of Positives')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, f'{target_name}_calibration_curve.png'), dpi=150)
    plt.close()

def plot_learning_curve_fig(model, X, y, target_name):
    train_sizes, train_scores, test_scores = learning_curve(
        model, X, y, cv=5, scoring='roc_auc', n_jobs=-1, 
        train_sizes=np.linspace(0.1, 1.0, 10))
    
    train_mean = np.mean(train_scores, axis=1)
    train_std = np.std(train_scores, axis=1)
    test_mean = np.mean(test_scores, axis=1)
    test_std = np.std(test_scores, axis=1)

    plt.figure(figsize=(8, 6))
    plt.plot(train_sizes, train_mean, 'o-', color="r", label="Training score (AUC)")
    plt.plot(train_sizes, test_mean, 'o-', color="g", label="Cross-validation score (AUC)")
    plt.fill_between(train_sizes, train_mean - train_std, train_mean + train_std, alpha=0.1, color="r")
    plt.fill_between(train_sizes, test_mean - test_std, test_mean + test_std, alpha=0.1, color="g")
    
    plt.title(f'Learning Curve: {target_name}')
    plt.xlabel('Training Set Size')
    plt.ylabel('ROC-AUC Score')
    plt.legend(loc="best")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(PLOTS_DIR, f'{target_name}_learning_curve.png'), dpi=150)
    plt.close()

def plot_shap_summary(model, X_preprocessed, feature_names, target_name):
    try:
        if isinstance(model, LogisticRegression):
            explainer = shap.LinearExplainer(model, X_preprocessed)
            shap_values = explainer.shap_values(X_preprocessed)
        elif isinstance(model, SVC):
            # Fallback for SVC
            X_sample = shap.sample(X_preprocessed, 100)
            explainer = shap.KernelExplainer(model.predict_proba, X_sample)
            shap_values = explainer.shap_values(X_sample)
            if isinstance(shap_values, list):
                shap_values = shap_values[1]
            X_preprocessed = X_sample
        else:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_preprocessed)
            if isinstance(shap_values, list):
                shap_values = shap_values[1] # For multiclass output fallback
                
        plt.figure(figsize=(10, 8))
        shap.summary_plot(shap_values, X_preprocessed, feature_names=feature_names, show=False)
        plt.tight_layout()
        plt.savefig(os.path.join(PLOTS_DIR, f'{target_name}_shap_summary.png'), dpi=150)
        plt.close()
    except Exception as e:
        print(f"Warning: SHAP plotting failed for {target_name} ({type(model).__name__}): {e}")

# ==========================================
# DATA LOADING & PREPROCESSING
# ==========================================
def load_and_preprocess_data():
    df = pd.read_excel(DATA_PATH)
    
    # Target values might be 'Cad', 'Normal', 'Stenotic' -> map to 1/0
    target_cols = ['Cath', 'LAD', 'LCX', 'RCA']
    for col in target_cols:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: 1 if str(x).strip().lower() in ['cad', 'stenotic'] else 0)

    y_df = df[target_cols].copy()
    X_df = df.drop(columns=target_cols)

    numeric_features = X_df.select_dtypes(include=['int64', 'float64']).columns.tolist()
    categorical_features = X_df.select_dtypes(exclude=['int64', 'float64']).columns.tolist()

    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('ordinal', OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ])
    
    return X_df, y_df, preprocessor

# ==========================================
# OPTUNA OBJECTIVE (Multi-Model)
# ==========================================
def objective(trial, X, y, preprocessor):
    classifier_name = trial.suggest_categorical("classifier", [
        "LogisticRegression", "RandomForest", "XGBoost", "LightGBM"
    ])
    
    # Create the model based on the suggested type and hyperparameters
    if classifier_name == "LogisticRegression":
        c = trial.suggest_float("lr_c", 1e-4, 1e2, log=True)
        classifier = LogisticRegression(C=c, max_iter=1000, class_weight='balanced', random_state=42)
    elif classifier_name == "RandomForest":
        n_est = trial.suggest_int("rf_n_estimators", 50, 150)
        depth = trial.suggest_int("rf_max_depth", 2, 5)
        min_leaf = trial.suggest_int("rf_min_samples_leaf", 3, 10)
        classifier = RandomForestClassifier(n_estimators=n_est, max_depth=depth, 
                                            min_samples_leaf=min_leaf, class_weight='balanced', 
                                            random_state=42)
    elif classifier_name == "XGBoost":
        n_est = trial.suggest_int("xgb_n_estimators", 50, 150)
        lr = trial.suggest_float("xgb_lr", 1e-3, 0.1, log=True)
        depth = trial.suggest_int("xgb_max_depth", 2, 4)
        subsample = trial.suggest_float("xgb_subsample", 0.5, 0.8)
        colsample = trial.suggest_float("xgb_colsample_bytree", 0.5, 0.8)
        scale_pos = trial.suggest_float("xgb_scale_pos", 1.0, 5.0)
        reg_lambda = trial.suggest_float("xgb_reg_lambda", 1.0, 10.0, log=True)
        classifier = XGBClassifier(n_estimators=n_est, learning_rate=lr, max_depth=depth,
                                   subsample=subsample, colsample_bytree=colsample,
                                   scale_pos_weight=scale_pos, reg_lambda=reg_lambda,
                                   eval_metric='auc', random_state=42)
    elif classifier_name == "LightGBM":
        n_est = trial.suggest_int("lgb_n_estimators", 50, 150)
        num_leaves = trial.suggest_int("lgb_num_leaves", 4, 15)
        lr = trial.suggest_float("lgb_lr", 1e-3, 0.1, log=True)
        reg_lambda = trial.suggest_float("lgb_reg_lambda", 1.0, 10.0, log=True)
        min_child = trial.suggest_int("lgb_min_child_samples", 5, 20)
        classifier = LGBMClassifier(n_estimators=n_est, num_leaves=num_leaves, learning_rate=lr,
                                    reg_lambda=reg_lambda, min_child_samples=min_child, is_unbalance=True, random_state=42)
    elif classifier_name == "SVC":
        c = trial.suggest_float("svc_c", 1e-3, 1e2, log=True)
        gamma = trial.suggest_categorical("svc_gamma", ['scale', 'auto'])
        classifier = SVC(C=c, gamma=gamma, probability=True, class_weight='balanced', random_state=42)

    # Use SMOTE only inside the CV folds via Pipeline
    pipeline = ImbPipeline(steps=[
        ('preprocessor', preprocessor),
        ('smote', SMOTE(random_state=42)),
        ('classifier', classifier)
    ])
    
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=42)
    auc_scores = []
    
    # Custom CV loop for pruning
    for step, (train_idx, val_idx) in enumerate(cv.split(X, y)):
        X_train_cv, y_train_cv = X.iloc[train_idx], y.iloc[train_idx]
        X_val_cv, y_val_cv = X.iloc[val_idx], y.iloc[val_idx]
        
        pipeline.fit(X_train_cv, y_train_cv)
        y_prob = pipeline.predict_proba(X_val_cv)[:, 1]
        auc = roc_auc_score(y_val_cv, y_prob)
        auc_scores.append(auc)
        
        trial.report(auc, step)
        if trial.should_prune():
            raise optuna.TrialPruned()
            
    return np.mean(auc_scores)

# ==========================================
# TRAINING EXECUTION
# ==========================================
def create_model_from_params(best_params):
    classifier_name = best_params['classifier']
    if classifier_name == "LogisticRegression":
        return LogisticRegression(C=best_params['lr_c'], max_iter=1000, class_weight='balanced', random_state=42)
    elif classifier_name == "RandomForest":
        return RandomForestClassifier(n_estimators=best_params['rf_n_estimators'], 
                                      max_depth=best_params['rf_max_depth'], 
                                      min_samples_leaf=best_params['rf_min_samples_leaf'], 
                                      class_weight='balanced', random_state=42)
    elif classifier_name == "XGBoost":
        return XGBClassifier(n_estimators=best_params['xgb_n_estimators'], 
                             learning_rate=best_params['xgb_lr'], 
                             max_depth=best_params['xgb_max_depth'],
                             subsample=best_params['xgb_subsample'], 
                             colsample_bytree=best_params['xgb_colsample_bytree'],
                             scale_pos_weight=best_params['xgb_scale_pos'], 
                             reg_lambda=best_params['xgb_reg_lambda'],
                             eval_metric='auc', random_state=42)
    elif classifier_name == "LightGBM":
        return LGBMClassifier(n_estimators=best_params['lgb_n_estimators'], 
                              num_leaves=best_params['lgb_num_leaves'], 
                              learning_rate=best_params['lgb_lr'],
                              reg_lambda=best_params['lgb_reg_lambda'], 
                              min_child_samples=best_params['lgb_min_child_samples'],
                              is_unbalance=True, random_state=42)
    elif classifier_name == "SVC":
        return SVC(C=best_params['svc_c'], gamma=best_params['svc_gamma'], 
                   probability=True, class_weight='balanced', random_state=42)

def train_and_evaluate(target_name, config, X_df, y_df, preprocessor, metrics_dict):
    print(f"\n{'='*60}\nTraining Target: {target_name} (100 Trials, 5 Models)\n{'='*60}")
    
    y = y_df[config['target']]
    X = X_df.copy()
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    # 1. Hyperparameter Tuning (100 Trials as requested)
    study = optuna.create_study(direction='maximize', pruner=MedianPruner(n_warmup_steps=3))
    study.optimize(lambda trial: objective(trial, X_train, y_train, preprocessor), n_trials=N_TRIALS, n_jobs=-1)
    
    print(f"[{target_name}] Best Model: {study.best_params['classifier']}")
    print(f"[{target_name}] Best CV AUC: {study.best_value:.4f}")
    
    # Create the Best Tuned Model first so we can anchor the ensemble with it
    best_model = create_model_from_params(study.best_params)
    
    # 2. Build Stacking Ensemble (Base: Best Tuned Anchor + Strong Defaults, Meta: LR)
    print(f"[{target_name}] Evaluating Stacking Ensemble vs Best Tuned Model...")
    stack = StackingClassifier(
        estimators=[
            ('best_tuned', best_model),
            ('rf', RandomForestClassifier(n_estimators=250, max_depth=10, min_samples_leaf=2, class_weight='balanced', random_state=42)),
            ('xgb', XGBClassifier(n_estimators=250, max_depth=6, learning_rate=0.03, subsample=0.8, eval_metric='auc', random_state=42)),
            ('lgb', LGBMClassifier(n_estimators=250, num_leaves=31, learning_rate=0.03, is_unbalance=True, random_state=42))
        ],
        final_estimator=LogisticRegression(C=0.1, class_weight='balanced', max_iter=1000),
        cv=5,
        n_jobs=-1
    )
    
    pipeline_tuned = ImbPipeline([('preprocessor', preprocessor), ('smote', SMOTE(random_state=42)), ('classifier', best_model)])
    pipeline_stack = ImbPipeline([('preprocessor', preprocessor), ('smote', SMOTE(random_state=42)), ('classifier', stack)])
    
    # We will choose whichever performs best on CV score. Since stack is expensive, we'll evaluate it on train set via cross_val
    from sklearn.model_selection import cross_val_score
    stack_cv_auc = np.mean(cross_val_score(pipeline_stack, X_train, y_train, cv=5, scoring='roc_auc', n_jobs=-1))
    print(f"[{target_name}] Stacking Ensemble CV AUC: {stack_cv_auc:.4f}")
    
    final_pipeline = pipeline_tuned
    chosen_model_name = study.best_params['classifier']
    if stack_cv_auc > study.best_value:
        print(f"[{target_name}] -> Stacking Ensemble outperformed the best single model. Selecting Stacking.")
        final_pipeline = pipeline_stack
        chosen_model_name = "StackingEnsemble"
    else:
        print(f"[{target_name}] -> Best tuned {chosen_model_name} outperformed Stacking. Selecting {chosen_model_name}.")

    # 3. Fit final selected model and Plot Learning Curves (to verify no overfitting)
    print(f"[{target_name}] Plotting learning curves...")
    plot_learning_curve_fig(final_pipeline, X_train, y_train, target_name)

    # 4. Calibration (Isotonic)
    print(f"[{target_name}] Calibrating final model...")
    # Wrap the entire pipeline in CalibratedClassifierCV.
    # cv=5 splits X_train/y_train. The pipeline fits on 4 folds (applying SMOTE)
    # and predicts on the 1 validation fold (natural/un-SMOTEd) to train the Isotonic calibrator.
    calibrated_clf = CalibratedClassifierCV(estimator=final_pipeline, method='isotonic', cv=5)
    calibrated_clf.fit(X_train, y_train)
    
    final_pipeline = calibrated_clf
    
    # 5. Test Evaluation
    y_prob = final_pipeline.predict_proba(X_test)[:, 1]
    y_pred = final_pipeline.predict(X_test)
    
    auc = roc_auc_score(y_test, y_prob)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    brier = brier_score_loss(y_test, y_prob)
    
    metrics_dict[target_name] = {
        'Selected_Model': chosen_model_name,
        'ROC_AUC': float(auc),
        'Accuracy': float(acc),
        'Precision': float(prec),
        'Recall': float(rec),
        'F1_Score': float(f1),
        'Brier_Score': float(brier)
    }
    print(f"[{target_name}] TEST METRICS -> AUC: {auc:.3f} | Acc: {acc:.3f} | F1: {f1:.3f} | Brier: {brier:.3f}")
    
    # Overfitting Check (Train vs Test AUC diff)
    y_prob_train = final_pipeline.predict_proba(X_train)[:, 1]
    train_auc = roc_auc_score(y_train, y_prob_train)
    print(f"[{target_name}] Train AUC: {train_auc:.3f} | Test AUC: {auc:.3f} | Gap: {(train_auc - auc):.3f}")
    if (train_auc - auc) > 0.10:
        print(f"WARNING: OVERFIT ALARM: Train/Test AUC gap exceeds 0.10 for {target_name}!")
        
    # 6. Saving Plots & Model
    plot_confusion_matrix(y_test, y_pred, target_name)
    plot_roc_curve(y_test, y_prob, target_name)
    plot_pr_curve(y_test, y_prob, target_name)
    plot_calibration_curve_fig(y_test, y_prob, target_name)
    
    # SHAP
    # Since final_pipeline is now a CalibratedClassifierCV, we extract the base estimator
    # from the first calibrated model to generate the SHAP plots.
    try:
        base_pipeline = final_pipeline.estimator
        if hasattr(final_pipeline, 'calibrated_estimators_'):
            base_pipeline = final_pipeline.calibrated_estimators_[0].estimator
            
        fitted_model = base_pipeline.named_steps['classifier']
        
        feature_names = base_pipeline.named_steps['preprocessor'].get_feature_names_out()
        feature_names = [f.split('__')[-1] for f in feature_names]
        
        # We need a transformed sample to pass to SHAP
        X_train_transformed = base_pipeline.named_steps['preprocessor'].transform(X_train)
        # Use un-SMOTEd data for authentic SHAP summaries
        plot_shap_summary(fitted_model, X_train_transformed, feature_names, target_name)
    except Exception as e:
        print(f"Warning: SHAP extraction failed for {target_name}: {e}")
        
    joblib.dump(final_pipeline, os.path.join(SAVE_DIR, f'xgb_{target_name}_calibrated.pkl')) # Keep filename prefix consistent for the API
    print(f"[{target_name}] Pipeline saved.")

def main():
    print("Loading data...")
    X_df, y_df, preprocessor = load_and_preprocess_data()
    
    metrics_dict = {}
    
    # 1. Independent Training for CAD, LAD, LCX, RCA
    for target_name, config in TARGET_MAP.items():
        train_and_evaluate(target_name, config, X_df, y_df, preprocessor, metrics_dict)
        
    # 2. Classifier Chains (Optional step requested to capture inter-vessel correlations)
    # We will build a simple chain for LAD -> LCX -> RCA and print its score for comparison
    print("\n" + "="*60 + "\nEvaluating Classifier Chain (LAD -> LCX -> RCA)\n" + "="*60)
    chain_targets = ['LAD', 'LCX', 'RCA']
    y_chain = y_df[chain_targets]
    
    # Standardize X for chain evaluation
    X_train, X_test, y_train, y_test = train_test_split(X_df, y_chain, test_size=0.2, random_state=42)
    # The preprocessor runs first on the full DataFrame.
    # The ClassifierChain then runs on the transformed numpy array.
    # SMOTE must be applied INSIDE the chain's base estimator so it handles one binary target at a time.
    smote_xgb = ImbPipeline([
        ('smote', SMOTE(random_state=42)),
        ('classifier', XGBClassifier(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42, eval_metric='logloss'))
    ])
    
    chain = ClassifierChain(smote_xgb, order='random', random_state=42)
    
    # Use standard sklearn Pipeline for the outer loop
    from sklearn.pipeline import Pipeline as SklearnPipeline
    pipeline_chain = SklearnPipeline([
        ('preprocessor', preprocessor), 
        ('chain', chain)
    ])
    
    pipeline_chain.fit(X_train, y_train)
    
    y_pred_chain = pipeline_chain.predict(X_test)
    for i, target in enumerate(chain_targets):
        acc = accuracy_score(y_test.iloc[:, i], y_pred_chain[:, i])
        print(f"Chain Performance for {target} -> Accuracy: {acc:.3f}")

    with open(os.path.join(SAVE_DIR, 'metrics.json'), 'w') as f:
        json.dump(metrics_dict, f, indent=4)
    print("\n[SUCCESS] Training complete! All metrics and models saved.")

if __name__ == '__main__':
    main()
