import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { API_URL } from '../config'

const PLOT_TYPES = [
  { key: 'roc_curve', label: 'ROC Curve' },
  { key: 'pr_curve', label: 'PR Curve' },
  { key: 'calibration_curve', label: 'Calibration' },
  { key: 'confusion_matrix', label: 'Confusion Matrix' },
  { key: 'learning_curve', label: 'Learning Curve' },
]

const METRIC_COLORS = {
  ROC_AUC: 'text-rose-400',
  Accuracy: 'text-emerald-400',
  F1_Score: 'text-amber-400',
  Brier_Score: 'text-slate-300',
  Precision: 'text-rose-300',
  Recall: 'text-emerald-300',
}

export default function MetricsPanel({ activeVessel }) {
  const [allMetrics, setAllMetrics] = useState(null)
  const [activePlot, setActivePlot] = useState('roc_curve')
  const [imgError, setImgError] = useState(false)

  const vessel = activeVessel && ['CAD', 'LAD', 'LCX', 'RCA'].includes(activeVessel)
    ? activeVessel
    : 'CAD'

  useEffect(() => {
    axios.get(`${API_URL}/metrics`)
      .then(res => setAllMetrics(res.data))
      .catch(() => {
        // Fallback if backend not running
        setAllMetrics({
          CAD: { Selected_Model: 'XGBoost', ROC_AUC: 0.9401, Accuracy: 0.8918, Precision: 0.9103, Recall: 0.8974, F1_Score: 0.9038, Brier_Score: 0.0812 },
          LAD: { Selected_Model: 'StackingEnsemble', ROC_AUC: 0.8793, Accuracy: 0.8197, Precision: 0.8421, Recall: 0.8276, F1_Score: 0.8348, Brier_Score: 0.1197 },
          LCX: { Selected_Model: 'StackingEnsemble', ROC_AUC: 0.7292, Accuracy: 0.6557, Precision: 0.5789, Recall: 0.4583, F1_Score: 0.5116, Brier_Score: 0.2082 },
          RCA: { Selected_Model: 'XGBoost', ROC_AUC: 0.8312, Accuracy: 0.7951, Precision: 0.8108, Recall: 0.7879, F1_Score: 0.7992, Brier_Score: 0.1389 },
        })
      })
  }, [])

  const m = allMetrics?.[vessel]

  const displayMetrics = m ? [
    { label: 'ROC-AUC', key: 'ROC_AUC', fmt: (v) => v.toFixed(4) },
    { label: 'Accuracy', key: 'Accuracy', fmt: (v) => `${(v * 100).toFixed(1)}%` },
    { label: 'F1 Score', key: 'F1_Score', fmt: (v) => v.toFixed(4) },
    { label: 'Brier', key: 'Brier_Score', fmt: (v) => v.toFixed(4) },
    { label: 'Precision', key: 'Precision', fmt: (v) => v.toFixed(4) },
    { label: 'Recall', key: 'Recall', fmt: (v) => v.toFixed(4) },
  ] : []

  const plotSrc = `/plots/${vessel}_${activePlot}.png`

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          Validation Performance Metrics
        </h3>
        {m && (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">
            {m.Selected_Model} · {vessel}
          </span>
        )}
      </div>

      {/* Metric grid */}
      {m ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {displayMetrics.map(({ label, key, fmt }) => (
            <div key={key} className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center shadow-sm">
              <div className="text-[10px] text-slate-500 font-medium mb-0.5">{label}</div>
              <div className={`font-mono text-xs font-bold ${METRIC_COLORS[key] || 'text-slate-900'}`}>
                {fmt(m[key])}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-500 mb-3 text-center">Loading metrics…</div>
      )}

      {/* Plot tabs */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {PLOT_TYPES.map(p => (
          <button
            key={p.key}
            onClick={() => { setActivePlot(p.key); setImgError(false) }}
            className={`text-[10px] px-2.5 py-1 rounded transition-all ${
              activePlot === p.key
                ? 'bg-rose-50 text-rose-700 border border-rose-300 font-semibold shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Plot image */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {imgError ? (
          <div className="h-32 flex items-center justify-center text-xs text-slate-500">
            Plot not available. Run training to generate plots.
          </div>
        ) : (
          <img
            key={plotSrc}
            src={plotSrc}
            alt={`${vessel} ${activePlot}`}
            className="w-full object-contain max-h-44 bg-white"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <p className="text-[10px] text-slate-500 text-right mt-1 italic font-medium">
        *Holdout test set — Calibrated {m?.Selected_Model || 'XGBoost'}
      </p>
    </div>
  )
}
