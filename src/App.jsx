import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus, Play, Terminal, AlertTriangle,
  Lightbulb, Mic, CheckCircle, Trash2, Zap,
  ChevronDown, ArrowUp, Sparkles, Activity,
  PanelLeft, ChevronLeft, ChevronRight, Monitor,
  RotateCw, Share, Copy
} from 'lucide-react';
import { generatePlan, replanTask, getTaskGuidance } from './gemini';
import { useVoice } from './hooks/useVoice';
import { Logo } from './components/Logo';
import { ScaledDashboard } from './components/ScaledDashboard';
import Antigravity from './components/Antigravity';
import './index.css';

// --- TELEMETRY COLOR STYLES ---
const getMissionStatus = (tasks) => {
  if (tasks.length === 0) return { label: "SYSTEM STANDBY", color: "text-slate-400 border-white/5 bg-white/[0.02]" };
  const allSubtasks = tasks.flatMap(t => t.subtasks);
  const doneCount = allSubtasks.filter(st => st.status === 'done').length;
  const total = allSubtasks.length;
  if (doneCount === total && total > 0) return { label: "MISSION SECURED", color: "text-emerald-400 border-emerald-500/10 bg-emerald-500/5 shadow-[0_0_10px_rgba(16,185,129,0.15)]" };
  return { label: `EXECUTING: ${doneCount}/${total}_NODES`, color: "text-blue-400 border-white/10 bg-white/[0.02]" };
};

const calculateTimeline = (subtasks) => {
  let currentTime = new Date();
  return subtasks.map(st => {
    const startTime = new Date(currentTime);
    const endTime = new Date(currentTime.getTime() + st.duration_mins * 60000);
    currentTime = new Date(endTime.getTime());
    return {
      ...st,
      scheduledStart: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      scheduledEnd: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    };
  });
};

function App() {
  // --- 1. STATES ---
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('agent_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('agent_logs');
    return saved ? JSON.parse(saved) : ["Orbit Dashboard ready. Standing by..."];
  });
  const [input, setInput] = useState({ goal: '', deadline: '', context: '' });
  const [heroInput, setHeroInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState(null);
  const [isGuidanceLoading, setIsGuidanceLoading] = useState(false);
  const [isListeningUI, setIsListeningUI] = useState(false);

  // Fluctuating HUD Telemetries
  const [coords, setCoords] = useState({ lat: "45.0933", alt: "108.433" });
  useEffect(() => {
    const interval = setInterval(() => {
      setCoords({
        lat: (45 + Math.random() * 0.05).toFixed(4),
        alt: (108 + Math.random() * 0.2).toFixed(3)
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // --- 2. VOICE CAPTURE ---
  const { startListening } = useVoice((text) => {
    setHeroInput(text);
    setInput(prev => ({ ...prev, goal: text }));
    addLog(`Perception Module: Voice goal parsed: "${text}"`);
  }, setIsListeningUI);

  useEffect(() => {
    localStorage.setItem('agent_tasks', JSON.stringify(tasks));
    localStorage.setItem('agent_logs', JSON.stringify(logs));
  }, [tasks, logs]);

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString([], { hour12: false })}] ${msg}`, ...prev]);

  // --- 3. TRAJECTORY ENGINE ---
  const handleCreatePlan = async (goalToUse) => {
    const targetGoal = goalToUse || input.goal;
    if (!targetGoal) return;
    setLoading(true);
    addLog(`Initiating system trajectory mapping: "${targetGoal}"`);
    try {
      const deadlineToUse = input.deadline || "Within 7 Days";
      const rawSubtasks = await generatePlan(targetGoal, deadlineToUse, input.context);
      const subtasksWithTime = calculateTimeline(rawSubtasks);
      const newTask = {
        id: uuidv4(),
        goal: targetGoal,
        deadline: deadlineToUse,
        context: input.context,
        status: 'active',
        subtasks: subtasksWithTime.map(s => ({ ...s, id: uuidv4(), status: 'pending' })),
        intervention: null
      };
      setTasks([newTask]);
      addLog(`Success: Tactical schedule verified.`);
      setInput({ goal: '', deadline: '', context: '' });
      setHeroInput('');
    } catch (error) {
      addLog('Error: Trajectory computation aborted.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = (taskId, subtaskId) => {
    addLog('Subtask verification: COMPLETE.');
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map(st => st.id === subtaskId ? { ...st, status: 'done' } : st)
        };
      }
      return t;
    }));
  };

  // DETOUR-INSERTION handleStuck LOGIC
  const handleStuck = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const subtask = task.subtasks.find(st => st.id === subtaskId);
    setLoading(true);
    addLog(`ALERT: Anomaly flagged at "${subtask.title}"`);

    try {
      const result = await replanTask(task.subtasks, subtask.title, 'System Anomaly');
      const stuckIndex = task.subtasks.findIndex(st => st.id === subtaskId);

      // PRESERVE THE PAST
      const preservedBefore = task.subtasks.slice(0, stuckIndex);

      // PRESERVE THE FUTURE
      const preservedAfter = task.subtasks.slice(stuckIndex + 1);

      // MAP THE NEW RECOVERY STEPS
      const newSubtasks = result.updatedSubtasks.map(s => ({
        ...s,
        id: uuidv4(),
        status: 'pending'
      }));

      // COMBINE IN ORDER
      const mergedSubtasks = [...preservedBefore, ...newSubtasks, ...preservedAfter];
      const updatedWithTime = calculateTimeline(mergedSubtasks);

      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: updatedWithTime,
            intervention: result.intervention
          };
        }
        return t;
      }));

      addLog('Route recalibrated. Backup trajectory successfully merged.');
    } catch (error) {
      addLog('Error: Recalibration modules offline.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteIntervention = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const text = task.intervention;

    // Real Action: Copy to clipboard
    navigator.clipboard.writeText(text);

    addLog("AGENT ACTION: Intervention text copied to clipboard.");
    addLog("SYSTEM: Launching external communication protocol...");

    // Open Mail client with the draft
    window.location.href = `mailto:?subject=Project Alert: ${task.goal}&body=${encodeURIComponent(text)}`;

    setTimeout(() => {
      addLog("SUCCESS: Intervention deployed and archived.");
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return { ...t, intervention: null };
        }
        return t;
      }));
    }, 1500);
  };

  const handleGuideMe = async (subtaskTitle, taskContext) => {
    setIsGuidanceLoading(true);
    addLog("Searching Knowledge Database...");
    try {
      const tip = await getTaskGuidance(subtaskTitle, taskContext);
      setGuidance({ title: subtaskTitle, text: tip });
    } catch (error) {
      addLog('Error: Database search timed out.');
    } finally {
      setIsGuidanceLoading(false);
    }
  };

  const clearAll = () => {
    if (window.confirm("Purge memory bank systems?")) {
      setTasks([]);
      setLogs(["Console cleared. Offline standby."]);
      localStorage.clear();
    }
  };

  const downloadMissionDebrief = () => {
    if (tasks.length === 0) return;
    const reportHeader = `--- ORBIT CONSOLE COORD-REPORT ---\nGenerated: ${new Date().toLocaleString()}\n`;
    const missionDetails = tasks.map(t => `OBJECTIVE: ${t.goal}\nTIMELINE:\n${t.subtasks.map(s => `[${s.status === 'done' ? 'X' : ' '}] ${s.title} (${s.scheduledStart})`).join('\n')}`).join('\n---\n');
    const blob = new Blob([reportHeader + missionDetails], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Orbit_Telemetry.txt`;
    link.click();
    addLog("SYSTEM: Mission Debrief exported successfully.");
  };

  // --- ANTIGRAVITY COLOR ENGINES ---
  const currentStatus = getMissionStatus(tasks).label;
  let themeSpeed = 0.2;
  let particleColor = "#00f0ff"; // Default Orbit Blue

  if (currentStatus === "MISSION SECURED" || currentStatus === "MISSION COMPLETE") {
    themeSpeed = 0.05;
    particleColor = "#10b981"; // Success Green
  } else if (tasks.some(t => t.intervention)) {
    themeSpeed = 1.3;
    particleColor = "#ffaa00"; // Alert Amber
  }

  // PURE BOOLEAN SUCCESS METRIC (IMMUNE TO STRING ERRORS!)
  const isMissionSecured = tasks.length > 0 && tasks.every(t => t.subtasks.every(st => st.status === 'done'));

  const allSubtasks = tasks.flatMap(t => t.subtasks);
  const doneCount = allSubtasks.filter(s => s.status === 'done').length;
  const progressPercent = allSubtasks.length > 0 ? Math.round((doneCount / allSubtasks.length) * 100) : 0;

  return (
    <div
      className="relative min-h-[100svh] overflow-x-hidden overflow-y-auto bg-cover bg-center flex flex-col justify-between"
      style={{
        backgroundImage: `url('https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260611_133301_d5f2a94a-b22e-4e4a-a6b6-eacdddf1f5b0.png&w=1280&q=85')`
      }}
    >
      {/* GLOBAL SCIFI GRID OVERLAY */}
      <div className="scifi-grid" />

      {/* THE GRASS OVERLAY SHADER */}
      <img
        src="https://res.cloudinary.com/dy5er7kv5/image/upload/q_auto/f_auto/v1781191264/grass_eam204.png"
        className="pointer-events-none absolute bottom-0 left-0 z-10 w-full select-none"
        alt="Ground shader"
      />

      {/* ANTIGRAVITY TELEMETRY FIELD */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none', overflow: 'hidden', opacity: 0.22 }}>
        <Antigravity
          count={180}
          magnetRadius={10}
          ringRadius={20}
          waveSpeed={themeSpeed}
          waveAmplitude={2}
          particleSize={1.2}
          lerpSpeed={0.06}
          color={particleColor}
          autoAnimate
          particleVariance={1.3}
          rotationSpeed={0.12}
          depthFactor={1.3}
          pulseSpeed={0.5}
          particleShape="capsule"
          fieldStrength={8}
        />
      </div>

      <div className="scanline" />

      {/* NAVBAR */}
      <nav className="animate-fade-down relative z-20 w-full px-5 sm:px-8 lg:px-10 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-gray-900">
            <Logo className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase">AGENT_ORBIT</span>
          </div>

          <button onClick={clearAll} className="bg-gray-900 text-white text-[11px] font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition-colors uppercase tracking-widest shadow">
            Purge Deck
          </button>
        </div>
      </nav>

      {/* LANDING CONTENT MATRIX */}
      <div className="flex-1 min-h-8 sm:min-h-12 lg:min-h-16 shrink-0" />

      <div className="relative z-10 max-w-4xl mx-auto w-full px-5 sm:px-8 text-center flex flex-col items-center">
        <h1 className="text-gray-900 font-normal leading-[1.05] tracking-tight text-[40px] min-[400px]:text-[44px] sm:text-6xl lg:text-7xl xl:text-[80px]">
          <span className="block animate-fade-up">Deploy Agent.</span>
          <span className="block animate-fade-up [animation-delay:100ms] text-gray-800">Optimize Trajectory.</span>
        </h1>

        {/* HERO SEARCH DECK */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreatePlan(heroInput); // Call plan creation on enter
          }}
          className="animate-fade-up [animation-delay:220ms] mt-5 sm:mt-6 w-full max-w-xl"
        >
          <div className="flex items-center gap-3 rounded-full bg-white/70 backdrop-blur-md ring-1 ring-gray-200/50 pl-5 pr-1.5 py-1.5 shadow-lg shadow-gray-200/5">
            <input
              type="text"
              placeholder="Input primary mission trajectory..."
              value={heroInput}
              onChange={(e) => {
                setHeroInput(e.target.value);
                setInput(prev => ({ ...prev, goal: e.target.value }));
              }}
              style={{ background: 'transparent', border: 'none' }}
              className="flex-1 bg-transparent text-sm sm:text-base text-gray-900 placeholder-gray-500 outline-none py-2"
            />

            {/* INTEGRATED MIC TRIGGER */}
            <button
              type="button"
              onClick={startListening}
              className={`p-2 rounded-full transition-all flex items-center justify-center ${isListeningUI ? 'bg-red-500 text-white animate-bounce' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              <Mic className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>

            <button
              type="submit"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-900 text-white hover:scale-105 active:scale-95 transition-transform shrink-0 flex items-center justify-center shadow-md animate-pulse cursor-pointer"
            >
              <ArrowUp className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </form>

        <p className="animate-fade-up [animation-delay:340ms] mt-4 sm:mt-5 text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed max-w-md">
          Calculate scheduled workflows automatically -- and trigger <Sparkles className="inline w-4 h-4 -mt-1 text-amber-500 animate-pulse" /> Self-Healing backup intervention protocols
        </p>
      </div>

      <div className="flex-1 min-h-10 sm:min-h-12 lg:min-h-16 shrink-0" />

      {/* MOBILE NATIVE CONSOLE VIEWPORT (Only visible on screens < lg) */}
      <div className="block lg:hidden w-[92%] max-w-xl mx-auto space-y-6 relative z-20 mb-16">

        {/* MOBILE HUD STATUS PANEL (UPDATED TO GLASS DESIGN) */}
        <div className="flex justify-between items-center p-4 glass-card text-[10px] font-black uppercase tracking-widest text-[#00f0ff] bg-cyan-950/10">
          <div className="flex items-center gap-3">
            <span>Decks: {getMissionStatus(tasks).label}</span>
            <span className="text-slate-500 font-bold">LAT: {coords.lat}°</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </div>

        {/* MOBILE ACTIVE TRAJECTORY PLAN */}
        {tasks.length === 0 ? (
          /* UPDATED TO SEMI-TRANSPARENT GLASS STATE CARD */
          <div className="glass-card border-dashed border-white/10 rounded-xl h-44 flex flex-col items-center justify-center text-white/40 font-bold text-[8px] uppercase tracking-wider">
            <Terminal size={18} className="mb-2 opacity-20" />
            No Trajectory Active
          </div>
        ) : (
          tasks.map(t => (
            <div key={t.id} className="glass-card overflow-hidden bg-slate-950/50 border-white/5 p-4 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white border-b border-white/5 pb-2">
                {t.goal}
              </h3>
              <div className="space-y-3">
                {t.subtasks.map((st, index) => (
                  <div key={st.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] relative">
                    {t.subtasks.find(s => s.status === 'pending')?.id === st.id && (
                      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-400 shadow-[0_0_10px_#00f0ff] animate-pulse" />
                    )}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-[8px] font-black mb-1">
                          <span className="bg-white/5 border border-white/10 text-white px-1.5 py-0.2 rounded uppercase">NODE 0{index + 1}</span>
                          <span className="text-slate-600">{st.scheduledStart}</span>
                        </div>
                        <p className={`text-xs mt-1 ${st.status === 'done' ? 'line-through text-slate-700' : 'text-slate-200'}`}>
                          {st.title}
                        </p>
                      </div>
                      <button onClick={() => handleGuideMe(st.title, t.context)} className="p-1.5 text-slate-500 hover:text-cyan-400"><Lightbulb size={14} /></button>
                    </div>
                    {st.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => handleMarkDone(t.id, st.id)} className="flex-1 text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 py-2 rounded-lg font-bold">DONE</button>
                        <button onClick={() => handleStuck(t.id, st.id)} className="flex-1 text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 py-2 rounded-lg font-bold">STUCK</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {t.intervention && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg mt-3">
                  <p className="text-[9px] italic text-amber-200/70 mb-3">"{t.intervention}"</p>
                  <button onClick={() => handleExecuteIntervention(t.id)} className="w-full bg-amber-500 text-black py-2 rounded text-[9px] font-bold">DEPLOY_CORRECTION</button>
                </div>
              )}
            </div>
          ))
        )}

        {/* MOBILE REAL-TIME TELEMETRY LOGS (UPDATED TO GLASS DESIGN) */}
        <div className="premium-terminal p-4 h-64 flex flex-col justify-between">
          <span className="text-yellow-500 text-[9px] font-black uppercase tracking-wider mb-2">[ log_history ]</span>
          <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[8px] leading-relaxed text-slate-500 h-full">
            {logs.slice(0, 15).map((log, i) => {
              const isAgent = log.includes('Anomaly') || log.includes('Traj') || log.includes('Success');
              return (
                <div key={i} className={`flex gap-1.5 border-l pl-1.5 ${isAgent ? 'border-cyan-500/40' : 'border-white/5'}`}>
                  <span className={isAgent ? 'text-cyan-400' : 'text-slate-400'}>{log.split(']')[1]}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* LOWER DESKTOP RESPONSIVE MOCKUP WINDOW (Only visible on screens >= lg) */}
      <div className="hidden lg:block animate-hero-rise [animation-delay:620ms] relative z-20 w-[92%] sm:w-[84%] lg:w-[72%] max-w-4xl mx-auto shrink-0 -mb-10 sm:-mb-20 lg:-mb-32">
        <ScaledDashboard>

          {/* THE MOCK BROWSER CHROME FRAME */}
          <div className="rounded-t-2xl overflow-hidden bg-[#1a1a1c] shadow-[0_-20px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/10 text-left w-full h-[540px] flex flex-col">

            {/* CHROME HEADER PANEL */}
            <div className="bg-[#242427] border-b border-white/5 px-4 py-2.5 flex items-center justify-between gap-4 select-none shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>

              <div className="flex items-center gap-4">
                <PanelLeft className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors" />
                <div className="flex items-center gap-2">
                  <ChevronLeft className="w-3.5 h-3.5 text-white/40" />
                  <ChevronRight className="w-3.5 h-3.5 text-white/25" />
                </div>
              </div>

              {/* CENTER COMPONENT TELEMETRIES */}
              <div className="flex-1 max-w-sm bg-[#1a1a1c] rounded-md px-6 py-1 text-[10px] text-white/60 flex items-center justify-center gap-1.5 ring-1 ring-white/5">
                <Monitor className="w-3 h-3 text-white/30" />
                <span className="tracking-widest">agent.orbit.deck</span>
              </div>

              <div className="flex items-center gap-3">
                <RotateCw className="w-3.5 h-3.5 text-white/40" />
                <Share className="w-3.5 h-3.5 text-white/40" />
                <Copy className="w-3.5 h-3.5 text-white/40" />
              </div>
            </div>

            {/* INTEGRATED LIVE DASHBOARD VIEW (NOW SEMI-TRANSPARENT BLUE TINT!) */}
            <div className="flex flex-1 min-h-0 bg-[#0a0f1d]/45 backdrop-blur-md relative z-10">
              <div className="relative flex flex-col h-full w-full p-4 overflow-y-auto">

                {/* HUD STATUS PANEL */}
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3 text-[10px] font-black tracking-widest text-white uppercase">
                  <div className="flex items-center gap-3">
                    <span>DECKS: {getMissionStatus(tasks).label}</span>
                    <div className="flex gap-3 text-[8px] text-white/40">
                      <span>LAT: {coords.lat}°N</span>
                      <span>ALT: {coords.alt}km</span>
                    </div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                </div>

                {/* THE BENTO CONTAINER WORKSPACE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">

                  {/* LEFT: MANUAL CONTROL INPUT */}
                  <div className="lg:col-span-4 glass-card p-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[9px] font-black tracking-widest text-white uppercase">[ manual_input_deck ]</h4>
                        <p className="text-[8px] text-white/35 uppercase mt-0.5">trajectory adjustments</p>
                      </div>

                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            className="glass-input w-full p-2.5 text-[10px] outline-none"
                            placeholder="Goal statement sequence..."
                            value={input.goal}
                            onChange={(e) => setInput({ ...input, goal: e.target.value })}
                          />
                        </div>
                        <input type="datetime-local" className="glass-input w-full p-2 text-[10px] outline-none text-slate-400" value={input.deadline} onChange={(e) => setInput({ ...input, deadline: e.target.value })} />
                      </div>
                    </div>

                    <button
                      onClick={() => handleCreatePlan()}
                      disabled={loading || !input.goal}
                      className="w-full mt-3 bg-white/5 border border-white/10 hover:bg-white/15 text-white py-2.5 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer"
                    >
                      {loading ? "MAPPING..." : "DEPLOY_DECK"}
                    </button>
                  </div>

                  {/* CENTER: TIMELINE MONITOR */}
                  <div className="lg:col-span-5 flex flex-col min-h-0 overflow-y-auto">
                    {tasks.length === 0 && (
                      /* UPDATED TO SEMI-TRANSPARENT GLASS CARD FOR DESKTOP */
                      <div className="glass-card border-dashed border-white/10 rounded-xl h-full flex flex-col items-center justify-center text-white/30 font-bold text-[8px] uppercase tracking-wider">
                        Trajectory Inactive
                      </div>
                    )}
                    {tasks.map(t => (
                      <div key={t.id} className="glass-card overflow-hidden border-white/5 p-3 h-full overflow-y-auto">
                        <div className="space-y-2">
                          {t.subtasks.map((st, index) => (
                            <div key={st.id} className="group relative p-2.5 rounded border border-white/5 bg-white/[0.01] hover:border-white/15 transition-all">
                              {t.subtasks.find(s => s.status === 'pending')?.id === st.id && (
                                <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-cyan-400 shadow-[0_0_10px_#00f0ff] animate-pulse" />
                              )}
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 text-[7px] font-black">
                                    <span className="bg-white/5 border border-white/10 text-white px-1.5 py-0.2 rounded uppercase">NODE 0{index + 1}</span>
                                    <span className="text-slate-600">{st.scheduledStart} — {st.scheduledEnd}</span>
                                  </div>

                                  {/* THE TEXT WRAP OVERRIDE - NO CHIPPED TEXT OR TRUNCATION */}
                                  <span className="text-[10px] whitespace-normal break-words block leading-relaxed text-slate-200">
                                    {st.title}
                                  </span>
                                </div>
                                <button onClick={() => handleGuideMe(st.title, t.context)} className="p-1 text-slate-600 hover:text-cyan-400 transition-colors">
                                  <Lightbulb size={10} />
                                </button>
                              </div>
                              {st.status === 'pending' && (
                                <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleMarkDone(t.id, st.id)} className="flex-1 text-[7px] bg-green-500/5 text-green-400 border border-green-500/10 py-1 rounded font-bold cursor-pointer">DONE</button>
                                  <button onClick={() => handleStuck(t.id, st.id)} className="flex-1 text-[7px] bg-amber-500/5 text-amber-400 border border-amber-500/10 py-1 rounded font-bold cursor-pointer">STUCK</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {t.intervention && (
                          <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded">
                            <p className="text-[9px] italic text-amber-200/70 mb-2">"{t.intervention.substring(0, 100)}..."</p>
                            <button onClick={() => handleExecuteIntervention(t.id)} className="w-full bg-amber-500 hover:bg-amber-400 text-black py-1.5 rounded text-[8px] font-bold cursor-pointer">DEPLOY_CORRECTION</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* RIGHT: TELEMETRY STREAM (UPGRADED TO PREMIUM GLASS TERMINAL ON DESKTOP) */}
                  <div className="lg:col-span-3 premium-terminal flex flex-col h-full">

                    {/* TACTICAL DIAGNOSTIC LINE */}
                    <div className="flex justify-between items-center p-2.5 bg-white/[0.02] border-b border-white/5 font-mono text-[7px] tracking-wider text-slate-400 select-none shrink-0">
                      <span>BUF: SECURE_PASS</span>
                      <span>LATENCY: 12ms</span>
                      <span>CORE_TEMP: 32.5°C</span>
                    </div>

                    {/* SCROLLABLE LOG LIST */}
                    <div className="flex-1 p-3 overflow-y-auto font-mono text-[8px] leading-relaxed relative z-20 space-y-2">
                      {logs.slice(0, 15).map((log, i) => {
                        const isAgent = log.includes('Anomaly') || log.includes('Traj') || log.includes('Success');
                        const isSuccess = log.includes('Success') || log.includes('verified') || log.includes('COMPLETE');
                        const isChassis = log.includes('Perception') || log.includes('System');

                        return (
                          <div key={i} className={`flex gap-1.5 border-l pl-1.5 ${isAgent ? 'border-amber-500/50' : isSuccess ? 'border-green-500/50' : isChassis ? 'border-cyan-500/40' : 'border-white/5'}`}>
                            <span className={isAgent ? 'text-amber-500 font-bold' : isSuccess ? 'text-green-400' : isChassis ? 'text-cyan-400' : 'text-slate-400'}>
                              {log.substring(log.indexOf(']') + 1)}
                            </span>
                          </div>
                        );
                      })}
                      <div className="animate-pulse inline-block w-1 h-3.5 bg-blue-500 align-middle ml-1" />
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </ScaledDashboard>
      </div>

      {/* DUAL BUTTON SUCCESS MODAL */}
      {isMissionSecured && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-green-500/10 backdrop-blur-3xl animate-in fade-in duration-1000" role="dialog" aria-modal="true" aria-labelledby="success-title">
          <div className="text-center p-12 border border-green-500 rounded-3xl bg-[#030712]/95 shadow-[0_0_100px_rgba(34,197,94,0.25)] max-w-lg">
            <div className="inline-block p-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full mb-6 animate-bounce">
              <CheckCircle size={48} />
            </div>
            <h2 id="success-title" className="text-4xl font-black italic text-white mb-2 tracking-tighter uppercase">Mission Secured</h2>
            <p className="text-green-400 font-mono text-xs tracking-[0.2em] uppercase mb-8">All nodes successfully mapped and closed</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={downloadMissionDebrief}
                className="px-6 py-3.5 bg-green-950/40 hover:bg-green-500 hover:text-black text-green-400 border border-green-500/20 font-black rounded-lg transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
              >
                <Terminal size={14} /> Download Debrief
              </button>
              <button
                onClick={clearAll}
                className="px-6 py-3.5 bg-green-600 hover:bg-green-500 text-white font-black rounded-lg transition-all text-xs uppercase tracking-widest cursor-pointer"
              >
                Re-Initialize Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATABASE MODAL */}
      {guidance && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center p-6 z-[100]" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="glass-card p-8 max-w-sm w-full border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={18} className="text-blue-400 animate-pulse" />
              <h2 id="modal-title" className="text-white font-black uppercase tracking-widest text-xs">INTEL_DATABASE_BRIEF</h2>
            </div>
            <div className="bg-black/40 p-5 border border-white/5 rounded mb-6 text-slate-200 text-xs leading-relaxed font-mono italic">
              "{guidance.text}"
            </div>
            <button onClick={() => setGuidance(null)} className="w-full bg-white/5 hover:bg-white/15 border border-white/10 text-white py-3 rounded-lg font-bold text-xs uppercase transition-all tracking-widest cursor-pointer">CLOSE_CORE_BRIEF</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;