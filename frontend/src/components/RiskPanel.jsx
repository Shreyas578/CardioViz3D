import React from 'react'

const VESSEL_META = {
  CAD: { label: 'Global CAD Burden', abbr: 'CAD', desc: 'Overall Coronary Artery Disease' },
  LAD: { label: 'Left Anterior Descending', abbr: 'LAD', desc: 'Anterior Myocardium & Septum' },
  LCX: { label: 'Left Circumflex', abbr: 'LCX', desc: 'Lateral & Posterior Left Ventricle' },
  RCA: { label: 'Right Coronary Artery', abbr: 'RCA', desc: 'Right Ventricle & Conduction Nodes' },
}

function RiskBar({ label, data, isActive, onClick }) {
  const prob = data?.probability ?? null
  const isHigh = prob !== null && prob > 0.65
  const isMod = prob !== null && prob > 0.35 && prob <= 0.65
  const color = prob === null ? '#64748B'
    : isHigh ? '#DC2626'
    : isMod ? '#D97706'
    : '#059669'

  const riskLabel = prob === null ? 'PENDING'
    : isHigh ? 'HIGH RISK'
    : isMod ? 'BORDERLINE'
    : 'OPTIMAL'

  const pct = prob !== null ? Math.round(prob * 100) : 0
  const meta = VESSEL_META[label] || { label, abbr: label, desc: '' }

  return (
    <div
      onClick={() => onClick(label)}
      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
        isActive
          ? 'border-rose-500 bg-rose-50/60 shadow-sm ring-1 ring-rose-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
            {meta.abbr}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-900">{meta.label}</span>
              {isActive && (
                <span className="text-[9px] font-mono font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-200">
                  SELECTED
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">{meta.desc}</div>
          </div>
        </div>

        <div className="text-right">
          <span
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
            style={{ background: `${color}14`, color, border: `1px solid ${color}35` }}
          >
            {riskLabel}
          </span>
          <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
            {pct}%
          </div>
        </div>
      </div>

      {/* Probability Gauge Bar */}
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}90, ${color})`
          }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
        <span>0% (Patent)</span>
        <span>Cutoff: 50%</span>
        <span>100% (Critical)</span>
      </div>
    </div>
  )
}

export default function RiskPanel({ predictions, onVesselClick, activeVessel }) {
  if (!predictions) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/60 rounded-xl border border-slate-200 p-4">
        <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-slate-900 text-xs font-semibold">Awaiting Clinical Data Submission</p>
        <p className="text-slate-500 text-[11px] mt-0.5">Select a preset or enter patient values to generate spatial risk</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Hemodynamic Risk Stratification
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500 font-medium">
          Click vessel to inspect
        </span>
      </div>

      <div className="space-y-2.5">
        {Object.entries(predictions).map(([label, data]) => (
          <RiskBar
            key={label}
            label={label}
            data={data}
            isActive={activeVessel === label}
            onClick={onVesselClick}
          />
        ))}
      </div>
    </div>
  )
}
