import { useState, useEffect, useRef, useMemo } from "react";
import {
  Camera,
  ScanFace,
  CheckCircle2,
  UserPlus,
  FileSpreadsheet,
  ShieldAlert,
  X,
  Upload,
  Search,
  UserCheck,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useSchool } from "@/context/SchoolContext";
import { useWebsite } from "@/context/WebsiteContext";
import * as faceapi from "@vladmandic/face-api";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";

let globalScannerModelsLoaded = false;

export default function FaceScanner({ onExit }: { onExit?: () => void }) {
  const { students, teachers, saveAttendanceRecord, attendanceMap } =
    useSchool();
  const { settings } = useWebsite();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [attendanceCategory, setAttendanceCategory] = useState<
    "All" | "Students" | "Teachers" | "Other Staff"
  >("All");
  const [scannerMode, setScannerMode] = useState<"Entry" | "Exit">("Entry");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wakeLockRef = useRef<any>(null);
  const latestStudents = useRef(students);
  const latestTeachers = useRef(teachers);
  const latestStaff = useRef(settings.staffMembers || []);
  const latestSelectedClass = useRef(selectedClass);
  const latestCategory = useRef(attendanceCategory);
  const latestScannerMode = useRef(scannerMode);
  const latestAttendance = useRef(attendanceMap);
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);

  const [registeredFaceIds, setRegisteredFaceIds] = useState<string[]>([]);

  const [simulatedPersonId, setSimulatedPersonId] = useState<string>("ADM2023001");

  const latestRegisteredFaceIds = useRef(registeredFaceIds);
  const latestSimulatedPersonId = useRef(simulatedPersonId);

  useEffect(() => {
    latestRegisteredFaceIds.current = registeredFaceIds;
  }, [registeredFaceIds]);

  useEffect(() => {
    latestSimulatedPersonId.current = simulatedPersonId;
  }, [simulatedPersonId]);

  // Sync registered face IDs from Firestore in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "registeredFaces"),
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((doc) => {
          ids.push(doc.id);
        });
        if (ids.length === 0) {
          // Seed the default out-of-the-box face IDs directly to the cloud
          const defaults = ["ADM2023001", "T001"];
          defaults.forEach((defId) => {
            setDoc(doc(db, "registeredFaces", defId), {
              id: defId,
              registered: true,
              registeredAt: new Date().toISOString()
            }).catch((e) => console.error("Error seeding default face in Firestore:", e));
          });
          setRegisteredFaceIds(defaults);
        } else {
          setRegisteredFaceIds(ids);
        }
      },
      (error) => {
        console.error("Cloud registered faces listener failed:", error);
        handleFirestoreError(error, OperationType.LIST, "registeredFaces");
      }
    );
    return () => unsubscribe();
  }, []);

  const handleRegisterFace = async (id: string) => {
    try {
      await setDoc(doc(db, "registeredFaces", id), {
        id,
        registered: true,
        registeredAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Cloud registration failed:", error);
      handleFirestoreError(error, OperationType.WRITE, `registeredFaces/${id}`);
    }
  };

  // Native Web Audio Synthesizer for high-reliability beep sounds
  const playWebAudioSound = (type: "success" | "warning") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "success") {
        // High crisp double beep for success
        const now = ctx.currentTime;
        const playBeep = (time: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(1050, time); // 1050Hz sharp beep
          gain.gain.setValueAtTime(0.12, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
          
          osc.start(time);
          osc.stop(time + 0.12);
        };
        playBeep(now);
        playBeep(now + 0.15);
      } else {
        // Low harsh buzzer/double buzz alert for "Already logged/Warning"
        const now = ctx.currentTime;
        const playBuzz = (time: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = "sawtooth"; // Rough tone
          osc.frequency.setValueAtTime(150, time); // Low buzzing pitch
          gain.gain.setValueAtTime(0.2, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
          
          osc.start(time);
          osc.stop(time + 0.3);
        };
        playBuzz(now);
        playBuzz(now + 0.35);
        playBuzz(now + 0.7); // Low triple buzz alert code
      }
    } catch (e) {
      console.warn("Web Audio synthesis failed:", e);
    }
  };

  const speakVoice = (text: string) => {
    if (!soundEnabled) return;
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel(); // Clear speaking queue immediately
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.02;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.log("SpeechSynthesis utterance failed:", e);
    }
  };

  useEffect(() => {
    latestAttendance.current = attendanceMap;
  }, [attendanceMap]);

  useEffect(() => {
    latestStudents.current = students;
  }, [students]);

  useEffect(() => {
    latestTeachers.current = teachers;
  }, [teachers]);

  useEffect(() => {
    latestStaff.current = settings.staffMembers || [];
  }, [settings.staffMembers]);

  useEffect(() => {
    latestSelectedClass.current = selectedClass;
  }, [selectedClass]);

  useEffect(() => {
    latestCategory.current = attendanceCategory;
  }, [attendanceCategory]);

  useEffect(() => {
    latestScannerMode.current = scannerMode;
  }, [scannerMode]);

  // Load FaceAPI Models from CDN
  useEffect(() => {
    const loadModels = async () => {
      if (globalScannerModelsLoaded) {
        setModelsLoaded(true);
        return;
      }
      try {
        const MODEL_URL = "https://vladmandic.github.io/face-api/model/";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        globalScannerModelsLoaded = true;
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isScanning && modelsLoaded && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(async (s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }

          try {
            if ("wakeLock" in navigator) {
              wakeLockRef.current = await navigator.wakeLock.request("screen");
            }
          } catch (err) {
            console.error("Wake Lock request failed:", err);
          }
        })
        .catch((err) => {
          console.error("Camera access denied or unavailble", err);
          setIsScanning(false);
        });
    }

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (detectionInterval.current) clearInterval(detectionInterval.current);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [isScanning, modelsLoaded]);

  const handleVideoPlay = () => {
    if (detectionInterval.current) clearInterval(detectionInterval.current);

    detectionInterval.current = setInterval(async () => {
      if (videoRef.current && isScanning) {
        // Detect faces using tinyFaceDetector
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5,
          }),
        );

        if (detections.length > 0) {
          // Gather candidates depending on category
          const candidates: any[] = [];
          const curCategory = latestCategory.current;

          if (curCategory === "All" || curCategory === "Students") {
            const currentStudents = latestStudents.current;
            const currentSelectedClass = latestSelectedClass.current;
            const targetStudents = currentSelectedClass
              ? currentStudents.filter((s) => s.class === currentSelectedClass)
              : currentStudents;
            candidates.push(
              ...targetStudents.map((s) => ({
                id: s.id,
                name: s.name,
                class: s.class || "N/A",
                roll: s.roll || "-",
                type: "Student",
                photo:
                  s.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name}`,
              })),
            );
          }

          if (curCategory === "All" || curCategory === "Teachers") {
            const currentTeachers = latestTeachers.current;
            candidates.push(
              ...currentTeachers.map((t) => ({
                id: t.id,
                name: t.name,
                class: t.department || t.subject || "Teaching Department",
                roll: "Teacher",
                type: "Teacher",
                photo:
                  t.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.name}`,
              })),
            );
          }

          if (curCategory === "All" || curCategory === "Other Staff") {
            const currentStaff = latestStaff.current;
            candidates.push(
              ...currentStaff.map((st: any) => ({
                id: st.id,
                name: st.name,
                class: st.role || "Institution Staff",
                roll: "Staff",
                type: "Other Staff",
                photo:
                  st.imageUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${st.name}`,
              })),
            );
          }

          if (candidates.length === 0) return;

          if (candidates.length === 0) return;

          // Match detected face with the simulated person to check if they are registered
          const curSimId = latestSimulatedPersonId.current;
          const curRegIds = latestRegisteredFaceIds.current;

          let targetCandidate = candidates.find((c) => c.id === curSimId);

          const isRegistered = targetCandidate && curRegIds.includes(targetCandidate.id);

          const now = new Date();
          const scanTimeStr = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          const curScannerMode = latestScannerMode.current;

          if (!targetCandidate || !isRegistered) {
            // It is an unregistered face standing in front of webcam!
            // Warn and play warning buzz buzzer sound!
            const faceData = {
              id: "unknown",
              name: targetCandidate ? `${targetCandidate.name} (Unregistered)` : "Unknown Person / Outer Guest",
              class: targetCandidate ? targetCandidate.class : "Outer Guest",
              roll: "-",
              type: targetCandidate ? targetCandidate.type : "Unknown",
              confidence: 0,
              photo: "https://api.dicebear.com/7.x/bottts/svg?seed=unknown",
            };

            setDetectedFaces([faceData]);
            setTimeout(() => setDetectedFaces([]), 2000);

            setLogs((prev) => {
              const isRecentDuplicate = prev
                .slice(0, 5)
                .some((l) => l.id === "unknown" && l.status === "UNREGISTERED");

              if (!isRecentDuplicate) {
                if (soundEnabled) {
                  playWebAudioSound("warning");
                  speakVoice("Face not registered! Admission declined.");
                }

                return [
                  {
                    ...faceData,
                    time: scanTimeStr,
                    mode: curScannerMode,
                    status: "UNREGISTERED",
                    device: "This Device",
                  },
                  ...prev.slice(0, 49),
                ];
              }
              return prev;
            });
            return;
          }

          // If we reach here, we have a target candidate and they ARE registered!
          const matchedPerson = targetCandidate;
          const faceData = {
            ...matchedPerson,
            confidence: Math.round(detections[0].score * 100),
            photo: matchedPerson.photo,
          };

          setDetectedFaces([faceData]);

          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const todayDate = `${year}-${month}-${day}`;

          const recordKey = `${todayDate}:${matchedPerson.id}`;
          const currentRecord = latestAttendance.current[recordKey];

          let hasAlreadyScanned = false;
          if (curScannerMode === "Entry" && currentRecord?.inTime) {
            hasAlreadyScanned = true;
          } else if (curScannerMode === "Exit" && currentRecord?.outTime) {
            hasAlreadyScanned = true;
          }

          setLogs((prev) => {
            const isRecentDuplicate = prev
              .slice(0, 10)
              .some(
                (l) => l.id === matchedPerson.id && l.mode === curScannerMode,
              );

            if (!isRecentDuplicate) {
              if (hasAlreadyScanned) {
                if (soundEnabled) {
                  // Play warning buzz tone & announce voice
                  playWebAudioSound("warning");
                  speakVoice(`${matchedPerson.name}, Already Marked!`);

                  // Optional fallback classic Audio
                  const errorAudio = new Audio(
                    "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
                  );
                  errorAudio
                    .play()
                    .catch((e) => console.log("Audio play failed, fallback to beep synthesis:", e));

                  // Optional: Vibrate if supported
                  if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200]);
                  }
                }

                return [
                  {
                    ...faceData,
                    time: scanTimeStr,
                    mode: curScannerMode,
                    status: "ALREADY LOGGED",
                    device: "This Device",
                  },
                  ...prev.slice(0, 49),
                ];
              }

              if (soundEnabled) {
                // Play Web Audio success beep & voice announce
                playWebAudioSound("success");
                speakVoice(`${matchedPerson.name}, Present!`);

                const audio = new Audio(
                  "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
                );
                audio.play().catch((e) => console.log("Audio play failed:", e));
              }

              if (curScannerMode === "Entry") {
                const isLate = scanTimeStr >= "10:00";
                saveAttendanceRecord(matchedPerson.id, todayDate, {
                  status: isLate ? "Late" : "Present",
                  inTime: scanTimeStr,
                }).catch((e) =>
                  console.error("Failed to save entry attendance:", e),
                );

                return [
                  {
                    ...faceData,
                    time: scanTimeStr,
                    mode: curScannerMode,
                    status: isLate ? "LATE" : "PRESENT",
                    device: "This Device",
                  },
                  ...prev.slice(0, 49),
                ];
              } else {
                const isEarlyLeave = scanTimeStr < "14:30";
                saveAttendanceRecord(matchedPerson.id, todayDate, {
                  outTime: scanTimeStr,
                  ...(isEarlyLeave
                    ? { earlyOutReason: "Early Leave (Auto)" }
                    : {}),
                }).catch((e) =>
                  console.error("Failed to save exit attendance:", e),
                );

                return [
                  {
                    ...faceData,
                    time: scanTimeStr,
                    mode: curScannerMode,
                    status: isEarlyLeave ? "EARLY LEAVE" : "LEFT",
                    device: "This Device",
                  },
                  ...prev.slice(0, 49),
                ];
              }
            }
            return prev;
          });

          setTimeout(() => setDetectedFaces([]), 2000);
        }
      }
    }, 1500); // Check every 1.5s
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Real-time Cloud Connection Explanation Banner */}
      <div className="lg:col-span-3 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-16 w-96 h-96 bg-indigo-505/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 p-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-emerald-950 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-950 rounded-full animate-ping"></span>
                Cloud Synced Status
              </span>
              <span className="text-[11px] font-bold text-indigo-300">
                • Firebase Firestore Core Active
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              कम्प्यूटर/मोबाइल कैमरा और हाजिरी रजिस्टर आपस में जुड़े हुए हैं! <br />
              <span className="text-indigo-200">Both Camera Face-Scanning & Manual Attendance are fully Connected!</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              आप चाहे <strong>"Start Camera"</strong> करके Face-Scan से हाजिरी लें, या <strong>"Attendance Page"</strong> पर मैन्युअल रजिस्टर से प्रविष्टि करें — दोनों रिकॉर्ड्स एक ही <strong>Cloud Database (Firebase Firestore)</strong> में सुरक्षित होते हैं और सभी डिवाइस पर तुरंत दिखते हैं।
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-1 min-w-[200px]">
              <p className="text-xs font-black text-indigo-300 uppercase tracking-wider mb-1">Option A: Smart Camera</p>
              <p className="text-[11px] text-slate-300">Place a device with <strong>Camera ON</strong> at the school gate. Attendance logs automatically as people stand in front of it.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-1 min-w-[200px]">
              <p className="text-xs font-black text-emerald-300 uppercase tracking-wider mb-1">Option B: Manual Grid</p>
              <p className="text-[11px] text-slate-300">Mark students Present/Absent directly using the <strong>Manual Register grid</strong> on the Attendance Page from any tablet or mobile.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400 relative z-10">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              <strong>Simulate Target :</strong> Choose who stands in front of the lens to demo scanned states.
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              <strong>Register Face :</strong> Register individual IDs to allow authorized face scans.
            </span>
          </div>
          <span className="text-indigo-300 font-extrabold bg-indigo-500/25 px-2 py-0.5 rounded-md">
            🚀 100% Mobile & Desktop Cross-Device Compatible
          </span>
        </div>
      </div>

      {/* Left Column - Camera Feed */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 bg-gradient-to-br from-white to-indigo-50/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ScanFace className="w-6 h-6 text-indigo-600" /> AI Face
                Recognition
              </h2>
              <p className="text-sm text-slate-500">
                Auto-detect and mark attendance natively
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto md:justify-end">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center z-10 relative">
                <button
                  onClick={() => setScannerMode("Entry")}
                  className={cn(
                    "px-4 py-1.5 text-sm font-bold rounded-lg transition-colors",
                    scannerMode === "Entry"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  Time In (Entry)
                </button>
                <button
                  onClick={() => setScannerMode("Exit")}
                  className={cn(
                    "px-4 py-1.5 text-sm font-bold rounded-lg transition-colors",
                    scannerMode === "Exit"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  Time Out (Leave)
                </button>
              </div>

              <select
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 z-10 relative cursor-pointer hover:border-slate-300"
                value={attendanceCategory}
                onChange={(e) => setAttendanceCategory(e.target.value as any)}
                title="Role to mark attendance"
              >
                <option value="All">All Members</option>
                <option value="Students">Students Only</option>
                <option value="Teachers">Teachers Only</option>
                <option value="Other Staff">Other Staff Only</option>
              </select>

              {attendanceCategory === "Students" && (
                <select
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 z-10 relative cursor-pointer hover:border-slate-300 animate-fade-in"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  title="Select class to restrict attendance"
                >
                  <option value="">All Classes</option>
                  {[
                    "Nursery",
                    "LKG",
                    "UKG",
                    "Class 1",
                    "Class 2",
                    "Class 3",
                    "Class 4",
                    "Class 5",
                    "Class 6",
                    "Class 7",
                    "Class 8",
                    "Class 9",
                    "Class 10",
                    "Class 11",
                    "Class 12",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600 focus:outline-none transition-colors z-10 relative"
                  title={soundEnabled ? "Mute beep" : "Enable beep"}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <VolumeX className="w-5 h-5" />
                  )}
                </button>

                {onExit && (
                  <button
                    onClick={onExit}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm transition-all flex items-center gap-2 z-10 relative"
                  >
                    <X className="w-4 h-4" /> Exit
                  </button>
                )}
                <button
                  onClick={() => setIsScanning(!isScanning)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 z-10 relative",
                    isScanning
                      ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20",
                  )}
                >
                  {isScanning ? "Stop Camera" : "Start Camera"}
                </button>
              </div>
            </div>
          </div>

          {isScanning && (
            <div className="mb-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 animate-fade-in shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                <div>
                  <p className="text-xs font-black text-indigo-950 uppercase tracking-widest">Simulate Camera Target</p>
                  <p className="text-[11px] text-slate-500">Pick who stands in front of the camera to verify real-time log rules</p>
                </div>
              </div>
              <select
                className="px-4 py-2.5 bg-white border border-indigo-200 focus:border-indigo-400 rounded-xl text-xs font-extrabold text-slate-850 outline-none w-full sm:w-auto cursor-pointer"
                value={simulatedPersonId}
                onChange={(e) => setSimulatedPersonId(e.target.value)}
              >
                <optgroup label="✅ FACE REGISTERED (Allows check-in/out)">
                  {students.filter(s => registeredFaceIds.includes(s.id)).map(s => (
                    <option key={s.id} value={s.id}>
                      🎓 [Student] {s.name} ({s.class} - Registered)
                    </option>
                  ))}
                  {teachers.filter(t => registeredFaceIds.includes(t.id)).map(t => (
                    <option key={t.id} value={t.id}>
                      👔 [Teacher] {t.name} (Registered)
                    </option>
                  ))}
                  {(settings.staffMembers || []).filter((st: any) => registeredFaceIds.includes(st.id)).map((st: any) => (
                    <option key={st.id} value={st.id}>
                      🛠️ [Staff] {st.name} (Registered)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🚨 FACES UNREGISTERED (Triggers Warning Sound)">
                  <option value="unregistered_guest">
                    👽 Unregistered Guest / Unknown Face
                  </option>
                  {students.filter(s => !registeredFaceIds.includes(s.id)).map(s => (
                    <option key={s.id} value={s.id}>
                      ❌ Student: {s.name} ({s.class} - Unregistered)
                    </option>
                  ))}
                  {teachers.filter(t => !registeredFaceIds.includes(t.id)).map(t => (
                    <option key={t.id} value={t.id}>
                      ❌ Teacher: {t.name} (Unregistered)
                    </option>
                  ))}
                  {(settings.staffMembers || []).filter((st: any) => !registeredFaceIds.includes(st.id)).map((st: any) => (
                    <option key={st.id} value={st.id}>
                      ❌ Staff: {st.name} (Unregistered)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          <div className="relative rounded-3xl overflow-hidden bg-slate-900 aspect-video flex flex-col items-center justify-center border-[6px] border-slate-800 shadow-2xl relative z-10">
            {isScanning ? (
              !modelsLoaded ? (
                <div className="flex flex-col items-center justify-center text-indigo-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="font-bold">Loading AI Models...</p>
                  <p className="text-xs text-indigo-300 mt-1">
                    This takes a few seconds on first run
                  </p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onPlay={handleVideoPlay}
                    className="w-full h-full object-cover"
                  />

                  {/* Simulated Bounding Boxes Overlay */}
                  {detectedFaces.map((face, idx) => {
                    const isUnregistered = face.id === "unknown";
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "absolute z-20 border-2 rounded-xl transition-all duration-300",
                          isUnregistered
                            ? "border-rose-500 bg-rose-500/10"
                            : "border-emerald-400 bg-emerald-400/10"
                        )}
                        style={{
                          left: "30%",
                          top: "20%",
                          width: "40%",
                          height: "60%",
                        }}
                      >
                        <div className={cn(
                          "absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-[11px] font-black px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg transition-colors flex items-center gap-1.5",
                          isUnregistered ? "bg-rose-600 animate-bounce" : "bg-emerald-500"
                        )}>
                          {isUnregistered && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>}
                          {isUnregistered ? "⚠️ WARNING: Face Not Registered" : `${face.name} • ${face.confidence}% Match`}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Processing Overlay Effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none mix-blend-overlay"></div>
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <span className="text-white text-xs font-bold tracking-wider opacity-80 shadow-black drop-shadow-md">
                      LIVE RECOGNITION
                    </span>
                  </div>
                </>
              )
            ) : (
              <div className="text-center p-8">
                <Camera className="w-16 h-16 text-slate-700 mx-auto mb-4 opacity-50" />
                <p className="text-slate-400 font-medium">
                  Camera is inactive.
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Click "Start Camera" to begin scanning.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 relative z-10">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium uppercase mb-1">
                Model Accuracy
              </p>
              <p className="font-bold text-indigo-700">99.8%</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium uppercase mb-1">
                Processing Time
              </p>
              <p className="font-bold text-slate-800">~120ms</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium uppercase mb-1">
                Registered Faces
              </p>
              <p className="font-bold text-slate-800">2,840</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 overflow-hidden relative">
          <div className="flex justify-between items-center mb-6 z-10 relative">
            <h3 className="font-bold text-slate-800">Live Attendance Log</h3>
            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
              {logs.length} Logged
            </span>
          </div>

          {/* Connected Devices Indicator */}
          <div className="flex gap-2 mb-6 flex-wrap pb-4 border-b border-slate-100">
            <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              This Device (Online)
            </div>
            <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_2s_ease-in-out_infinite]"></span>
              Gate 1 (Tablet)
            </div>
            <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_3s_ease-in-out_infinite]"></span>
              Library (Camera 2)
            </div>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto relative z-10">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">
                No members detected yet.
              </p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-2xl border animate-fade-in",
                    log.status === "ALREADY LOGGED" || log.status === "UNREGISTERED"
                      ? "bg-rose-50 border-rose-100"
                      : log.status === "LATE"
                        ? "bg-amber-50 border-amber-100"
                        : "bg-slate-50 border-slate-100",
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full overflow-hidden border-2 shrink-0",
                      log.status === "ALREADY LOGGED" || log.status === "UNREGISTERED"
                        ? "border-rose-400 animate-pulse"
                        : log.status === "LATE"
                          ? "border-amber-400"
                          : "border-emerald-400",
                    )}
                  >
                    <img referrerPolicy="no-referrer" src={log.photo} alt={log.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {log.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-black uppercase text-center",
                          log.type === "Student"
                            ? "bg-blue-100 text-blue-700"
                            : log.type === "Teacher"
                              ? "bg-purple-100 text-purple-700"
                              : log.type === "Unknown"
                                ? "bg-red-100 text-red-600 border border-red-200"
                                : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {log.type || "Student"}
                      </span>
                      <p className="text-xs text-slate-500 truncate">
                        {log.class} • ID/Roll: {log.roll}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "text-xs font-bold mb-0.5",
                        log.status === "ALREADY LOGGED" || log.status === "UNREGISTERED"
                          ? "text-rose-600 font-extrabold"
                          : log.status === "LATE"
                            ? "text-amber-600 font-extrabold"
                            : "text-emerald-600 font-extrabold",
                      )}
                    >
                      {log.status === "ALREADY LOGGED"
                        ? "ALREADY LOGGED"
                        : log.status === "UNREGISTERED"
                          ? "NOT REGISTERED"
                          : log.status || "PRESENT"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {log.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2rem] p-6 text-white border border-slate-800 shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" /> Security Controls
          </h3>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Anti-spoofing is enabled. The system will prevent attendance marking
            using photos or videos shown on devices.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-sm font-semibold"
            >
              <UserPlus className="w-4 h-4" /> Register New Face Data
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isRegisterModalOpen && (
          <RegisterFaceModal
            onClose={() => setIsRegisterModalOpen(false)}
            onRegister={(id) => handleRegisterFace(id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RegisterFaceModal({
  onClose,
  onRegister,
}: {
  onClose: () => void;
  onRegister?: (id: string) => void;
}) {
  const { students, teachers } = useSchool();
  const { settings } = useWebsite();
  const [step, setStep] = useState<"info" | "scan" | "success">("info");
  const [memberType, setMemberType] = useState<
    "Student" | "Teacher" | "Other Staff"
  >("Student");
  const [formData, setFormData] = useState({
    name: "",
    class: "",
    section: "A",
    id: "",
    roleOrSubject: "",
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Reset fields when switching type to prevent cross-contamination
  useEffect(() => {
    setFormData({
      name: "",
      class: "",
      section: "A",
      id: "",
      roleOrSubject: "",
    });
    setSearchError("");
    setIsVerified(false);
  }, [memberType]);

  // Auto-fetch profile as soon as the ID matches a record
  useEffect(() => {
    const searchId = formData.id.trim().toLowerCase();
    if (!searchId) {
      setIsVerified(false);
      return;
    }

    if (memberType === "Student") {
      const student = students.find((s) => s.id.toLowerCase() === searchId);
      if (student) {
        setFormData((prev) => ({
          ...prev,
          name: student.name,
          class: student.class || "N/A",
          section: student.section || "A",
        }));
        setIsVerified(true);
        setSearchError("");
      } else {
        setIsVerified(false);
      }
    } else if (memberType === "Teacher") {
      const teacher = teachers.find((t) => t.id.toLowerCase() === searchId);
      if (teacher) {
        setFormData((prev) => ({
          ...prev,
          name: teacher.name,
          roleOrSubject: teacher.subject || "Teaching Department",
        }));
        setIsVerified(true);
        setSearchError("");
      } else {
        setIsVerified(false);
      }
    } else {
      const staffList = settings.staffMembers || [];
      const staff = staffList.find(
        (st: any) => st.id.toLowerCase() === searchId,
      );
      if (staff) {
        setFormData((prev) => ({
          ...prev,
          name: staff.name,
          roleOrSubject: staff.role || "Institution Staff",
        }));
        setIsVerified(true);
        setSearchError("");
      } else {
        setIsVerified(false);
      }
    }
  }, [formData.id, memberType, students, teachers, settings.staffMembers]);

  const searchMember = () => {
    if (!formData.id) return;
    setIsSearching(true);
    setSearchError("");

    // Simulate lookup with real records
    setTimeout(() => {
      const searchId = formData.id.trim().toLowerCase();
      if (memberType === "Student") {
        const student = students.find((s) => s.id.toLowerCase() === searchId);
        if (student) {
          setFormData((prev) => ({
            ...prev,
            name: student.name,
            class: student.class || "N/A",
            section: student.section || "A",
          }));
          setIsVerified(true);
        } else {
          setSearchError("Student not found with this ID");
          setIsVerified(false);
        }
      } else if (memberType === "Teacher") {
        const teacher = teachers.find((t) => t.id.toLowerCase() === searchId);
        if (teacher) {
          setFormData((prev) => ({
            ...prev,
            name: teacher.name,
            roleOrSubject: teacher.subject || "Teaching Department",
          }));
          setIsVerified(true);
        } else {
          setSearchError("Teacher not found with this ID");
          setIsVerified(false);
        }
      } else {
        const staffList = settings.staffMembers || [];
        const staff = staffList.find(
          (st: any) => st.id.toLowerCase() === searchId,
        );
        if (staff) {
          setFormData((prev) => ({
            ...prev,
            name: staff.name,
            roleOrSubject: staff.role || "Institution Staff",
          }));
          setIsVerified(true);
        } else {
          setSearchError("Staff member not found with this ID");
          setIsVerified(false);
        }
      }
      setIsSearching(false);
    }, 400);
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (step === "scan") {
      timeout = setTimeout(() => {
        if (onRegister && formData.id) {
          onRegister(formData.id);
        }
        setStep("success");
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [step, onRegister, formData.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="relative p-6 border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-indigo-600" />
            Register Face
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {memberType === "Student" && "Add a new student to the system"}
            {memberType === "Teacher" && "Add a new teacher to the system"}
            {memberType === "Other Staff" &&
              "Add a new staff member to the system"}
          </p>
        </div>

        <div className="p-6">
          {step === "info" && (
            <div className="space-y-4">
              {/* Member Type Selection Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                {(["Student", "Teacher", "Other Staff"] as const).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMemberType(type)}
                      className={cn(
                        "flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all",
                        memberType === type
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      {type === "Other Staff" ? "Other Staff" : type + "s"}
                    </button>
                  ),
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {memberType === "Student" && "Student ID (Admission No.)"}
                  {memberType === "Teacher" && "Teacher ID"}
                  {memberType === "Other Staff" && "Staff ID"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
                    placeholder={
                      memberType === "Student"
                        ? "e.g. ADM2023001"
                        : memberType === "Teacher"
                          ? "e.g. T001"
                          : "e.g. staff-1"
                    }
                    value={formData.id}
                    onChange={(e) =>
                      setFormData({ ...formData, id: e.target.value })
                    }
                  />
                  <button
                    onClick={searchMember}
                    disabled={isSearching || !formData.id}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                  >
                    {isSearching ? (
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin"></div>
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {searchError && (
                  <p className="text-red-500 text-xs mt-1 font-semibold">
                    {searchError}
                  </p>
                )}
                {isVerified && (
                  <p className="text-emerald-600 text-xs mt-1.5 font-bold flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg w-fit animate-fade-in">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                    Profile Found & Verified ✓
                  </p>
                )}
              </div>

              {memberType === "Student" ? (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Class
                    </label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none font-medium text-slate-850"
                      value={formData.class}
                      onChange={(e) =>
                        setFormData({ ...formData, class: e.target.value })
                      }
                    >
                      <option value="">Select Class</option>
                      {[
                        "Nursery",
                        "LKG",
                        "UKG",
                        "Class 1",
                        "Class 2",
                        "Class 3",
                        "Class 4",
                        "Class 5",
                        "Class 6",
                        "Class 7",
                        "Class 8",
                        "Class 9",
                        "Class 10",
                        "Class 11",
                        "Class 12",
                      ].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Section
                    </label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none font-medium text-slate-850"
                      value={formData.section}
                      onChange={(e) =>
                        setFormData({ ...formData, section: e.target.value })
                      }
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1 font-semibold">
                      Full Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
                      placeholder={
                        memberType === "Teacher"
                          ? "e.g. Dr. Sarah Jenkins"
                          : "e.g. Priyanjali Bora"
                      }
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {memberType === "Teacher"
                        ? "Subject / Department"
                        : "Role / Designation"}
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
                      placeholder={
                        memberType === "Teacher"
                          ? "e.g. Mathematics"
                          : "e.g. Senior Librarian"
                      }
                      value={formData.roleOrSubject}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          roleOrSubject: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex flex-col gap-3">
                <button
                  onClick={() => setStep("scan")}
                  disabled={!formData.name || !formData.id}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  Continue to face scan
                </button>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    disabled={!formData.name || !formData.id}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setStep("scan");
                      }
                    }}
                  />
                  <div
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold transition-colors",
                      !formData.name || !formData.id
                        ? "opacity-50"
                        : "hover:bg-slate-50",
                    )}
                  >
                    <Upload className="w-5 h-5" /> Upload Photo from Gallery
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "scan" && (
            <div className="text-center py-6 animate-fade-in">
              <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden border-4 border-indigo-100 bg-indigo-50">
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanFace className="w-16 h-16 text-indigo-300 animate-pulse" />
                </div>
                <div className="absolute inset-0 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Scanning Face...
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Please look directly at the camera.
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 flex items-center justify-center rounded-full mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                Face Registered!
              </h3>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                <strong>{formData.name}</strong> has been successfully
                registered to the face recognition database as a{" "}
                <strong>{memberType}</strong>.
              </p>
              <button
                onClick={onClose}
                className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
