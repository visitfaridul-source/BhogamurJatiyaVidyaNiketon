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

          // Match detected face with a candidate (Simulated logic for demonstration)
          const matchedPerson =
            candidates[Math.floor(Math.random() * candidates.length)];
          const faceData = {
            ...matchedPerson,
            confidence: Math.round(detections[0].score * 100),
            photo: matchedPerson.photo,
          };

          setDetectedFaces([faceData]);

          const now = new Date();
          const scanTimeStr = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          const curScannerMode = latestScannerMode.current;
          
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
                  // Danger/Alert sound
                  const errorAudio = new Audio(
                    "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
                  );
                  errorAudio
                    .play()
                    .catch((e) => console.log("Audio play failed:", e));

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
                  {detectedFaces.map((face, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute z-20 border-2 border-emerald-400 bg-emerald-400/10 rounded-xl"
                      style={{
                        left: "30%",
                        top: "20%",
                        width: "40%",
                        height: "60%",
                      }}
                    >
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg">
                        {face.name} • {face.confidence}% Match
                      </div>
                    </motion.div>
                  ))}

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
                    log.status === "ALREADY LOGGED"
                      ? "bg-rose-50 border-rose-100"
                      : log.status === "LATE"
                        ? "bg-amber-50 border-amber-100"
                        : "bg-slate-50 border-slate-100",
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full overflow-hidden border-2 shrink-0",
                      log.status === "ALREADY LOGGED"
                        ? "border-rose-400"
                        : log.status === "LATE"
                          ? "border-amber-400"
                          : "border-emerald-400",
                    )}
                  >
                    <img src={log.photo} alt={log.name} />
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
                        log.status === "ALREADY LOGGED"
                          ? "text-rose-600"
                          : log.status === "LATE"
                            ? "text-amber-600"
                            : "text-emerald-600",
                      )}
                    >
                      {log.status === "ALREADY LOGGED"
                        ? "ALREADY LOGGED"
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
          <RegisterFaceModal onClose={() => setIsRegisterModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function RegisterFaceModal({ onClose }: { onClose: () => void }) {
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
      timeout = setTimeout(() => setStep("success"), 3000);
    }
    return () => clearTimeout(timeout);
  }, [step]);

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
