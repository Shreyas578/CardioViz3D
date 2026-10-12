from pydantic import BaseModel
from typing import Optional, Dict, Any

class PatientInput(BaseModel):
    Age: float = 50.0
    Weight: float = 70.0
    Sex: str = "M"
    BMI: float = 25.0
    DM: str = "N"
    HTN: str = "N"
    Current_Smoker: str = "N"
    Ex_Smoker: str = "N"
    FH: str = "N"
    Obesity: str = "N"
    CRF: str = "N"
    CVA: str = "N"
    Airway_Disease: str = "N"
    Thyroid_Disease: str = "N"
    CHF: str = "N"
    DLP: str = "N"
    BP: float = 120.0
    PR: float = 80.0
    Edema: str = "N"
    Weak_Peripheral_Pulse: str = "N"
    Lung_Rales: str = "N"
    Systolic_Murmur: str = "N"
    Diastolic_Murmur: str = "N"
    Typical_Chest_Pain: str = "N"
    Dyspnea: str = "N"
    Function_Class: str = "I"
    Atypical: str = "N"
    Non_anginal_CP: str = "N"
    Exertional_CP: str = "N"
    LowTH_Ang: str = "N"
    Q_Wave: str = "N"
    ST_Elevation: str = "N"
    ST_Depression: str = "N"
    T_Inversion: str = "N"
    LVH: str = "N"
    Poor_R_Progression: str = "N"
    FBS: float = 90.0
    Cr: float = 1.0
    TG: float = 150.0
    LDL: float = 100.0
    HDL: float = 50.0
    BUN: float = 15.0
    ESR: float = 10.0
    HB: float = 14.0
    K: float = 4.0
    Na: float = 140.0
    WBC: float = 6000.0
    Lymph: float = 30.0
    Neut: float = 60.0
    PLT: float = 250.0
    EF_TTE: float = 55.0
    Region_with_RWMA: int = 0
    Wall_Motion_Abnormality: str = "N"
    mode: Optional[str] = "independent"  # "independent" or "chain"


class WhatIfRequest(BaseModel):
    """Request body for the /whatif endpoint."""
    patient: PatientInput
    modifications: Dict[str, Any] = {}
