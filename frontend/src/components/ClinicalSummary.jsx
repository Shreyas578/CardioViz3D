import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import IsolatedVesselScene from './IsolatedVesselScene';

const ANATOMY_DATA = {
  lad: {
    name: "Left Anterior Descending (LAD)",
    desc: "The anterior interventricular artery ('widowmaker') supplies the anterior 2/3 of the interventricular septum, anterior left ventricular free wall, and heart apex. It is the single most critical arterial conduit for global left ventricular stroke volume.",
    impact: {
      low: "Patent anterior perfusion. Normal regional wall motion across the septum and anterior apex with low ischemic probability.",
      moderate: "Borderline flow-limiting stenosis. Potential for demand-induced subendocardial ischemia during exertion or elevated heart rate.",
      high: "Critical stenosis (≥50% cutoff exceeded). Severe threat of acute anterior myocardial infarction, malignant arrhythmias, and acute cardiogenic shock.",
      default: "Stenosis directly endangers anterior left ventricular perfusion and ejection fraction."
    },
    measures: {
      low: "Routine primary prevention: target LDL-C < 70 mg/dL, regular aerobic conditioning, blood pressure < 120/80 mmHg.",
      moderate: "Initiate or intensify high-intensity statin therapy (Atorvastatin 40-80mg), dual antiplatelet evaluation, and stress echocardiogram.",
      high: "Urgent coronary angiography (ICA) with pressure wire FFR/iFR assessment; prepare for percutaneous coronary intervention (PCI) or CABG.",
      default: "Lipid lowering, antiplatelet therapy, and specialized cardiological review."
    }
  },
  lcx: {
    name: "Left Circumflex (LCX)",
    desc: "Courses along the coronary sulcus, delivering blood to the posterolateral left ventricle, anterolateral papillary muscle, and posterior wall through obtuse marginal branches.",
    impact: {
      low: "Normal lateral left ventricular perfusion. Lateral wall contractility preserved.",
      moderate: "Intermediate stenosis risk. May produce exertional angina, atypical chest tightness, or posterolateral wall hypokinesia.",
      high: "Severe circumflex stenosis. Threat of lateral wall transmural infarction, ischemic mitral regurgitation, and impaired left ventricular compliance.",
      default: "Narrowing here threatens lateral left ventricular contractility."
    },
    measures: {
      low: "Guideline-directed preventative cardiovascular wellness.",
      moderate: "Optimize medical therapy: beta-blockers, ACEi/ARB, and strict glycemic control if diabetic.",
      high: "Invasive coronary evaluation; urgent PCI consideration if ischemia is functionally significant on anatomical imaging.",
      default: "Medical therapy optimization and routine ischemic surveillance."
    }
  },
  rca: {
    name: "Right Coronary Artery (RCA)",
    desc: "Originates from the right aortic sinus, traversing the right atrioventricular groove to supply the right ventricle, inferior left ventricular wall, SA node (~60%), and AV node (~90%).",
    impact: {
      low: "Unimpaired right ventricular perfusion and intact intrinsic cardiac electrophysiological pacing pathways.",
      moderate: "Borderline inferior ischemia risk. Potential for stress-induced inferior hypokinesis or early conduction delays.",
      high: "Critical RCA stenosis. High risk of inferior myocardial infarction, right ventricular failure, symptomatic sinus bradycardia, or complete AV nodal block.",
      default: "Severe lesions risk inferior infarction and electrophysiological conduction blocks."
    },
    measures: {
      low: "Standard metabolic health maintenance and annual cardiometabolic review.",
      moderate: "Monitor 12-lead ECG for PR prolongation or inferior ST depression; initiate aggressive lipid-lowering therapy.",
      high: "Immediate invasive coronary angiography with revascularization standby; transcutaneous pacing pads on standby if high-grade AV block occurs.",
      default: "Electrophysiological monitoring and medical risk reduction."
    }
  },
  cad: {
    name: "Systemic Coronary Artery Disease (CAD)",
    desc: "Reflects the global atherosclerotic burden across the entire epicardial coronary arterial tree, indicating systemic plaque vulnerability and diffuse narrowing.",
    impact: {
      low: "Minimal global plaque burden. Systemic microvascular and macrovascular endothelial function appears well-preserved.",
      moderate: "Multifocal sub-critical plaque accumulation throughout the coronary tree. Increased intermediate-term risk of adverse cardiovascular events.",
      high: "Diffuse multi-vessel CAD. High risk of major adverse cardiac events (MACE), myocardial infarction, and ischemic cardiomyopathy.",
      default: "Systemic atherosclerotic risk across the epicardial coronary bed."
    },
    measures: {
      low: "Maintain heart-healthy Mediterranean diet, target BMI 20-25, and annual lipid panel screening.",
      moderate: "Intensive risk factor control: high-intensity statin + Ezetimibe, strict BP control (<130/80 mmHg), and antiplatelet therapy.",
      high: "Heart team evaluation (Interventional Cardiologist + Cardiothoracic Surgeon) for SYNTAX score stratification, guideline-directed medical therapy, and revascularization.",
      default: "Guideline-directed medical therapy and risk factor optimization."
    }
  },
  auricle: {
    name: "Atrial Auricle / Appendage",
    desc: "Muscular, ear-shaped pouch projecting from the atrium (both left and right auricles). Rich in pectinate muscles, it acts as a decompression reservoir during periods of elevated atrial pressure and plays a major role in neurohumoral release of Atrial Natriuretic Peptide (ANP).",
    impact: {
      low: "Normal atrial compliance and physiological chamber volume. Low risk of hemodynamic stasis.",
      moderate: "Atrial dilation or elevated filling pressure may increase intra-auricular blood stasis, especially in patients with hypertension or valvular disease.",
      high: "In clinical settings of atrial fibrillation or heart failure, the left atrial appendage (LAA) is the source of >90% of cardiac thrombi responsible for ischemic stroke.",
      default: "Critical anatomical site for thrombogenesis during rhythm disturbances like atrial fibrillation."
    },
    measures: {
      low: "Maintain regular sinus rhythm surveillance during routine annual examinations.",
      moderate: "Screen for subclinical paroxysmal atrial fibrillation using Holter telemetry; optimize blood pressure to reduce atrial stretch.",
      high: "Evaluate stroke risk using CHA2DS2-VASc score; initiate oral anticoagulation (DOAC) if indicated, or evaluate for Left Atrial Appendage Occlusion (Watchman device).",
      default: "Rhythm monitoring, stroke risk evaluation, and atrial pressure control."
    }
  },
  atrium: {
    name: "Cardiac Atrium (Left / Right)",
    desc: "The receiving chambers of the heart. The right atrium receives deoxygenated blood from the superior and inferior vena cavae, while the left atrium collects oxygenated blood from the pulmonary veins to fill the left ventricle.",
    impact: {
      low: "Normal atrial volumes, low filling pressures, and preserved compliance.",
      moderate: "Mild chamber enlargement (atrial remodeling) from chronic hypertension or diastolic dysfunction.",
      high: "Marked atrial enlargement, high risk of atrial fibrillation, elevated pulmonary capillary wedge pressure, and heart failure with preserved ejection fraction (HFpEF).",
      default: "Atrial remodeling reflects chronic upstream filling pressures."
    },
    measures: {
      low: "Routine preventative blood pressure and cardiovascular surveillance.",
      moderate: "Transthoracic echocardiogram (TTE) to measure Left Atrial Volume Index (LAVI); strict blood pressure management.",
      high: "Aggressive afterload reduction, diuretic therapy if symptomatic congestion is present, and electrophysiological arrhythmia assessment.",
      default: "Echocardiographic monitoring and preload/afterload optimization."
    }
  },
  ventricle: {
    name: "Cardiac Ventricle (Left / Right)",
    desc: "The main muscular pumping engines of the heart. The thick-walled left ventricle generates high pressure to pump systemic blood through the aorta, while the right ventricle propels blood through the pulmonary trunk into the lungs.",
    impact: {
      low: "Preserved ventricular systolic and diastolic mechanics. Normal stroke volume and ejection fraction.",
      moderate: "Regional or global wall motion abnormalities; early eccentric or concentric ventricular hypertrophy.",
      high: "Severe ventricular dysfunction, ischemic cardiomyopathy, marked reduction in ejection fraction (EF < 40%), and high risk of heart failure decompensation.",
      default: "Ventricular performance directly determines systemic cardiac output."
    },
    measures: {
      low: "Promote regular physical activity and maintain normotensive targets.",
      moderate: "Echocardiographic strain imaging; optimize neurohormonal blockade with ACEi/ARB/ARNI and beta-blockers.",
      high: "Guideline-directed medical therapy for heart failure (Quadruple Therapy: SGLT2i, ARNI, Beta-blocker, MRA); consider ICD/CRT device evaluation.",
      default: "Guideline-directed heart failure therapy and cardiac imaging follow-up."
    }
  },
  aorta: {
    name: "Aorta & Aortic Root",
    desc: "The principal high-pressure elastic arterial trunk carrying oxygenated blood from the left ventricle to the entire systemic circulation. Originates at the aortic bulb and ascending aorta.",
    impact: {
      low: "Normal aortic root dimensions and physiological vascular compliance without aneurysm or ectasia.",
      moderate: "Increased aortic stiffness and central pulse pressure; potential for mild ascending aortic dilation.",
      high: "Aortic root enlargement, risk of aortic dissection, severe calcification, or compromised coronary ostial inflow.",
      default: "Central vascular conduit; vulnerability to atherosclerosis and mechanical wall stress."
    },
    measures: {
      low: "Routine cardiovascular risk factor management.",
      moderate: "Echocardiographic aortic root measurement; strict blood pressure control to reduce mechanical shear stress.",
      high: "CT angiography / MRI aortogram for surgical threshold monitoring; strict beta-blocker therapy to minimize aortic dP/dt.",
      default: "Vascular imaging surveillance and strict hemodynamic pressure targets."
    }
  },
  valve: {
    name: "Cardiac Valve (Aortic / Mitral / Tricuspid / Pulmonary)",
    desc: "Fibrous endothelial leaflets ensuring strictly unidirectional blood flow through the heart chambers during the systolic and diastolic cardiac cycle.",
    impact: {
      low: "Coaptation is complete without hemodynamically significant regurgitation or stenosis.",
      moderate: "Mild-to-moderate valvular sclerosis, annular calcification, or regurgitant jet impacting chamber volume.",
      high: "Severe stenotic or regurgitant valve disease causing progressive ventricular remodeling, pulmonary hypertension, and heart failure.",
      default: "Valvular integrity preserves forward flow efficiency and prevents chamber volume overload."
    },
    measures: {
      low: "Standard auscultation during annual physical exam.",
      moderate: "Transthoracic echocardiogram with continuous Doppler gradient quantification every 1-2 years.",
      high: "Cardiology heart valve team consultation; evaluate for transcatheter or surgical repair/replacement (TAVR, SAVR, MitraClip).",
      default: "Doppler echocardiography monitoring and surgical/transcatheter intervention assessment."
    }
  },
  septum: {
    name: "Interventricular / Interatrial Septum",
    desc: "The muscular and membranous partition separating the left and right cardiac chambers, carrying essential conduction fascicles of the His-Purkinje network.",
    impact: {
      low: "Structurally intact septum with normal synchrony and conduction velocity.",
      moderate: "Septal hypertrophy (concentric remodeling) or localized septal hypokinesia from anterior LAD hypoperfusion.",
      high: "Severe septal ischemia, bundle branch block, or life-threatening ventricular septal defect (VSD) in the setting of acute infarction.",
      default: "Separates cardiac hemodynamics and houses electrical conduction branches."
    },
    measures: {
      low: "Standard cardiac preventative care.",
      moderate: "12-lead ECG analysis for intraventricular conduction delays; optimization of antihypertensive medications.",
      high: "Coronary revascularization of septal perforator branches; electrophysiological consultation for conduction system pacing.",
      default: "Electrocardiographic monitoring and coronary perfusion optimization."
    }
  },
  conduction: {
    name: "Cardiac Conduction System (SA / AV Node & Bundles)",
    desc: "The specialized neuromuscular pathway (Sinoatrial node, AV node, Bundle of His, Purkinje network) responsible for the rhythmic generation and propagation of electrical impulses that trigger coordinated myocardial contraction.",
    impact: {
      low: "Normal intrinsic pacing and rapid, synchronized atrioventricular electrical conduction.",
      moderate: "First-degree AV block, sinus bradycardia, or fascicular block due to nodal ischemia or metabolic disturbance.",
      high: "High-grade AV block (Mobitz II or complete 3rd degree), sinus arrest, or malignant ventricular tachyarrhythmias.",
      default: "Coordinates cardiac chronotropic and inotropic contraction."
    },
    measures: {
      low: "Maintain electrolyte balance (Potassium, Magnesium) and physiological heart rate.",
      moderate: "Review nodal-blocking medications (beta-blockers, CCBs, Digoxin); 24-hour Holter monitoring.",
      high: "Continuous telemetry monitoring; immediate temporary pacing standby; evaluate indication for permanent pacemaker (PPM) or ICD.",
      default: "Continuous telemetry monitoring and pacemaker evaluation."
    }
  }
};

export default function ClinicalSummary({ activeVessel, predictions, patientData }) {
  const [insight, setInsight] = useState('');

  const isTarget = activeVessel && ['CAD', 'LAD', 'LCX', 'RCA'].includes(activeVessel);

  useEffect(() => {
    if (!activeVessel || !predictions || !patientData) return;

    const vesselKey = isTarget ? activeVessel : 'CAD';
    const prob = predictions[vesselKey]?.probability || 0;
    const probPct = (prob * 100).toFixed(0);

    const bp = patientData.BP || 120;
    const age = patientData.Age || 50;
    const ef = patientData.EF_TTE || 55;
    const dm = patientData.DM === 'Y' || patientData.DM === 1;
    const smoker = patientData.Current_Smoker === 'Y' || patientData.Current_Smoker === 1;

    let text = `Model estimated ${probPct}% stenosis risk for ${vesselKey}. `;
    if (prob > 0.65) {
      text += `Key contributors include BP ${bp} mmHg, EF ${ef}%, ${dm ? 'Diabetes Mellitus, ' : ''}${smoker ? 'active smoking history' : 'age ' + age}. Immediate clinical review recommended.`;
    } else if (prob > 0.35) {
      text += `Intermediate profile. Modifiable risk factors (BP ${bp}, lifestyle) warrant proactive management.`;
    } else {
      text += `Low predicted burden. Preserved ventricular function (EF ${ef}%) and stable hemodynamics.`;
    }

    setInsight(text);
  }, [activeVessel, predictions, patientData, isTarget]);

  if (!activeVessel) return null;

  const searchKey = activeVessel.toLowerCase();
  let matchedData = null;
  if (ANATOMY_DATA[searchKey]) {
    matchedData = ANATOMY_DATA[searchKey];
  } else {
    for (const [key, data] of Object.entries(ANATOMY_DATA)) {
      if (searchKey.includes(key)) {
        matchedData = data;
        break;
      }
    }
  }

  const info = matchedData || {
    name: activeVessel.replace(/_/g, ' '),
    desc: `Anatomical component within the cardiovascular tree, spatial reference active.`,
    impact: { default: "Structural landmark visualized within the 3D model." },
    measures: { default: "General cardiovascular risk maintenance." }
  };

  const evaluationVessel = isTarget ? activeVessel : 'CAD';
  const prob = predictions?.[evaluationVessel]?.probability ?? null;
  
  let severityKey = 'default';
  let severityLabel = 'Normal';

  if (prob !== null) {
    if (prob > 0.65) {
      severityKey = 'high';
      severityLabel = 'High Stenosis Risk';
    } else if (prob > 0.35) {
      severityKey = 'moderate';
      severityLabel = 'Borderline';
    } else {
      severityKey = 'low';
      severityLabel = 'Optimal / Low Risk';
    }
  }

  const impactText = info.impact[severityKey] || info.impact.default;
  const measuresText = info.measures[severityKey] || info.measures.default;

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            ANATOMICAL LOCALIZATION
          </span>
          <h4 className="text-base font-bold text-slate-900 capitalize leading-tight">{info.name}</h4>
        </div>
        {prob !== null && (
          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
            severityKey === 'high' 
              ? 'bg-rose-50 text-rose-700 border-rose-200' 
              : severityKey === 'moderate'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {severityLabel} ({(prob * 100).toFixed(0)}%)
          </span>
        )}
      </div>

      {/* Dedicated 3D Model Focus & Histological Lumen Cutaway for Selected Part */}
      <IsolatedVesselScene activeVessel={activeVessel} predictions={predictions} />

      {/* Structured Clinical Text with High-Contrast Medical Styling */}
      <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Anatomical Territory &amp; Function</span>
          </div>
          <p className="text-slate-600 pl-5">{info.desc}</p>
        </div>

        {insight && (
          <div className="pt-3 border-t border-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span>Patient AI Risk Synthesis</span>
            </div>
            <p className="text-slate-700 pl-5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">{insight}</p>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 space-y-1">
          <div className="flex items-center gap-2 text-rose-700 font-bold uppercase tracking-wider text-[11px]">
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>Hemodynamic Impact &amp; Clinical Risks</span>
          </div>
          <p className="text-slate-600 pl-5">{impactText}</p>
        </div>

        <div className="pt-3 border-t border-slate-200 space-y-1">
          <div className="flex items-center gap-2 text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Evidence-Based Clinical Guidance</span>
          </div>
          <p className="text-slate-600 pl-5">{measuresText}</p>
        </div>
      </div>
    </div>
  );
}
