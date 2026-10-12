import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline as SklearnPipeline
from sklearn.multioutput import ClassifierChain
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier
from train import load_and_preprocess_data

def train_and_save_chain():
    print("Loading data for Classifier Chain...")
    X_df, y_df, preprocessor = load_and_preprocess_data()
    
    chain_targets = ['LAD', 'LCX', 'RCA']
    y_chain = y_df[chain_targets]
    
    smote_xgb = ImbPipeline([
        ('smote', SMOTE(random_state=42)),
        ('classifier', XGBClassifier(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42, eval_metric='logloss'))
    ])
    
    chain = ClassifierChain(smote_xgb, order=[0, 1, 2], random_state=42)
    
    pipeline_chain = SklearnPipeline([
        ('preprocessor', preprocessor), 
        ('chain', chain)
    ])
    
    pipeline_chain.fit(X_df, y_chain)
    
    out_path = os.path.join('models', 'saved', 'classifier_chain.pkl')
    joblib.dump(pipeline_chain, out_path)
    print(f"Classifier chain successfully trained and saved to {out_path}!")

if __name__ == '__main__':
    train_and_save_chain()
