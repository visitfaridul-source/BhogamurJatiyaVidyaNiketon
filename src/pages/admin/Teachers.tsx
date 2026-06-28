import React, { useState, useRef } from 'react';
import { Search, Plus, Filter, MoreVertical, Mail, Phone, BookOpen, UserPlus, X, Upload, PencilLine, Camera, RefreshCcw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useSchool } from '../../context/SchoolContext';
import { useConfirm } from '../../context/ConfirmationContext';

const ensureDDMMYYYY = (dateVal: string | Date | undefined | null) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'object' && dateVal instanceof Date) {
    const d = dateVal.getDate().toString().padStart(2, '0');
    const m = (dateVal.getMonth() + 1).toString().padStart(2, '0');
    const y = dateVal.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const dateStr = String(dateVal).trim();
  if (!dateStr || dateStr === '-') return '-';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  // if format is YYYY-MM-DD
  const matchesYMD = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchesYMD) {
    return `${matchesYMD[3].padStart(2, '0')}/${matchesYMD[2].padStart(2, '0')}/${matchesYMD[1]}`;
  }
  
  // if format is YYYY/MM/DD
  const parts = dateStr.split('/');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }

  // Try parsing in native JS Date parser
  try {
    const dObj = new Date(dateStr);
    if (!isNaN(dObj.getTime())) {
      const d = dObj.getDate().toString().padStart(2, '0');
      const m = (dObj.getMonth() + 1).toString().padStart(2, '0');
      const y = dObj.getFullYear();
      return `${d}/${m}/${y}`;
    }
  } catch (err) {}

  return dateStr;
};

const formatDateForInput = (dateStr: string) => {
  return ensureDDMMYYYY(dateStr);
};

const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let value = e.target.value.replace(/\D/g, ""); // strip non-digits
  if (value.length > 8) value = value.slice(0, 8);
  
  let formatted = "";
  if (value.length > 0) {
    formatted += value.slice(0, 2);
  }
  if (value.length > 2) {
    formatted += "/" + value.slice(2, 4);
  }
  if (value.length > 4) {
    formatted += "/" + value.slice(4, 8);
  }
  e.target.value = formatted;
};

export default function Teachers() {
  const { teachers, setTeachers } = useSchool();
  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera capture states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const startCamera = async (mode = facingMode) => {
    setIsCameraActive(true);
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setIsCameraActive(false);
      alert("Camera access denied or not available. Please check permissions.");
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      
      // Calculate scaled dimensions (target max width ~200px to ensure 20-30KB size)
      const MAX_WIDTH = 200;
      let targetWidth = videoRef.current.videoWidth;
      let targetHeight = videoRef.current.videoHeight;
      
      if (targetWidth > MAX_WIDTH) {
        const aspectRatio = targetHeight / targetWidth;
        targetWidth = MAX_WIDTH;
        targetHeight = targetWidth * aspectRatio;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);
        // Use 0.55 quality to keep size under 20-30KB and avoid data crashes
        const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
        setPhotoPreview(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    setMediaStream(null);
    setIsCameraActive(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress uploaded image
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Scale to max width of 200px to ensure extremely lightweight 20-30KB images
          const MAX_WIDTH = 200;
          let targetWidth = img.width;
          let targetHeight = img.height;
          
          if (targetWidth > MAX_WIDTH) {
            const aspectRatio = targetHeight / targetWidth;
            targetWidth = MAX_WIDTH;
            targetHeight = targetWidth * aspectRatio;
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            // Use 0.55 quality to keep size under 20-30KB and avoid document limit crashes
            const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
            setPhotoPreview(dataUrl);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTeacher = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawId = (formData.get('teacherId') as string || '').trim().toUpperCase();
    const teacherId = rawId || `TCH${Date.now()}${(Math.floor(Math.random() * 100))}`;
    const isIdCollision = teachers.some(t => t.id === teacherId && (!editingTeacher || editingTeacher.id !== teacherId));
    
    if (isIdCollision) {
      alert('Teacher ID must be unique. This ID is already assigned to another teacher.');
      return;
    }

    const rawFullName = (formData.get('fullName') as string || 'UNKNOWN TEACHER').trim().toUpperCase();

    const newTeacher = {
      id: teacherId,
      name: rawFullName,
      gender: (formData.get('gender') as string || 'Male'),
      subject: (formData.get('subject') as string || editingTeacher?.subject || 'GENERAL').trim().toUpperCase(),
      qualification: (formData.get('qualification') as string || editingTeacher?.qualification || 'B.ED').trim().toUpperCase(),
      phone: (formData.get('mobile') as string || '-').trim(),
      email: editingTeacher?.email || `${rawFullName.split(' ')[0].toLowerCase() || 'teacher'}@school.com`,
      status: (formData.get('status') as string || 'Present').trim(),
      avatar: photoPreview || editingTeacher?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rawFullName}`,
      fatherName: (formData.get('fatherName') as string || '-').trim().toUpperCase(),
      dob: ensureDDMMYYYY(formData.get('dob') as string || '-'),
      joiningDate: ensureDDMMYYYY(formData.get('joiningDate') as string || new Date().toISOString().split('T')[0]),
      aadhaar: (formData.get('aadhaar') as string || '-').trim().toUpperCase(),
      pan: (formData.get('pan') as string || '-').trim().toUpperCase(),
      address: (formData.get('address') as string || '-').trim().toUpperCase(),
    };

    if (editingTeacher) {
      setTeachers(prev => prev.map(t => t.id === editingTeacher.id ? newTeacher : t));
      setEditingTeacher(null);
    } else {
      setTeachers(prev => [newTeacher, ...prev]);
    }
    
    setIsAddTeacherModalOpen(false);
    setPhotoPreview(null);
  };

  const handleDeleteTeacher = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Teacher',
      message: 'Are you sure you want to delete this teacher? This action will remove their profile record.',
      variant: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (isConfirmed) {
      setTeachers(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Teacher Management</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage staff directory, class assignments, and communications.</p>
        </div>
        <div className="flex gap-3 mt-2 sm:mt-0">
          <button 
            onClick={() => setIsAddTeacherModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Teacher
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search teachers by name or subject..." 
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
          <Filter className="w-5 h-5" />
          More Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teachers
          .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.subject.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((teacher) => (
          <div key={teacher.id} className="bg-white rounded-[2xl] border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden group">
             <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
               <div className="absolute top-4 right-4 group/dropdown">
                 <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white">
                   <MoreVertical className="w-5 h-5" />
                 </button>
                 <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-10 overflow-hidden text-sm font-medium">
                   <button 
                     onClick={() => {
                        setEditingTeacher(teacher);
                        setPhotoPreview(teacher.avatar);
                     }}
                     className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                   >
                      <PencilLine className="w-4 h-4 text-blue-500" /> Edit
                   </button>
                   <button 
                     onClick={() => handleDeleteTeacher(teacher.id)}
                     className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                   >
                     <X className="w-4 h-4" /> Delete
                   </button>
                 </div>
               </div>
            </div>
            <div className="px-6 pb-6 relative">
              <div className="flex justify-between items-end mb-4 -mt-12">
                <div className="w-24 h-24 rounded-2xl border-4 border-white bg-slate-100 overflow-hidden shadow-sm">
                  <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" />
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold mb-2 border ${
                  teacher.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {teacher.status}
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-900 uppercase">{teacher.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    teacher.gender === 'Female' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100' : 
                    teacher.gender === 'Other' ? 'bg-slate-50 text-slate-700 border-slate-200' : 
                    'bg-sky-50 text-sky-700 border-sky-100'
                  }`}>
                    {teacher.gender || 'Male'}
                  </span>
                </div>
                <p className="text-sm font-bold text-blue-600 mb-4">{teacher.subject} • <span className="text-slate-500 font-medium">{teacher.qualification}</span></p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{teacher.phone}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm">
                    <BookOpen className="w-4 h-4 text-slate-400" /> Schedule
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-bold shadow-sm">
                    <Mail className="w-4 h-4" /> Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Teacher Modal */}
      {(isAddTeacherModalOpen || editingTeacher) && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
             {/* Modal Header */}
             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
               <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                     <UserPlus className="w-6 h-6 text-blue-600" /> 
                     {editingTeacher ? 'Edit Teacher Details' : 'New Teacher Enrollment'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{editingTeacher ? 'Update the details for the existing staff member' : 'Provide information to register a new staff member'}</p>
               </div>
               <button 
                 onClick={() => { setIsAddTeacherModalOpen(false); setEditingTeacher(null); stopCamera(); }} 
                 className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             {/* Modal Body */}
             <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                <form key={editingTeacher?.id || 'new'} id="add-teacher-form" className="space-y-8" onSubmit={handleAddTeacher}>
                   {/* Personal Details Section */}
                   <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-6">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                        <span className="w-6 h-px bg-blue-600 rounded-full"></span>
                        Personal Details
                      </h3>

                      <div className="flex flex-col md:flex-row gap-8">
                         {/* Photo Upload Area */}
                         <div className="flex flex-col items-center gap-4 shrink-0">
                            <div className="flex gap-2">
                              {!isCameraActive ? (
                                <button type="button" onClick={() => startCamera()} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-md transition-colors shadow-sm border border-blue-100 text-xs font-bold flex items-center gap-1">
                                  <Camera className="w-4 h-4" /> Camera
                                </button>
                              ) : (
                                <div className="flex gap-1">
                                  <button type="button" onClick={toggleCamera} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-md transition-colors shadow-sm border border-blue-100 text-xs font-bold flex items-center gap-1" title="Switch Camera">
                                    <RefreshCcw className="w-4 h-4" /> Switch
                                  </button>
                                  <button type="button" onClick={stopCamera} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors shadow-sm border border-red-100 text-xs font-bold flex items-center gap-1" title="Cancel Camera">
                                    <X className="w-4 h-4" /> Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                            <div 
                              className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-500 transition-colors shadow-sm"
                              onClick={() => !isCameraActive && fileInputRef.current?.click()}
                            >
                               {isCameraActive ? (
                                 <>
                                   <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover z-20 ${facingMode === "user" ? "scale-x-[-1]" : ""}`} />
                                   <button type="button" onClick={(e) => { e.stopPropagation(); capturePhoto(); }} className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 text-blue-600 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-md z-30 hover:bg-white transition-colors flex items-center gap-1">
                                     <Camera className="w-3 h-3" /> Snap
                                   </button>
                                 </>
                               ) : (
                                 photoPreview ? (
                                    <>
                                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer">
                                        <PencilLine className="w-6 h-6" />
                                      </div>
                                    </>
                                 ) : (
                                    <div className="flex flex-col items-center cursor-pointer">
                                       <Upload className="w-6 h-6 text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" />
                                       <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide group-hover:text-blue-600 transition-colors text-center leading-tight">Upload<br/>Photo</span>
                                    </div>
                                 )
                               )}
                            </div>
                            <input 
                              type="file" 
                              ref={fileInputRef}
                              onChange={handlePhotoUpload}
                              className="hidden" 
                              accept="image/jpeg,image/png,image/webp"
                            />
                            {!isCameraActive && (
                              <div className="w-full">
                                <input 
                                  type="text" 
                                  placeholder="Or paste URL"
                                  value={photoPreview || ''}
                                  onChange={(e) => {
                                    setPhotoPreview(e.target.value);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] focus:outline-none focus:border-blue-500 text-center"
                                />
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400 text-center uppercase tracking-wide max-w-[120px]">
                              JPG, PNG max 2MB
                            </p>
                         </div>

                         {/* Form Fields */}
                         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Teacher ID</label>
                              <input type="text" name="teacherId" defaultValue={editingTeacher?.id} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="e.g. TCH2024001" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Full Name</label>
                              <input type="text" name="fullName" defaultValue={editingTeacher?.name} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="JOHN DOE" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Gender</label>
                              <select name="gender" defaultValue={editingTeacher?.gender || 'Male'} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Father's Name</label>
                              <input type="text" name="fatherName" defaultValue={editingTeacher?.fatherName} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="FATHER'S NAME" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Subject</label>
                              <input type="text" name="subject" defaultValue={editingTeacher?.subject} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="e.g. Mathematics" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Qualification</label>
                              <input type="text" name="qualification" defaultValue={editingTeacher?.qualification} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="e.g. M.Sc, B.Ed" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Status</label>
                              <select name="status" defaultValue={editingTeacher?.status || 'Present'} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase">
                                <option value="Present">Present</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Resigned">Resigned</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                              <input 
                                type="text" 
                                name="dob" 
                                maxLength={10}
                                placeholder="DD/MM/YYYY"
                                defaultValue={editingTeacher?.dob ? formatDateForInput(editingTeacher.dob) : ""} 
                                onChange={handleDateInputChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Mobile No</label>
                              <input type="tel" name="mobile" defaultValue={editingTeacher?.phone} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="+1 (____) ___-____" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Date of Joining</label>
                              <input 
                                type="text" 
                                name="joiningDate" 
                                maxLength={10}
                                placeholder="DD/MM/YYYY"
                                defaultValue={editingTeacher?.joiningDate ? formatDateForInput(editingTeacher.joiningDate) : formatDateForInput(new Date().toISOString().split('T')[0])} 
                                onChange={handleDateInputChange}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" 
                              />
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Documentation Section */}
                   <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-6">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                        <span className="w-6 h-px bg-purple-600 rounded-full"></span>
                        Documentation & Address
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         <div className="space-y-1.5">
                           <label className="text-sm font-semibold text-slate-700">Aadhaar No</label>
                           <input type="text" name="aadhaar" defaultValue={editingTeacher?.aadhaar} pattern="\d{12}" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="12 Digit Aadhaar Number" />
                         </div>
                         <div className="space-y-1.5">
                           <label className="text-sm font-semibold text-slate-700">PAN No</label>
                           <input type="text" name="pan" defaultValue={editingTeacher?.pan} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="ABCDE1234F" />
                         </div>
                         <div className="space-y-1.5 md:col-span-2">
                           <label className="text-sm font-semibold text-slate-700">Residential Address</label>
                           <textarea name="address" defaultValue={editingTeacher?.address} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-20 text-sm uppercase" placeholder="FULL RESIDENTIAL ADDRESS"></textarea>
                         </div>
                      </div>
                   </div>
                </form>
             </div>

             {/* Modal Footer */}
             <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0 rounded-b-3xl">
               <button 
                 type="button"
                 onClick={() => { setIsAddTeacherModalOpen(false); setEditingTeacher(null); }}
                 className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
               >
                 Cancel
               </button>
               <button 
                 type="submit"
                 form="add-teacher-form"
                 className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-blue-700 shadow-blue-500/20 transition-all active:scale-95"
               >
                 {editingTeacher ? 'Save Changes' : 'Save & Register'}
               </button>
             </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
