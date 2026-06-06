import React, { useEffect, useRef, useState, useMemo } from "react";
import * as faceapi from "@vladmandic/face-api";
import { useSchool } from "../../context/SchoolContext";
import { useWebsite } from "../../context/WebsiteContext";
import { useAuth } from "../../context/AuthContext";
import {
  Camera,
  CheckCircle2,
  User,
  RefreshCcw,
  X,
  Volume2,
  VolumeX,
  Clock,
  Search,
  LogOut,
  Check,
  ArrowRight,
  ShieldAlert,
  FileText,
  HeartHandshake,
  Trash2,
  Download,
  Calendar,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const LEAVE_REASONS = [
  { value: "Illness", label: "Illness / Bimari (बीमारी)" },
  { value: "Urgent Work", label: "Urgent Family Work (घर का जरूरी काम)" },
  {
    value: "Doctor Appointment",
    label: "Doctor Appointment (चिकित्सक से मिलना)",
  },
  { value: "Personal Issue", label: "Personal Reasons (व्यक्तिगत कारण)" },
  {
    value: "Event Leave",
    label: "School Activity Done / Early Leave (शीघ्र छुट्टी)",
  },
  { value: "Other", label: "Other Reason (अन्य कारण)" },
];

const DESCRIPTOR_CACHE_KEY = "bhogamur_face_descriptors_cache";

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
    console.error("Failed to save descriptor cache:", e);
  }
};

let globalModelsLoaded = false;

const fetchImageWithTimeout = (url: string, timeoutMs: number = 2500): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout loading image after ${timeoutMs}ms`));
    }, timeoutMs);

    faceapi.fetchImage(url)
      .then((img) => {
        clearTimeout(timer);
        resolve(img);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

export default function FaceRecognitionAttendance() {
  const {
    students,
    teachers,
    saveAttendanceRecord,
    deleteAttendanceRecord,
    attendanceMap,
  } = useSchool();
  const { settings } = useWebsite();
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(
    null,
  );
  const [isFaceMatcherLoading, setIsFaceMatcherLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading models...");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );

  const [override24h, setOverride24h] = useState<boolean>(() => {
    return localStorage.getItem("bhogamur_attendance_24h_override") === "true";
  });
  const [currentIsthHour, setCurrentIstHour] = useState<number>(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utc + 3600000 * 5.5);
    return istTime.getHours();
  });
  const [istTimeString, setIstTimeString] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + 3600000 * 5.5);
      setCurrentIstHour(istTime.getHours());
      setIstTimeString(
        istTime.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const isAllowedToScan = useMemo(() => {
    return (currentIsthHour >= 7 && currentIsthHour < 16) || override24h;
  }, [currentIsthHour, override24h]);

  const [recognizedPeople, setRecognizedPeople] = useState<Set<string>>(
    new Set(),
  );

  // Persistent daily manual attendance registry
  const [attendanceRegistry, setAttendanceRegistry] = useState<
    Record<string, any>
  >(() => {
    const saved = localStorage.getItem("bhogamur_attendance_registry");
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const mergedAttendanceRegistry = useMemo(() => {
    // Combine local registry with the real-time Firestore map
    return {
      ...attendanceRegistry,
      ...attendanceMap,
    };
  }, [attendanceRegistry, attendanceMap]);

  const saveRegistry = (updated: Record<string, any>) => {
    setAttendanceRegistry(updated);
    localStorage.setItem(
      "bhogamur_attendance_registry",
      JSON.stringify(updated),
    );
  };

  const todayDateStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Dictionary Optimization Filters
  const [dictionaryFilterType, setDictionaryFilterType] = useState<"All" | "Student" | "Teacher">("All");
  const [dictionaryFilterClass, setDictionaryFilterClass] = useState<string>("");

  // UI state for dual-mode logging
  const [scanMode, setScanMode] = useState<"check-in" | "early-out">(
    "check-in",
  );
  const [scanTargetGroup, setScanTargetGroup] = useState<"Student" | "Staff">(
    "Student",
  );
  const [selectedPerson, setSelectedPerson] = useState<{
    id: string;
    name: string;
    type: "Student" | "Teacher";
    details: string;
    photoUrl: string;
  } | null>(null);
  const [selectedReason, setSelectedReason] = useState("Illness");
  const [customReason, setCustomReason] = useState("");
  const [checkoutTime, setCheckoutTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isSimulatingFaceScan, setIsSimulatingFaceScan] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  // Search results for manual checkout lookup
  const [memberTypeFilter, setMemberTypeFilter] = useState<
    "Student" | "Teacher"
  >("Student");

  // Create a memoized lookup map of all individuals in the school
  const personMap = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        type: "Student" | "Teacher";
        details: string;
        photoUrl: string;
      }
    >();
    students.forEach((s) => {
      map.set(s.name, {
        id: s.id,
        name: s.name,
        type: "Student",
        details: `${s.class} - ${s.section || "A"}`,
        photoUrl: s.avatar || "",
      });
    });
    teachers.forEach((t) => {
      map.set(t.name, {
        id: t.id,
        name: t.name,
        type: "Teacher",
        details: t.subject || "Educator",
        photoUrl: t.avatar || "",
      });
    });
    return map;
  }, [students, teachers]);

  // Load models on mount
  useEffect(() => {
    const loadModels = async () => {
      if (globalModelsLoaded) {
        setIsModelsLoaded(true);
        setLoadingText("Models loaded successfully from memory.");
        return;
      }
      try {
        const MODEL_URL = "https://vladmandic.github.io/face-api/model/";
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        globalModelsLoaded = true;
        setIsModelsLoaded(true);
        setLoadingText("Models loaded successfully.");
      } catch (err) {
        console.error("Error loading models", err);
        setLoadingText(
          `Failed to load models: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };
    loadModels();
  }, []);

  // Initialize face matcher when models are loaded or data changes
  useEffect(() => {
    if (!isModelsLoaded) return;

    const createFaceMatcher = async () => {
      setIsFaceMatcherLoading(true);
      setLoadingText("Processing profiles...");
      const labeledFaceDescriptors: faceapi.LabeledFaceDescriptors[] = [];

      // Combine students and teachers
      let allPeople = [
        ...students.map((s) => ({
          id: s.id,
          name: s.name,
          type: "Student",
          class: s.class,
          photoUrl: (s as any).photoUrl || s.avatar,
        })),
        ...teachers.map((t) => ({
          id: t.id,
          name: t.name,
          type: "Teacher",
          class: "",
          photoUrl: (t as any).photoUrl || t.avatar,
        })),
      ];

      if (dictionaryFilterType !== "All") {
        allPeople = allPeople.filter(p => p.type === dictionaryFilterType);
      }
      if (dictionaryFilterType === "Student" && dictionaryFilterClass) {
        allPeople = allPeople.filter(p => p.class === dictionaryFilterClass);
      }

      const cache = getDescriptorCache();
      let cacheUpdated = false;

      // Group allPeople into small parallel batches of 6 for high speed without blocking
      const batchSize = 6;
      for (let i = 0; i < allPeople.length; i += batchSize) {
        const currentProcessed = Math.min(i + batchSize, allPeople.length);
        setLoadingText(`Building face dictionaries (${currentProcessed}/${allPeople.length})...`);
        const batch = allPeople.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (person) => {
            if (
              person.photoUrl &&
              !person.photoUrl.includes("dicebear") &&
              !person.photoUrl.includes("unsplash") &&
              !person.photoUrl.includes("ui-avatars")
            ) {
              const cacheKey = `${person.id}:${person.photoUrl}`;
              if (cache[cacheKey]) {
                try {
                  const floatArray = new Float32Array(cache[cacheKey]);
                  labeledFaceDescriptors.push(
                    new faceapi.LabeledFaceDescriptors(person.name, [floatArray]),
                  );
                  return;
                } catch (err) {
                  console.warn(
                    `Failed to reload cached face descriptors for ${person.name}, re-detecting...`,
                    err,
                  );
                }
              }

              try {
                // Fetch image with max 2500ms timeout
                const img = await fetchImageWithTimeout(person.photoUrl, 2500);
                const detection = await faceapi
                  .detectSingleFace(img)
                  .withFaceLandmarks()
                  .withFaceDescriptor();

                if (detection) {
                  labeledFaceDescriptors.push(
                    new faceapi.LabeledFaceDescriptors(person.name, [
                      detection.descriptor,
                    ]),
                  );
                  cache[cacheKey] = Array.from(detection.descriptor);
                  cacheUpdated = true;
                }
              } catch (e) {
                console.error(`Error processing image for ${person.name}`, e);
              }
            }
          })
        );
      }

      if (cacheUpdated) {
        saveDescriptorCache(cache);
      }

      if (labeledFaceDescriptors.length > 0) {
        setFaceMatcher(new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6));
        setLoadingText("");
      } else {
        setFaceMatcher(null);
        setLoadingText(
          "No valid faces found in profiles. Upload real photos first/using simulated mock feed.",
        );
      }
      setIsFaceMatcherLoading(false);
    };

    createFaceMatcher();
  }, [isModelsLoaded, students, teachers, dictionaryFilterType, dictionaryFilterClass]);

  // Start video stream
  useEffect(() => {
    if (
      !isModelsLoaded ||
      isFaceMatcherLoading ||
      !isCameraActive ||
      !isAllowedToScan
    ) {
      if (isCameraActive && !isAllowedToScan) {
        setIsCameraActive(false);
      }
      return;
    }

    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: facingMode } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error accessing webcam", err);
        });
    };

    startVideo();

    return () => {
      // Clean up stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [
    isModelsLoaded,
    isFaceMatcherLoading,
    isCameraActive,
    facingMode,
    isAllowedToScan,
  ]);

  // Core logging actions
  const handleCheckIn = (personId: string, name: string) => {
    const key = `${todayDateStr}:${personId}`;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${hours}:${minutes}`;

    const currentRecord = mergedAttendanceRegistry[key] || {
      status: "Present",
      remarks: "",
    };

    // Auto check-in if not already recorded for InTime
    if (currentRecord.inTime) {
      return;
    }

    const updated = {
      ...attendanceRegistry,
      [key]: {
        ...currentRecord,
        status: "Present",
        inTime: currentTime,
        remarks: currentRecord.remarks || `Checked in via Face ID`,
      },
    };
    saveRegistry(updated);

    // Save to Firestore SchoolContext database
    const isLate = currentTime >= "10:00";
    saveAttendanceRecord(personId, todayDateStr, {
      status: isLate ? "Late" : "Present",
      inTime: currentTime,
      remarks: `Checked in via Face ID`,
    }).catch((err) => {
      console.error(
        "Failed to save check-in through Face ID to Firestore:",
        err,
      );
    });

    setActionSuccess(`Check-In logged for ${name} at ${currentTime}!`);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const handleConfirmCheckout = () => {
    if (!selectedPerson) return;

    const key = `${todayDateStr}:${selectedPerson.id}`;
    const currentRecord = mergedAttendanceRegistry[key] || {
      status: "Present",
      remarks: "",
    };

    const reason =
      selectedReason === "Other"
        ? customReason
        : LEAVE_REASONS.find((r) => r.value === selectedReason)?.label ||
          selectedReason;

    const finalOutTime =
      checkoutTime ||
      (() => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
      })();

    const updated = {
      ...attendanceRegistry,
      [key]: {
        ...currentRecord,
        status: currentRecord.status || "Present",
        outTime: finalOutTime,
        earlyOutReason: reason || "Early leave",
      },
    };
    saveRegistry(updated);

    // Save check-out directly to Firestore
    saveAttendanceRecord(selectedPerson.id, todayDateStr, {
      outTime: finalOutTime,
      earlyOutReason: reason || "Early leave",
      status: currentRecord.status || "Present",
    }).catch((err) => {
      console.error(
        "Failed to save early check-out through Face ID to Firestore:",
        err,
      );
    });

    if (soundEnabled) {
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
      );
      audio.play().catch((e) => console.log("Audio play failed:", e));
    }

    // Add to recognized list for visual display
    setRecognizedPeople((prev) => {
      const newSet = new Set(prev);
      newSet.add(selectedPerson.name);
      return newSet;
    });

    setActionSuccess(
      `Early checkout logged for ${selectedPerson.name} with reason: "${reason}"`,
    );
    setSelectedPerson(null);
    setCustomReason("");
    setSelectedReason("Illness");
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const handlePersonRecognized = (name: string) => {
    const person = personMap.get(name);
    if (!person) return;

    if (scanMode === "check-in") {
      handleCheckIn(person.id, name);
    } else {
      // Early Out Mode - select this person if none is selected
      setSelectedPerson((prev) => {
        if (!prev) {
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, "0");
          const minutes = String(now.getMinutes()).padStart(2, "0");
          setCheckoutTime(`${hours}:${minutes}`);
          return person;
        }
        return prev;
      });
    }
  };

  // Trigger mock/simulated scanning for manual dropdown selection
  const handleSimulateScan = (person: {
    id: string;
    name: string;
    type: "Student" | "Teacher";
    details: string;
    photoUrl: string;
  }) => {
    setIsSimulatingFaceScan(true);
    setSimulationProgress(0);

    const interval = setInterval(() => {
      setSimulationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSimulatingFaceScan(false);

          if (soundEnabled) {
            const audio = new Audio(
              "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
            );
            audio.play().catch((e) => console.log("Audio play failed:", e));
          }

          if (scanMode === "check-in") {
            handleCheckIn(person.id, person.name);
          } else {
            setSelectedPerson(person);
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, "0");
            const minutes = String(now.getMinutes()).padStart(2, "0");
            setCheckoutTime(`${hours}:${minutes}`);
          }
          return 100;
        }
        return prev + 25;
      });
    }, 350);
  };

  // Get lists of logged profiles for today
  const todayRecords = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      type: "Student" | "Teacher";
      details: string;
      photoUrl: string;
      inTime?: string;
      outTime?: string;
      earlyOutReason?: string;
    }> = [];

    const allPeople = [
      ...students.map((s) => ({
        id: s.id,
        name: s.name,
        type: "Student" as const,
        details: `${s.class} - ${s.section || "A"}`,
        photoUrl: s.avatar || "",
      })),
      ...teachers.map((t) => ({
        id: t.id,
        name: t.name,
        type: "Teacher" as const,
        details: t.subject || "Educator",
        photoUrl: t.avatar || t.photoUrl || "",
      })),
    ];

    allPeople.forEach((p) => {
      const key = `${todayDateStr}:${p.id}`;
      const record = mergedAttendanceRegistry[key];
      if (record) {
        list.push({
          ...p,
          inTime: record.inTime,
          outTime: record.outTime,
          earlyOutReason: record.earlyOutReason,
        });
      }
    });

    return list;
  }, [students, teachers, mergedAttendanceRegistry, todayDateStr]);

  const checkInLogs = useMemo(
    () => todayRecords.filter((r) => r.inTime),
    [todayRecords],
  );
  const earlyOutLogs = useMemo(
    () => todayRecords.filter((r) => r.outTime),
    [todayRecords],
  );

  // History states
  const [historyDate, setHistoryDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [historyMonth, setHistoryMonth] = useState<string>("");
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyRole, setHistoryRole] = useState<"All" | "Student" | "Teacher">(
    "All",
  );

  // Daily auto-reset logic before 7:00 AM (Indian Standard Time)
  useEffect(() => {
    const lastSavedDate = localStorage.getItem("bhogamur_attendance_last_date");
    if (lastSavedDate !== todayDateStr || currentIsthHour < 7) {
      setRecognizedPeople(new Set());
      setAttendanceRegistry({});
      localStorage.removeItem("bhogamur_attendance_registry");
      localStorage.setItem("bhogamur_attendance_last_date", todayDateStr);
    }
  }, [todayDateStr, currentIsthHour]);

  // Compute historical attendance records from attendanceMap
  const historyRecords = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      type: "Student" | "Teacher";
      details: string;
      photoUrl: string;
      date: string;
      status: string;
      remarks: string;
      inTime?: string;
      outTime?: string;
      earlyOutReason?: string;
    }> = [];

    Object.entries(attendanceMap).forEach(([key, val]) => {
      const splitIdx = key.indexOf(":");
      if (splitIdx === -1) return;
      const recDate = key.substring(0, splitIdx);
      const memberId = key.substring(splitIdx + 1);

      const recordVal = val as any;

      const student = students.find((s) => s.id === memberId);
      const teacher = teachers.find((t) => t.id === memberId);
      const person = student
        ? {
            name: student.name,
            type: "Student" as const,
            details: `${student.class} - ${student.section || "A"}`,
            photoUrl: student.avatar || "",
          }
        : teacher
          ? {
              name: teacher.name,
              type: "Teacher" as const,
              details: teacher.subject || "Educator",
              photoUrl: teacher.avatar || teacher.photoUrl || "",
            }
          : {
              name: `Unknown (${memberId})`,
              type: "Student" as const,
              details: "Unknown Profile",
              photoUrl: "",
            };

      list.push({
        id: memberId,
        name: person.name,
        type: person.type,
        details: person.details,
        photoUrl: person.photoUrl,
        date: recDate,
        status: recordVal.status || "Present",
        remarks: recordVal.remarks || "",
        inTime: recordVal.inTime,
        outTime: recordVal.outTime,
        earlyOutReason: recordVal.earlyOutReason,
      });
    });

    return list
      .filter((item) => {
        if (historyDate && item.date !== historyDate) return false;
        if (historyMonth) {
          const itemMonth = item.date.substring(0, 7);
          if (itemMonth !== historyMonth) return false;
        }
        if (historySearch) {
          const q = historySearch.toLowerCase();
          const matchesName = item.name.toLowerCase().includes(q);
          const matchesId = item.id.toLowerCase().includes(q);
          if (!matchesName && !matchesId) return false;
        }
        if (historyRole !== "All" && item.type !== historyRole) return false;
        return true;
      })
      .sort(
        (a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name),
      );
  }, [
    attendanceMap,
    students,
    teachers,
    historyDate,
    historyMonth,
    historySearch,
    historyRole,
  ]);

  // Download filtered history as CSV
  const downloadCSVReport = (recordsList: any[]) => {
    if (recordsList.length === 0) {
      alert("No attendance records found for the selected filter.");
      return;
    }
    const headers = [
      "ID",
      "Name",
      "Role/Type",
      "Date",
      "Status",
      "In Time",
      "Out Time",
      "Remarks/Early Out Reason",
    ];
    const csvRows = [headers.join(",")];

    recordsList.forEach((rec) => {
      const row = [
        `"${rec.id}"`,
        `"${rec.name.replace(/"/g, '""')}"`,
        `"${rec.type}"`,
        `"${rec.date}"`,
        `"${rec.status || "Present"}"`,
        `"${rec.inTime || "-"}"`,
        `"${rec.outTime || "-"}"`,
        `"${(rec.remarks || rec.earlyOutReason || "N/A").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    let fileName = "Attendance_Report";
    if (historyDate) fileName += `_Date_${historyDate}`;
    if (historyMonth) fileName += `_Month_${historyMonth}`;
    link.setAttribute("download", `${fileName}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dedicated Super Admin deletion handler
  const handleDeleteAttendance = async (
    memberId: string,
    name: string,
    dateStr: string,
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the attendance of ${name} for ${dateStr}?`,
      )
    ) {
      return;
    }
    try {
      await deleteAttendanceRecord(memberId, dateStr);

      // Update local face scanned sets
      if (dateStr === todayDateStr) {
        setRecognizedPeople((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        const temp = { ...attendanceRegistry };
        delete temp[`${todayDateStr}:${memberId}`];
        saveRegistry(temp);
      }

      setActionSuccess(`Attendance record for ${name} removed successfully.`);
      setTimeout(() => setActionSuccess(""), 3500);
    } catch (err) {
      console.error("Deletion failed:", err);
    }
  };

  // Search filtered school list for simulated scans
  const filteredSchoolMembers = useMemo(() => {
    const allPeople = [
      ...students.map((s) => ({
        id: s.id,
        name: s.name,
        type: "Student" as const,
        details: `${s.class} / Section ${s.section || "A"}`,
        photoUrl: s.avatar || "",
      })),
      ...teachers.map((t) => ({
        id: t.id,
        name: t.name,
        type: "Teacher" as const,
        details: t.subject || "Educator",
        photoUrl: t.avatar || t.photoUrl || "",
      })),
    ];

    return allPeople.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.details.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = p.type === memberTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [students, teachers, searchQuery, memberTypeFilter]);

  // Store the interval ID to avoid memory leaks
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle video play - face detection interval
  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current || !faceMatcher) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const displaySize = {
      width: videoRef.current.videoWidth,
      height: videoRef.current.videoHeight,
    };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    intervalRef.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current && faceMatcher) {
        const detections = await faceapi
          .detectAllFaces(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize,
        );

        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );

          const results = resizedDetections.map((d) =>
            faceMatcher.findBestMatch(d.descriptor),
          );

          results.forEach((result, i) => {
            const box = resizedDetections[i].detection.box;

            // Check if it's the right group logic
            let validTarget = false;
            let person: ReturnType<typeof personMap.get> | undefined;

            if (result.label !== "unknown") {
              person = personMap.get(result.label);
              if (person) {
                const isStudent = person.type === "Student";
                if (scanTargetGroup === "Student" && isStudent)
                  validTarget = true;
                if (scanTargetGroup === "Staff" && !isStudent)
                  validTarget = true;
              }
            }

            const displayLabel = validTarget
              ? result.toString()
              : "Unknown / Wrong Group";
            const boxColor = validTarget
              ? "rgba(16, 185, 129, 1)"
              : "rgba(239, 68, 68, 1)";

            const drawBox = new faceapi.draw.DrawBox(box, {
              label: displayLabel,
              boxColor,
            });
            drawBox.draw(canvasRef.current!);

            if (validTarget && person) {
              // Prevent duplicate logging triggers
              const key = `${todayDateStr}:${person.id}`;
              const currentRecord = mergedAttendanceRegistry[key] || {};

              // If checking in and already recorded, skip logic
              if (scanMode === "check-in" && currentRecord.inTime) return;
              // If checking out and already recorded, skip logic
              if (scanMode === "early-out" && currentRecord.outTime) return;

              if (soundEnabled && !recognizedPeople.has(result.label)) {
                const audio = new Audio(
                  "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
                );
                audio.play().catch((e) => console.log("Audio play failed:", e));
              }
              setRecognizedPeople((prev) => {
                const newSet = new Set(prev);
                newSet.add(result.label);
                return newSet;
              });

              // Handle live face match
              handlePersonRecognized(result.label);
            }
          });
        }
      }
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Side-panel mode tab selection
  const [rightPanelTab, setRightPanelTab] = useState<
    "recognized" | "search-simulation" | "today-logs" | "history"
  >("recognized");

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header with Exit */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Face Recognition Attendance Panel
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Check-in students or manage early-out leaves (Chutti) with live
            facial recognition scan logs.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/attendance")}
          className="px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 self-start sm:self-center"
        >
          <X className="w-4 h-4" /> Close Panel
        </button>
      </div>

      {/* Dictionary Building Optimizer Options */}
      <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Dictionary Optimizer:</span>
        </div>
        <select 
          className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          value={dictionaryFilterType}
          onChange={(e) => {
            setDictionaryFilterType(e.target.value as any);
            if (e.target.value !== "Student") setDictionaryFilterClass("");
          }}
        >
          <option value="All">All Profiles (Student + Staff)</option>
          <option value="Student">Students Only</option>
          <option value="Teacher">Staff Only</option>
        </select>

        {dictionaryFilterType === "Student" && (
          <select 
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={dictionaryFilterClass}
            onChange={(e) => setDictionaryFilterClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <span className="text-[10px] text-slate-400 font-medium ml-auto">
          Applies instantly to facial scanning models for faster detection
        </span>
      </div>

      {!isModelsLoaded || isFaceMatcherLoading ? (
        <div className="bg-white border border-slate-200/60 shadow-xs rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="relative flex items-center justify-center mb-6">
            <span className="absolute inline-flex h-16 w-16 rounded-full bg-blue-100 animate-ping opacity-60"></span>
            <RefreshCcw className="relative w-12 h-12 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">
            Booting AI Facial Matcher Models
          </h3>
          <p className="text-slate-500 mt-2 text-sm max-w-md">{loadingText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT / MAIN WORKSPACE AREA */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode Selection Headers */}
            <div className="bg-slate-100/80 p-2 rounded-2xl border border-slate-250/30 flex justify-between items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setScanMode("check-in");
                    setSelectedPerson(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold uppercase transition-all tracking-wider ${
                    scanMode === "check-in"
                      ? "bg-white text-emerald-700 shadow-md border border-slate-200"
                      : "text-slate-600 hover:bg-white/50"
                  }`}
                >
                  🌅 Arrival (Check-In)
                </button>
                <button
                  onClick={() => {
                    setScanMode("early-out");
                    setSelectedPerson(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold uppercase transition-all tracking-wider ${
                    scanMode === "early-out"
                      ? "bg-rose-50 text-rose-800 shadow-md border border-rose-200"
                      : "text-slate-600 hover:bg-white/50"
                  }`}
                >
                  🚪 Early Out / Leave (Chutti)
                </button>
              </div>

              <div className="flex items-center gap-1 px-3 border-l border-slate-200">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={
                    soundEnabled
                      ? "Mute audio indicator"
                      : "Unmute audio indicator"
                  }
                  className={`p-2.5 rounded-xl transition-all ${
                    soundEnabled
                      ? "text-indigo-600 bg-indigo-50 border border-indigo-100"
                      : "text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Target Group Selector */}
            <div className="flex justify-center bg-white border border-slate-200 rounded-[1.5rem] p-1.5 shadow-sm max-w-sm mx-auto">
              {(["Student", "Staff"] as const).map((group) => (
                <button
                  key={group}
                  onClick={() => {
                    setScanTargetGroup(group);
                    setRecognizedPeople(new Set()); // Reset on switch
                  }}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                    scanTargetGroup === group
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {group} Scan
                </button>
              ))}
            </div>

            {/* 24-Hour Override Toggle Option (Super Admin Controls) */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-100/50 border border-slate-200/60 rounded-2xl p-3 px-4 max-w-sm mx-auto shadow-xs gap-3">
              <div className="flex items-center gap-2.5">
                <Clock
                  className={`w-4 h-4 ${override24h ? "text-indigo-600 animate-pulse" : "text-slate-400"}`}
                />
                <div className="text-left">
                  <p className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest">
                    24-Hour Attendance (24 घंटे चालू)
                  </p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">
                    {user?.role === "Super Admin"
                      ? "⚡ Super Admin Bypass"
                      : "🔒 Super Admin Option Only"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={user?.role !== "Super Admin"}
                  checked={override24h}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setOverride24h(val);
                    localStorage.setItem(
                      "bhogamur_attendance_24h_override",
                      String(val),
                    );
                  }}
                  className="sr-only peer"
                />
                <div
                  className={`w-11 h-6 bg-slate-205 rounded-full peer peer-focus:outline-none after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-650 peer-checked:after:translate-x-full peer-checked:after:border-white ${user?.role !== "Super Admin" ? "opacity-50 cursor-not-allowed" : ""}`}
                ></div>
              </label>
            </div>

            {/* Toast System Actions alerts */}
            {actionSuccess && (
              <div className="bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 px-5 py-4 rounded-2xl font-bold text-sm shadow-xs flex items-center gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* CHUTTI / EARLY OUT FORM OVERLAY/PANEL */}
            {scanMode === "early-out" && selectedPerson ? (
              <div className="bg-rose-50/50 border border-rose-200/80 rounded-[2rem] p-6 shadow-sm animate-fade-in relative overflow-hidden backdrop-blur-xs">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full filter blur-xl transform translate-x-10 -translate-y-10"></div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-rose-200 p-1 shrink-0 shadow-xs relative object-cover flex items-center justify-center">
                    <img
                      src={
                        selectedPerson.photoUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPerson.name}`
                      }
                      className="w-full h-full object-cover rounded-xl"
                      alt={selectedPerson.name}
                    />
                    <span className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-1 rounded-md text-[9px] font-bold uppercase shadow-xs">
                      {selectedPerson.type[0]}
                    </span>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase bg-rose-600 text-white tracking-widest shadow-xs">
                        Chutti Approval System 🛑
                      </span>
                      <h3 className="text-xl font-black text-slate-900 mt-2 uppercase">
                        {selectedPerson.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Verified Profile details:{" "}
                        <strong className="text-slate-700">
                          {selectedPerson.details}
                        </strong>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/70 p-4 rounded-2xl border border-rose-100">
                      {/* Selection Option for Leaving Cause */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-rose-600" />{" "}
                          Cause / Reason for Chutti (छुट्टी का कारण) *
                        </label>
                        <select
                          value={selectedReason}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        >
                          {LEAVE_REASONS.map((reason) => (
                            <option key={reason.value} value={reason.value}>
                              {reason.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Time field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-rose-600" /> Early
                          Exit Time (कितने बजे छुट्टी हुई) *
                        </label>
                        <input
                          type="time"
                          value={checkoutTime}
                          onChange={(e) => setCheckoutTime(e.target.value)}
                          className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        />
                      </div>

                      {/* Custom Write In Reason */}
                      {selectedReason === "Other" && (
                        <div className="col-span-1 md:col-span-2 space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Write Custom Cause (विस्तृत विवरण लिखें)
                          </label>
                          <input
                            type="text"
                            placeholder="Specify detail reason for emergency exit..."
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={handleConfirmCheckout}
                        disabled={selectedReason === "Other" && !customReason}
                        className="flex-1 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-extrabold text-xs uppercase py-3.5 px-5 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 tracking-wider"
                      >
                        <LogOut className="w-4 h-4" /> Approve Chutti & Exit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPerson(null);
                          setSelectedReason("Illness");
                          setCustomReason("");
                        }}
                        className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold text-xs uppercase px-5 rounded-xl transition-all"
                      >
                        Cancel Scan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* CAMERA STREAM VERIFICATION MODULE / FEED */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex flex-col items-center relative min-h-[400px] w-full">
              {!isAllowedToScan ? (
                <div className="w-full flex flex-col items-center justify-center text-center py-12 px-6 min-h-[350px] animate-fade-in z-10">
                  <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center text-rose-500 mb-5 shadow-xs">
                    <Clock className="w-8 h-8 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800 font-sans tracking-tight">
                    Attendance Offline / छुट्टी का समय
                  </h3>
                  <p className="text-slate-500 text-sm max-w-md mt-2.5 leading-relaxed">
                    School attendance is configured to run daily from{" "}
                    <span className="text-emerald-600 font-bold">07:00 AM</span>{" "}
                    to <span className="text-rose-600 font-bold">04:00 PM</span>{" "}
                    (Indian Standard Time). Outside these hours, registration is
                    locked.
                  </p>
                  <div className="mt-5 px-5 py-2.5 bg-slate-900 border border-slate-850 rounded-2xl text-emerald-400 font-mono text-sm tracking-widest shadow-inner flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>IST CLOCK: {istTimeString || "Calculating..."}</span>
                  </div>

                  {user?.role === "Super Admin" ? (
                    <div className="w-full max-w-xs bg-indigo-50/50 p-4 border border-indigo-100 rounded-2xl mt-8">
                      <p className="text-[10px] text-indigo-800 font-extrabold uppercase tracking-widest mb-3">
                        🛠️ Super Admin Bypass Panel
                      </p>
                      <button
                        onClick={() => {
                          setOverride24h(true);
                          localStorage.setItem(
                            "bhogamur_attendance_24h_override",
                            "true",
                          );
                        }}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
                      >
                        <Check className="w-4 h-4" />
                        <span>Force Open 24h Attendance</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-8 flex items-center gap-2 p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-xs font-medium text-amber-700 max-w-xs text-left">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>
                        Only Super Admins can override this schedule lock.
                        Please contact your administrator.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Simulation Overlay Banner */}
                  {isSimulatingFaceScan && (
                    <div className="absolute inset-0 bg-slate-900/95 rounded-[2rem] z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in overflow-hidden">
                      {/* Laser scanning moving animation */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1 bg-cyan-400/80 shadow-[0_0_15px_#22d3ee] animate-pulse"
                        style={{
                          animation: "bounce 2.2s infinite ease-in-out",
                        }}
                      ></div>

                      <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin flex items-center justify-center"></div>
                        <Camera className="w-10 h-10 text-cyan-400 absolute top-7 left-7 animate-pulse" />
                      </div>

                      <h4 className="text-xl font-extrabold text-white uppercase tracking-wider">
                        Simulating Face Recognition
                      </h4>
                      <p className="text-xs text-slate-300 mt-2 max-w-sm">
                        Comparing bio-metric scan records with school datastore
                        signatures. Please stand still...
                      </p>

                      {/* Fake Progress Indicator */}
                      <div className="w-64 bg-slate-800 rounded-full h-2 mt-6 overflow-hidden border border-slate-700">
                        <div
                          className="bg-cyan-500 h-full transition-all duration-350"
                          style={{ width: `${simulationProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-cyan-400 mt-2 tracking-widest">
                        Matching Progress: {simulationProgress}%
                      </span>
                    </div>
                  )}

                  {loadingText && (
                    <div className="absolute top-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-xl text-xs font-bold z-10 shadow-sm border border-yellow-250">
                      {loadingText}
                    </div>
                  )}

                  {/* Feed container */}
                  <div className="relative w-full overflow-hidden bg-slate-950 rounded-2xl shadow-inner mx-auto flex justify-center items-center min-h-[300px] md:min-h-[420px]">
                    {/* Camera switch toggle button */}
                    {isCameraActive && !isSimulatingFaceScan && (
                      <button
                        onClick={() =>
                          setFacingMode((prev) =>
                            prev === "user" ? "environment" : "user",
                          )
                        }
                        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-xs font-bold border border-slate-700 shadow-md backdrop-blur-xs transition-all cursor-pointer scale-100 active:scale-95"
                        title="Switch Camera (Front/Back)"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        <span>
                          {facingMode === "user" ? "Front Cam" : "Back Cam"}
                        </span>
                      </button>
                    )}
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      onPlay={handleVideoPlay}
                      className={`w-full h-auto object-cover max-h-[500px] rounded-2xl transform ${facingMode === "user" ? "-scale-x-100" : ""}`}
                    />
                    <canvas
                      ref={canvasRef}
                      className={`absolute top-0 left-0 w-full h-full transform ${facingMode === "user" ? "-scale-x-100" : ""}`}
                    />

                    {!videoRef.current?.srcObject && !isSimulatingFaceScan && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 p-8">
                        <span className="p-4 bg-slate-800 rounded-full border border-slate-700/60 mb-4 text-indigo-400">
                          <Camera className="w-8 h-8" />
                        </span>
                        <h4 className="text-lg font-bold">Cam Live Feed</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-md text-center">
                          Webcam access is ready. Toggle face recognition below
                          to parse class descriptors automatically.
                        </p>

                        {!isCameraActive ? (
                          <button
                            onClick={() => {
                              setActionSuccess("");
                              setIsCameraActive(true);
                            }}
                            className="px-6 py-3 rounded-xl text-xs font-extrabold uppercase bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all mt-6 tracking-wider flex items-center gap-2"
                          >
                            🚀 Start Real Camera
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs uppercase tracking-widest mt-6 animate-pulse">
                            <RefreshCcw className="w-4 h-4 animate-spin" />{" "}
                            Waiting for Camera Permission...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-full mt-4 flex items-center justify-between text-xs font-bold text-slate-400 py-1 bg-slate-50 px-4 rounded-xl border border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>{" "}
                      Mode:{" "}
                      <span className="text-slate-700">
                        {scanMode === "check-in"
                          ? "Check-In"
                          : "Chutti (Leave)"}
                      </span>
                    </span>
                    <span>
                      Date:{" "}
                      <time className="text-slate-800">{todayDateStr}</time>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR PANEL */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 flex flex-col h-[650px] lg:h-auto lg:min-h-[600px]">
            {/* Sidebar navigation internal tabs */}
            <div className="grid grid-cols-4 gap-1 bg-slate-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => setRightPanelTab("recognized")}
                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all text-center tracking-wider focus:outline-none ${
                  rightPanelTab === "recognized"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:bg-white/40"
                }`}
              >
                Scan
              </button>
              <button
                onClick={() => setRightPanelTab("search-simulation")}
                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all text-center tracking-wider focus:outline-none ${
                  rightPanelTab === "search-simulation"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:bg-white/40"
                }`}
              >
                Simulate
              </button>
              <button
                onClick={() => setRightPanelTab("today-logs")}
                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all text-center tracking-wider focus:outline-none ${
                  rightPanelTab === "today-logs"
                    ? "bg-white text-slate-850 shadow-xs"
                    : "text-slate-500 hover:bg-white/40"
                }`}
              >
                Logs ({todayRecords.length})
              </button>
              <button
                onClick={() => setRightPanelTab("history")}
                className={`py-2 text-[9px] font-black uppercase rounded-lg transition-all text-center tracking-wider focus:outline-none ${
                  rightPanelTab === "history"
                    ? "bg-white text-slate-850 shadow-xs"
                    : "text-slate-500 hover:bg-white/40"
                }`}
              >
                History
              </button>
            </div>

            {/* TAB 1: LIVE RECOGNIZED STREAM LIST */}
            {rightPanelTab === "recognized" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />{" "}
                    Session Scanned Today
                  </h3>
                  <button
                    onClick={() => setRecognizedPeople(new Set())}
                    className="text-[10px] font-bold text-indigo-600 hover:underline uppercase"
                  >
                    Reset List
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                  {Array.from(recognizedPeople).length === 0 ? (
                    <div className="text-center text-slate-400 py-20 flex flex-col items-center justify-center">
                      <User className="w-12 h-12 text-slate-200 mb-3" />
                      <p className="text-xs font-bold uppercase tracking-wider">
                        No recognized faces in stream
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">
                        Scan face or select from the 'Find/Simulate' tab for
                        demo checkouts.
                      </p>
                    </div>
                  ) : (
                    Array.from(recognizedPeople).map((name, idx) => {
                      const details = personMap.get(name);
                      const photoUrl =
                        details?.photoUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
                      const type = details?.type || "Student";

                      const typeBadgeStyles = {
                        Student: "bg-blue-50 text-blue-700 border-blue-150",
                        Teacher:
                          "bg-purple-50 text-purple-700 border-purple-150",
                        "Other Staff":
                          "bg-amber-50 text-amber-700 border-amber-150",
                      }[type];

                      // Lookup today's check status
                      const personalKey = `${todayDateStr}:${details?.id || ""}`;
                      const currentReg = mergedAttendanceRegistry[personalKey];

                      return (
                        <div
                          key={idx}
                          className="flex flex-col gap-2 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:shadow-xs transition-shadow animate-fade-in"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-50 flex items-center justify-center">
                              <img
                                src={photoUrl}
                                className="w-full h-full object-cover"
                                alt={name}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-extrabold text-slate-800 text-xs truncate uppercase">
                                {name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase border ${typeBadgeStyles}`}
                                >
                                  {type}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate font-semibold">
                                  {details?.details || ""}
                                </span>
                              </div>
                            </div>
                            {user?.role === "Super Admin" && details && (
                              <button
                                onClick={() =>
                                  handleDeleteAttendance(
                                    details.id,
                                    name as string,
                                    todayDateStr
                                  )
                                }
                                className="p-1.5 text-rose-550 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all shrink-0 cursor-pointer"
                                title="Delete Attendance"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Attendance result indicators snippet */}
                          <div className="pt-2 border-t border-slate-100/60 flex flex-wrap gap-1.5 text-[10px]">
                            {currentReg?.inTime ? (
                              <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                🌅 In: {currentReg.inTime}
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                                Not Checked In
                              </span>
                            )}

                            {currentReg?.outTime ? (
                              <div className="w-full mt-1.5 bg-rose-50 border border-rose-100 p-2 rounded-lg space-y-1">
                                <span className="bg-rose-100 text-rose-800 font-black px-1.5 py-0.5 rounded-md text-[9px]">
                                  🚪 Checked Out Chutti: {currentReg.outTime}
                                </span>
                                <p className="text-[10px] text-rose-700 italic font-bold">
                                  ⚠️ Reason: {currentReg.earlyOutReason}
                                </p>
                              </div>
                            ) : (
                              scanMode === "early-out" &&
                              details && (
                                <button
                                  onClick={() => setSelectedPerson(details)}
                                  className="text-red-600 font-black tracking-wider hover:underline ml-auto uppercase text-[9px]"
                                >
                                  Apply Checkout ⏱️
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: REGISTER SEARCH AND MOCK SIMULATION TRIGGER */}
            {rightPanelTab === "search-simulation" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Simulate Bio-Scan for Early Out
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Search student data, click name, and simulate facial
                    scanning validation to input leave reasons.
                  </p>
                </div>

                {/* Member type filter toggle */}
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-4 text-[9px] font-black uppercase text-center">
                  <button
                    onClick={() => setMemberTypeFilter("Student")}
                    className={`py-1.5 rounded-lg transition-all ${
                      memberTypeFilter === "Student"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Students
                  </button>
                  <button
                    onClick={() => setMemberTypeFilter("Teacher")}
                    className={`py-1.5 rounded-lg transition-all ${
                      memberTypeFilter === "Teacher"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Teachers
                  </button>
                </div>

                {/* Search Field */}
                <div className="relative mb-4">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder={`Search ${memberTypeFilter}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-250/30 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 font-medium"
                  />
                </div>

                {/* Filtered List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                  {filteredSchoolMembers.length === 0 ? (
                    <div className="text-center text-slate-400 py-10">
                      <p className="text-xs font-semibold">
                        No registry records match your search criteria.
                      </p>
                    </div>
                  ) : (
                    filteredSchoolMembers.slice(0, 15).map((member) => (
                      <div
                        key={member.id}
                        onClick={() => handleSimulateScan(member)}
                        className="flex items-center gap-3 p-3 bg-slate-50 outline outline-1 outline-slate-100 hover:outline-indigo-500 rounded-xl cursor-pointer hover:bg-indigo-50/30 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
                          <img
                            src={
                              member.photoUrl ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`
                            }
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs uppercase text-slate-800 group-hover:text-indigo-700 truncate">
                            {member.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                            {member.details}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: REGISTERED LOGS SUMMARY FOR TODAY */}
            {rightPanelTab === "today-logs" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-4">
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Completed logs (आज के कुल रिकॉर्ड)
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Summary of attendance actions logged dynamically for date:{" "}
                    <strong className="text-slate-800">{todayDateStr}</strong>
                  </p>
                </div>

                {/* Log stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-emerald-500/10 text-emerald-800 border border-emerald-500/10 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] uppercase font-black text-emerald-700 tracking-wider">
                      Arrivals (Aagman)
                    </span>
                    <p className="font-black text-lg mt-0.5 text-slate-900">
                      {checkInLogs.length}
                    </p>
                  </div>
                  <div className="bg-rose-500/10 text-rose-800 border border-rose-500/10 p-2.5 rounded-xl text-center">
                    <span className="text-[9px] uppercase font-black text-rose-700 tracking-wider">
                      Chutti (Exits)
                    </span>
                    <p className="font-black text-lg mt-0.5 text-slate-900">
                      {earlyOutLogs.length}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar pr-1">
                  {todayRecords.length === 0 ? (
                    <div className="text-center text-slate-400 py-20 flex flex-col items-center">
                      <User className="w-10 h-10 text-slate-200 mb-2" />
                      <p className="text-xs font-semibold uppercase tracking-wider">
                        No logs stored yet for today.
                      </p>
                    </div>
                  ) : (
                    todayRecords.map((log, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white border border-slate-150-b rounded-xl space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${log.outTime ? "bg-rose-600" : "bg-emerald-500"}`}
                          ></span>
                          <p className="text-xs font-extrabold uppercase text-slate-900">
                            {log.name}
                          </p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 ml-auto font-black uppercase text-[8px]">
                            {log.type[0]}
                          </span>
                          {user?.role === "Super Admin" && (
                            <button
                              onClick={() =>
                                handleDeleteAttendance(
                                  log.id,
                                  log.name,
                                  todayDateStr
                                )
                              }
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all shrink-0 cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="bg-slate-50/80 p-2 rounded-lg text-[10px] space-y-1">
                          {log.inTime && (
                            <p className="text-slate-600 font-semibold">
                              🌅 Checked In:{" "}
                              <strong className="text-slate-900">
                                {log.inTime} AM
                              </strong>
                            </p>
                          )}
                          {log.outTime && (
                            <div className="space-y-0.5 border-t border-slate-100 pt-1.5 mt-1">
                              <p className="text-rose-700 font-extrabold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md inline-block">
                                🚪 early check-out:{" "}
                                <span className="font-extrabold">
                                  {log.outTime} PM
                                </span>
                              </p>
                              <p className="text-slate-600 font-bold">
                                💬 Cause:{" "}
                                <span className="text-slate-900 font-black italic">
                                  "{log.earlyOutReason}"
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {rightPanelTab === "history" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-4">
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Attendance History (इतिहास और डाउनलोड)
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Search, view and download date-wise or month-wise historical
                    records.
                  </p>
                </div>

                {/* Filters panel */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2.5 mb-4 text-xs font-semibold">
                  {/* Search query */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search Name or ID..."
                      className="w-full bg-white border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs placeholder:text-slate-450 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Date and Month Pickers */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">
                        Date Wise
                      </label>
                      <input
                        type="date"
                        value={historyDate}
                        onChange={(e) => {
                          setHistoryDate(e.target.value);
                          if (e.target.value) setHistoryMonth(""); // prioritize date
                        }}
                        className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-xl text-[11px] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">
                        Month Wise
                      </label>
                      <input
                        type="month"
                        value={historyMonth}
                        onChange={(e) => {
                          setHistoryMonth(e.target.value);
                          if (e.target.value) setHistoryDate(""); // prioritize month
                        }}
                        className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-xl text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Role Selection & Download buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                    <div className="flex rounded-lg bg-white p-0.5 border border-slate-250 shrink-0">
                      {(["All", "Student", "Teacher"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setHistoryRole(r)}
                          className={`px-2 py-1 text-[9px] font-bold rounded-md ${
                            historyRole === r
                              ? "bg-slate-900 text-white"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => downloadCSVReport(historyRecords)}
                      className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl uppercase flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                      title="Download CSV report"
                    >
                      <Download className="w-3.5 h-3.5" /> Export (
                      {historyRecords.length})
                    </button>
                  </div>
                </div>

                {/* Matching List */}
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                  {historyRecords.length === 0 ? (
                    <div className="text-center text-slate-400 py-16 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      <Filter className="w-8 h-8 text-slate-300 mb-1.5" />
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        No records found
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[170px]">
                        Try changing the filters or select a different date/month.
                      </p>
                    </div>
                  ) : (
                    historyRecords.map((rec, index) => {
                      const typeBadgeStyles =
                        {
                          Student: "bg-blue-50 text-blue-700 border-blue-150",
                          Teacher:
                            "bg-purple-50 text-purple-700 border-purple-150",
                        }[rec.type] ||
                        "bg-slate-50 text-slate-600 border-slate-150";

                      return (
                        <div
                          key={index}
                          className="p-3 bg-white border border-slate-150-b rounded-2xl space-y-2 hover:shadow-xs transition-shadow"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                              <img
                                src={
                                  rec.photoUrl ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.name}`
                                }
                                className="w-full h-full object-cover"
                                alt={rec.name}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-extrabold uppercase text-slate-900 truncate">
                                {rec.name}
                              </p>
                              <span className="text-[9px] text-slate-400 font-bold">
                                {rec.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[8px] px-1 py-0.5 rounded-md font-bold uppercase border ${typeBadgeStyles}`}
                              >
                                {rec.type}
                              </span>
                              {user?.role === "Super Admin" && (
                                <button
                                  onClick={() =>
                                    handleDeleteAttendance(
                                      rec.id,
                                      rec.name,
                                      rec.date
                                    )
                                  }
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete record from system"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-50/70 p-2 rounded-xl text-[10px] grid grid-cols-2 gap-1.5">
                            <div>
                              <p className="text-slate-500 font-bold">Date</p>
                              <p className="text-slate-850 font-extrabold">
                                {rec.date}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-bold">Status</p>
                              <p
                                className={`font-black uppercase ${rec.status === "Present" ? "text-emerald-700" : "text-amber-700"}`}
                              >
                                {rec.status}
                              </p>
                            </div>
                            {rec.inTime && (
                              <div className="col-span-2 border-t border-slate-100 pt-1 mt-1 flex justify-between">
                                <span className="text-slate-500 font-semibold">
                                  🌅 In Time:
                                </span>
                                <strong className="text-slate-800">
                                  {rec.inTime}
                                </strong>
                              </div>
                            )}
                            {rec.outTime && (
                              <div className="col-span-2 border-t border-slate-100 pt-1 mt-1">
                                <p className="text-rose-700 font-extrabold">
                                  🚪 Out:{" "}
                                  <span className="font-extrabold">
                                    {rec.outTime}
                                  </span>
                                </p>
                                {rec.earlyOutReason && (
                                  <p className="text-slate-500 italic mt-0.5 font-bold">
                                    "Reason: {rec.earlyOutReason}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
