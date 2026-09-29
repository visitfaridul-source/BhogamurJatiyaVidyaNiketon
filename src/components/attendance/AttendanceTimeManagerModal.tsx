import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Sparkles,
  Check,
  AlertTriangle,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Sliders,
  ShieldCheck,
  ArrowRight,
  Sun,
  Sunset,
  BookOpen,
  Info
} from 'lucide-react';
import {
  AttendanceTimingConfig,
  ClassTimingOverride,
  PRESETS,
  TimingPresetKey,
  formatTime12h
} from '@/lib/attendanceTiming';
import { useSchool } from '@/context/SchoolContext';
import { useWebsite } from '@/context/WebsiteContext';

interface AttendanceTimeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AttendanceTimingConfig;
  onSave: (updated: AttendanceTimingConfig) => void;
}

export default function AttendanceTimeManagerModal({
  isOpen,
  onClose,
  config,
  onSave
}: AttendanceTimeManagerModalProps) {
  const { students } = useSchool();
  const { updateSettings } = useWebsite();

  // Local state form
  const [formData, setFormData] = useState<AttendanceTimingConfig>(config);
  const [activeTab, setActiveTab] = useState<'presets' | 'manual' | 'classes' | 'simulate'>('presets');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Class override form
  const [newOverrideClass, setNewOverrideClass] = useState<string>('Class 10');
  const [newOverrideShift, setNewOverrideShift] = useState<'morning' | 'evening' | 'extended'>('evening');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Simulation test state
  const [testTime, setTestTime] = useState<string>('16:15');
  const [testType, setTestType] = useState<'entry' | 'exit'>('exit');
  const [testClass, setTestClass] = useState<string>('All');

  // Available unique classes in school
  const availableClasses = Array.from(
    new Set(students.map((s) => s.class).filter(Boolean))
  ).sort();

  if (availableClasses.length === 0) {
    availableClasses.push('Class 9', 'Class 10', 'Class 11', 'Class 12');
  }

  // Synchronize when opened or updated
  useEffect(() => {
    if (isOpen) {
      setFormData(config);
      setSaveSuccessNotice(null);
    }
  }, [isOpen, config]);

  // Live clock
  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  // Preset selector
  const handleSelectPreset = (key: TimingPresetKey) => {
    if (key === 'custom') {
      setFormData((prev) => ({
        ...prev,
        activePreset: 'custom',
        activeSessionName: 'Custom Manual Timings'
      }));
      setActiveTab('manual');
      return;
    }
    const preset = PRESETS[key];
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        ...preset,
        classOverrides: prev.classOverrides // Preserve existing class overrides
      }));
    }
  };

  // Add a class-specific override
  const handleAddClassOverride = () => {
    if (!newOverrideClass) return;

    let shiftConfig: Partial<ClassTimingOverride> = {};
    if (newOverrideShift === 'morning') {
      shiftConfig = {
        shiftName: 'Morning Exam Shift',
        schoolStartTime: '07:30',
        lateCutoff: '08:00',
        halfDayCutoff: '10:00',
        earlyLeaveCutoff: '12:30',
        closingTime: '12:30',
        note: 'Morning session for examination'
      };
    } else if (newOverrideShift === 'evening') {
      shiftConfig = {
        shiftName: 'Afternoon / Evening Exam Shift',
        schoolStartTime: '12:30',
        lateCutoff: '13:00',
        halfDayCutoff: '14:30',
        earlyLeaveCutoff: '16:30',
        closingTime: '16:30',
        note: 'Afternoon exam shift (dismissal at 04:30 PM)'
      };
    } else {
      shiftConfig = {
        shiftName: 'Extended Exam Day (4:30 PM)',
        schoolStartTime: '08:00',
        lateCutoff: '08:45',
        halfDayCutoff: '12:30',
        earlyLeaveCutoff: '16:30',
        closingTime: '16:30',
        note: 'Extended exam session closing at 04:30 PM'
      };
    }

    const newOverride: ClassTimingOverride = {
      id: `override-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      className: newOverrideClass,
      shiftName: shiftConfig.shiftName || 'Custom Shift',
      schoolStartTime: shiftConfig.schoolStartTime || '08:00',
      lateCutoff: shiftConfig.lateCutoff || '08:45',
      halfDayCutoff: shiftConfig.halfDayCutoff || '11:30',
      earlyLeaveCutoff: shiftConfig.earlyLeaveCutoff || '16:30',
      closingTime: shiftConfig.closingTime || '16:30',
      note: shiftConfig.note || ''
    };

    // Filter out existing override for this class if any
    const filtered = formData.classOverrides.filter(
      (o) => o.className.toLowerCase() !== newOverrideClass.toLowerCase()
    );

    setFormData((prev) => ({
      ...prev,
      classOverrides: [...filtered, newOverride]
    }));
  };

  const handleRemoveClassOverride = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      classOverrides: prev.classOverrides.filter((o) => o.id !== id)
    }));
  };

  // Save changes
  const handleSave = () => {
    onSave(formData);
    // Also sync to Website settings if available
    try {
      updateSettings({
        attendanceTimingConfig: formData
      } as any).catch(() => {});
    } catch (e) {
      // safe fallback
    }

    setSaveSuccessNotice('Attendance Timing Schedule Activated Successfully!');
    setTimeout(() => {
      setSaveSuccessNotice(null);
      onClose();
    }, 1200);
  };

  // Quick helper for simulation
  const simulateStatus = () => {
    let lateThreshold = formData.lateCutoff;
    let earlyLeaveThreshold = formData.earlyLeaveCutoff;
    let sessionTitle = formData.activeSessionName;

    if (testClass !== 'All') {
      const matched = formData.classOverrides.find(
        (o) => o.className.toLowerCase() === testClass.toLowerCase()
      );
      if (matched) {
        lateThreshold = matched.lateCutoff;
        earlyLeaveThreshold = matched.earlyLeaveCutoff;
        sessionTitle = `${matched.className} - ${matched.shiftName}`;
      }
    }

    if (testType === 'entry') {
      const isLate = testTime > lateThreshold;
      return {
        status: isLate ? 'LATE' : 'PRESENT',
        color: isLate ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white',
        desc: isLate
          ? `Scanned at ${formatTime12h(testTime)}, which is past cutoff ${formatTime12h(lateThreshold)}.`
          : `Scanned at ${formatTime12h(testTime)}, on time before ${formatTime12h(lateThreshold)}.`,
        session: sessionTitle
      };
    } else {
      const isEarly = testTime < earlyLeaveThreshold;
      return {
        status: isEarly ? 'EARLY LEAVE' : 'REGULAR EXIT (PRESENT)',
        color: isEarly ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white',
        desc: isEarly
          ? `Leaving at ${formatTime12h(testTime)}, which is before the closing requirement ${formatTime12h(earlyLeaveThreshold)}.`
          : `Leaving at ${formatTime12h(testTime)}, valid departure at or after ${formatTime12h(earlyLeaveThreshold)}.`,
        session: sessionTitle
      };
    }
  };

  const simResult = simulateStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Futuristic Modal Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5 border-b border-indigo-900/40">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-inner">
                <Clock className="w-6 h-6 text-indigo-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    Attendance Time Management
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    <Sparkles className="w-3 h-3 text-indigo-300" />
                    Dynamic Shift Engine
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Configure school closing times (e.g. 4:00 or 4:30 PM), exam sessions, morning & evening shifts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Live Digital Clock */}
              <div className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">Live Clock</span>
                <span className="text-sm font-mono font-bold text-white tracking-widest">{currentTime || '--:--:--'}</span>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Bar inside Header */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/10 text-indigo-100 hover:bg-white/15'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quick Schedule Presets
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/10 text-indigo-100 hover:bg-white/15'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Manual Time Settings
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'classes'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/10 text-indigo-100 hover:bg-white/15'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Class-Specific Shifts ({formData.classOverrides.length})
            </button>
            <button
              onClick={() => setActiveTab('simulate')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'simulate'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/10 text-indigo-100 hover:bg-white/15'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Rule Simulator
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* Active Status Pill */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                ⏰
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Active Working Session:</span>
                  <span className="text-sm font-extrabold text-slate-800">{formData.activeSessionName}</span>
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 mt-0.5 font-medium">
                  <span>Start: <strong className="text-slate-800">{formatTime12h(formData.schoolStartTime)}</strong></span>
                  <span>•</span>
                  <span>Late Cutoff: <strong className="text-amber-700">{formatTime12h(formData.lateCutoff)}</strong></span>
                  <span>•</span>
                  <span>Early Leave Cutoff: <strong className="text-purple-700">{formatTime12h(formData.earlyLeaveCutoff)}</strong></span>
                  <span>•</span>
                  <span>Closing: <strong className="text-slate-800">{formatTime12h(formData.closingTime)}</strong></span>
                </div>
              </div>
            </div>

            {formData.isExamMode && (
              <span className="self-start sm:self-center px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                Exam Mode Active
              </span>
            )}
          </div>

          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Choose a Schedule Preset</h3>
                  <p className="text-xs text-slate-500">Quickly apply standard, exam-day, morning, or evening shift hours with one tap</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Regular Schedule */}
                <div
                  onClick={() => handleSelectPreset('regular')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    formData.activePreset === 'regular'
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-md shadow-indigo-600/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  {formData.activePreset === 'regular' && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white flex items-center gap-1">
                      <Check className="w-3 h-3" /> Selected
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Sun className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Regular School Schedule</h4>
                      <p className="text-xs text-slate-500">Standard Daily Operating Hours</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono">
                    <div className="flex justify-between"><span>Entry:</span> <strong className="text-slate-800">08:00 AM</strong></div>
                    <div className="flex justify-between"><span>Late After:</span> <strong className="text-amber-700">08:45 AM</strong></div>
                    <div className="flex justify-between"><span>Early Leave Before:</span> <strong className="text-purple-700">02:30 PM</strong></div>
                    <div className="flex justify-between"><span>School Closes:</span> <strong className="text-slate-800">02:30 PM</strong></div>
                  </div>
                </div>

                {/* Exam Extended Day - EXACT USER REQUEST: Closes at 4 or 4:30 */}
                <div
                  onClick={() => handleSelectPreset('exam_extended')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    formData.activePreset === 'exam_extended'
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-md shadow-indigo-600/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  {formData.activePreset === 'exam_extended' && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white flex items-center gap-1">
                      <Check className="w-3 h-3" /> Selected
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <BookOpen className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-800">Examination Day (Extended to 4:30 PM)</h4>
                      </div>
                      <p className="text-xs text-slate-500">School closes at 4:30 PM for exams</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 font-mono">
                    <div className="flex justify-between"><span>Entry:</span> <strong className="text-slate-800">08:00 AM</strong></div>
                    <div className="flex justify-between"><span>Late After:</span> <strong className="text-amber-700">08:45 AM</strong></div>
                    <div className="flex justify-between"><span>Early Leave Before:</span> <strong className="text-purple-700">04:30 PM (16:30)</strong></div>
                    <div className="flex justify-between"><span>School Closes:</span> <strong className="text-slate-800">04:30 PM</strong></div>
                  </div>
                </div>

                {/* Morning Exam Shift */}
                <div
                  onClick={() => handleSelectPreset('exam_morning')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    formData.activePreset === 'exam_morning'
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-md shadow-indigo-600/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  {formData.activePreset === 'exam_morning' && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white flex items-center gap-1">
                      <Check className="w-3 h-3" /> Selected
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                      <Sun className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Morning Session / Exam Shift</h4>
                      <p className="text-xs text-slate-500">Early shift (07:30 AM to 12:30 PM)</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 bg-orange-50/60 p-2.5 rounded-xl border border-orange-100 font-mono">
                    <div className="flex justify-between"><span>Entry:</span> <strong className="text-slate-800">07:30 AM</strong></div>
                    <div className="flex justify-between"><span>Late After:</span> <strong className="text-amber-700">08:00 AM</strong></div>
                    <div className="flex justify-between"><span>Early Leave Before:</span> <strong className="text-purple-700">12:30 PM</strong></div>
                    <div className="flex justify-between"><span>Dismissal:</span> <strong className="text-slate-800">12:30 PM</strong></div>
                  </div>
                </div>

                {/* Evening / Afternoon Exam Shift */}
                <div
                  onClick={() => handleSelectPreset('exam_evening')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    formData.activePreset === 'exam_evening'
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-md shadow-indigo-600/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  {formData.activePreset === 'exam_evening' && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white flex items-center gap-1">
                      <Check className="w-3 h-3" /> Selected
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Sunset className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Afternoon / Evening Exam Shift</h4>
                      <p className="text-xs text-slate-500">Afternoon shift (12:30 PM to 04:30 PM)</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 bg-purple-50/60 p-2.5 rounded-xl border border-purple-100 font-mono">
                    <div className="flex justify-between"><span>Entry:</span> <strong className="text-slate-800">12:30 PM</strong></div>
                    <div className="flex justify-between"><span>Late After:</span> <strong className="text-amber-700">01:00 PM</strong></div>
                    <div className="flex justify-between"><span>Early Leave Before:</span> <strong className="text-purple-700">04:30 PM (16:30)</strong></div>
                    <div className="flex justify-between"><span>Dismissal:</span> <strong className="text-slate-800">04:30 PM</strong></div>
                  </div>
                </div>

              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Need specific customized timings for today?</h5>
                    <p className="text-[11px] text-slate-500">Switch to Manual Mode to fine-tune cutoff minutes or set custom closing at 4:00 PM</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleSelectPreset('custom');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Custom Manual Timings
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL TIME SETTINGS */}
          {activeTab === 'manual' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-800">Manual Time Controls</h3>
                <p className="text-xs text-slate-500">Adjust the precise operating hours, late cutoffs, and early leave criteria manually</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Session Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Session / Schedule Title</label>
                  <input
                    type="text"
                    value={formData.activeSessionName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        activePreset: 'custom',
                        activeSessionName: e.target.value
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                    placeholder="e.g. Annual Exam Schedule (Closes 4:30 PM)"
                  />
                </div>

                {/* Entry Window Start */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">School Starts / Entry Open From</label>
                  <div className="relative">
                    <input
                      type="time"
                      value={formData.schoolStartTime}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          activePreset: 'custom',
                          schoolStartTime: e.target.value
                        }))
                      }
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold font-mono text-slate-800"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Students normally begin arriving</span>
                </div>

                {/* Late Cutoff */}
                <div>
                  <label className="block text-xs font-bold text-amber-700 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Late Cutoff (Mark as Late if arrival is after)
                  </label>
                  <input
                    type="time"
                    value={formData.lateCutoff}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        activePreset: 'custom',
                        lateCutoff: e.target.value
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-amber-50/50 border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-semibold font-mono text-amber-900"
                  />
                  <span className="text-[11px] text-amber-600/80 mt-1 block">Arrival after {formatTime12h(formData.lateCutoff)} is marked "Late"</span>
                </div>

                {/* Early Leave Cutoff - USER REQUIREMENT: 4:00 or 4:30 PM */}
                <div>
                  <label className="block text-xs font-bold text-purple-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    Early Leave Cutoff (Mark as Early Leave if leaving before)
                  </label>
                  <input
                    type="time"
                    value={formData.earlyLeaveCutoff}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        activePreset: 'custom',
                        earlyLeaveCutoff: e.target.value
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-purple-50/50 border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-semibold font-mono text-purple-900"
                  />
                  <span className="text-[11px] text-purple-600/80 mt-1 block">Leaving before {formatTime12h(formData.earlyLeaveCutoff)} is marked "Early Leave"</span>
                </div>

                {/* School Dismissal / Closing Time */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Dismissal / Closing Time</label>
                  <input
                    type="time"
                    value={formData.closingTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        activePreset: 'custom',
                        closingTime: e.target.value
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold font-mono text-slate-800"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">e.g. 16:00 (04:00 PM) or 16:30 (04:30 PM) during exams</span>
                </div>

                {/* Examination Mode Toggle */}
                <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      Examination Mode Flag
                    </span>
                    <p className="text-[11px] text-slate-500">Flags attendance logs as exam session attendance and displays Exam badge</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer self-start sm:self-center">
                    <input
                      type="checkbox"
                      checked={formData.isExamMode}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isExamMode: e.target.checked
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {formData.isExamMode && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Exam Instructions / Remarks Note</label>
                    <input
                      type="text"
                      value={formData.examNote || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          examNote: e.target.value
                        }))
                      }
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                      placeholder="e.g. Half-Yearly Examination 2026 - Dismissal at 04:30 PM"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CLASS-SPECIFIC SHIFTS & EXAM OVERRIDES */}
          {activeTab === 'classes' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-800">Class-Specific Timing Shifts</h3>
                <p className="text-xs text-slate-500">
                  Assign specific classes to Morning Exam session or Evening Exam session while others follow standard timings
                </p>
              </div>

              {/* Add Override Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Add Shift Override for a Specific Class:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Class</label>
                    <select
                      value={newOverrideClass}
                      onChange={(e) => setNewOverrideClass(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    >
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Assigned Shift / Hours</label>
                    <select
                      value={newOverrideShift}
                      onChange={(e) => setNewOverrideShift(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    >
                      <option value="morning">Morning Shift (07:30 AM - 12:30 PM)</option>
                      <option value="evening">Afternoon / Evening Exam (12:30 PM - 04:30 PM)</option>
                      <option value="extended">Extended Exam Day (08:00 AM - 04:30 PM)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleAddClassOverride}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Assign Shift
                    </button>
                  </div>
                </div>
              </div>

              {/* Overrides Table */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 block">Active Class Overrides ({formData.classOverrides.length}):</span>
                {formData.classOverrides.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No class overrides configured</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      All classes currently follow the school-wide schedule ({formData.activeSessionName}).
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {formData.classOverrides.map((override) => (
                      <div
                        key={override.id}
                        className="bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl p-4 shadow-sm relative group transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-indigo-100 text-indigo-800">
                              {override.className}
                            </span>
                            <h5 className="text-sm font-bold text-slate-800 mt-1.5">{override.shiftName}</h5>
                          </div>
                          <button
                            onClick={() => handleRemoveClassOverride(override.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove class shift override"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600">
                          <div>Starts: <strong className="text-slate-800">{formatTime12h(override.schoolStartTime)}</strong></div>
                          <div>Late After: <strong className="text-amber-700">{formatTime12h(override.lateCutoff)}</strong></div>
                          <div>Early Exit: <strong className="text-purple-700">&lt; {formatTime12h(override.earlyLeaveCutoff)}</strong></div>
                          <div>Dismissal: <strong className="text-slate-800">{formatTime12h(override.closingTime)}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: RULE SIMULATOR */}
          {activeTab === 'simulate' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-800">Interactive Attendance Status Simulator</h3>
                <p className="text-xs text-slate-500">
                  Verify how your active schedule rules will evaluate student scan timestamps
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Scan Type</label>
                    <div className="flex rounded-xl bg-white border border-slate-200 p-1">
                      <button
                        onClick={() => setTestType('entry')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          testType === 'entry' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Entry Check-In
                      </button>
                      <button
                        onClick={() => setTestType('exit')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          testType === 'exit' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Exit Check-Out
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Test Scan Time</label>
                    <input
                      type="time"
                      value={testTime}
                      onChange={(e) => setTestTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Student Class Context</label>
                    <select
                      value={testClass}
                      onChange={(e) => setTestClass(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    >
                      <option value="All">Global School Schedule</option>
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Outcome Display */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase ${simResult.color}`}>
                      {simResult.status}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{simResult.desc}</p>
                      <p className="text-[11px] text-slate-500">Evaluated against session: <strong>{simResult.session}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>Updates immediately apply to QR Scanner, Face Scanner, Live Monitor & Ledgers</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Apply & Save Schedule
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {saveSuccessNotice && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-extrabold rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
            <Check className="w-4 h-4" />
            {saveSuccessNotice}
          </div>
        )}

      </div>
    </div>
  );
}
