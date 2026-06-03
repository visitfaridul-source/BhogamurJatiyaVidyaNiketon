import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { 
  CheckCircle2, 
  User, 
  XCircle, 
  Search, 
  Smartphone, 
  Volume2, 
  VolumeX, 
  X, 
  QrCode, 
  Camera, 
  Clock, 
  ChevronRight, 
  UserCheck, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  SearchCode
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useSchool } from "@/context/SchoolContext";

interface ScanLog {
  id: string;
  memberId: string;
  name: string;
  type: "student" | "teacher";
  classOrSubject: string;
  time: string;
  mode: "Entry" | "Exit";
  status: "Present" | "Late" | "Left" | "Early Leave" | "Already Scanned";
  rawTime: string;
}

export default function QRScanner({ onExit }: { onExit?: () => void }) {
  const { students, teachers, attendanceMap, saveAttendanceRecord } = useSchool();
  
  // Real-time scanner state
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [scannedMember, setScannedMember] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scannerMode, setScannerMode] = useState<"Entry" | "Exit">("Entry");
  const [selectedClass, setSelectedClass] = useState<string>("");
  
  // Manual attendance input fallback
  const [manualSearch, setManualSearch] = useState("");
  const [manualType, setManualType] = useState<"student" | "teacher">("student");

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const cooldownsRef = useRef<Record<string, number>>({}); // prevent scanning same card repeatedly within 8 seconds

  const todayDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD for attendanceMap matching

  // 1. Synth Audio Beep Engine (Pure Web Audio API - no external assets needed!)
  const playBeep = (type: "success" | "error" | "warning") => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (type === "success") {
        // High, pleasant chime for attendance marked
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "error") {
        // Red double buzzer for invalid, mismatch, or failure
        const playBuzz = (delay: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(140, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.2);
        };
        playBuzz(0);
        playBuzz(0.14);
      } else if (type === "warning") {
        // Double rising notification chime for already scanned
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();
        
        osc1.frequency.setValueAtTime(600, ctx.currentTime);
        osc2.frequency.setValueAtTime(850, ctx.currentTime + 0.08);
        
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        
        gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc1.start();
        osc1.stop(ctx.currentTime + 0.14);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.22);
      }
    } catch (err) {
      console.warn("Web Audio API warning:", err);
    }
  };

  // 2. Hydrate scan history directly from database state so logs match today's actual updates
  useEffect(() => {
    const list: ScanLog[] = [];
    Object.entries(attendanceMap).forEach(([key, recordValue]) => {
      const record = recordValue as any;
      // Key format is "YYYY-MM-DD:MEMBER_ID"
      if (key.startsWith(todayDateStr + ":")) {
        const memberId = key.substring(todayDateStr.length + 1);
        
        // Find matching student or teacher
        const student = students.find(s => s.id === memberId);
        const teacher = teachers.find(t => t.id === memberId);
        
        if (student) {
          list.push({
            id: `seed_${memberId}_${record.inTime || record.outTime || "Entry"}`,
            memberId: student.id,
            name: student.name,
            type: "student",
            classOrSubject: `${student.class} - ${student.section || "A"}`,
            time: record.inTime || record.outTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            mode: record.outTime ? "Exit" : "Entry",
            status: record.status as any,
            rawTime: record.inTime || record.outTime || "00:00"
          });
        } else if (teacher) {
          list.push({
            id: `seed_${memberId}_${record.inTime || record.outTime || "Entry"}`,
            memberId: teacher.id,
            name: teacher.name,
            type: "teacher",
            classOrSubject: teacher.subject || "Faculty",
            time: record.inTime || record.outTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            mode: record.outTime ? "Exit" : "Entry",
            status: record.status as any,
            rawTime: record.inTime || record.outTime || "00:00"
          });
        }
      }
    });

    // Sort by timestamp descending
    list.sort((a, b) => b.id.localeCompare(a.id));
    setScanLogs(list);
  }, [attendanceMap, students, teachers, todayDateStr]);

  // 3. Setup HTML5-Qrcode scanner devices
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        if (devices.length > 0) {
          // Default to environments / back-facing if found, else default first camera
          const envCam = devices.find(d => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"));
          setSelectedCameraId(envCam ? envCam.id : devices[0].id);
        } else {
          setStatusMessage({
            text: "No video cameras found. Please verify permissions or type ID manually below.",
            type: "warning"
          });
        }
      })
      .catch((err) => {
        console.error("Failed to query cameras:", err);
        setStatusMessage({
          text: "Camera permission denied or camera list unavailable.",
          type: "error"
        });
      });

    return () => {
      stopScanner();
    };
  }, []);

  // 4. Handle active scanning state of html5qrcode
  useEffect(() => {
    if (!selectedCameraId) return;
    
    // Stop any active instance first
    stopScanner();

    const html5Qrcode = new Html5Qrcode("qr-reader-enhanced");
    html5QrcodeRef.current = html5Qrcode;

    setStatusMessage(null);

    html5Qrcode.start(
      selectedCameraId,
      {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
          return { width: size, height: size };
        }
      },
      (decodedText) => {
        handleScannedData(decodedText);
      },
      (errorMessage) => {
        // Quiet mode for live scan tick errors
      }
    )
    .then(() => {
      setIsScanning(true);
    })
    .catch((err) => {
      console.error("Camera start failed:", err);
      setIsScanning(false);
      setStatusMessage({
        text: "Could not start camera. It may be locked by another application.",
        type: "error"
      });
    });

    return () => {
      stopScanner();
    };
  }, [selectedCameraId]);

  const stopScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        html5QrcodeRef.current.stop().then(() => {
          setIsScanning(false);
        }).catch(err => console.warn("Scanner stop warning:", err));
      } catch (e) {
        console.warn("Scanner cleanup failed:", e);
      }
    }
  };

  // 5. core attendance verification, double lookup, and Firestore writing
  const handleScannedData = async (payload: string) => {
    const now = Date.now();
    const curTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); // 13:45 format
    const readableTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Extract ID and properties from either raw string or nested JSON
    let parsedId = payload.trim();
    let parsedType: "student" | "teacher" = "student";
    let payloadName = "";

    try {
      const parsed = JSON.parse(payload);
      if (parsed.id) {
        parsedId = parsed.id;
        parsedType = parsed.type === "teacher" ? "teacher" : "student";
        payloadName = parsed.name || "";
      }
    } catch (e) {
      // payload is raw string: check if it matches static teacher values
      const matchedTeacher = teachers.find(t => t.id === parsedId || t.name === parsedId);
      if (matchedTeacher) {
        parsedType = "teacher";
      }
    }

    // A. Cooldown protection (prevent scanning same card multiple times within 8 seconds)
    const cooldownKey = `${parsedId}:${scannerMode}`;
    if (cooldownsRef.current[cooldownKey] && (now - cooldownsRef.current[cooldownKey] < 8000)) {
      return; 
    }
    cooldownsRef.current[cooldownKey] = now;

    // B. Find member in database state
    let member: any = null;
    let classNameStr = "";
    let photoUrl = "";

    if (parsedType === "student") {
      member = students.find(s => s.id === parsedId);
      if (member) {
        classNameStr = `${member.class} - ${member.section || "A"}`;
        photoUrl = member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`;
      }
    } else {
      member = teachers.find(t => t.id === parsedId);
      if (member) {
        classNameStr = member.subject || "Faculty Member";
        photoUrl = member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`;
      }
    }

    // Return if member was not found at all
    if (!member) {
      playBeep("error");
      setScannedMember({
        name: payloadName || parsedId,
        classOrSubject: parsedType === "teacher" ? "Faculty" : "Student Class",
        status: "NOT_FOUND",
        mode: scannerMode,
        photo: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(payloadName || parsedId)}`
      });
      setTimeout(() => setScannedMember(null), 3000);
      return;
    }

    // C. Check restricted class selection
    if (selectedClass && parsedType === "student" && member.class !== selectedClass) {
      playBeep("error");
      setScannedMember({
        ...member,
        classOrSubject: classNameStr,
        status: "WRONG_CLASS",
        mode: scannerMode,
        photo: photoUrl
      });
      setTimeout(() => setScannedMember(null), 3500);
      return;
    }

    // D. Process check-in vs check-out attendance state
    const mapKey = `${todayDateStr}:${member.id}`;
    const todayRecord = attendanceMap[mapKey];

    if (scannerMode === "Entry") {
      // Check-In Mode
      if (todayRecord && todayRecord.inTime) {
        // Already marked entry
        playBeep("warning");
        setScannedMember({
          ...member,
          classOrSubject: classNameStr,
          status: "ALREADY_IN",
          mode: scannerMode,
          timeStr: todayRecord.inTime,
          photo: photoUrl
        });
        setTimeout(() => setScannedMember(null), 3500);
        return;
      }

      // Late check (Late limit is set to 08:45 AM)
      const isLate = curTimeStr > "08:45";
      const finalStatus: "Present" | "Late" = isLate ? "Late" : "Present";
      const recordRemarks = isLate ? "Late QR Check-In" : "Regular QR Check-In";

      // Save record into Firestore via handle
      await saveAttendanceRecord(member.id, todayDateStr, {
        status: finalStatus,
        inTime: curTimeStr,
        remarks: recordRemarks
      });

      playBeep("success");
      setScannedMember({
        ...member,
        classOrSubject: classNameStr,
        status: finalStatus,
        mode: scannerMode,
        timeStr: readableTime,
        photo: photoUrl
      });

    } else {
      // Check-Out / Exit Mode
      if (todayRecord && todayRecord.outTime) {
        // Already checked out
        playBeep("warning");
        setScannedMember({
          ...member,
          classOrSubject: classNameStr,
          status: "ALREADY_OUT",
          mode: scannerMode,
          timeStr: todayRecord.outTime,
          photo: photoUrl
        });
        setTimeout(() => setScannedMember(null), 3500);
        return;
      }

      // Early Leave calculation (Standard exit is after 14:30 PM)
      const isEarlyLeave = curTimeStr < "14:30";
      const finalStatus = isEarlyLeave ? "Present" : "Present"; // keep marked as present
      const earlyLeaveReasonStr = isEarlyLeave ? "Self QR Early Departure" : "";
      
      await saveAttendanceRecord(member.id, todayDateStr, {
        outTime: curTimeStr,
        earlyOutReason: earlyLeaveReasonStr,
        remarks: isEarlyLeave ? "Early Exit Scanned" : "Regular Check-Out"
      });

      playBeep("success");
      setScannedMember({
        ...member,
        classOrSubject: classNameStr,
        status: isEarlyLeave ? "EARLY_LEAVE" : "LEFT",
        mode: scannerMode,
        timeStr: readableTime,
        photo: photoUrl
      });
    }

    // Clear overlay card after 3.2 seconds
    setTimeout(() => setScannedMember(null), 3200);
  };

  // Switch camera manual triggers
  const cycleCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  const currentActiveCameraLabel = cameras.find(c => c.id === selectedCameraId)?.label || "Camera Feed";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-slate-800">
      
      {/* LEFT & CENTER PANEL: Scanning HUD and Terminal Frame */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-[2.2rem] border border-slate-200 shadow-md p-6 bg-gradient-to-tr from-white via-white to-teal-50/20 relative overflow-hidden">
          
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                <span className="p-2 bg-teal-500 text-white rounded-xl shadow-md shadow-teal-500/15 animate-pulse">
                  <QrCode className="w-5 h-5" />
                </span>
                <span>Enhanced QR Attendance Monitor</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Automated high-frequency registration for Students & Faculty</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Sound toggle button */}
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-xs",
                  soundEnabled 
                    ? "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100/70" 
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                )}
                title={soundEnabled ? "Mute audio beeps" : "Enable synthetic beeps"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 cursor-pointer" /> : <VolumeX className="w-4 h-4 cursor-pointer" />}
              </button>

              {/* Camera cycle switcher */}
              {cameras.length > 1 && (
                <button
                  onClick={cycleCamera}
                  className="px-3.5 py-2 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="Switch camera device lens"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                  <span>Switch Lens ({cameras.length})</span>
                </button>
              )}

              {onExit && (
                <button 
                  onClick={onExit}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Close Terminals
                </button>
              )}
            </div>
          </div>

          {/* Mode (Check-In vs Out) & Class Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Entry vs Exit Toggle */}
            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex border border-slate-200/60">
              <button
                onClick={() => setScannerMode("Entry")}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer",
                  scannerMode === "Entry"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", scannerMode === "Entry" ? "bg-white animate-ping" : "bg-emerald-500")} />
                <span>ENTRY (Check-In / आगमन)</span>
              </button>
              <button
                onClick={() => setScannerMode("Exit")}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer",
                  scannerMode === "Exit"
                    ? "bg-teal-600 text-white shadow-md shadow-teal-600/10"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", scannerMode === "Exit" ? "bg-white animate-ping" : "bg-teal-500")} />
                <span>EXIT (Check-Out / प्रस्थान)</span>
              </button>
            </div>

            {/* Target Class Selector */}
            <div className="relative">
              <select
                className="w-full pl-3.5 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 shadow-xs appearance-none"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                title="Limit Scans to a Specific Class"
              >
                <option value="">🎯 Allow All Classes (सभी कक्षाएं स्वीकार्य)</option>
                {["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

          {/* Feedback & Error notification bars */}
          {statusMessage && (
            <div className={cn(
              "p-3.5 mb-5 rounded-2xl flex items-center gap-2.5 text-xs font-bold border",
              statusMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-100" :
              statusMessage.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-100" :
              "bg-rose-50 text-rose-800 border-rose-100"
            )}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* MASTER CAMERA READER PORT */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-4 border-slate-900 aspect-video flex flex-col items-center justify-center shadow-inner group">
            
            {/* The Live Video Container hook */}
            <div id="qr-reader-enhanced" className="w-full h-full min-h-[280px]" style={{ width: "100%", height: "100%" }}></div>

            {/* Simulated Overlay HUD overlay for operator clarity */}
            <div className="absolute inset-x-0 top-3 px-4 py-2 pointer-events-none z-10 flex justify-between items-center">
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className={cn("w-2 h-2 rounded-full", isScanning ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-200">
                  {isScanning ? "Terminal Live" : "Offline"}
                </span>
              </div>
              <div className="text-[10px] font-mono font-bold text-white/70 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md max-w-[150px] truncate">
                {currentActiveCameraLabel}
              </div>
            </div>

            {/* Target Alignment Reticle Viewfinder */}
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center">
              <div className="w-48 h-48 sm:w-60 sm:h-60 border-2 border-dashed border-white/20 rounded-2xl relative flex items-center justify-center">
                {/* Visual corners */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-teal-400 -mt-1.5 -ml-1.5 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-teal-400 -mt-1.5 -mr-1.5 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-teal-400 -mb-1.5 -ml-1.5 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-teal-400 -mb-1.5 -mr-1.5 rounded-br-lg"></div>

                {/* Cyber Lasers scanning wireframe line */}
                {isScanning && (
                  <div className="absolute w-full h-[3px] bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#2dd4bf] left-0 animate-scanner-line" />
                )}
                
                {/* Center target circle indicator */}
                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest text-center mt-36">
                  Align ID Barcode/QR
                </span>
              </div>
            </div>

            {/* OVERLAY: SUCCESS LOG DIALOG (POPS OVER VIDEO INSTANTLY UPON BEAM HIT) */}
            <AnimatePresence>
              {scannedMember && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
                >
                  <div className={cn(
                    "bg-white rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden border-2",
                    scannedMember.status === "NOT_FOUND" ? "border-rose-500" :
                    scannedMember.status === "WRONG_CLASS" ? "border-amber-400" :
                    scannedMember.status && ["Late", "EARLY_LEAVE", "LEFT"].includes(scannedMember.status) ? "border-amber-500" :
                    scannedMember.status && ["ALREADY_IN", "ALREADY_OUT"].includes(scannedMember.status) ? "border-teal-500/80" :
                    "border-emerald-500"
                  )}>
                    
                    {/* Glowing Aura Effect */}
                    <div className={cn(
                      "absolute -top-32 w-64 h-64 rounded-full filter blur-[40px] opacity-15",
                      scannedMember.status === "NOT_FOUND" ? "bg-rose-500" :
                      scannedMember.status === "WRONG_CLASS" ? "bg-amber-400" : "bg-emerald-500"
                    )} />

                    {/* Check / Cross Status Badge */}
                    <div className="mb-4 relative">
                      {["Present", "Late", "LEFT", "EARLY_LEAVE"].includes(scannedMember.status) ? (
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 stroke-[2.5]" />
                      ) : ["ALREADY_IN", "ALREADY_OUT"].includes(scannedMember.status) ? (
                        <ShieldCheck className="w-16 h-16 text-teal-500 stroke-[2.5]" />
                      ) : (
                        <XCircle className="w-16 h-16 text-rose-500 stroke-[2.5]" />
                      )}
                    </div>

                    {/* Member Profile Card Details */}
                    <div className="w-20 h-20 bg-slate-100 rounded-full overflow-hidden border-4 border-white shadow-md relative -mt-3 mb-3 shrink-0">
                      <img 
                        src={scannedMember.photo} 
                        alt={scannedMember.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight leading-tight uppercase font-sans">{scannedMember.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{scannedMember.classOrSubject}</p>
                    {scannedMember.roll && <p className="text-[11px] font-mono text-slate-400 font-bold mt-0.5">Roll No: {scannedMember.roll}</p>}

                    {/* Active Scan Mode display label */}
                    <div className="flex gap-1.5 items-center justify-center my-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <span>{scannedMember.mode === "Entry" ? "आगमन / IN" : "प्रस्थान / OUT"}</span>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                      <span className="text-slate-600 font-mono font-black">{scannedMember.timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Diagnostic Status Alert Box */}
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-[11px] font-bold w-full shadow-xs border",
                      scannedMember.status === "NOT_FOUND" ? "bg-rose-50 text-rose-700 border-rose-100" :
                      scannedMember.status === "WRONG_CLASS" ? "bg-amber-50 text-amber-700 border-amber-100" :
                      scannedMember.status === "ALREADY_IN" ? "bg-teal-50 text-teal-700 border-teal-100" :
                      scannedMember.status === "ALREADY_OUT" ? "bg-amber-100/40 text-amber-700 border-amber-200" :
                      scannedMember.status === "Late" ? "bg-amber-100 text-amber-800 border-amber-200" :
                      scannedMember.status === "EARLY_LEAVE" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-emerald-50 text-emerald-800 border-emerald-100"
                    )}>
                      {scannedMember.status === "NOT_FOUND" ? "UNKNOWN ID / NOT IN SCHOOL DATABASE" :
                       scannedMember.status === "WRONG_CLASS" ? "WRONG CLASS / WRONG DIVISION" :
                       scannedMember.status === "ALREADY_IN" ? "ENTRY ALREADY RECORDED TODAY" :
                       scannedMember.status === "ALREADY_OUT" ? "EXIT ALREADY RECORDED TODAY" :
                       scannedMember.status === "Late" ? "✓ LATE CHECK-IN SAVED SUCCESS" :
                       scannedMember.status === "EARLY_LEAVE" ? "✓ EARLY LEAVE EXIT REGISTERED" :
                       "✓ ATTENDANCE RECORDED SUCCESSFULLY"}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SIMULATED DIRECT MANUAL ADMIT FALLBACK PANEL */}
          <div className="mt-5 p-4 bg-slate-50 rounded-2.5xl border border-slate-200/80">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <SearchCode className="w-4 h-4 text-slate-400" />
              <span>Manual Entry Assistant (आपातकालीन हाजिरी)</span>
            </h4>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <select 
                value={manualType} 
                onChange={(e) => setManualType(e.target.value as any)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                <option value="student">Student (छात्र)</option>
                <option value="teacher">Faculty (शिक्षक)</option>
              </select>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={manualType === "student" ? "Search student by name, roll, or click below..." : "Search teacher name..."}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-teal-500"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                />
                {manualSearch && (
                  <button onClick={() => setManualSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Render matched list in fallback selector */}
            {manualSearch.trim().length >= 2 && (() => {
              const query = manualSearch.toLowerCase();
              const matches = manualType === "student"
                ? students.filter(s => s.name.toLowerCase().includes(query) || (s.roll && s.roll.includes(query)) || s.id.toLowerCase().includes(query)).slice(0, 5)
                : teachers.filter(t => t.name.toLowerCase().includes(query) || t.id.toLowerCase().includes(query)).slice(0, 5);

              return (
                <div className="mt-2.5 bg-white rounded-xl border border-slate-200 shadow-sm max-h-48 overflow-y-auto divide-y divide-slate-100 z-10">
                  {matches.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400 text-center">No matching staff/students found</p>
                  ) : (
                    matches.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          handleScannedData(JSON.stringify({
                            id: item.id,
                            name: item.name,
                            type: manualType,
                            class: item.class || "",
                            section: item.section || ""
                          }));
                          setManualSearch("");
                        }}
                        className="p-2.5 hover:bg-slate-50 flex justify-between items-center cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <img 
                            src={item.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} 
                            alt="" 
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full bg-slate-50 object-cover" 
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {manualType === "student" ? `Class ${item.class || "N/A"}` : item.subject || "Teacher"}
                            </p>
                          </div>
                        </div>
                        <button className="px-2 py-1 text-[9px] font-black uppercase text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors">
                          Insert Scanned Record
                        </button>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}

            {/* Demo/Shortcut grid for immediate click scans (no search required) */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Direct Shortcuts:</span>
              {(manualType === "student" ? students.slice(0, 4) : teachers.slice(0, 4)).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    handleScannedData(JSON.stringify({
                      id: item.id,
                      name: item.name,
                      type: manualType,
                      class: item.class || "",
                      section: item.section || ""
                    }));
                  }}
                  className="px-2.5 py-1.5 text-[10px] font-medium bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-800 rounded-lg transition-colors cursor-pointer"
                >
                  {item.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT SIDEBAR: Counts & Persistent Log hydrated from Firestore */}
      <div className="space-y-6">
        
        {/* Statistics Widgets */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-xs p-4 text-center bg-emerald-50 relative overflow-hidden group hover:border-emerald-300 transition-all">
            <div className="absolute top-0 right-0 p-1 opacity-5">
              <UserCheck className="w-16 h-16 text-emerald-900" />
            </div>
            <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">Scanned Arrival</h4>
            <p className="text-3xl font-black text-emerald-600">{scanLogs.filter(l => l.mode === "Entry").length}</p>
            <span className="text-[9px] font-bold text-emerald-500 bg-emerald-100/50 px-2 py-0.5 rounded-full inline-block">Registered Today</span>
          </div>

          <div className="bg-white rounded-[2rem] border border-teal-100 shadow-xs p-4 text-center bg-teal-50 relative overflow-hidden group hover:border-teal-300 transition-all">
            <h4 className="text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-0.5">Scanned Departure</h4>
            <p className="text-3xl font-black text-teal-600">{scanLogs.filter(l => l.mode === "Exit").length}</p>
            <span className="text-[9px] font-bold text-teal-500 bg-teal-100/50 px-2 py-0.5 rounded-full inline-block">Leaving Logged</span>
          </div>
        </div>

        {/* Attendance Live Log Board */}
        <div className="bg-white rounded-[2.2rem] border border-slate-200 shadow-md h-[585px] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Scanned Today (आज की हाजिरी)</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Direct Live database sync</p>
            </div>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-bold">
              {scanLogs.length} Total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
            {scanLogs.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Smartphone className="w-12 h-12 mb-2 opacity-30 text-teal-500 animate-bounce" />
                <p className="text-sm font-bold text-slate-700">Waiting for live scans...</p>
                <p className="text-xs text-slate-400 mt-1">Scan student / teacher ID cards with camera to record attendance instantaneously</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {scanLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-3 bg-white border border-slate-100 rounded-2xl shadow-xs flex justify-between items-center hover:border-slate-200 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-100 overflow-hidden shrink-0">
                        <img 
                          src={
                            log.type === "student"
                              ? students.find(s => s.id === log.memberId)?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.name}`
                              : teachers.find(t => t.id === log.memberId)?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.name}`
                          }
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800 text-xs truncate max-w-[120px] uppercase">{log.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{log.classOrSubject}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                          log.mode === "Entry" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-teal-50 text-teal-700 border border-teal-100"
                        )}>
                          {log.mode === "Entry" ? "In" : "Out"}
                        </span>
                        
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                          log.status === "Present" ? "bg-emerald-500 text-white" :
                          log.status === "Late" ? "bg-amber-500 text-white" :
                          "bg-amber-600 text-white"
                        )}>
                          {log.status === "Present" ? "Present" : log.status === "Late" ? "Late" : "Early Out"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono font-bold mt-1.5 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span>{log.time}</span>
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
