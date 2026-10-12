import React, { useState } from 'react'

const GROUPS = {
  "Demographics": ["Age", "Weight", "Sex", "BMI", "DM", "HTN", "Current_Smoker", "Ex_Smoker", "FH", "Obesity", "CRF", "CVA", "Airway_Disease", "Thyroid_Disease", "CHF", "DLP"],
  "Symptoms & Exam": ["BP", "PR", "Edema", "Weak_Peripheral_Pulse", "Lung_Rales", "Systolic_Murmur", "Diastolic_Murmur", "Typical_Chest_Pain", "Dyspnea", "Function_Class", "Atypical", "Non_anginal_CP", "Exertional_CP", "LowTH_Ang"],
  "ECG Features": ["Q_Wave", "ST_Elevation", "ST_Depression", "T_Inversion", "LVH", "Poor_R_Progression"],
  "Lab & Echo": ["FBS", "Cr", "TG", "LDL", "HDL", "BUN", "ESR", "HB", "K", "Na", "WBC", "Lymph", "Neut", "PLT", "EF_TTE", "Region_with_RWMA", "Wall_Motion_Abnormality"]
}

export const PATIENT_PRESETS = {
  "High-Risk Multi-Vessel": {
    label: "🚨 High-Risk Multi-Vessel (Diabetic & HTN)",
    desc: "68yo Male, Diabetic, HTN, Smoker, EF 38%, Typical Angina",
    data: {
      Age: 68, Weight: 84, Sex: "M", BMI: 29.8, DM: "Y", HTN: "Y", Current_Smoker: "Y", Ex_Smoker: "N", FH: "Y", Obesity: "N", CRF: "N", CVA: "N", Airway_Disease: "N", Thyroid_Disease: "N", CHF: "Y", DLP: "Y",
      BP: 155, PR: 88, Edema: "Y", Weak_Peripheral_Pulse: "Y", Lung_Rales: "Y", Systolic_Murmur: "Y", Diastolic_Murmur: "N", Typical_Chest_Pain: "Y", Dyspnea: "Y", Function_Class: "III", Atypical: "N", Non_anginal_CP: "N", Exertional_CP: "Y", LowTH_Ang: "Y",
      Q_Wave: "Y", ST_Elevation: "N", ST_Depression: "Y", T_Inversion: "Y", LVH: "Y", Poor_R_Progression: "Y",
      FBS: 175, Cr: 1.6, TG: 260, LDL: 175, HDL: 34, BUN: 26, ESR: 28, HB: 12.0, K: 4.6, Na: 137, WBC: 8900, Lymph: 20, Neut: 75, PLT: 280, EF_TTE: 38, Region_with_RWMA: 2, Wall_Motion_Abnormality: "Y"
    }
  },
  "Isolated LAD 'Widowmaker'": {
    label: "⚡ Isolated LAD Risk (Heavy Smoker)",
    desc: "56yo Male, Smoker, Dyslipidemia, Anterior ST-T Inversion",
    data: {
      Age: 56, Weight: 79, Sex: "M", BMI: 27.0, DM: "N", HTN: "Y", Current_Smoker: "Y", Ex_Smoker: "N", FH: "Y", Obesity: "N", CRF: "N", CVA: "N", Airway_Disease: "N", Thyroid_Disease: "N", CHF: "N", DLP: "Y",
      BP: 140, PR: 82, Edema: "N", Weak_Peripheral_Pulse: "N", Lung_Rales: "N", Systolic_Murmur: "N", Diastolic_Murmur: "N", Typical_Chest_Pain: "Y", Dyspnea: "N", Function_Class: "II", Atypical: "N", Non_anginal_CP: "N", Exertional_CP: "Y", LowTH_Ang: "N",
      Q_Wave: "N", ST_Elevation: "N", ST_Depression: "Y", T_Inversion: "Y", LVH: "N", Poor_R_Progression: "Y",
      FBS: 110, Cr: 1.1, TG: 195, LDL: 160, HDL: 38, BUN: 18, ESR: 14, HB: 14.5, K: 4.2, Na: 140, WBC: 7200, Lymph: 28, Neut: 65, PLT: 230, EF_TTE: 48, Region_with_RWMA: 1, Wall_Motion_Abnormality: "Y"
    }
  },
  "Borderline RCA Dyslipidemia": {
    label: "⚠️ Borderline RCA (Metabolic Syndrome)",
    desc: "63yo Female, Borderline BP, High TG, Low HDL",
    data: {
      Age: 63, Weight: 72, Sex: "F", BMI: 28.5, DM: "Y", HTN: "Y", Current_Smoker: "N", Ex_Smoker: "N", FH: "N", Obesity: "N", CRF: "N", CVA: "N", Airway_Disease: "N", Thyroid_Disease: "N", CHF: "N", DLP: "Y",
      BP: 138, PR: 74, Edema: "N", Weak_Peripheral_Pulse: "N", Lung_Rales: "N", Systolic_Murmur: "N", Diastolic_Murmur: "N", Typical_Chest_Pain: "N", Dyspnea: "Y", Function_Class: "II", Atypical: "Y", Non_anginal_CP: "N", Exertional_CP: "N", LowTH_Ang: "N",
      Q_Wave: "N", ST_Elevation: "N", ST_Depression: "N", T_Inversion: "Y", LVH: "N", Poor_R_Progression: "N",
      FBS: 128, Cr: 1.0, TG: 215, LDL: 138, HDL: 40, BUN: 17, ESR: 16, HB: 13.0, K: 4.3, Na: 141, WBC: 6400, Lymph: 30, Neut: 60, PLT: 240, EF_TTE: 52, Region_with_RWMA: 0, Wall_Motion_Abnormality: "N"
    }
  },
  "Young Healthy / Low Risk": {
    label: "✅ Young / Low Risk (Atypical Symptoms)",
    desc: "34yo Male, Non-smoker, Normal Echo (EF 60%), Normal Labs",
    data: {
      Age: 34, Weight: 68, Sex: "M", BMI: 22.4, DM: "N", HTN: "N", Current_Smoker: "N", Ex_Smoker: "N", FH: "N", Obesity: "N", CRF: "N", CVA: "N", Airway_Disease: "N", Thyroid_Disease: "N", CHF: "N", DLP: "N",
      BP: 115, PR: 68, Edema: "N", Weak_Peripheral_Pulse: "N", Lung_Rales: "N", Systolic_Murmur: "N", Diastolic_Murmur: "N", Typical_Chest_Pain: "N", Dyspnea: "N", Function_Class: "I", Atypical: "Y", Non_anginal_CP: "Y", Exertional_CP: "N", LowTH_Ang: "N",
      Q_Wave: "N", ST_Elevation: "N", ST_Depression: "N", T_Inversion: "N", LVH: "N", Poor_R_Progression: "N",
      FBS: 85, Cr: 0.9, TG: 110, LDL: 90, HDL: 58, BUN: 12, ESR: 6, HB: 15.0, K: 4.1, Na: 141, WBC: 5500, Lymph: 35, Neut: 55, PLT: 210, EF_TTE: 60, Region_with_RWMA: 0, Wall_Motion_Abnormality: "N"
    }
  }
}

export default function PatientForm({ onPredict, loading = false, currentPatient, onPresetSelect }) {
  const [formData, setFormData] = useState(currentPatient || PATIENT_PRESETS["High-Risk Multi-Vessel"].data)
  const [activeGroup, setActiveGroup] = useState("Demographics")
  const [inferenceMode, setInferenceMode] = useState("independent")
  const [selectedPreset, setSelectedPreset] = useState("High-Risk Multi-Vessel")

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey)
    const presetData = PATIENT_PRESETS[presetKey].data
    setFormData(presetData)
    if (onPresetSelect) {
      onPresetSelect(presetData)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked ? 'Y' : 'N' }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const processed = { ...formData, mode: inferenceMode }
    Object.keys(processed).forEach(key => {
      if (!['Sex', 'Function_Class', 'DM', 'HTN', 'Current_Smoker', 'Ex_Smoker', 'FH', 'Obesity', 'CRF', 'CVA', 'Airway_Disease', 'Thyroid_Disease', 'CHF', 'DLP', 'Edema', 'Weak_Peripheral_Pulse', 'Lung_Rales', 'Systolic_Murmur', 'Diastolic_Murmur', 'Typical_Chest_Pain', 'Dyspnea', 'Atypical', 'Non_anginal_CP', 'Exertional_CP', 'LowTH_Ang', 'Q_Wave', 'ST_Elevation', 'ST_Depression', 'T_Inversion', 'LVH', 'Poor_R_Progression', 'Wall_Motion_Abnormality', 'mode'].includes(key)) {
        processed[key] = parseFloat(processed[key])
      }
    })
    onPredict(processed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-3">
      {/* Patient Archetypes / Presets Dropdown */}
      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <span>👥</span> Clinical Persona Preset
          </label>
          <span className="text-[10px] text-slate-500 font-medium">1-Click Fast Load</span>
        </div>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full bg-white border border-slate-200 text-xs rounded p-1.5 text-slate-900 focus:border-rose-500 focus:outline-none shadow-sm"
        >
          {Object.entries(PATIENT_PRESETS).map(([k, preset]) => (
            <option key={k} value={k}>
              {preset.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 mt-1 truncate">
          {PATIENT_PRESETS[selectedPreset]?.desc}
        </p>
      </div>

      {/* Model Inference Mode Toggle */}
      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <span>⚙️</span> Inference Architecture
          </label>
          <span className="text-[10px] text-slate-500 font-mono font-medium">
            {inferenceMode === 'chain' ? 'Conditional' : 'Calibrated'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded border border-slate-200 text-xs shadow-sm">
          <button
            type="button"
            onClick={() => setInferenceMode('independent')}
            className={`py-1 px-2 rounded font-medium transition-all ${
              inferenceMode === 'independent'
                ? 'bg-rose-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Independent Ensembles
          </button>
          <button
            type="button"
            onClick={() => setInferenceMode('chain')}
            className={`py-1 px-2 rounded font-medium transition-all ${
              inferenceMode === 'chain'
                ? 'bg-rose-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔗 Classifier Chain (LAD→LCX→RCA)
          </button>
        </div>
      </div>

      {/* Group Navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 hide-scrollbar">
        {Object.keys(GROUPS).map(group => (
          <button
            type="button"
            key={group}
            onClick={() => setActiveGroup(group)}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
              activeGroup === group
                ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-200 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Form Fields Grid */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {GROUPS[activeGroup].map(field => {
          const isCheckbox = ['DM', 'HTN', 'Current_Smoker', 'Ex_Smoker', 'FH', 'Obesity', 'CRF', 'CVA', 'Airway_Disease', 'Thyroid_Disease', 'CHF', 'DLP', 'Edema', 'Weak_Peripheral_Pulse', 'Lung_Rales', 'Systolic_Murmur', 'Diastolic_Murmur', 'Typical_Chest_Pain', 'Dyspnea', 'Atypical', 'Non_anginal_CP', 'Exertional_CP', 'LowTH_Ang', 'Q_Wave', 'ST_Elevation', 'ST_Depression', 'T_Inversion', 'LVH', 'Poor_R_Progression', 'Wall_Motion_Abnormality'].includes(field)
          const isSelect = ['Sex', 'Function_Class'].includes(field)

          return (
            <div key={field} className="flex items-center justify-between py-1 border-b border-slate-100 text-xs">
              <label className="text-slate-700 pr-2 truncate max-w-[170px] font-medium" title={field}>
                {field.replace(/_/g, ' ')}
              </label>
              <div className="w-28 flex justify-end">
                {isCheckbox ? (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name={field}
                      checked={formData[field] === 'Y'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-600 shadow-inner"></div>
                  </label>
                ) : isSelect ? (
                   <select
                     name={field}
                     value={formData[field]}
                     onChange={handleChange}
                     className="bg-white border border-slate-200 text-slate-900 text-xs rounded focus:ring-rose-500 focus:border-rose-500 block w-full p-1 shadow-sm"
                   >
                     {field === 'Sex' ? (
                       <><option value="M">Male</option><option value="F">Female</option></>
                     ) : (
                       <><option value="I">Class I</option><option value="II">Class II</option><option value="III">Class III</option><option value="IV">Class IV</option></>
                     )}
                   </select>
                ) : (
                  <input
                    type="number"
                    step="any"
                    name={field}
                    value={formData[field] !== undefined ? formData[field] : ''}
                    onChange={handleChange}
                    className="bg-white border border-slate-200 text-slate-900 text-xs rounded focus:ring-rose-500 focus:border-rose-500 block w-full p-1 text-right shadow-sm"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit Button */}
      <div className="pt-2 border-t border-slate-200 mt-auto">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Heart...</span>
            </>
          ) : (
            <span>RUN ANALYSIS 🔬</span>
          )}
        </button>
      </div>
    </form>
  )
}
