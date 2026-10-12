import React from 'react'

export default function ClinicalReportModal({ patient, predictions, activeVessel, onClose }) {
  if (!patient || !predictions) return null

  const handlePrint = () => {
    window.print()
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Target risk assessment
  const cadProb = predictions?.CAD?.probability ?? 0
  const ladProb = predictions?.LAD?.probability ?? 0
  const lcxProb = predictions?.LCX?.probability ?? 0
  const rcaProb = predictions?.RCA?.probability ?? 0

  const getRiskBadge = (prob) => {
    if (prob > 0.65) return { label: 'CRITICAL / HIGH RISK', color: 'bg-red-500/20 text-red-400 border-red-500/40' }
    if (prob > 0.35) return { label: 'INTERMEDIATE / BORDERLINE', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' }
    return { label: 'LOW / OPTIMAL', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0B1120] text-slate-100 rounded-xl border border-border shadow-2xl overflow-hidden my-8">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-[#0F172A] border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="font-bold text-white text-base">Clinical Dossier & Diagnostic Report</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-500 transition-all shadow-sm active:scale-95 text-sm"
            >
              <span>🖨️ Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all text-sm font-semibold"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="p-8 space-y-6 text-sm print:p-0 print:text-black print:bg-white">
          
          {/* Header */}
          <div className="border-b border-border/80 pb-4 flex justify-between items-start print:border-black">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white print:text-black">
                CARDIOLOGY CLINICAL DOSSIER
              </h1>
              <p className="text-xs text-slate-400 mt-1 print:text-gray-600">
                CardioViz3D Automated Decision Support System | FMA-3D Spatial Integration
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 print:text-gray-700">
              <p className="font-semibold text-white print:text-black">Exam Date: {currentDate}</p>
              <p>Record ID: #{Math.abs(Math.sin(patient.Age || 1) * 100000).toFixed(0)}</p>
              <p>Status: Completed Calibration</p>
            </div>
          </div>

          {/* Patient Demographics & Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#131722] p-4 rounded-lg border border-[#1E2536] print:bg-gray-100 print:text-black print:border-gray-300">
            <div>
              <span className="text-[11px] text-slate-400 uppercase block">Age / Sex</span>
              <span className="font-bold text-sm text-white print:text-black">{patient.Age} yrs / {patient.Sex === 'M' ? 'Male' : 'Female'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase block">Blood Pressure</span>
              <span className="font-bold text-sm text-white print:text-black">{patient.BP} mmHg (PR {patient.PR} bpm)</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase block">Ejection Fraction</span>
              <span className="font-bold text-sm text-white print:text-black">{patient.EF_TTE}% (Echo)</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase block">Metabolic Profile</span>
              <span className="font-bold text-sm text-white print:text-black">
                {patient.DM === 'Y' ? 'Diabetic' : 'Non-DM'} | {patient.HTN === 'Y' ? 'HTN' : 'Normotensive'}
              </span>
            </div>
          </div>

          {/* Multi-Vessel Stenosis Risk Summary Table */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400 mb-3 print:text-black">
              1. Multi-Vessel Predicted Stenosis Stratification
            </h2>
            <div className="overflow-x-auto rounded-lg border border-[#1E2536] print:border-gray-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181D2A] border-b border-[#1E2536] text-slate-400 uppercase print:bg-gray-200 print:text-black">
                  <tr>
                    <th className="py-2.5 px-3">Anatomical Target</th>
                    <th className="py-2.5 px-3">Anatomical Role</th>
                    <th className="py-2.5 px-3">Model Probability</th>
                    <th className="py-2.5 px-3">Clinical Risk Category</th>
                    <th className="py-2.5 px-3">50% Cutoff Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2536] print:divide-gray-300">
                  <tr className="bg-[#131722]/50">
                    <td className="py-2.5 px-3 font-bold text-white print:text-black">Overall CAD</td>
                    <td className="py-2.5 px-3 text-slate-400 print:text-gray-700">Systemic Coronary Artery Disease</td>
                    <td className="py-2.5 px-3 font-mono font-bold">{(cadProb * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getRiskBadge(cadProb).color}`}>
                        {getRiskBadge(cadProb).label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{cadProb >= 0.5 ? '🚨 Positive (≥50%)' : '✅ Negative (<50%)'}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-red-400 print:text-black">LAD</td>
                    <td className="py-2.5 px-3 text-slate-400 print:text-gray-700">Left Anterior Descending (Anterior wall, septum)</td>
                    <td className="py-2.5 px-3 font-mono font-bold">{(ladProb * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getRiskBadge(ladProb).color}`}>
                        {getRiskBadge(ladProb).label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{ladProb >= 0.5 ? '🚨 Stenosis Likely' : '✅ Patent / Low Risk'}</td>
                  </tr>
                  <tr className="bg-[#131722]/50">
                    <td className="py-2.5 px-3 font-bold text-amber-400 print:text-black">LCX</td>
                    <td className="py-2.5 px-3 text-slate-400 print:text-gray-700">Left Circumflex (Lateral / posterior wall)</td>
                    <td className="py-2.5 px-3 font-mono font-bold">{(lcxProb * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getRiskBadge(lcxProb).color}`}>
                        {getRiskBadge(lcxProb).label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{lcxProb >= 0.5 ? '🚨 Stenosis Likely' : '✅ Patent / Low Risk'}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-sky-400 print:text-black">RCA</td>
                    <td className="py-2.5 px-3 text-text-muted print:text-gray-700">Right Coronary Artery (Inferior wall, RV, SA/AV nodes)</td>
                    <td className="py-2.5 px-3 font-mono font-bold">{(rcaProb * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getRiskBadge(rcaProb).color}`}>
                        {getRiskBadge(rcaProb).label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{rcaProb >= 0.5 ? '🚨 Stenosis Likely' : '✅ Patent / Low Risk'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Clinical Insights & Management Guidance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-bg-secondary/40 p-4 rounded-lg border border-border print:bg-gray-50 print:border-gray-300">
              <h3 className="font-bold text-xs uppercase text-text-primary mb-2 print:text-black">
                Primary Physiological Risk Drivers
              </h3>
              <ul className="space-y-1.5 text-xs text-text-muted print:text-gray-800">
                <li>• <strong>Lipid Profile:</strong> LDL {patient.LDL} mg/dL, HDL {patient.HDL} mg/dL, TG {patient.TG} mg/dL</li>
                <li>• <strong>ECG Findings:</strong> ST Depression: {patient.ST_Depression === 'Y' ? 'Present' : 'Absent'} | T-Wave Inversion: {patient.T_Inversion === 'Y' ? 'Present' : 'Absent'}</li>
                <li>• <strong>Functional Status:</strong> NYHA Class {patient.Function_Class || 'I'}, Angina: {patient.Typical_Chest_Pain === 'Y' ? 'Typical' : 'Atypical/Non-anginal'}</li>
                <li>• <strong>Echo Wall Motion:</strong> {patient.Wall_Motion_Abnormality === 'Y' ? 'Regional wall motion abnormality observed' : 'Normal motility'}</li>
              </ul>
            </div>

            <div className="bg-bg-secondary/40 p-4 rounded-lg border border-border print:bg-gray-50 print:border-gray-300">
              <h3 className="font-bold text-xs uppercase text-text-primary mb-2 print:text-black">
                Recommended Clinical Action Path
              </h3>
              <div className="space-y-2 text-xs text-text-muted print:text-gray-800">
                {cadProb > 0.65 ? (
                  <p className="text-red-300 print:text-red-700">
                    <strong>Urgent Cardiology Referral:</strong> Invasive Coronary Angiography (ICA) or Coronary CT Angiography (CCTA) recommended to define lesion anatomy and assess suitability for PCI vs CABG.
                  </p>
                ) : (
                  <p className="text-emerald-300 print:text-emerald-700">
                    <strong>Guideline-Directed Management:</strong> Optimize statin therapy, tight blood pressure control (&lt;130/80), lifestyle modification, and annual non-invasive treadmill/echo stress testing.
                  </p>
                )}
                <p className="text-[11px] text-text-muted mt-2 border-t border-border/40 pt-2 print:text-gray-500">
                  <em>Disclaimer: Automated predictive scores are designed for investigational clinical decision support and do not supersede qualified physician clinical judgment.</em>
                </p>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="border-t border-border/80 pt-4 flex justify-between items-end print:border-black text-[11px] text-text-muted print:text-gray-700">
            <div>
              <p>CardioViz3D Architecture: Ensemble Stacking + Isotonic Probability Calibration</p>
              <p>Dataset: Extended Z-Alizadeh Sani Protocol (303 Pts, 54 Parameters)</p>
            </div>
            <div className="text-right">
              <p className="border-b border-dotted border-border print:border-black pb-1 mb-1 w-44 inline-block"></p>
              <p>Attending Reviewer Signature</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
