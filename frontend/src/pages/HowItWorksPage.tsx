import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import {
  Flame,
  Satellite,
  Target,
  Map as MapIcon,
  BrainCircuit,
  Activity,
  AlertTriangle,
  Search,
  ArrowRight,
  ArrowDown,
  Layers,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { HOTSPOT_COLORS } from '../types/hotspot';

import { Link } from 'react-router-dom';

function StepCard({
  number,
  title,
  icon: Icon,
  description,
  accentColor = '#FF4444',
}: {
  number: number;
  title: string;
  icon: React.ElementType;
  description: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div className="bg-[#0C1520] border border-[#111A26] rounded-2xl p-6 relative overflow-hidden group hover:border-[#1E2D45] transition-all duration-300 shadow-lg">
      <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:opacity-25 transition-opacity pointer-events-none">
        <Icon className="w-24 h-24 text-[#1E2D45]" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs"
            style={{
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}40`,
              color: accentColor,
              borderWidth: '1px',
            }}
          >
            {String(number).padStart(2, '0')}
          </div>
          <h3 className="text-lg font-bold text-[#E8EDF5]">{title}</h3>
        </div>
        <div className="text-sm text-[#7A8FA8] leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  );
}

interface WorkflowNodeProps {
  icon: React.ElementType;
  label: string;
  stepNumber: string;
  delay: number;
  variant?: 'muted' | 'thermal' | 'orange' | 'blue';
}

function WorkflowNode({
  icon: Icon,
  label,
  stepNumber,
  delay,
  variant = 'muted',
}: WorkflowNodeProps) {
  const variantStyles = {
    muted: {
      bg: 'bg-[#080C14]',
      border: 'border-[#1E2D45]',
      icon: 'text-[#7A8FA8]',
      label: 'text-[#5A7090]',
      badge: 'text-[#5A7090] bg-[#111827]',
    },
    thermal: {
      bg: 'bg-[rgba(255,68,68,0.08)]',
      border: 'border-[rgba(255,68,68,0.35)]',
      icon: 'text-[#FF4444]',
      label: 'text-[#FF4444]',
      badge: 'text-[#FF4444] bg-[rgba(255,68,68,0.15)]',
    },
    orange: {
      bg: 'bg-[rgba(255,140,0,0.08)]',
      border: 'border-[rgba(255,140,0,0.35)]',
      icon: 'text-[#FF8C00]',
      label: 'text-[#FF8C00]',
      badge: 'text-[#FF8C00] bg-[rgba(255,140,0,0.15)]',
    },
    blue: {
      bg: 'bg-[rgba(45,125,210,0.08)]',
      border: 'border-[rgba(45,125,210,0.35)]',
      icon: 'text-[#2D7DD2]',
      label: 'text-[#2D7DD2]',
      badge: 'text-[#2D7DD2] bg-[rgba(45,125,210,0.15)]',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className="flex flex-col items-center gap-2.5 w-32 shrink-0 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className={`w-14 h-14 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center shadow-xl relative transition-transform duration-200 hover:scale-105`}>
        <Icon className={`w-6 h-6 ${style.icon}`} />
        <span className={`absolute -top-2 -right-1 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-[#1E2D45] ${style.badge}`}>
          {stepNumber}
        </span>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider text-center px-1 ${style.label}`}>
        {label}
      </span>
    </div>
  );
}

function WorkflowArrow({ hiddenMobile = false, hiddenTablet = false }: { hiddenMobile?: boolean; hiddenTablet?: boolean }) {
  return (
    <div className={`shrink-0 flex items-center justify-center ${hiddenMobile ? 'hidden lg:flex' : 'flex'} ${hiddenTablet ? 'md:hidden lg:flex' : ''}`}>
      <ArrowRight className="hidden lg:block w-4 h-4 text-[#1E2D45]" />
      <ArrowDown className="block lg:hidden w-4 h-4 text-[#1E2D45]" />
    </div>
  );
}

export default function HowItWorksPage(): React.JSX.Element {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#06090F] text-[#D0DAE8] select-none font-sans relative">
      {/* Background subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(#1E2D45 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <Navbar />

      <main className="flex-1 w-full relative z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-20 space-y-24">

          {/* 1. HERO */}
          <section className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Small ThermalTrace Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(255,68,68,0.1)] border border-[rgba(255,68,68,0.25)] text-[#FF4444] text-[11px] font-semibold tracking-wider uppercase">
              <Flame className="w-3.5 h-3.5 text-[#FF4444]" />
              <span>Thermal Intelligence Workflow</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#E8EDF5]">
                How ThermalTrace Works
              </h1>

              <p className="text-lg md:text-xl text-[#94A3B8] max-w-2xl mx-auto font-medium leading-snug">
                From satellite thermal observations to <span className="text-[#E8EDF5] font-semibold">geospatial intelligence</span>.
              </p>
            </div>

            <p className="text-sm md:text-base text-[#CBD5E1] max-w-3xl mx-auto leading-relaxed font-normal">
              ThermalTrace combines NASA FIRMS observations, spatial analysis,
              geographic context, machine learning, activity history, and
              satellite imagery to help operators investigate and prioritize
              thermal activity across India.
            </p>

            {/* Hero Capability Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-2">
              <div className="bg-[#0C1520] border border-[#1E2D45] rounded-xl p-3.5 text-left flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[rgba(255,68,68,0.1)] text-[#FF4444] shrink-0">
                  <Satellite className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#E8EDF5]">Satellite Ingestion</h4>
                  <p className="text-[11px] text-[#8B9BB4] leading-tight mt-0.5">NASA VIIRS & MODIS thermal anomaly feeds</p>
                </div>
              </div>

              <div className="bg-[#0C1520] border border-[#1E2D45] rounded-xl p-3.5 text-left flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[rgba(255,140,0,0.1)] text-[#FF8C00] shrink-0">
                  <MapIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#E8EDF5]">GIS Context</h4>
                  <p className="text-[11px] text-[#8B9BB4] leading-tight mt-0.5">OpenStreetMap infrastructure cross-matching</p>
                </div>
              </div>

              <div className="bg-[#0C1520] border border-[#1E2D45] rounded-xl p-3.5 text-left flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[rgba(45,125,210,0.1)] text-[#2D7DD2] shrink-0">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#E8EDF5]">ML Classification</h4>
                  <p className="text-[11px] text-[#8B9BB4] leading-tight mt-0.5">Industrial, Mining & Natural Fire inference</p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. END-TO-END WORKFLOW DIAGRAM */}
          <section className="py-6 w-full max-w-5xl mx-auto bg-[#080C14]/80 border border-[#111A26] rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <div className="text-center mb-6">
              <span className="text-[10px] font-mono font-bold text-[#5A7090] uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4444]" />
                THERMALTRACE PIPELINE
              </span>
            </div>

            {/* Desktop: Horizontal Flex Wrap */}
            <div className="hidden lg:flex flex-row flex-wrap items-center justify-center gap-3">
              <WorkflowNode icon={Satellite} label="NASA FIRMS" stepNumber="01" delay={100} variant="muted" />
              <WorkflowArrow />
              <WorkflowNode icon={Target} label="Detection" stepNumber="02" delay={200} variant="thermal" />
              <WorkflowArrow />
              <WorkflowNode icon={Layers} label="Grouping" stepNumber="03" delay={300} variant="muted" />
              <WorkflowArrow />
              <WorkflowNode icon={MapIcon} label="Context" stepNumber="04" delay={400} variant="muted" />
              <WorkflowArrow />
              <WorkflowNode icon={BrainCircuit} label="AI Classify" stepNumber="05" delay={500} variant="orange" />
              <WorkflowArrow />
              <WorkflowNode icon={Activity} label="Activity" stepNumber="06" delay={600} variant="muted" />
              <WorkflowArrow />
              <WorkflowNode icon={AlertTriangle} label="Prioritize" stepNumber="07" delay={700} variant="thermal" />
              <WorkflowArrow />
              <WorkflowNode icon={Search} label="Review" stepNumber="08" delay={800} variant="blue" />
            </div>

            {/* Tablet: 2-Column Grid */}
            <div className="hidden md:grid lg:hidden grid-cols-4 gap-y-8 gap-x-4 justify-items-center">
              <WorkflowNode icon={Satellite} label="NASA FIRMS" stepNumber="01" delay={100} variant="muted" />
              <WorkflowNode icon={Target} label="Detection" stepNumber="02" delay={200} variant="thermal" />
              <WorkflowNode icon={Layers} label="Grouping" stepNumber="03" delay={300} variant="muted" />
              <WorkflowNode icon={MapIcon} label="Context" stepNumber="04" delay={400} variant="muted" />
              <WorkflowNode icon={BrainCircuit} label="AI Classify" stepNumber="05" delay={500} variant="orange" />
              <WorkflowNode icon={Activity} label="Activity" stepNumber="06" delay={600} variant="muted" />
              <WorkflowNode icon={AlertTriangle} label="Prioritize" stepNumber="07" delay={700} variant="thermal" />
              <WorkflowNode icon={Search} label="Review" stepNumber="08" delay={800} variant="blue" />
            </div>

            {/* Mobile: Vertical Timeline */}
            <div className="flex md:hidden flex-col items-center gap-4 w-full">
              <WorkflowNode icon={Satellite} label="NASA FIRMS" stepNumber="01" delay={100} variant="muted" />
              <WorkflowArrow />
              <WorkflowNode icon={Target} label="Detection" stepNumber="02" delay={200} variant="thermal" />
              <WorkflowArrow />
              <WorkflowNode icon={Layers} label="Grouping" stepNumber="03" delay={300} variant="muted" />
              <WorkflowArrow />
              <WorkflowNode icon={MapIcon} label="Context" stepNumber="04" delay={400} variant="muted" />
              <WorkflowArrow />
              <WorkflowNode icon={BrainCircuit} label="AI Classify" stepNumber="05" delay={500} variant="orange" />
              <WorkflowArrow />
              <WorkflowNode icon={Activity} label="Activity" stepNumber="06" delay={600} variant="muted" />
              <WorkflowArrow />
              <WorkflowNode icon={AlertTriangle} label="Prioritize" stepNumber="07" delay={700} variant="thermal" />
              <WorkflowArrow />
              <WorkflowNode icon={Search} label="Review" stepNumber="08" delay={800} variant="blue" />
            </div>
          </section>

          {/* 3-9. STEP BY STEP EXPLANATION */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StepCard
              number={1}
              title="Detect Thermal Activity"
              icon={Satellite}
              accentColor="#7A8FA8"
              description={
                <>
                  NASA FIRMS provides satellite-derived thermal anomaly
                  observations. These observations give ThermalTrace the geographic
                  location and thermal characteristics of detected activity.
                  <br /><br />
                  <span className="text-[#94A3B8] italic font-medium">Note:</span> A thermal anomaly observation simply indicates abnormal heat; it does not automatically mean there is a confirmed fire.
                </>
              }
            />

            <StepCard
              number={2}
              title="Turn Detections Into Sources"
              icon={Target}
              accentColor="#FF4444"
              description={
                <>
                  Individual satellite observations can belong to the same physical area or source.
                  ThermalTrace groups spatially related observations so that the platform can analyze
                  a source over time rather than treating every satellite observation as an independent event.
                  <br /><br />
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7A8FA8]" />
                      <span className="text-[#E8EDF5] font-semibold">FIRMS Detections</span>
                      <span className="text-[#5A7090] text-xs">= individual satellite observations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF4444]" />
                      <span className="text-[#E8EDF5] font-semibold">Unique Thermal Sources</span>
                      <span className="text-[#5A7090] text-xs">= spatially grouped source locations</span>
                    </div>
                  </div>
                </>
              }
            />

            <StepCard
              number={3}
              title="Add Geographic Context"
              icon={MapIcon}
              accentColor="#7A8FA8"
              description={
                <>
                  ThermalTrace uses geographic information to understand what exists around a detected thermal source.
                  Examples include industrial areas, power infrastructure, quarries, mining areas, and other mapped facilities.
                  <br /><br />
                  OpenStreetMap provides contextual geographic evidence. Proximity to an industrial facility does not automatically mean the thermal source is industrial; human context remains vital.
                </>
              }
            />

            <StepCard
              number={4}
              title="Classify the Thermal Source"
              icon={BrainCircuit}
              accentColor="#FF8C00"
              description={
                <>
                  The machine-learning system evaluates characteristics of the thermal source and assigns a probabilistic source category.
                  <br /><br />
                  <span className="text-[#E8EDF5] font-semibold block mb-2">Established Classifications:</span>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 bg-[#080C14] px-3 py-1.5 rounded-lg border border-[#161F2E]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: HOTSPOT_COLORS.industrial_thermal_source }} />
                      <span className="text-[#E8EDF5] font-semibold text-xs">Industrial Thermal Source</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-[#080C14] px-3 py-1.5 rounded-lg border border-[#161F2E]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: HOTSPOT_COLORS.mining_thermal_source }} />
                      <span className="text-[#E8EDF5] font-semibold text-xs">Mining Thermal Source</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-[#080C14] px-3 py-1.5 rounded-lg border border-[#161F2E]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: HOTSPOT_COLORS.natural_fire }} />
                      <span className="text-[#E8EDF5] font-semibold text-xs">Natural Fire</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-[#080C14] px-3 py-1.5 rounded-lg border border-[#161F2E]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: HOTSPOT_COLORS.unknown }} />
                      <span className="text-[#E8EDF5] font-semibold text-xs">Unknown / Under Review</span>
                    </div>
                  </div>
                </>
              }
            />

            <StepCard
              number={5}
              title="Understand Source Activity"
              icon={Activity}
              accentColor="#7A8FA8"
              description={
                <>
                  ThermalTrace looks at source activity over time to distinguish newly detected activity from recurring or persistent thermal sources.
                  <br /><br />
                  <div className="flex flex-wrap gap-2 my-1">
                    <span className="px-2.5 py-1 rounded bg-[#080C14] border border-[#162033] text-[#E8EDF5] text-xs font-mono font-semibold">New</span>
                    <span className="px-2.5 py-1 rounded bg-[rgba(255,140,0,0.1)] border border-[rgba(255,140,0,0.25)] text-[#FF8C00] text-xs font-mono font-semibold">Recurring</span>
                    <span className="px-2.5 py-1 rounded bg-[rgba(255,68,68,0.1)] border border-[rgba(255,68,68,0.25)] text-[#FF4444] text-xs font-mono font-semibold">Persistent</span>
                  </div>
                  <br />
                  These are activity characteristics, NOT ML classes. For example, a source can have an activity of <strong>Persistent</strong> while its classification remains <strong>Unknown / Under Review</strong>.
                </>
              }
            />

            <StepCard
              number={6}
              title="Prioritize What Needs Attention"
              icon={AlertTriangle}
              accentColor="#FF4444"
              description={
                <>
                  ThermalTrace combines available signals such as thermal intensity, source activity, persistence, classification, confidence, and geographic context to help surface sources that deserve closer inspection.
                  <br /><br />
                  The platform does not automatically determine that an event is an emergency, nor does it trigger automatic emergency dispatch.
                </>
              }
            />

            <div className="md:col-span-2">
              <StepCard
                number={7}
                title="Investigate With Context"
                icon={Search}
                accentColor="#2D7DD2"
                description={
                  <div className="max-w-3xl">
                    The operator can select a source and inspect its location, thermal characteristics, activity history, classification, confidence, nearby infrastructure, satellite imagery, and alerts.
                    <br /><br />
                    The operator uses these signals together to investigate the event. ThermalTrace supports decision-making rather than replacing human verification.
                  </div>
                }
              />
            </div>
          </section>

          {/* 11. WHY MULTIPLE SIGNALS MATTER */}
          <section className="bg-[#0C1520] border border-[#1E2D45] rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="text-[10px] font-mono font-bold text-[#5A7090] uppercase tracking-widest mb-3">
              INTELLIGENCE SYNTHESIS
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#E8EDF5] mb-6 max-w-xl mx-auto">
              A thermal anomaly alone does not explain its cause.
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs md:text-sm font-medium text-[#7A8FA8] mt-6">
              <span className="bg-[#080C14] px-3.5 py-2 rounded-lg border border-[#161F2E] text-[#E8EDF5]">Thermal Signal</span>
              <span className="text-[#5A7090] font-bold text-sm">+</span>
              <span className="bg-[#080C14] px-3.5 py-2 rounded-lg border border-[#161F2E] text-[#E8EDF5]">Source History</span>
              <span className="text-[#5A7090] font-bold text-sm">+</span>
              <span className="bg-[#080C14] px-3.5 py-2 rounded-lg border border-[#161F2E] text-[#E8EDF5]">Geographic Context</span>
              <span className="text-[#5A7090] font-bold text-sm">+</span>
              <span className="bg-[#080C14] px-3.5 py-2 rounded-lg border border-[#161F2E] text-[#E8EDF5]">Machine Learning</span>
              <span className="text-[#5A7090] font-bold text-sm">+</span>
              <span className="bg-[#080C14] px-3.5 py-2 rounded-lg border border-[#161F2E] text-[#E8EDF5]">Satellite Context</span>
              <span className="text-[#E8EDF5] text-base font-bold mx-1">=</span>
              <span className="bg-[rgba(255,68,68,0.1)] text-[#FF4444] font-semibold px-4 py-2 rounded-lg border border-[rgba(255,68,68,0.3)] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#FF4444]" />
                Better Investigation
              </span>
            </div>
          </section>

          {/* 12. RESPONSIBLE INTERPRETATION */}
          <section className="max-w-3xl mx-auto text-center border-t border-[#111A26] pt-12">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#5A7090] uppercase tracking-widest mb-4">
              <ShieldAlert className="w-3.5 h-3.5 text-[#5A7090]" />
              Responsible Interpretation
            </div>
            <p className="text-sm text-[#7A8FA8] leading-relaxed italic bg-[#080C14] border border-[#111A26] rounded-xl p-5">
              "ThermalTrace identifies and analyzes satellite-observed thermal anomalies. A classification is a model-based assessment, not independent confirmation of the physical cause of an event. Operators should consider source history, geographic context, and satellite imagery when reviewing detections."
            </p>
          </section>

          {/* 13 & 14. DATA FLOW & TECHNOLOGY */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-[#111A26] pt-12 pb-16">
            <div>
              <h3 className="text-xs font-bold text-[#E8EDF5] uppercase tracking-wider mb-5 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FF4444]" />
                Simplified Data Flow
              </h3>
              <div className="font-mono text-xs text-[#7A8FA8] bg-[#080C14] border border-[#111A26] rounded-xl p-5 leading-loose">
                <div className="text-[#E8EDF5]">NASA FIRMS</div>
                <div className="text-[#5A7090] ml-4">↓</div>
                <div>Thermal Observations</div>
                <div className="text-[#5A7090] ml-4">↓</div>
                <div>Thermal Sources <span className="text-[#5A7090]">──────► OpenStreetMap Context</span></div>
                <div className="text-[#5A7090] ml-4">↓</div>
                <div>Machine Learning</div>
                <div className="text-[#5A7090] ml-4">↓</div>
                <div>Activity / Persistence</div>
                <div className="text-[#5A7090] ml-4">↓</div>
                <div>ThermalTrace Dashboard</div>
                <div className="text-[#5A7090] ml-4">↓</div>
                <div className="text-[#FF4444] font-bold">Operator Review</div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-[#E8EDF5] uppercase tracking-wider mb-5 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FF8C00]" />
                Built With
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'NASA FIRMS',
                  'OpenStreetMap',
                  'MapLibre',
                  'PostgreSQL / PostGIS',
                  'Redis',
                  'Node.js / Express',
                  'Python',
                  'XGBoost',
                  'React'
                ].map((tech) => (
                  <span key={tech} className="bg-[#080C14] border border-[#161F2E] px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium text-[#8B9BB4]">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#06090F] border-t border-[#111A26] py-8 text-center text-xs text-[#5A7090] relative z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-center rounded-lg w-5 h-5 bg-[rgba(255,68,68,0.1)] border border-[rgba(255,68,68,0.25)] shrink-0">
              <Flame className="w-3 h-3 text-[#EF4444]" />
            </div>
            <span className="font-bold text-xs tracking-wider text-[#C8D4E3]">
              THERMAL<span className="text-[#EF4444]">TRACE</span>
            </span>
          </Link>
          <p>© 2026 ThermalTrace. Geospatial Thermal Intelligence & Risk Monitoring.</p>
        </div>
      </footer>
    </div>
  );
}
