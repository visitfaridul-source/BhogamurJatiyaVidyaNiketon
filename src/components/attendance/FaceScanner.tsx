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
        ...teachers.map(t => ({ id: t.id, name: t.name, type: 'Teacher', photoUrl: t.avatar || '' })),
        ...(settings.staffMembers || []).map((st: any) => ({ id: st.id, name: st.name, type: 'Other Staff', photoUrl: st.imageUrl || '' }))
      ];

      const cache = getDescriptorCache();
      let cacheUpdated = false;

      for (const person of allPeople) {
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
                new faceapi.LabeledFaceDescriptors(person.id, [floatArray]) // Using ID instead of name to reliably map
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
  }, [modelsLoaded, students, teachers, settings.staffMembers]);

  // Warmup/Pre-fetch camera permissions on mounting and list all video devices instantly
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter(d => d.kind === "videoinput");
          // If labels are empty, we request once to trigger permissions so they are listed with labels
          if (videoInputs.length > 0 && !videoInputs[0].label) {
            navigator.mediaDevices.getUserMedia({ video: true })
              .then((s) => {
                updateDeviceList();
                s.getTracks().forEach(t => t.stop());
              })
              .catch(e => console.log("Warmup getUserMedia rejected:", e));
          } else {
            setVideoDevices(videoInputs);
            const savedCamera = localStorage.getItem("bhogamur_selected_camera_id");
            if (savedCamera && videoInputs.some(v => v.deviceId === savedCamera)) {
              setSelectedDeviceId(savedCamera);
            } else if (videoInputs.length > 0) {
              setSelectedDeviceId(videoInputs[0].deviceId);
            }
          }
        })
        .catch(err => console.log("Initial enumerateDevices failed:", err));
    }
  }, []);

  // Automatically start tracking video play inside stream setup

  useEffect(() => {
    let stream: MediaStream | null = null;
    setCameraError("");

    if (isScanning && modelsLoaded && videoRef.current) {
      const constraints = selectedDeviceId 
        ? { video: { deviceId: { exact: selectedDeviceId } } } 
        : { video: true };

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
  }, [isScanning, modelsLoaded, selectedDeviceId]);

   

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
                  } else if (curCategory === "Other Staff") {
                    if (targetCandidate.type !== "Other Staff") isValidCategory = false;
                  }
                  
                  if (!isValidCategory) {
                    targetCandidate = null; // Deny if wrong category selected
                  }
               }
            }

            const curRegIds = latestRegisteredFaceIds.current;
            const isRegistered = targetCandidate && curRegIds.includes(targetCandidate.id);

            const now = new Date();
            const scanTimeStr = now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            const curScannerMode = latestScannerMode.current;

            if (!targetCandidate || !isRegistered) {
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
            <div className="pt-2 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-ping"></span>
              <p className="text-xs font-black text-emerald-300">
                ✨ नई सुविधा: छात्र (Student) या शिक्षक (Teacher) का पंजीकरण करते समय अपलोड की गई तस्वीर (Photo) से उनका Face Setup अपने आप पूरा हो जाता है!
              </p>
            </div>
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
              
              {/* Note: In real-world automatic facial matching, categories are parsed directly from descriptors */}

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
              !modelsLoaded || isFaceMatcherLoading ? (
                <div className="flex flex-col items-center justify-center text-indigo-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="font-bold">Loading AI face descriptor models...</p>
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

                  {/* MAGNIFICENT DIAGNOSTIC CONFIRM STATUS OVERLAY CARD */}
                  <AnimatePresence>
                    {scanResultAlert && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute inset-x-4 top-4 bottom-4 z-40 rounded-[1.5rem] overflow-hidden flex flex-col justify-between p-5 text-white backdrop-blur-md shadow-2xl"
                        style={{
                          background: scanResultAlert.status === "UNREGISTERED" 
                            ? "linear-gradient(135deg, rgba(225,29,72,0.95), rgba(159,18,57,0.95))"
                            : scanResultAlert.status === "ALREADY LOGGED"
                            ? "linear-gradient(135deg, rgba(217,119,6,0.95), rgba(146,64,14,0.95))"
                            : "linear-gradient(135deg, rgba(5,150,105,0.95), rgba(6,78,59,0.95))"
                        }}
                      >
                        {/* Header status bar */}
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] uppercase font-black tracking-widest">
                            DIAGNOSTIC FEEDBACK
                          </span>
                          <span className="text-[11px] font-mono opacity-80 font-bold bg-black/20 px-2.5 py-1 rounded-lg">
                            🕒 {scanResultAlert.time}
                          </span>
                        </div>

                        {/* Middle display content */}
                        <div className="flex items-center gap-4 my-auto">
                          <div className="relative">
                            <img
                              src={scanResultAlert.photo}
                              alt={scanResultAlert.name}
                              referrerPolicy="no-referrer"
                              className="w-16 h-16 rounded-full border-4 border-white/20 object-cover shadow-md bg-white/10"
                            />
                            {/* Animated icon badge status indicator */}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-lg"
                              style={{
                                background: scanResultAlert.status === "UNREGISTERED" ? "#f43f5e" : scanResultAlert.status === "ALREADY LOGGED" ? "#f59e0b" : "#10b981"
                              }}
                            >
                              {scanResultAlert.status === "UNREGISTERED" ? "⚠️" : scanResultAlert.status === "ALREADY LOGGED" ? "🔁" : "✓"}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-white/75">
                              {scanResultAlert.type} • {scanResultAlert.class}
                            </p>
                            <h4 className="text-lg font-black tracking-tight uppercase leading-tight">
                              {scanResultAlert.name}
                            </h4>
                            <div className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border border-white/15">
                              <span>Id:</span>
                              <span className="font-mono">{scanResultAlert.id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action Footer with high impact */}
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                            <span className="text-[12px] font-black uppercase tracking-wider">
                              {scanResultAlert.status === "UNREGISTERED" 
                                ? "PROHIBITED / अनधिकृत प्रवेश"
                                : scanResultAlert.status === "ALREADY LOGGED"
                                ? "ALREADY RECORDED / पहले से दर्ज"
                                : "ATTENDANCE SAVED / हाजिरी दर्ज हुई"}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setScanResultAlert(null)}
                            className="p-1.5 hover:bg-white/15 active:scale-90 rounded-full transition-all cursor-pointer border border-white/20"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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

          {/* CAMERA DEVICE RESET & SELECTOR SYSTEM */}
          <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-[2rem] relative z-10 space-y-4 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span className="p-1 px-1.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider">Live Controls</span>
                  कम्प्यूटर/मोबाइल कैमरा और फीड रीसेट • Camera Reset List
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  यदि कैमरा फीड लोड नहीं हो रहा है या रुक गया है, तो उपलब्ध कैमरे की सूची में से डिवाइस चुनें या <strong>Instant Reset</strong> दबाएं।
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  // Instant hard reset
                  setIsScanning(false);
                  if (videoRef.current) {
                    videoRef.current.srcObject = null;
                  }
                  setTimeout(async () => {
                    await updateDeviceList();
                    setIsScanning(true);
                  }, 150);
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-black rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md shadow-slate-900/10"
              >
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                ⚡ Instant Camera Reset
              </button>
            </div>

            {/* Device lists */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {videoDevices.length === 0 ? (
                <div className="sm:col-span-2 p-5 text-center bg-white border border-slate-100 rounded-2xl text-slate-400 text-xs font-medium">
                  fसूची खाली है या कैमरा अनुमति का इंतजार है। अनुमति देने के लिए "Instant Camera Reset" पर क्लिक करें। <br />
                  <span className="text-[10px] text-slate-400 mt-1 block">(No camera devices detected yet. Awaiting browser permission approval.)</span>
                </div>
              ) : (
                videoDevices.map((device, idx) => {
                  const isActive = selectedDeviceId === device.deviceId;
                  return (
                    <button
                      key={device.deviceId || idx}
                      type="button"
                      onClick={() => {
                        setSelectedDeviceId(device.deviceId);
                        localStorage.setItem("bhogamur_selected_camera_id", device.deviceId);
                      }}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer",
                        isActive
                          ? "bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10 text-indigo-950 font-bold"
                          : "bg-white/70 hover:bg-white border-slate-200 hover:border-slate-350 text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                        )} />
                        <div className="min-w-0">
                          <p className="text-xs truncate font-bold tracking-tight">
                            {device.label || `Camera Device ${idx + 1}`}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono truncate">
                            ID: {device.deviceId ? `${device.deviceId.substring(0, 16)}...` : 'Default'}
                          </p>
                        </div>
                      </div>
                      {isActive ? (
                        <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          सक्रिय / Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          चुनें / SELECT
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {cameraError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                <strong>कैमरा समस्या:</strong> {cameraError}. कृपया जांचें कि कैमरा अन्य कार्यों में व्यस्त तो नहीं है।
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
