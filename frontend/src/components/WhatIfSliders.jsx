import React, { useState, useEffect, useRef, useCallback } from 'react'

const SLIDERS = [
  { key: 'Age',    label: 'Age',            min: 30, max: 90,  step: 1,   unit: 'yrs', icon: '👤' },
  { key: 'BP',     label: 'Blood Pressure', min: 80, max: 200, step: 1,   unit: 'mmHg', icon: '🩺' },
  { key: 'BMI',    label: 'BMI',            min: 18, max: 45,  step: 0.1, unit: 'kg/m²', icon: '⚖️' },
  { key: 'FBS',    label: 'Fasting Blood Sugar', min: 70, max: 300, step: 1, unit: 'mg/dL', icon: '🩸' },
  { key: 'LDL',    label: 'LDL Cholesterol', min: 50, max: 250, step: 1,   unit: 'mg/dL', icon: '💊' },
  { key: 'HDL',    label: 'HDL Cholesterol', min: 20, max: 100, step: 1,   unit: 'mg/dL', icon: '🛡️' },
  { key: 'EF_TTE', label: 'Ejection Fraction', min: 20, max: 70, step: 1, unit: '%', icon: '💓' },
]

const getRiskColor = (key, val) => {
  if (key === 'BP')     return val > 140 ? '#EF4444' : val > 120 ? '#F59E0B' : '#10B981'
  if (key === 'BMI')    return val > 30 ? '#EF4444' : val > 25 ? '#F59E0B' : '#10B981'
  if (key === 'FBS')    return val > 126 ? '#EF4444' : val > 100 ? '#F59E0B' : '#10B981'
  if (key === 'LDL')    return val > 160 ? '#EF4444' : val > 130 ? '#F59E0B' : '#10B981'
  if (key === 'HDL')    return val < 40 ? '#EF4444' : val < 60 ? '#F59E0B' : '#10B981'
  if (key === 'EF_TTE') return val < 40 ? '#EF4444' : val < 50 ? '#F59E0B' : '#10B981'
  if (key === 'Age')    return val > 70 ? '#EF4444' : val > 55 ? '#F59E0B' : '#10B981'
  return '#60A5FA'
}

export default function WhatIfSliders({ patientData, onWhatIfChange }) {
  const [values, setValues] = useState(() => {
    const init = {}
    SLIDERS.forEach(s => { init[s.key] = s.min + (s.max - s.min) / 2 })
    return init
  })
  const debounceRef = useRef(null)

  // Sync with patient data when it loads
  useEffect(() => {
    if (patientData) {
      const synced = {}
      SLIDERS.forEach(s => {
        synced[s.key] = patientData[s.key] !== undefined ? parseFloat(patientData[s.key]) : values[s.key]
      })
      setValues(synced)
    }
  }, [patientData])

  const handleSlider = useCallback((key, val) => {
    const newVal = parseFloat(parseFloat(val).toFixed(1))
    setValues(prev => ({ ...prev, [key]: newVal }))

    // Debounce API calls by 400ms to avoid flooding
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (onWhatIfChange) onWhatIfChange({ [key]: newVal })
    }, 400)
  }, [onWhatIfChange])

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500 mb-1">
        Adjust sliders to explore counterfactual risk scenarios in real time.
      </p>
      {SLIDERS.map(slider => {
        const val = values[slider.key] ?? slider.min
        const color = getRiskColor(slider.key, val)
        const pct = ((val - slider.min) / (slider.max - slider.min)) * 100

        return (
          <div key={slider.key}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs leading-none">{slider.icon}</span>
                <span className="text-xs font-semibold text-slate-800">{slider.label}</span>
              </div>
              <span
                className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
                style={{ color, background: `${color}12`, borderColor: `${color}30` }}
              >
                {typeof val === 'number' ? val.toFixed(slider.step < 1 ? 1 : 0) : val} {slider.unit}
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={val}
                onChange={e => handleSlider(slider.key, e.target.value)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)`
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
