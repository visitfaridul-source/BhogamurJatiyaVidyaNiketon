import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, User, XCircle, Search, Smartphone, Volume2, VolumeX, X, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useSchool } from '@/context/SchoolContext';

interface ScanLog {
  id: string;
  studentId: string;
  name: string;
  class: string;
  time: string;
  status: 'Present' | 'Late' | 'Duplicate';
}

export default function QRScanner({ onExit }: { onExit?: () => void }) {
  const { students } = useSchool();
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [scannedStudent, setScannedStudent] = useState<any | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scannerReady, setScannerReady] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialize Scanner when component mounts
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * 0.7);
          return { width: qrboxSize, height: qrboxSize };
        },
        rememberLastUsedCamera: true,
        videoConstraints: {
          facingMode: "environment"
        }
      },
      false
    );

    const onScanSuccess = (decodedText: string) => {
      handleScan(decodedText);
    };

    const onScanFailure = (error: any) => {
      // Ignore routine scan failures
    };

    scannerRef.current.render(onScanSuccess, onScanFailure);
    setScannerReady(true);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const handleScan = (studentId: string) => {
    // Extract ID if it's a JSON string, else use raw
    let extractedId = studentId;
    try {
      const data = JSON.parse(studentId);
      extractedId = data.id || data.studentId || studentId;
    } catch(e) {}

    const student = students.find(s => s.id === extractedId);
    
    if (student) {
      if (selectedClass && student.class !== selectedClass) {
        if (soundEnabled) playErrorSound();
        setScannedStudent({ ...student, logStatus: 'Duplicate', customStatus: 'Wrong Class', photo: student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}` });
        setTimeout(() => setScannedStudent(null), 3000);
        return;
      }

      // Check for duplicate today
      const isDuplicate = scanLogs.some(log => log.studentId === student.id);
      
      const newLog: ScanLog = {
        id: Date.now().toString(),
        studentId: student.id,
        name: student.name,
        class: `${student.class} - ${student.section || 'A'}`,
        time: new Date().toLocaleTimeString(),
        status: isDuplicate ? 'Duplicate' : 'Present'
      };

      setScannedStudent({ ...student, logStatus: newLog.status, photo: student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}` });
      
      if (!isDuplicate) {
        setScanLogs(prev => [newLog, ...prev]);
        if (soundEnabled) playSuccessSound();
      } else {
        if (soundEnabled) playErrorSound();
      }
      
      // Clear popup after 3 seconds
      setTimeout(() => setScannedStudent(null), 3000);
    } else {
      if (soundEnabled) playErrorSound();
      alert("Student not found for ID: " + extractedId);
    }
  };

  const playSuccessSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  const playErrorSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Left Column - Scanner & Instructions */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 bg-gradient-to-br from-white to-blue-50/50">
          <div className="flex justify-between items-center mb-6">
              <div>
               <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <QrCode className="w-6 h-6 text-blue-600" /> QR Code Scanner
               </h2>
               <p className="text-sm text-slate-500">Scan student ID card to mark attendance</p>
             </div>
             <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
               <select 
                 className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                 value={selectedClass}
                 onChange={(e) => setSelectedClass(e.target.value)}
                 title="Select class to restrict attendance"
               >
                 <option value="">All Classes</option>
                 {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                   <option key={c} value={c}>{c}</option>
                 ))}
               </select>
               <div className="flex gap-2">
                 {onExit && (
                   <button 
                     onClick={onExit}
                     className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm transition-all flex items-center gap-2"
                   >
                     <X className="w-4 h-4" /> Exit
                   </button>
                 )}
                 <button 
                   onClick={() => setSoundEnabled(!soundEnabled)}
                   className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-blue-600 focus:outline-none transition-colors"
                   title={soundEnabled ? "Mute beep" : "Enable beep"}
                 >
                   {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                 </button>
               </div>
             </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-4 border-slate-800 aspect-video flex items-center justify-center">
            {/* The html5-qrcode target */}
            <div id="qr-reader" className="w-full" style={{ width: '100%', minHeight: '300px' }}></div>
            
            {/* Scanning Overlay (Active when scanning) */}
            <AnimatePresence>
              {scannedStudent && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6"
                >
                  <div className={cn(
                    "bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center",
                    scannedStudent.logStatus === 'Duplicate' ? "border-2 border-amber-400" : "border-2 border-emerald-400"
                  )}>
                    {scannedStudent.logStatus === 'Duplicate' ? (
                      <XCircle className="w-16 h-16 text-amber-500 mb-4" />
                    ) : (
                      <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                    )}
                    
                    <div className="w-20 h-20 bg-slate-100 rounded-full overflow-hidden border-4 border-white shadow-lg -mt-12 mb-3">
                      <img src={scannedStudent.photo} alt={scannedStudent.name} />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800">{scannedStudent.name}</h3>
                    <p className="text-slate-500 font-medium">{scannedStudent.class} - {scannedStudent.section}</p>
                    <p className="text-sm text-slate-400 mb-4">Roll: {scannedStudent.roll}</p>

                    <div className={cn(
                      "px-4 py-2 rounded-xl text-sm font-bold w-full",
                      scannedStudent.customStatus ? "bg-rose-100 text-rose-700" :
                      scannedStudent.logStatus === 'Duplicate' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {scannedStudent.customStatus ? 'Student Belongs to Another Class' :
                       scannedStudent.logStatus === 'Duplicate' ? 'Already Marked Present' : 'Attendance Marked Successfully'}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Quick Mock Controls (for demo when no camera available) */}
          <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
             <p className="text-xs text-blue-600 font-medium mb-3 uppercase tracking-wider">Demo / Manual Entry Tools</p>
             <div className="flex gap-2">
               {students.slice(0, 3).map((stu) => (
                 <button key={stu.id} onClick={() => handleScan(stu.id)} className="px-3 py-1.5 text-sm bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50">Scan {stu.name.split(' ')[0]}</button>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* Right Column - Logs & Stats */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm p-4 text-center bg-emerald-50 relative overflow-hidden group hover:border-emerald-300 transition-all">
            <h4 className="text-xs font-bold text-emerald-800 uppercase mb-1">Present Today</h4>
            <p className="text-3xl font-bold text-emerald-600">{scanLogs.filter(l => l.status === 'Present').length}</p>
          </div>
          <div className="bg-white rounded-[2rem] border border-amber-100 shadow-sm p-4 text-center bg-amber-50 relative overflow-hidden group hover:border-amber-300 transition-all">
            <h4 className="text-xs font-bold text-amber-800 uppercase mb-1">Duplicate Scans</h4>
            <p className="text-3xl font-bold text-amber-600">{scanLogs.filter(l => l.status === 'Duplicate').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm h-[500px] flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Recent Scans</h3>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-semibold">{scanLogs.length} Records</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
            {scanLogs.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Smartphone className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm font-medium">Waiting for first scan...</p>
              </div>
            ) : (
              <AnimatePresence>
                {scanLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{log.name}</p>
                      <p className="text-xs text-slate-500">{log.class} • {log.studentId}</p>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1",
                        log.status === 'Present' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {log.status}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">{log.time}</p>
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
