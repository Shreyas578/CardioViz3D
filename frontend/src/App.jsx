import React, { useState, useEffect, useCallback } from 'react'
import HeartScene from './components/HeartScene'
import PatientForm, { PATIENT_PRESETS } from './components/PatientForm'
import RiskPanel from './components/RiskPanel'
import WhatIfSliders from './components/WhatIfSliders'
import ShapChart from './components/ShapChart'
import MetricsPanel from './components/MetricsPanel'
import ClinicalSummary from './components/ClinicalSummary'
import DisclaimerModal from './components/DisclaimerModal'
import ClinicalReportModal from './components/ClinicalReportModal'
import axios from 'axios'
import { API_URL } from './config'
import './styles/globals.css'

function App() {
  const [patientData, setPatientData] = useState(PATIENT_PRESETS["High-Risk Multi-Vessel"].data)
  const [predictions, setPredictions] = useState(null)
  const [hoveredVessel, setHoveredVessel] = useState(null)
  const [activeVessel, setActiveVessel] = useState('CAD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [consoleTab, setConsoleTab] = useState('risk')

  // Auto-run initial prediction
  useEffect(() => {
    handlePredict(patientData)
  }, [])

  const handlePredict = useCallback(async (data) => {
    setPatientData(data)
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API_URL}/predict`, data)
      setPredictions(res.data)
      if (!activeVessel) setActiveVessel('CAD')
      setError(null)
    } catch (err) {
      console.warn("Backend prediction call failed:", err)
      setError("Backend server is not running on port 8000. Start backend with `python -m uvicorn api.main:app --reload` to fetch live model predictions.")
    } finally {
      setLoading(false)
    }
  }, [activeVessel])

  const handleWhatIf = useCallback(async (modifications) => {
    if (!patientData) return
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/whatif`, {
        patient: patientData,
        modifications
      })
      setPredictions(res.data)
    } catch (err) {
      console.warn("What-If failed:", err)
    } finally {
      setLoading(false)
    }
  }, [patientData])

  const handleVesselClick = useCallback((vessel) => {
    setActiveVessel(vessel)
  }, [])

  const handlePresetSelect = useCallback((presetData) => {
    setPatientData(presetData)
    handlePredict(presetData)
  }, [handlePredict])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900 relative">

      {/* Modals */}
      {showDisclaimer && <DisclaimerModal onAccept={() => setShowDisclaimer(false)} />}
      
      {showReportModal && (
        <ClinicalReportModal
          patient={patientData}
          predictions={predictions}
          activeVessel={activeVessel}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* ── Top Clinical Telemetry Header ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                  CardioViz<span className="text-rose-600">3D</span>
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                  CLINICAL SUITE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Coronary Hemodynamic Stenosis &bull; FMA Anatomical Model
              </p>
            </div>
          </div>

          {/* Patient Quick Vitals Bar */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-50 px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-mono shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Patient:</span>
              <span className="font-semibold text-slate-900">{patientData.Age}y / {patientData.Sex === 'M' ? 'Male' : 'Female'}</span>
            </div>
            <div className="h-3 w-[1px] bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">BP:</span>
              <span className="font-semibold text-slate-900">{patientData.BP || 120} <span className="text-slate-500 text-[10px]">mmHg</span></span>
            </div>
            <div className="h-3 w-[1px] bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Pulse:</span>
              <span className="font-semibold text-rose-600">{patientData.PR || 70} <span className="text-slate-500 text-[10px]">bpm</span></span>
            </div>
            <div className="h-3 w-[1px] bg-slate-300" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">EF:</span>
              <span className={`font-semibold ${patientData.EF_TTE < 45 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {patientData.EF_TTE || 50}%
              </span>
            </div>
            {predictions?.CAD && (
              <>
                <div className="h-3 w-[1px] bg-slate-300" />
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">CAD Risk:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                    predictions.CAD.probability > 0.65 ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  }`}>
                    {(predictions.CAD.probability * 100).toFixed(0)}%
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowDisclaimer(true)}
              className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium border border-transparent hover:border-slate-200"
            >
              Protocol
            </button>
            {predictions && (
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-sm transition-all active:scale-95 text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export Dossier (PDF)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Spacious 2-Column Workstation Layout ── */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Left Stage: 3D Heart Hero & Clinical Localization (7 cols / ~58%) ── */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-5">
          {/* 3D Heart Viewport Box */}
          <div className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-[#0F172A] h-[560px] lg:h-[600px]">
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0B0E14]/75 backdrop-blur-sm">
                <div className="text-center p-5 bg-[#171C28] rounded-xl border border-[#242C3E] shadow-xl">
                  <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-200 text-xs font-medium font-mono tracking-wide">
                    COMPUTING HEMODYNAMIC STENOSIS MAPPING...
                  </p>
                </div>
              </div>
            )}

            {/* Error notice (Non-intrusive) */}
            {error && !loading && (
              <div className="absolute top-16 left-4 right-4 z-20 bg-[#171C28]/95 border border-amber-600/40 rounded-lg p-3 text-xs text-amber-200 shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePredict(patientData)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded text-[11px] font-semibold transition-all active:scale-95"
                  >
                    Connect Now ⚡
                  </button>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-slate-400 hover:text-white px-1.5 py-0.5"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Risk legend in bottom corner */}
            <div className="absolute bottom-16 left-4 z-20 bg-[#121620]/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-[#242C3E] text-xs flex gap-3 shadow-md pointer-events-none">
              <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low (&lt;35%)
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Borderline (35-65%)
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Severe (&gt;65%)
              </div>
            </div>

            <HeartScene
              predictions={predictions}
              patientData={patientData}
              onVesselClick={handleVesselClick}
              hoveredVessel={hoveredVessel}
              setHoveredVessel={setHoveredVessel}
              activeVessel={activeVessel}
            />
          </div>

          {/* Integrated Clinical Findings & Histological Lumen Cutaway */}
          <ClinicalSummary 
            activeVessel={activeVessel} 
            predictions={predictions} 
            patientData={patientData} 
          />
        </div>

        {/* ── Right Column: Clean Tabbed Clinical Command Console (5 cols / ~42%) ── */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-4">
          {/* Console Tab Selector */}
          <div className="bg-white p-1.5 rounded-xl border border-slate-200 flex items-center gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => setConsoleTab('risk')}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                consoleTab === 'risk'
                  ? 'bg-rose-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Risk &amp; Simulation</span>
            </button>

            <button
              type="button"
              onClick={() => setConsoleTab('intake')}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                consoleTab === 'intake'
                  ? 'bg-rose-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Patient Intake</span>
            </button>

            <button
              type="button"
              onClick={() => setConsoleTab('metrics')}
              className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                consoleTab === 'metrics'
                  ? 'bg-rose-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Model Metrics</span>
            </button>
          </div>

          {/* TAB 1: Risk & Counterfactual What-If */}
          {consoleTab === 'risk' && (
            <div className="space-y-4">
              {/* Hemodynamic Risk Dashboard */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <RiskPanel 
                  predictions={predictions} 
                  onVesselClick={handleVesselClick} 
                  activeVessel={activeVessel} 
                />
              </div>

              {/* Counterfactual "What-If" Sliders */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200 text-slate-900 font-semibold text-xs uppercase tracking-wide">
                  <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span>Counterfactual "What-If" Analysis</span>
                </div>
                <WhatIfSliders patientData={patientData} onWhatIfChange={handleWhatIf} />
              </div>

              {/* SHAP Feature Attribution */}
              {activeVessel && ['CAD', 'LAD', 'LCX', 'RCA'].includes(activeVessel) && predictions && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <ShapChart vessel={activeVessel} patientData={patientData} />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Patient Intake & Presets */}
          {consoleTab === 'intake' && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                  <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Clinical Patient Intake</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 font-semibold">54 Clinical Biomarkers</span>
              </div>
              
              <PatientForm
                onPredict={handlePredict}
                loading={loading}
                currentPatient={patientData}
                onPresetSelect={handlePresetSelect}
              />
            </div>
          )}

          {/* TAB 3: Model Metrics & Calibration */}
          {consoleTab === 'metrics' && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <MetricsPanel activeVessel={activeVessel} />
            </div>
          )}
        </div>

      </main>
    </div>
  )
}

export default App
