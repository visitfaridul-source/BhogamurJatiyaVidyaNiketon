import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { useSchool } from '../../context/SchoolContext';
import { useWebsite } from '../../context/WebsiteContext';
import { Camera, CheckCircle2, User, RefreshCcw, X, Volume2, VolumeX, Clock, Search, LogOut, Check, ArrowRight, ShieldAlert, FileText, HeartHandshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LEAVE_REASONS = [
  { value: 'Illness', label: 'Illness / Bimari (बीमारी)' },
  { value: 'Urgent Work', label: 'Urgent Family Work (घर का जरूरी काम)' },
  { value: 'Doctor Appointment', label: 'Doctor Appointment (चिकित्सक से मिलना)' },
  { value: 'Personal Issue', label: 'Personal Reasons (व्यक्तिगत कारण)' },
  { value: 'Event Leave', label: 'School Activity Done / Early Leave (शीघ्र छुट्टी)' },
  { value: 'Other', label: 'Other Reason (अन्य कारण)' }
];

export default function FaceRecognitionAttendance() {
  const { students, teachers } = useSchool();
  const { settings } = useWebsite();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const [isFaceMatcherLoading, setIsFaceMatcherLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading models...');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [recognizedPeople, setRecognizedPeople] = useState<Set<string>>(new Set());

  // Persistent daily manual attendance registry
  const [attendanceRegistry, setAttendanceRegistry] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('bhogamur_attendance_registry');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const saveRegistry = (updated: Record<string, any>) => {
    setAttendanceRegistry(updated);
    localStorage.setItem('bhogamur_attendance_registry', JSON.stringify(updated));
  };

  const todayDateStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // UI state for dual-mode logging
  const [scanMode, setScanMode] = useState<'check-in' | 'early-out'>('check-in');
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string; type: 'Student' | 'Teacher' | 'Other Staff'; details: string; photoUrl: string } | null>(null);
  const [selectedReason, setSelectedReason] = useState('Illness');
  const [customReason, setCustomReason] = useState('');
  const [checkoutTime, setCheckoutTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isSimulatingFaceScan, setIsSimulatingFaceScan] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  // Search results for manual checkout lookup
  const [memberTypeFilter, setMemberTypeFilter] = useState<'Student' | 'Teacher' | 'Other Staff'>('Student');

  // Create a memoized lookup map of all individuals in the school
  const personMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: 'Student' | 'Teacher' | 'Other Staff'; details: string; photoUrl: string }>();
    students.forEach(s => {
      map.set(s.name, { id: s.id, name: s.name, type: 'Student', details: `${s.class} - ${s.section || 'A'}`, photoUrl: s.avatar || '' });
    });
    teachers.forEach(t => {
      map.set(t.name, { id: t.id, name: t.name, type: 'Teacher', details: t.subject || 'Educator', photoUrl: t.avatar || '' });
    });
    (settings.staffMembers || []).forEach((st: any) => {
      map.set(st.name, { id: st.id, name: st.name, type: 'Other Staff', details: st.role || 'Staff', photoUrl: st.imageUrl || '' });
    });
    return map;
  }, [students, teachers, settings.staffMembers]);

  // Load models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
         await Promise.all([
           faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
           faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
           faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
         ]);
         setIsModelsLoaded(true);
         setLoadingText('Models loaded successfully.');
      } catch (err) {
         console.error("Error loading models", err);
         setLoadingText(`Failed to load models: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    loadModels();
  }, []);

  // Initialize face matcher when models are loaded or data changes
  useEffect(() => {
    if (!isModelsLoaded) return;

    const createFaceMatcher = async () => {
      setIsFaceMatcherLoading(true);
      setLoadingText('Processing profiles...');
      const labeledFaceDescriptors: faceapi.LabeledFaceDescriptors[] = [];

      // Combine students, teachers, and other staff
      const allPeople = [
        ...students.map(s => ({ id: s.id, name: s.name, photoUrl: (s as any).photoUrl })),
        ...teachers.map(t => ({ id: t.id, name: t.name, photoUrl: (t as any).photoUrl || t.avatar })),
        ...(settings.staffMembers || []).map((st: any) => ({ id: st.id, name: st.name, photoUrl: st.imageUrl }))
      ];

      for (const person of allPeople) {
        if (person.photoUrl && !person.photoUrl.includes('dicebear')) {
          try {
            // Load image
            const img = await faceapi.fetchImage(person.photoUrl);
            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            
            if (detection) {
              labeledFaceDescriptors.push(
                new faceapi.LabeledFaceDescriptors(person.name, [detection.descriptor])
              );
            }
          } catch (e) {
            console.error(`Error processing image for ${person.name}`, e);
          }
        }
      }

      if (labeledFaceDescriptors.length > 0) {
        setFaceMatcher(new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6));
        setLoadingText('');
      } else {
        setFaceMatcher(null);
        setLoadingText('No valid faces found in profiles. Upload real photos first/using simulated mock feed.');
      }
      setIsFaceMatcherLoading(false);
    };

    createFaceMatcher();
  }, [isModelsLoaded, students, teachers, settings.staffMembers]);

  // Start video stream
  useEffect(() => {
    if (!isModelsLoaded || isFaceMatcherLoading || !isCameraActive) return;

    const startVideo = () => {
      navigator.mediaDevices.getUserMedia({ video: true })
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
         tracks.forEach(track => track.stop());
       }
    };
  }, [isModelsLoaded, isFaceMatcherLoading, isCameraActive]);

  // Core logging actions
  const handleCheckIn = (personId: string, name: string) => {
    const key = `${todayDateStr}:${personId}`;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    const currentRecord = attendanceRegistry[key] || { status: 'Present', remarks: '' };
    
    // Auto check-in if not already recorded for InTime
    if (currentRecord.inTime) {
      return;
    }

    const updated = {
      ...attendanceRegistry,
      [key]: {
        ...currentRecord,
        status: 'Present',
        inTime: currentTime,
        remarks: currentRecord.remarks || `Checked in via Face ID`
      }
    };
    saveRegistry(updated);

    setActionSuccess(`Check-In logged for ${name} at ${currentTime}!`);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleConfirmCheckout = () => {
    if (!selectedPerson) return;

    const key = `${todayDateStr}:${selectedPerson.id}`;
    const currentRecord = attendanceRegistry[key] || { status: 'Present', remarks: '' };

    const reason = selectedReason === 'Other' ? customReason : (LEAVE_REASONS.find(r => r.value === selectedReason)?.label || selectedReason);
    
    const updated = {
      ...attendanceRegistry,
      [key]: {
        ...currentRecord,
        status: currentRecord.status || 'Present',
        outTime: checkoutTime || (() => {
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        })(),
        earlyOutReason: reason || 'Early leave'
      }
    };
    saveRegistry(updated);

    if (soundEnabled) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
    }

    // Add to recognized list for visual display
    setRecognizedPeople(prev => {
      const newSet = new Set(prev);
      newSet.add(selectedPerson.name);
      return newSet;
    });

    setActionSuccess(`Early checkout logged for ${selectedPerson.name} with reason: "${reason}"`);
    setSelectedPerson(null);
    setCustomReason('');
    setSelectedReason('Illness');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handlePersonRecognized = (name: string) => {
    const person = personMap.get(name);
    if (!person) return;

    if (scanMode === 'check-in') {
      handleCheckIn(person.id, name);
    } else {
      // Early Out Mode - select this person if none is selected
      setSelectedPerson(prev => {
        if (!prev) {
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          setCheckoutTime(`${hours}:${minutes}`);
          return person;
        }
        return prev;
      });
    }
  };

  // Trigger mock/simulated scanning for manual dropdown selection
  const handleSimulateScan = (person: { id: string; name: string; type: 'Student' | 'Teacher' | 'Other Staff'; details: string; photoUrl: string }) => {
    setIsSimulatingFaceScan(true);
    setSimulationProgress(0);
    
    const interval = setInterval(() => {
      setSimulationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSimulatingFaceScan(false);
          
          if (soundEnabled) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));
          }

          if (scanMode === 'check-in') {
            handleCheckIn(person.id, person.name);
          } else {
            setSelectedPerson(person);
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
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
    const list: Array<{ id: string; name: string; type: 'Student' | 'Teacher' | 'Other Staff'; details: string; photoUrl: string; inTime?: string; outTime?: string; earlyOutReason?: string }> = [];
    
    const allPeople = [
      ...students.map(s => ({ id: s.id, name: s.name, type: 'Student' as const, details: `${s.class} - ${s.section || 'A'}`, photoUrl: s.avatar || '' })),
      ...teachers.map(t => ({ id: t.id, name: t.name, type: 'Teacher' as const, details: t.subject || 'Educator', photoUrl: t.avatar || t.photoUrl || '' })),
      ...(settings.staffMembers || []).map((st: any) => ({ id: st.id, name: st.name, type: 'Other Staff' as const, details: st.role || 'Staff', photoUrl: st.imageUrl || '' }))
    ];

    allPeople.forEach(p => {
      const key = `${todayDateStr}:${p.id}`;
      const record = attendanceRegistry[key];
      if (record) {
        list.push({
          ...p,
          inTime: record.inTime,
          outTime: record.outTime,
          earlyOutReason: record.earlyOutReason
        });
      }
    });

    return list;
  }, [students, teachers, settings.staffMembers, attendanceRegistry, todayDateStr]);

  const checkInLogs = useMemo(() => todayRecords.filter(r => r.inTime), [todayRecords]);
  const earlyOutLogs = useMemo(() => todayRecords.filter(r => r.outTime), [todayRecords]);

  // Search filtered school list for simulated scans
  const filteredSchoolMembers = useMemo(() => {
    const allPeople = [
      ...students.map(s => ({ id: s.id, name: s.name, type: 'Student' as const, details: `${s.class} / Section ${s.section || 'A'}`, photoUrl: s.avatar || '' })),
      ...teachers.map(t => ({ id: t.id, name: t.name, type: 'Teacher' as const, details: t.subject || 'Educator', photoUrl: t.avatar || t.photoUrl || '' })),
      ...(settings.staffMembers || []).map((st: any) => ({ id: st.id, name: st.name, type: 'Other Staff' as const, details: st.role || 'Staff', photoUrl: st.imageUrl || '' }))
    ];

    return allPeople.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.details.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = p.type === memberTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [students, teachers, settings.staffMembers, searchQuery, memberTypeFilter]);

  // Handle video play - face detection interval
  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current || !faceMatcher) return;

    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    setInterval(async () => {
      if (videoRef.current && canvasRef.current && faceMatcher) {
         const detections = await faceapi.detectAllFaces(videoRef.current).withFaceLandmarks().withFaceDescriptors();
         const resizedDetections = faceapi.resizeResults(detections, displaySize);
         
         const ctx = canvasRef.current.getContext('2d');
         if (ctx) {
           ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
           
           const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));
           
           results.forEach((result, i) => {
             const box = resizedDetections[i].detection.box;
             const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
             drawBox.draw(canvasRef.current!);
             
             if (result.label !== 'unknown') {
                if (soundEnabled && !recognizedPeople.has(result.label)) {
                  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
                  audio.play().catch(e => console.log('Audio play failed:', e));
                }
               setRecognizedPeople(prev => {
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
    }, 1000);
  };

  // Side-panel mode tab selection
  const [rightPanelTab, setRightPanelTab] = useState<'recognized' | 'search-simulation' | 'today-logs'>('recognized');

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
       {/* Header with Exit */}
       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
         <div>
           <div className="flex items-center gap-2">
             <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
               <Camera className="w-5 h-5" />
             </span>
             <h1 className="text-2xl font-bold tracking-tight text-slate-900">Face Recognition Attendance Panel</h1>
           </div>
           <p className="text-slate-500 text-sm mt-1">Check-in students or manage early-out leaves (Chutti) with live facial recognition scan logs.</p>
         </div>
         <button 
           onClick={() => navigate('/admin/attendance')}
           className="px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 self-start sm:self-center"
         >
           <X className="w-4 h-4" /> Close Panel
         </button>
       </div>

       {(!isModelsLoaded || isFaceMatcherLoading) ? (
         <div className="bg-white border border-slate-200/60 shadow-xs rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
             <div className="relative flex items-center justify-center mb-6">
               <span className="absolute inline-flex h-16 w-16 rounded-full bg-blue-100 animate-ping opacity-60"></span>
               <RefreshCcw className="relative w-12 h-12 text-blue-600 animate-spin" />
             </div>
             <h3 className="text-xl font-bold text-slate-800">Booting AI Facial Matcher Models</h3>
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
                       setScanMode('check-in');
                       setSelectedPerson(null);
                     }}
                     className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold uppercase transition-all tracking-wider ${
                       scanMode === 'check-in'
                         ? 'bg-white text-emerald-700 shadow-md border border-slate-200'
                         : 'text-slate-600 hover:bg-white/50'
                     }`}
                   >
                     🌅 Arrival (Check-In)
                   </button>
                   <button
                     onClick={() => {
                       setScanMode('early-out');
                       setSelectedPerson(null);
                     }}
                     className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold uppercase transition-all tracking-wider ${
                       scanMode === 'early-out'
                         ? 'bg-rose-50 text-rose-800 shadow-md border border-rose-200'
                         : 'text-slate-600 hover:bg-white/50'
                     }`}
                   >
                     🚪 Early Out / Leave (Chutti)
                   </button>
                 </div>
                 
                 <div className="flex items-center gap-1 px-3 border-l border-slate-200">
                   <button
                     onClick={() => setSoundEnabled(!soundEnabled)}
                     title={soundEnabled ? "Mute audio indicator" : "Unmute audio indicator"}
                     className={`p-2.5 rounded-xl transition-all ${
                       soundEnabled ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' : 'text-slate-400 hover:bg-slate-200'
                     }`}
                   >
                     {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                   </button>
                 </div>
               </div>

               {/* Toast System Actions alerts */}
               {actionSuccess && (
                 <div className="bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 px-5 py-4 rounded-2xl font-bold text-sm shadow-xs flex items-center gap-3 animate-fade-in">
                   <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                   <span>{actionSuccess}</span>
                 </div>
               )}

               {/* CHUTTI / EARLY OUT FORM OVERLAY/PANEL */}
               {scanMode === 'early-out' && selectedPerson ? (
                 <div className="bg-rose-50/50 border border-rose-200/80 rounded-[2rem] p-6 shadow-sm animate-fade-in relative overflow-hidden backdrop-blur-xs">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full filter blur-xl transform translate-x-10 -translate-y-10"></div>
                   
                   <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                     <div className="w-20 h-20 rounded-2xl bg-white border-2 border-rose-200 p-1 shrink-0 shadow-xs relative object-cover flex items-center justify-center">
                       <img 
                         src={selectedPerson.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPerson.name}`} 
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
                         <h3 className="text-xl font-black text-slate-900 mt-2 uppercase">{selectedPerson.name}</h3>
                         <p className="text-xs text-slate-500 mt-1">Verified Profile details: <strong className="text-slate-700">{selectedPerson.details}</strong></p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/70 p-4 rounded-2xl border border-rose-100">
                         {/* Selection Option for Leaving Cause */}
                         <div className="space-y-1.5">
                           <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                             <FileText className="w-3.5 h-3.5 text-rose-600" /> Cause / Reason for Chutti (छुट्टी का कारण) *
                           </label>
                           <select
                             value={selectedReason}
                             onChange={(e) => setSelectedReason(e.target.value)}
                             className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                           >
                             {LEAVE_REASONS.map((reason) => (
                               <option key={reason.value} value={reason.value}>{reason.label}</option>
                             ))}
                           </select>
                         </div>

                         {/* Time field */}
                         <div className="space-y-1.5">
                           <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                             <Clock className="w-3.5 h-3.5 text-rose-600" /> Early Exit Time (कितने बजे छुट्टी हुई) *
                           </label>
                           <input
                             type="time"
                             value={checkoutTime}
                             onChange={(e) => setCheckoutTime(e.target.value)}
                             className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                           />
                         </div>

                         {/* Custom Write In Reason */}
                         {selectedReason === 'Other' && (
                           <div className="col-span-1 md:col-span-2 space-y-1.5">
                             <label className="text-xs font-bold text-slate-700">Write Custom Cause (विस्तृत विवरण लिखें)</label>
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
                           disabled={selectedReason === 'Other' && !customReason}
                           className="flex-1 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-extrabold text-xs uppercase py-3.5 px-5 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 tracking-wider"
                         >
                           <LogOut className="w-4 h-4" /> Approve Chutti & Exit
                         </button>
                         <button
                           onClick={() => {
                             setSelectedPerson(null);
                             setSelectedReason('Illness');
                             setCustomReason('');
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
               <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex flex-col items-center relative min-h-[400px]">
                  
                  {/* Simulation Overlay Banner */}
                  {isSimulatingFaceScan && (
                    <div className="absolute inset-0 bg-slate-900/95 rounded-[2rem] z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in overflow-hidden">
                      {/* Laser scanning moving animation */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-400/80 shadow-[0_0_15px_#22d3ee] animate-pulse" style={{
                        animation: 'bounce 2.2s infinite ease-in-out'
                      }}></div>
                      
                      <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin flex items-center justify-center"></div>
                        <Camera className="w-10 h-10 text-cyan-400 absolute top-7 left-7 animate-pulse" />
                      </div>

                      <h4 className="text-xl font-extrabold text-white uppercase tracking-wider">Simulating Face Recognition</h4>
                      <p className="text-xs text-slate-300 mt-2 max-w-sm">Comparing bio-metric scan records with school datastore signatures. Please stand still...</p>
                      
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
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      muted 
                      onPlay={handleVideoPlay}
                      className="w-full h-auto object-cover max-h-[500px] rounded-2xl transform -scale-x-100"
                    />
                    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full transform -scale-x-100" />
                    
                    {!videoRef.current?.srcObject && !isSimulatingFaceScan && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 p-8">
                          <span className="p-4 bg-slate-800 rounded-full border border-slate-700/60 mb-4 text-indigo-400">
                            <Camera className="w-8 h-8" />
                          </span>
                          <h4 className="text-lg font-bold">Cam Live Feed</h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-md text-center">Webcam access is ready. Toggle face recognition below to parse class descriptors automatically.</p>
                          
                          {!isCameraActive ? (
                            <button 
                              onClick={() => {
                                setActionSuccess('');
                                setIsCameraActive(true);
                              }}
                              className="px-6 py-3 rounded-xl text-xs font-extrabold uppercase bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all mt-6 tracking-wider flex items-center gap-2"
                            >
                              🚀 Start Real Camera
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs uppercase tracking-widest mt-6 animate-pulse">
                              <RefreshCcw className="w-4 h-4 animate-spin" /> Waiting for Camera Permission...
                            </div>
                          )}
                       </div>
                    )}
                  </div>

                  <div className="w-full mt-4 flex items-center justify-between text-xs font-bold text-slate-400 py-1 bg-slate-50 px-4 rounded-xl border border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Mode: <span className="text-slate-700">{scanMode === 'check-in' ? 'Check-In' : 'Chutti (Leave)'}</span>
                    </span>
                    <span>Date: <time className="text-slate-800">{todayDateStr}</time></span>
                  </div>
               </div>
            </div>

            {/* RIGHT SIDEBAR PANEL */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-6 flex flex-col h-[650px] lg:h-auto lg:min-h-[600px]">
               
               {/* Sidebar navigation internal tabs */}
               <div className="grid grid-cols-3 gap-1 bg-slate-100 rounded-xl p-1 mb-6">
                 <button
                   onClick={() => setRightPanelTab('recognized')}
                   className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all text-center tracking-wider focus:outline-none ${
                     rightPanelTab === 'recognized' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:bg-white/40'
                   }`}
                 >
                   Scanning
                 </button>
                 <button
                   onClick={() => setRightPanelTab('search-simulation')}
                   className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all text-center tracking-wider focus:outline-none ${
                     rightPanelTab === 'search-simulation' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:bg-white/40'
                   }`}
                 >
                   🔍 Find/Simulate
                 </button>
                 <button
                   onClick={() => setRightPanelTab('today-logs')}
                   className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all text-center tracking-wider focus:outline-none ${
                     rightPanelTab === 'today-logs' ? 'bg-white text-slate-850 shadow-xs' : 'text-slate-500 hover:bg-white/40'
                   }`}
                 >
                   📋 Logs ({todayRecords.length})
                 </button>
               </div>

               {/* TAB 1: LIVE RECOGNIZED STREAM LIST */}
               {rightPanelTab === 'recognized' && (
                 <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Session Scanned Today
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
                            <p className="text-xs font-bold uppercase tracking-wider">No recognized faces in stream</p>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">Scan face or select from the 'Find/Simulate' tab for demo checkouts.</p>
                         </div>
                       ) : (
                         Array.from(recognizedPeople).map((name, idx) => {
                           const details = personMap.get(name);
                           const photoUrl = details?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
                           const type = details?.type || 'Student';
                           
                           const typeBadgeStyles = {
                             Student: 'bg-blue-50 text-blue-700 border-blue-150',
                             Teacher: 'bg-purple-50 text-purple-700 border-purple-150',
                             'Other Staff': 'bg-amber-50 text-amber-700 border-amber-150'
                           }[type];

                           // Lookup today's check status
                           const personalKey = `${todayDateStr}:${details?.id || ''}`;
                           const currentReg = attendanceRegistry[personalKey];

                           return (
                             <div key={idx} className="flex flex-col gap-2 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:shadow-xs transition-shadow animate-fade-in">
                               <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-50 flex items-center justify-center">
                                   <img src={photoUrl} className="w-full h-full object-cover" alt={name} />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <p className="font-extrabold text-slate-800 text-xs truncate uppercase">{name}</p>
                                     <div className="flex items-center gap-1.5 mt-1">
                                       <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase border ${typeBadgeStyles}`}>
                                         {type}
                                       </span>
                                       <span className="text-[10px] text-slate-400 truncate font-semibold">{details?.details || ''}</span>
                                     </div>
                                 </div>
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
                                   scanMode === 'early-out' && details && (
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
               {rightPanelTab === 'search-simulation' && (
                 <div className="flex-1 flex flex-col min-h-0">
                    <div className="mb-4">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Simulate Bio-Scan for Early Out</h3>
                      <p className="text-[10px] text-slate-500 mt-1">Search student data, click name, and simulate facial scanning validation to input leave reasons.</p>
                    </div>

                    {/* Member type filter toggle */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl mb-4 text-[9px] font-black uppercase text-center">
                      <button
                        onClick={() => setMemberTypeFilter('Student')}
                        className={`py-1.5 rounded-lg transition-all ${
                          memberTypeFilter === 'Student' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Students
                      </button>
                      <button
                        onClick={() => setMemberTypeFilter('Teacher')}
                        className={`py-1.5 rounded-lg transition-all ${
                          memberTypeFilter === 'Teacher' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Teachers
                      </button>
                      <button
                        onClick={() => setMemberTypeFilter('Other Staff')}
                        className={`py-1.5 rounded-lg transition-all ${
                          memberTypeFilter === 'Other Staff' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Staff
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
                          <p className="text-xs font-semibold">No registry records match your search criteria.</p>
                        </div>
                      ) : (
                        filteredSchoolMembers.slice(0, 15).map((member) => (
                          <div 
                            key={member.id}
                            onClick={() => handleSimulateScan(member)}
                            className="flex items-center gap-3 p-3 bg-slate-50 outline outline-1 outline-slate-100 hover:outline-indigo-500 rounded-xl cursor-pointer hover:bg-indigo-50/30 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
                              <img src={member.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs uppercase text-slate-800 group-hover:text-indigo-700 truncate">{member.name}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{member.details}</p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        ))
                      )}
                    </div>
                 </div>
               )}

               {/* TAB 3: REGISTERED LOGS SUMMARY FOR TODAY */}
               {rightPanelTab === 'today-logs' && (
                 <div className="flex-1 flex flex-col min-h-0">
                    <div className="mb-4">
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Completed logs (आज के कुल रिकॉर्ड)</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Summary of attendance actions logged dynamically for date: <strong className="text-slate-800">{todayDateStr}</strong></p>
                    </div>

                    {/* Log stats */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-emerald-500/10 text-emerald-800 border border-emerald-500/10 p-2.5 rounded-xl text-center">
                        <span className="text-[9px] uppercase font-black text-emerald-700 tracking-wider">Arrivals (Aagman)</span>
                        <p className="font-black text-lg mt-0.5 text-slate-900">{checkInLogs.length}</p>
                      </div>
                      <div className="bg-rose-500/10 text-rose-800 border border-rose-500/10 p-2.5 rounded-xl text-center">
                        <span className="text-[9px] uppercase font-black text-rose-700 tracking-wider">Chutti (Exits)</span>
                        <p className="font-black text-lg mt-0.5 text-slate-900">{earlyOutLogs.length}</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar pr-1">
                      {todayRecords.length === 0 ? (
                        <div className="text-center text-slate-400 py-20 flex flex-col items-center">
                          <User className="w-10 h-10 text-slate-200 mb-2" />
                          <p className="text-xs font-semibold uppercase tracking-wider">No logs stored yet for today.</p>
                        </div>
                      ) : (
                        todayRecords.map((log, index) => (
                          <div key={index} className="p-3 bg-white border border-slate-150-b rounded-xl space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${log.outTime ? 'bg-rose-600' : 'bg-emerald-500'}`}></span>
                              <p className="text-xs font-extrabold uppercase text-slate-900">{log.name}</p>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 ml-auto font-black uppercase text-[8px]">{log.type[0]}</span>
                            </div>
                            
                            <div className="bg-slate-50/80 p-2 rounded-lg text-[10px] space-y-1">
                              {log.inTime && (
                                <p className="text-slate-600 font-semibold">
                                  🌅 Checked In: <strong className="text-slate-900">{log.inTime} AM</strong>
                                </p>
                              )}
                              {log.outTime && (
                                <div className="space-y-0.5 border-t border-slate-100 pt-1.5 mt-1">
                                  <p className="text-rose-700 font-extrabold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-md inline-block">
                                    🚪 early check-out: <span className="font-extrabold">{log.outTime} PM</span>
                                  </p>
                                  <p className="text-slate-600 font-bold">
                                    💬 Cause: <span className="text-slate-900 font-black italic">"{log.earlyOutReason}"</span>
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
            </div>
         </div>
       )}
    </div>
  );
}
