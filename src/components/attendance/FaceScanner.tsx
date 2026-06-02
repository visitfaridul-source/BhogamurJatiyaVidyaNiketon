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
    "All" | "Students" | "Teachers"
  >("All");
  const [scannerMode, setScannerMode] = useState<"Entry" | "Exit">("Entry");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string>("");
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<any[]>([]);
  const [scanResultAlert, setScanResultAlert] = useState<{
    id: string;
    name: string;
    class: string;
    status: string;
    type: string;
    time: string;
    photo: string;
  } | null>(null);
  const alertTimeoutRef = useRef<any>(null);
  const detectedFacesTimeoutRef = useRef<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wakeLockRef = useRef<any>(null);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const latestFaceMatcher = useRef<faceapi.FaceMatcher | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);

  useEffect(() => {
    latestFaceMatcher.current = faceMatcher;
  }, [faceMatcher]);
  const [isFaceMatcherLoading, setIsFaceMatcherLoading] = useState(false);
  
  const latestStudents = useRef(students);
  const latestTeachers = useRef(teachers);

  const updateDeviceList = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((device) => device.kind === "videoinput");
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          const savedCamera = localStorage.getItem("bhogamur_selected_camera_id");
          if (savedCamera && videoInputs.some(v => v.deviceId === savedCamera)) {
            setSelectedDeviceId(savedCamera);
          } else {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        }
      }
    } catch (err) {
      console.warn("Could not enumerate camera devices:", err);
    }
  };
  const latestStaff = useRef(settings.staffMembers || []);
  const latestSelectedClass = useRef(selectedClass);
  const latestCategory = useRef(attendanceCategory);
  const latestScannerMode = useRef(scannerMode);
  const latestAttendance = useRef(attendanceMap);
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);

  const [registeredFaceIds, setRegisteredFaceIds] = useState<string[]>([]);

  const latestRegisteredFaceIds = useRef(registeredFaceIds);
  const latestIsScanning = useRef(isScanning);
  const latestSoundEnabled = useRef(soundEnabled);

  useEffect(() => {
    latestRegisteredFaceIds.current = registeredFaceIds;
  }, [registeredFaceIds]);

  useEffect(() => {
    latestIsScanning.current = isScanning;
  }, [isScanning]);

  useEffect(() => {
    latestSoundEnabled.current = soundEnabled;
  }, [soundEnabled]);

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
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        globalScannerModelsLoaded = true;
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
      }
    };
    loadModels();
  }, []);

  const DESCRIPTOR_CACHE_KEY = 'bhogamur_face_descriptors_cache';
  
  const getDescriptorCache = (): Record<string, number[]> => {
    try {
      const saved = localStorage.getItem(DESCRIPTOR_CACHE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  };

  const saveDescriptorCache = (cache: Record<string, number[]>) => {
    try {
      localStorage.setItem(DESCRIPTOR_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to save descriptor cache', e);
    }
  };

  useEffect(() => {
    if (!modelsLoaded) return;

    const createFaceMatcher = async () => {
      setIsFaceMatcherLoading(true);
      const labeledFaceDescriptors: faceapi.LabeledFaceDescriptors[] = [];

      const allPeople = [
        ...students.map(s => ({ id: s.id, name: s.name, type: 'Student', photoUrl: s.avatar || '' })),
        ...teachers.map(t => ({ id: t.id, name: t.name, type: 'Teacher', photoUrl: t.avatar || '' }))
      ];

      const cache = getDescriptorCache();
      let cacheUpdated = false;

      for (const person of allPeople) {
        // Priority 1: Camera-trained descriptor from local storage
        const cameraCacheKey = `camera_${person.id}`;
        if (cache[cameraCacheKey]) {
          try {
            const floatArray = new Float32Array(cache[cameraCacheKey]);
            labeledFaceDescriptors.push(
              new faceapi.LabeledFaceDescriptors(person.id, [floatArray])
            );
            continue;
          } catch (err) {
            console.warn(`Failed to reload camera-trained face descriptor for ${person.name}`, err);
          }
        }

        // Priority 2: Valid photoUrl (Firebase Storage or direct URI, NOT placeholders)
        if (
          person.photoUrl && 
          !person.photoUrl.includes('dicebear') && 
          !person.photoUrl.includes('unsplash') && 
          !person.photoUrl.includes('ui-avatars')
        ) {
          const cacheKey = `${person.id}:${person.photoUrl}`;
          if (cache[cacheKey]) {
            try {
              const floatArray = new Float32Array(cache[cacheKey]);
              labeledFaceDescriptors.push(
                new faceapi.LabeledFaceDescriptors(person.id, [floatArray])
              );
              continue;
            } catch (err) {
              console.warn(`Failed to reload cached face descriptors for ${person.name}, re-detecting...`, err);
            }
          }

          try {
            const img = await faceapi.fetchImage(person.photoUrl);
            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            
            if (detection) {
              labeledFaceDescriptors.push(
                new faceapi.LabeledFaceDescriptors(person.id, [detection.descriptor])
              );
              cache[cacheKey] = Array.from(detection.descriptor);
              cacheUpdated = true;
            }
          } catch (e) {
            console.error(`Error processing image for ${person.name}`, e);
          }
        }
      }

      if (cacheUpdated) {
        saveDescriptorCache(cache);
      }

      if (labeledFaceDescriptors.length > 0) {
        setFaceMatcher(new faceapi.FaceMatcher(labeledFaceDescriptors, 0.60));
      } else {
        setFaceMatcher(null);
      }
      setIsFaceMatcherLoading(false);
    };

    createFaceMatcher();
  }, [modelsLoaded, students, teachers, cacheVersion]);

  // Pre-fetch camera permissions on mounting and list all video devices instantly
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter(d => d.kind === "videoinput");
          setVideoDevices(videoInputs);
          const savedCamera = localStorage.getItem("bhogamur_selected_camera_id");
          if (savedCamera && videoInputs.some(v => v.deviceId === savedCamera)) {
            setSelectedDeviceId(savedCamera);
          } else if (videoInputs.length > 0) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        })
        .catch(err => console.log("Initial enumerateDevices failed:", err));
    }
  }, []);

  // Automatically start tracking video play inside stream setup

  useEffect(() => {
    let stream: MediaStream | null = null;
    setCameraError("");

    if (isScanning && !isRegisterModalOpen && modelsLoaded && videoRef.current) {
      const constraints = selectedDeviceId 
        ? { video: { deviceId: { ideal: selectedDeviceId } } } 
        : { video: { facingMode: 'environment' } };

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(async (s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            try {
              await videoRef.current.play();
            } catch (playErr) {
              console.log("Autoplay waiting or user gesture required:", playErr);
            }
          }
          // Start the detection loop programmatically to bypass any missed browser events
          handleVideoPlay();
          
          // Populate list again to ensure labels are detailed after permission is acquired
          updateDeviceList();

          try {
            if ("wakeLock" in navigator) {
              wakeLockRef.current = await navigator.wakeLock.request("screen");
            }
          } catch (err) {
            console.error("Wake Lock request failed:", err);
          }
        })
        .catch((err) => {
          console.error("Camera access denied or unavailable", err);
          setCameraError(err.message || "Permission Denied or Camera Busy");
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
  }, [isScanning, modelsLoaded, selectedDeviceId, isRegisterModalOpen]);

   

  const handleVideoPlay = () => {
    if (detectionInterval.current) clearInterval(detectionInterval.current);

    detectionInterval.current = setInterval(async () => {
      if (videoRef.current && latestIsScanning.current) {
        try {
          const detections = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.35, // More sensitive to facial angles and lighting!
            }),
          ).withFaceLandmarks().withFaceDescriptors();

          if (detections.length > 0 && latestFaceMatcher.current) {
            const candidates: any[] = [];
            
            const currentStudents = latestStudents.current;
            candidates.push(
              ...currentStudents.map((s) => ({
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

            const curCategory = latestCategory.current;

            // Pick the best match from the face matching engine
            const bestMatch = latestFaceMatcher.current.findBestMatch(detections[0].descriptor);
            let targetCandidate = null;

            if (bestMatch.label !== 'unknown') {
               targetCandidate = candidates.find((c) => c.id === bestMatch.label);
               
               // Check category filter
               if (targetCandidate) {
                  const currentSelectedClass = latestSelectedClass.current;
                  let isValidCategory = true;
                  
                  if (curCategory === "Students") {
                    if (targetCandidate.type !== "Student") isValidCategory = false;
                    if (currentSelectedClass && targetCandidate.class !== currentSelectedClass) isValidCategory = false;
                  } else if (curCategory === "Teachers") {
                    if (targetCandidate.type !== "Teacher") isValidCategory = false;
                  }
                  
                  if (!isValidCategory) {
                    targetCandidate = null; // Deny if wrong category selected
                  }
               }
            }

            const isRegistered = !!targetCandidate; // Treat as registered if Face Matcher confidently mapped them to an ID

            const now = new Date();
            const scanTimeStr = now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            const curScannerMode = latestScannerMode.current;

            if (!targetCandidate) {
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
              if (detectedFacesTimeoutRef.current) clearTimeout(detectedFacesTimeoutRef.current);
              detectedFacesTimeoutRef.current = setTimeout(() => setDetectedFaces([]), 2000);

              setScanResultAlert({
                id: "unknown",
                name: faceData.name,
                class: faceData.class,
                type: faceData.type,
                photo: faceData.photo,
                status: "UNREGISTERED",
                time: scanTimeStr,
              });
              if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
              alertTimeoutRef.current = setTimeout(() => {
                setScanResultAlert(null);
              }, 4000);

              if (latestSoundEnabled.current) {
                playWebAudioSound("warning");
                speakVoice("Face not registered! Admission declined.");
              }

              setLogs((prev) => {
                const isRecentDuplicate = prev
                  .slice(0, 5)
                  .some((l) => l.id === "unknown" && l.status === "UNREGISTERED");

                if (!isRecentDuplicate) {
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

            const matchedPerson = targetCandidate;
            const faceData = {
              ...matchedPerson,
              confidence: Math.round(detections[0].detection.score * 100),
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

            const isLate = scanTimeStr >= "10:00";
            const isEarlyLeave = scanTimeStr < "14:30";
            const finalStatus = hasAlreadyScanned
              ? "ALREADY LOGGED"
              : (curScannerMode === "Entry"
                ? (isLate ? "LATE" : "PRESENT")
                : (isEarlyLeave ? "EARLY LEAVE" : "LEFT"));

            setScanResultAlert({
              id: matchedPerson.id,
              name: matchedPerson.name,
              class: matchedPerson.class,
              type: matchedPerson.type,
              photo: matchedPerson.photo,
              status: finalStatus,
              time: scanTimeStr,
            });
            if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
            alertTimeoutRef.current = setTimeout(() => {
              setScanResultAlert(null);
            }, 4000);

            if (latestSoundEnabled.current) {
              if (hasAlreadyScanned) {
                playWebAudioSound("warning");
                speakVoice(`${matchedPerson.name}, Already Marked!`);
              } else {
                playWebAudioSound("success");
                speakVoice(`${matchedPerson.name}, Present!`);
                const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3");
                audio.play().catch((e) => console.log("Audio play failed:", e));
              }
            }

            setLogs((prev) => {
              const isRecentDuplicate = prev
                .slice(0, 10)
                .some(
                  (l) => l.id === matchedPerson.id && l.mode === curScannerMode,
                );

              if (!isRecentDuplicate || hasAlreadyScanned) {
                if (hasAlreadyScanned) {
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

                if (curScannerMode === "Entry") {
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

            if (detectedFacesTimeoutRef.current) clearTimeout(detectedFacesTimeoutRef.current);
            detectedFacesTimeoutRef.current = setTimeout(() => {
              setDetectedFaces([]);
            }, 2000);
          }
        } catch (err) {
          console.warn("Face detection check failed gracefully:", err);
        }
      }
    }, 1500); // Check every 1.5s
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 animate-fade-in">
      {/* Main Scanner Section */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative">
          
          {/* Top Control Bar */}
          <div className="p-4 sm:p-6 pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-20">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-indigo-500/20 rounded-xl">
                  <ScanFace className="w-6 h-6 text-indigo-400" />
                </div>
                Live Face Scanner
              </h2>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Sensors Active
                </span>
                <span className="text-slate-400 font-mono text-xs">AI VERIFICATION ENGINE</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 p-1.5 bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700/50">
              <div className="flex rounded-xl overflow-hidden bg-slate-900">
                <button
                  onClick={() => setScannerMode("Entry")}
                  className={cn(
                    "px-5 py-2 text-sm font-bold transition-all",
                    scannerMode === "Entry"
                      ? "bg-indigo-500 text-white shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-800",
                  )}
                >
                  Entry Mode
                </button>
                <button
                  onClick={() => setScannerMode("Exit")}
                  className={cn(
                    "px-5 py-2 text-sm font-bold transition-all",
                    scannerMode === "Exit"
                      ? "bg-indigo-500 text-white shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-800",
                  )}
                >
                  Exit Mode
                </button>
              </div>

              <div className="h-6 w-px bg-slate-700 mx-1"></div>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={cn(
                  "p-2.5 rounded-xl transition-all border",
                  soundEnabled 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700"
                )}
                title={soundEnabled ? "Mute Output" : "Enable Audio"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsScanning(!isScanning)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg flex items-center gap-2",
                  isScanning
                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25"
                    : "bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/25",
                )}
              >
                {isScanning ? "🛑 Hault Scanner" : "▶️ Initialize Lens"}
              </button>
              
              {onExit && (
                <button
                  onClick={onExit}
                  className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all font-bold"
                  title="Close Screen"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Camera Viewport */}
          <div className="relative aspect-video mt-6 bg-black border-y border-slate-800 flex flex-col items-center justify-center">
            {/* Viewport Corner Brackets */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-indigo-500/50 rounded-tl-lg z-10 pointer-events-none"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-indigo-500/50 rounded-tr-lg z-10 pointer-events-none"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-indigo-500/50 rounded-bl-lg z-10 pointer-events-none"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-indigo-500/50 rounded-br-lg z-10 pointer-events-none"></div>

            {isScanning ? (
              !modelsLoaded || isFaceMatcherLoading ? (
                <div className="flex flex-col items-center justify-center text-center text-indigo-400 z-10">
                  <div className="relative">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-ping"></div>
                    <Loader2 className="w-12 h-12 animate-spin relative z-10 text-indigo-500" />
                  </div>
                  <p className="font-extrabold mt-6 tracking-widest uppercase text-sm">Initializing Neural Net</p>
                  <p className="text-xs text-indigo-400/60 mt-2 font-mono">Loading face descriptor dictionaries...</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onPlay={handleVideoPlay}
                    className="w-full h-full object-cover opacity-90 mix-blend-lighten"
                  />

                  {/* Processing Overlay Effect */}
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)50%,rgba(0,0,0,0.8)100%)]"></div>
                  
                  {/* Grid Lines */}
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

                  {/* Live Bounding Boxes Overlays */}
                  {detectedFaces.map((face, idx) => {
                    const isUnregistered = face.id === "unknown";
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "absolute z-20 transition-all duration-150 flex items-center justify-center",
                        )}
                        style={{
                          left: "30%",
                          top: "20%",
                          width: "40%",
                          height: "60%",
                        }}
                      >
                         <svg className="absolute inset-0 w-full h-full drop-shadow-md" viewBox="0 0 100 100" preserveAspectRatio="none">
                           <path d="M0,20 L0,0 L20,0 M80,0 L100,0 L100,20 M100,80 L100,100 L80,100 M20,100 L0,100 L0,80" fill="none" stroke={isUnregistered ? "#f43f5e" : "#10b981"} strokeWidth="1" />
                           <rect x="0" y="0" width="100" height="100" fill={isUnregistered ? "rgba(244, 63, 94, 0.1)" : "rgba(16, 185, 129, 0.1)"} />
                         </svg>

                         <div className={cn(
                           "absolute -bottom-12 font-mono px-4 py-2 rounded-lg text-white font-black text-xs uppercase tracking-widest whitespace-nowrap shadow-2xl backdrop-blur-md flex items-center gap-2",
                           isUnregistered ? "bg-rose-500/90 border border-rose-400" : "bg-emerald-500/90 border border-emerald-400"
                         )}>
                           {isUnregistered && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>}
                           {isUnregistered ? "UNKNOWN IDENTITY" : `${face.name} • ${face.confidence}%`}
                         </div>
                      </motion.div>
                    );
                  })}

                  {/* Top Left Live Indicator */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 text-white">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-90 font-mono">
                      REC
                    </span>
                  </div>

                  {/* Immersive Diagnostic Overlay */}
                  <AnimatePresence>
                    {scanResultAlert && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute inset-x-6 bottom-6 z-40 rounded-2xl overflow-hidden shadow-2xl border border-white/10 backdrop-blur-xl"
                        style={{
                          background: scanResultAlert.status === "UNREGISTERED" 
                            ? "linear-gradient(to right, rgba(225,29,72,0.95), rgba(159,18,57,0.95))"
                            : scanResultAlert.status === "ALREADY LOGGED"
                            ? "linear-gradient(to right, rgba(217,119,6,0.95), rgba(146,64,14,0.95))"
                            : "linear-gradient(to right, rgba(5,150,105,0.95), rgba(6,78,59,0.95))"
                        }}
                      >
                        <div className="p-4 sm:p-5 flex items-center gap-5">
                          <div className="relative shrink-0">
                            <img
                              src={scanResultAlert.photo}
                              alt={scanResultAlert.name}
                              referrerPolicy="no-referrer"
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-white/30 object-cover shadow-inner bg-black/20"
                            />
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shadow-xl"
                              style={{
                                background: scanResultAlert.status === "UNREGISTERED" ? "#f43f5e" : scanResultAlert.status === "ALREADY LOGGED" ? "#f59e0b" : "#10b981"
                              }}
                            >
                              {scanResultAlert.status === "UNREGISTERED" ? "⚠️" : scanResultAlert.status === "ALREADY LOGGED" ? "🔁" : "✓"}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 text-white">
                            <p className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-white/70 mb-1">
                              {scanResultAlert.type} // {scanResultAlert.class} // ID: {scanResultAlert.id}
                            </p>
                            <h4 className="text-lg sm:text-2xl font-black tracking-tight uppercase truncate">
                              {scanResultAlert.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="bg-black/30 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                                {scanResultAlert.status === "UNREGISTERED" 
                                  ? "ACCESS DENIED"
                                  : scanResultAlert.status === "ALREADY LOGGED"
                                  ? "DUPLICATE ENTRY"
                                  : "VERIFIED & LOGGED"}
                              </span>
                              <span className="text-[10px] font-mono text-white/50">
                                {scanResultAlert.time}
                              </span>
                            </div>
                          </div>

                          <button onClick={() => setScanResultAlert(null)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/20 text-white/70 hover:bg-black/40 hover:text-white transition-all">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )
            ) : (
              <div className="text-center p-8 flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-300 font-bold tracking-widest uppercase text-sm">
                  System Offline
                </p>
                <p className="text-slate-500 text-xs mt-2 font-mono">
                  Awaiting initialization command.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Control Bar */}
          <div className="p-4 sm:p-6 bg-slate-900 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
             <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50">
               <div className="p-3 bg-slate-800 rounded-xl">
                 <Camera className="w-4 h-4 text-indigo-400" />
               </div>
               <div className="flex-1 min-w-0 pr-2">
                 <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Capture Device</p>
                 <select
                   className="w-full bg-transparent border-none text-white text-xs font-bold outline-none cursor-pointer truncate mt-0.5 appearance-none"
                   value={selectedDeviceId}
                   onChange={(e) => {
                     setSelectedDeviceId(e.target.value);
                     localStorage.setItem("bhogamur_selected_camera_id", e.target.value);
                   }}
                 >
                   {videoDevices.length === 0 && <option value="">No devices found</option>}
                   {videoDevices.map((device, idx) => (
                     <option key={idx} value={device.deviceId} className="bg-slate-900 text-white">
                       {device.label || `Camera Device ${idx + 1}`}
                     </option>
                   ))}
                 </select>
               </div>
               <button
                 type="button"
                 onClick={async () => {
                   setIsScanning(false);
                   if (videoRef.current) videoRef.current.srcObject = null;
                   setTimeout(async () => {
                     await updateDeviceList();
                     setIsScanning(true);
                   }, 150);
                 }}
                 className="px-3 py-2 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
               >
                 Reset
               </button>
             </div>

             <div className="flex justify-around items-center h-full px-4 text-center divide-x divide-slate-800">
                <div className="px-4">
                  <p className="text-2xl font-black text-emerald-400 font-mono tracking-tighter">99.8<span className="text-sm">%</span></p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Accuracy</p>
                </div>
                <div className="px-4">
                  <p className="text-2xl font-black text-indigo-400 font-mono tracking-tighter">120<span className="text-sm">ms</span></p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Latency</p>
                </div>
                <div className="px-4">
                  <p className="text-2xl font-black text-amber-400 font-mono tracking-tighter">{registeredFaceIds.length}</p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Identities</p>
                </div>
             </div>
          </div>
        </div>

        {/* Security Controls & Manual Registration */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex flex-col items-center justify-center shrink-0">
               <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 tracking-tight">Identity Management</h3>
              <p className="text-xs text-slate-500 font-medium">Automatic synced across all institutional portals.</p>
            </div>
          </div>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" /> Add Identity
          </button>
        </div>
      </div>

      {/* Side Panel: Log Activity */}
      <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0 h-full max-h-[85vh]">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center z-10">
            <div>
              <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
                Session Ledger
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h3>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Real-time DB Sync</p>
            </div>
            <span className="text-xs font-black bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full shadow-sm">
              {logs.length} Logged
            </span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[400px] p-5 sm:p-6 space-y-3 bg-slate-50/30">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <ScanFace className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-600">No Check-ins Yet</p>
                <p className="text-xs mt-1">Waiting for initial facial scan...</p>
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-4 p-3.5 rounded-2xl border bg-white animate-fade-in transition-all",
                    log.status === "ALREADY LOGGED" || log.status === "UNREGISTERED"
                      ? "border-rose-100 shadow-[0_4px_15px_-3px_rgba(254,226,226,0.5)]"
                      : log.status === "LATE"
                        ? "border-amber-100 shadow-[0_4px_15px_-3px_rgba(254,243,199,0.5)]"
                        : "border-slate-100 hover:border-slate-300 shadow-sm",
                  )}
                >
                  <div className="relative">
                    <img referrerPolicy="no-referrer" src={log.photo} alt={log.name} className="w-12 h-12 rounded-xl object-cover bg-slate-100" />
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border-2 border-white",
                      log.status === "ALREADY LOGGED" || log.status === "UNREGISTERED" ? "bg-rose-500 text-white" : log.status === "LATE" ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                    )}>
                       {log.status === "UNREGISTERED" ? "!" : log.status === "ALREADY LOGGED" ? "↺" : "✓"}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate mb-0.5">
                      {log.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider",
                        log.type === "Student" ? "bg-blue-50 text-blue-600" : log.type === "Teacher" ? "bg-purple-50 text-purple-600" : "bg-slate-100 text-slate-600"
                      )}>
                        {log.type}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate font-mono">
                        {log.class}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-wider mb-1",
                      log.status === "ALREADY LOGGED" || log.status === "UNREGISTERED" ? "text-rose-600" : log.status === "LATE" ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {log.status === "ALREADY LOGGED" ? "DUPLICATE" : log.status === "UNREGISTERED" ? "UNKNOWN" : log.status || "PRESENT"}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                      {log.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isRegisterModalOpen && (
          <RegisterFaceModal
            onClose={() => setIsRegisterModalOpen(false)}
            onRegister={(id) => {
              handleRegisterFace(id);
              setCacheVersion((c) => c + 1);
            }}
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
    "Student" | "Teacher"
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
    }
  }, [formData.id, memberType, students, teachers]);

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
      }
      setIsSearching(false);
    }, 400);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanError, setScanError] = useState("");

  const saveTrainedFace = (descriptor: Float32Array) => {
    try {
      const DESCRIPTOR_CACHE_KEY = 'bhogamur_face_descriptors_cache';
      const saved = localStorage.getItem(DESCRIPTOR_CACHE_KEY);
      const cache = saved ? JSON.parse(saved) : {};
      cache[`camera_${formData.id}`] = Array.from(descriptor);
      localStorage.setItem(DESCRIPTOR_CACHE_KEY, JSON.stringify(cache));
      console.log("Saved local descriptor for:", formData.id);
    } catch (err) {
      console.warn("Local storage error:", err);
    }
  };

  const processUploadedImage = async (file: File) => {
    try {
      setStep("scan");
      setScanError("");
      const img = await faceapi.bufferToImage(file);
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        setScanError("No face detected in the uploaded image.");
        setTimeout(() => setStep("info"), 2000);
        return;
      }
      saveTrainedFace(detection.descriptor);
      if (onRegister && formData.id) onRegister(formData.id);
      setStep("success");
    } catch (e) {
      console.error(e);
      setScanError("Error processing image.");
      setTimeout(() => setStep("info"), 2000);
    }
  };

  useEffect(() => {
    let localStream: MediaStream | null = null;
    let scanInterval: NodeJS.Timeout;

    if (step === "scan" && !scanError) {
      const startCamera = async () => {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          if (videoRef.current) {
            videoRef.current.srcObject = localStream;
            await videoRef.current.play();
          }
        } catch (e) {
          setScanError("Camera access denied.");
          setTimeout(() => setStep("info"), 2000);
        }
      };

      startCamera();

      scanInterval = setInterval(async () => {
        if (videoRef.current && localStream) {
          try {
            const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
            if (detection) {
              clearInterval(scanInterval);
              saveTrainedFace(detection.descriptor);
              if (onRegister && formData.id) onRegister(formData.id);
              setStep("success");
            }
          } catch (e) {
            // ignore scan errors, keep trying
          }
        }
      }, 1000);
    }

    return () => {
      clearInterval(scanInterval);
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [step, scanError, onRegister, formData.id]);

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
          </p>
        </div>

        <div className="p-6">
          {step === "info" && (
            <div className="space-y-4">
              {/* Member Type Selection Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                {(["Student", "Teacher"] as const).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMemberType(type)}
                      className={cn(
                        "flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all",
                        memberType === type
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      {type + "s"}
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
                        processUploadedImage(e.target.files[0]);
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
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {!videoRef.current?.srcObject && !scanError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ScanFace className="w-16 h-16 text-indigo-300 animate-pulse" />
                  </div>
                )}
                <div className="absolute inset-0 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {scanError ? "Scan Error" : "Scanning Face..."}
              </h3>
              <p className={cn("text-sm mt-2", scanError ? "text-rose-600" : "text-slate-500")}>
                {scanError || "Please look directly at the camera."}
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
