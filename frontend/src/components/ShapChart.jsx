import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, LabelList
} from 'recharts'
import axios from 'axios'
import { API_URL } from '../config'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value
    return (
      <div className="bg-slate-900/95 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-slate-300 font-semibold mb-1">{payload[0].payload.name}</p>
        <p style={{ color: val > 0 ? '#EF4444' : '#10B981' }}>
          SHAP: <span className="font-mono">{val.toFixed(4)}</span>
        </p>
        <p className="text-slate-500 mt-0.5">{val > 0 ? '▲ Increases risk' : '▼ Decreases risk'}</p>
      </div>
    )
  }
  return null
}

export default function ShapChart({ vessel, patientData }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [baseValue, setBaseValue] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!vessel || !patientData) return
    setLoading(true)
    setError(null)

    axios.post(`${API_URL}/explain/${vessel}`, patientData)
      .then(res => {
        const payload = res.data
        if (payload.error) { setError(payload.error); return }

        setBaseValue(payload.base_value)
        const formatted = Object.entries(payload.shap_values)
          .map(([feat, val]) => {
            // Try to match patient value from data (handle _ vs space naming)
            let actualValue = patientData[feat]
            if (actualValue === undefined) {
              const altKey = Object.keys(patientData).find(
                k => k.replace(/_/g, ' ').toLowerCase() === feat.toLowerCase()
              )
              if (altKey) actualValue = patientData[altKey]
            }
            const suffix = actualValue !== undefined ? ` (${actualValue})` : ''
            return {
              name: `${feat}${suffix}`,
              value: parseFloat(val.toFixed(4)),
              fill: val > 0 ? '#EF4444' : '#10B981'
            }
          })
          .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

        setData(formatted)
      })
      .catch(err => setError(err.response?.data?.detail || err.message || 'Failed to fetch explanation'))
      .finally(() => setLoading(false))
  }, [vessel, patientData])

  if (!vessel) return null

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-xs text-slate-600 py-4 px-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="font-mono">Computing SHAP feature attributions for {vessel}…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-rose-700 py-3 px-4 bg-rose-50 border border-rose-200 rounded-xl font-medium shadow-sm">
        ⚠️ {error}
      </div>
    )
  }

  if (!data.length) return null

  const positive = data.filter(d => d.value > 0)
  const negative = data.filter(d => d.value < 0)

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{vessel} Feature Attribution (XAI)</h3>
          <p className="text-[10px] text-slate-500 font-medium">SHAP attributions &bull; Baseline reference: {baseValue.toFixed(3)}</p>
        </div>
        <div className="flex gap-3 text-[10px] font-medium">
          <span className="flex items-center gap-1 text-rose-700"><span className="w-2 h-2 rounded-sm bg-rose-600 inline-block" />Risk ↑</span>
          <span className="flex items-center gap-1 text-emerald-700"><span className="w-2 h-2 rounded-sm bg-emerald-600 inline-block" />Protective ↓</span>
        </div>
      </div>

      {/* Aligned, Zero-Collision Clinical Attribution List & Horizontal Bars */}
      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
        {data.map((item, idx) => {
          const maxAbs = Math.max(...data.map(d => Math.abs(d.value)), 0.01)
          const pct = Math.min(Math.round((Math.abs(item.value) / maxAbs) * 100), 100)
          const isRisk = item.value > 0

          return (
            <div 
              key={idx}
              className="flex items-center text-xs py-1 px-1.5 rounded hover:bg-slate-100/80 transition-colors group"
            >
              {/* Feature Name & Value (Left aligned) */}
              <div className="w-[145px] shrink-0 font-mono text-[11px] font-semibold text-slate-800 truncate" title={item.name}>
                {item.name}
              </div>

              {/* Protective (Left Bar) */}
              <div className="flex-1 flex justify-end items-center h-4 pr-1.5 border-r border-slate-300">
                {!isRisk && (
                  <div className="flex items-center gap-1.5 justify-end w-full">
                    <span className="text-[10px] font-mono font-bold text-emerald-600 shrink-0">
                      {item.value.toFixed(3)}
                    </span>
                    <div 
                      className="h-3 rounded-l bg-emerald-500 transition-all group-hover:bg-emerald-600"
                      style={{ width: `${pct}%`, maxWidth: '100%' }}
                    />
                  </div>
                )}
              </div>

              {/* Risk (Right Bar) */}
              <div className="flex-1 flex justify-start items-center h-4 pl-1.5 border-l border-slate-300">
                {isRisk && (
                  <div className="flex items-center gap-1.5 justify-start w-full">
                    <div 
                      className="h-3 rounded-r bg-rose-500 transition-all group-hover:bg-rose-600"
                      style={{ width: `${pct}%`, maxWidth: '100%' }}
                    />
                    <span className="text-[10px] font-mono font-bold text-rose-600 shrink-0">
                      +{item.value.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick summary cards with high-contrast text */}
      {positive.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-rose-50/90 rounded-lg p-2.5 border border-rose-200 shadow-sm">
            <div className="text-rose-700 font-bold mb-0.5 text-[11px] uppercase tracking-wide">Top Risk Factor</div>
            <div className="text-slate-900 font-semibold truncate text-xs">{positive[0]?.name}</div>
          </div>
          {negative.length > 0 && (
            <div className="bg-emerald-50/90 rounded-lg p-2.5 border border-emerald-200 shadow-sm">
              <div className="text-emerald-700 font-bold mb-0.5 text-[11px] uppercase tracking-wide">Top Protective</div>
              <div className="text-slate-900 font-semibold truncate text-xs">{negative[0]?.name}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
