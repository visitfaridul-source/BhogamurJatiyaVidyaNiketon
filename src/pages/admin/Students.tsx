import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Download, Upload, IdCard, X, Printer, UserPlus, Image as ImageIcon, FileSpreadsheet, ClipboardList, Camera, RefreshCcw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
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

  // check if it's an Excel serial number
  const serial = Number(dateStr);
  if (!isNaN(serial) && serial > 20000 && serial < 60000) {
    const dateObj = new Date((serial - 25569) * 86400 * 1000);
    const d = dateObj.getDate().toString().padStart(2, '0');
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}/${m}/${y}`;
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

export default function Students() {
  const { students, setStudents } = useSchool();
  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedStudentForID, setSelectedStudentForID] = useState<any>(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically update old students with default address
  useEffect(() => {
    let hasUpdates = false;
    const updatedStudents = students.map(s => {
      if (!s.address || s.address.trim() === '-' || s.address.trim() === '') {
        hasUpdates = true;
        return { ...s, address: 'NAGAON, ASSAM' };
      }
      return s;
    });

    if (hasUpdates) {
      setStudents(updatedStudents);
    }
  }, [students, setStudents]);

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
      
      // Calculate scaled dimensions (target max width ~300px)
      const MAX_WIDTH = 300;
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
        // Use 0.6 quality for lower file size (approx 20-30kb)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
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

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Bulk Excel copy-paste sheet states
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [bulkClass, setBulkClass] = useState('Class 1');
  const [bulkSection, setBulkSection] = useState('A');

  const bulkHeaders = [
    "Student Name *", 
    "Admission ID", 
    "Roll No", 
    "Class", "Section", 
    "Father's Name *", 
    "Mother's Name", 
    "Gender",
    "Mobile No", 
    "D.O.B (DD/MM/YYYY)", 
    "Admission Date (DD/MM/YYYY)", 
    "Residential Address", 
    "Aadhaar No.", 
    "PEN No.", 
    "APAAR ID"
  ];

  const [bulkGridData, setBulkGridData] = useState<string[][]>(() => 
    Array.from({ length: 15 }, () => Array(15).fill(''))
  );

  const [parsedBulkStudents, setParsedBulkStudents] = useState<any[]>([]);
  const [bulkParseError, setBulkParseError] = useState('');

  React.useEffect(() => {
    const rows = bulkGridData;
    const nonEmptyRows = rows.filter(r => r.some(c => c && c.trim() !== ''));

    if (nonEmptyRows.length === 0) {
      setParsedBulkStudents([]);
      setBulkParseError('');
      return;
    }

    try {
      const newStudents: any[] = [];
      nonEmptyRows.forEach((row, index) => {
        const firstColVal = row[0]?.trim() || '';
        if (firstColVal.toLowerCase().includes('student name') || firstColVal.toLowerCase() === 'name') {
          return;
        }

        const name = row[0]?.trim()?.toUpperCase() || 'UNKNOWN STUDENT';

        const id = row[1]?.trim()?.toUpperCase() || `ADM${Date.now()}${Math.floor(Math.random() * 1000)}${index}`;
        const roll = row[2]?.trim()?.toUpperCase() || '-';
        const cls = row[3]?.trim()?.toUpperCase() || bulkClass || 'Class 1';
        const sec = row[4]?.trim()?.toUpperCase() || bulkSection || 'A';
        const parentName = row[5]?.trim()?.toUpperCase() || '-';
        const motherName = row[6]?.trim()?.toUpperCase() || '-';
        const gender = row[7]?.trim() || 'Male';
        const phone = row[8]?.trim() || '-';
        const dob = ensureDDMMYYYY(row[9]?.trim());
        const admissionDate = ensureDDMMYYYY(row[10]?.trim()) || ensureDDMMYYYY(new Date());
        const address = row[11]?.trim()?.toUpperCase() || '-';
        const aadhaar = row[12]?.trim()?.toUpperCase() || '-';
        const pen = row[13]?.trim()?.toUpperCase() || '-';
        const apaar = row[14]?.trim()?.toUpperCase() || '-';

        newStudents.push({
          id,
          name,
          gender,
          roll,
          class: cls,
          section: sec,
          parentName,
          motherName,
          phone,
          dob,
          admissionDate,
          address,
          aadhaar,
          pen,
          apaar,
          status: 'Active'
        });
      });
      setParsedBulkStudents(newStudents);
      setBulkParseError('');
    } catch (err) {
      setBulkParseError('Error parsing pasted columns. Please check that values are correct.');
      setParsedBulkStudents([]);
    }
  }, [bulkGridData, bulkClass, bulkSection]);

  const updateGridCell = (rIdx: number, cIdx: number, value: string) => {
    const newGrid = [...bulkGridData];
    newGrid[rIdx] = [...newGrid[rIdx]];
    newGrid[rIdx][cIdx] = value;
    setBulkGridData(newGrid);
  };

  const handleGridPaste = (e: React.ClipboardEvent, startRow: number, startCol: number) => {
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;
    
    if (clipboardData.includes('\t') || clipboardData.includes('\n')) {
      e.preventDefault();
      const pasteRows = clipboardData.split(/\r?\n/).map(r => r.split('\t'));
      
      let newGrid = [...bulkGridData.map(r => [...r])];
      let maxRows = Math.max(newGrid.length, startRow + pasteRows.length);
      let maxCols = newGrid[0].length;
      
      while(newGrid.length < maxRows) {
        newGrid.push(Array(maxCols).fill(''));
      }
      newGrid.forEach(row => {
        while (row.length < maxCols) row.push('');
      });

      pasteRows.forEach((r, i) => {
        r.forEach((c, j) => {
          const ri = startRow + i;
          const ci = startCol + j;
          if (ri < newGrid.length && ci < newGrid[ri].length) {
            newGrid[ri][ci] = c;
          }
        });
      });
      setBulkGridData(newGrid);
    }
  };

  const handleSaveBulkStudents = () => {
    if (parsedBulkStudents.length === 0) {
      alert('Please paste or write some student data first.');
      return;
    }
    
    const currentIds = students.map(s => s.id);
    const resolvedStudents = parsedBulkStudents.map(s => {
      const match = currentIds.includes(s.id);
      return {
        ...s,
        id: match ? `${s.id}-${Math.floor(Math.random() * 1000)}` : s.id
      };
    });

    setStudents(prev => [...resolvedStudents, ...prev]);
    setShowBulkPasteModal(false);
    setBulkGridData(Array.from({ length: 15 }, () => Array(15).fill('')));
    alert(`Successfully enrolled ${resolvedStudents.length} students class-wise!`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress uploaded image
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            setPhotoPreview(dataUrl);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const importedStudents = data.map((row: any, index) => ({
          id: row['Admission Id'] || row['Adm Id'] || `IMP${Date.now()}${index}`,
          name: row['Name'] || 'Unknown',
          gender: row['Gender'] || row['gender'] || 'Male',
          class: row['Class'] || 'N/A',
          section: row['Section'] || 'N/A',
          admissionDate: ensureDDMMYYYY(row['Date of Admission']),
          dob: ensureDDMMYYYY(row['DOB']),
          parentName: row["Father's Name"] || row["Father's name"] || 'N/A',
          motherName: row["Mother's Name"] || row["Mother's name"] || '',
          address: row['Address'] || '',
          phone: row['Mobile No'] || 'N/A',
          aadhaar: row['Aadhaar No'] || '',
          pen: row['PEN No'] || '',
          apaar: row['APAAR ID'] || '',
          status: row['Status'] || 'Active',
        }));
        
        setStudents(prev => [...importedStudents, ...prev]);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Group students by Class and Section uniquely
    const studentsByGroup = filteredStudents.reduce((acc, student) => {
      const className = (student.class || 'Unassigned').toUpperCase();
      const sectionName = (student.section || '').toUpperCase();
      const groupKey = sectionName ? `${className} - SEC ${sectionName}` : className;

      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(student);
      return acc;
    }, {} as Record<string, typeof students>);

    const usedSheetNames = new Set<string>();
    
    // Create a sheet for each class-section combination
    Object.entries(studentsByGroup).forEach(([groupName, classStudentsList]) => {
      const formattedData = (classStudentsList as any[]).map(s => ({
        'Admission Id': s.id,
        'Date of Admission': ensureDDMMYYYY(s.admissionDate),
        'Class': s.class,
        'Section': s.section,
        'Name': s.name,
        'Gender': s.gender || 'Male',
        'DOB': ensureDDMMYYYY(s.dob),
        'Mobile No': s.phone,
        "Father's Name": s.parentName,
        "Mother's Name": s.motherName || '',
        'Address': s.address || '',
        'Aadhaar No': s.aadhaar || '',
        'PEN No': s.pen || '',
        'APAAR ID': s.apaar || '',
        'Status': s.status
      }));

      const ws = XLSX.utils.json_to_sheet(formattedData);
      // Valid sheet names cannot exceed 31 chars and no special chars
      let safeSheetName = groupName.substring(0, 31).replace(/[\\/?*[\]]/g, ' ').trim();
      if (!safeSheetName) safeSheetName = 'Students';
      
      let finalSheetName = safeSheetName;
      let counter = 1;
      while (usedSheetNames.has(finalSheetName.toUpperCase())) {
        const suffix = ` (${counter})`;
        finalSheetName = safeSheetName.substring(0, 31 - suffix.length) + suffix;
        counter++;
      }
      usedSheetNames.add(finalSheetName.toUpperCase());
      
      XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
    });

    if (Object.keys(studentsByGroup).length === 0) {
      const ws = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, ws, "Students");
    }

    XLSX.writeFile(wb, "Sectionwise_Students_List.xlsx");
  };

  const handleDeleteStudent = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Student',
      message: 'Are you sure you want to delete this student? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (isConfirmed) {
      setStudents(prev => prev.filter(s => s.id !== id));
      setSelectedStudentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredStudents.map(s => s.id));
      setSelectedStudentIds(allIds);
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.size === 0) return;
    const isConfirmed = await confirm({
      title: 'Delete Selected Students',
      message: `Are you sure you want to delete ${selectedStudentIds.size} student(s)? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete All',
      cancelLabel: 'Cancel'
    });
    if (isConfirmed) {
      setStudents(prev => prev.filter(s => !selectedStudentIds.has(s.id)));
      setSelectedStudentIds(new Set());
    }
  };

  const availableSectionsFilter = React.useMemo(() => {
    if (!selectedClassFilter) return [];
    const sections = new Set<string>();
    students.forEach((s) => {
      const clsNormalized = (s.class || '').toLowerCase().replace(/\s+/g, '');
      const filterNormalized = selectedClassFilter.toLowerCase().replace(/\s+/g, '');
      if (clsNormalized === filterNormalized && s.section) {
        sections.add(s.section.toUpperCase().trim());
      }
    });
    return Array.from(sections).sort();
  }, [students, selectedClassFilter]);

  const filteredStudents = students
    .filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.roll && s.roll.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(s => selectedClassFilter ? (s.class || '').toLowerCase().replace(/\s+/g, '') === selectedClassFilter.toLowerCase().replace(/\s+/g, '') : true)
    .filter(s => selectedSectionFilter ? (s.section || '').toUpperCase().trim() === selectedSectionFilter.toUpperCase().trim() : true)
    .filter(s => selectedStatusFilter ? s.status === selectedStatusFilter : true);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Student Management</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage enrollments, profiles, and ID cards.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedStudentIds.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-100 transition-colors border border-rose-200 shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete {selectedStudentIds.size}
            </button>
          )}
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImportExcel}
          />
          <button 
            onClick={() => {
              setBulkGridData(Array.from({ length: 15 }, () => Array(15).fill('')));
              setShowBulkPasteModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel Copy-Paste
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={() => setIsAddStudentModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name, ID or roll..." 
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select 
              className="bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 shadow-sm min-w-[140px]"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Transferred">Transferred</option>
            </select>
            <select 
              className="bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 shadow-sm min-w-[140px]"
              value={selectedClassFilter}
              onChange={(e) => {
                setSelectedClassFilter(e.target.value);
                setSelectedSectionFilter('');
              }}
            >
              <option value="">All Classes</option>
              {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {selectedClassFilter && availableSectionsFilter.length > 0 && (
              <select 
                className="bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 shadow-sm min-w-[140px]"
                value={selectedSectionFilter}
                onChange={(e) => setSelectedSectionFilter(e.target.value)}
              >
                <option value="">All Sections</option>
                {availableSectionsFilter.map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Photo</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Adm Id</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Name</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Class</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Gender</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Mobile</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Father's Name</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      checked={selectedStudentIds.has(student.id)}
                      onChange={() => handleSelectStudent(student.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div 
                      className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden shrink-0 bg-white cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setViewingPhotoUrl((student as any).photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`)}
                    >
                       {(student as any).photoUrl ? (
                          <img src={(student as any).photoUrl} alt={student.name} className="w-full h-full object-cover" />
                       ) : (
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} alt={student.name} className="w-full h-full object-cover bg-slate-50" />
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-800 font-bold">{student.id}</td>
                  <td className="px-6 py-4 text-slate-900 font-bold">{student.name}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {student.class} {student.section && `- ${student.section}`}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      student.gender === 'Female' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' : 
                      student.gender === 'Other' ? 'bg-slate-50 text-slate-700 border-slate-200' : 
                      'bg-sky-50 text-sky-700 border-sky-200'
                    }`}>
                      {student.gender || 'Male'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{student.phone}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{student.parentName}</td>
                  <td className="px-6 py-4">
                     <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                      student.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                      student.status === 'Transferred' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setSelectedStudentForID(student)}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-100" title="Generate ID Card"
                      >
                        <IdCard className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingStudent(student);
                          setPhotoPreview((student as any).photoUrl || null);
                        }}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-5 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 bg-slate-50/50">
          <p className="font-medium">Showing {filteredStudents.length} students {selectedClassFilter ? `in ${selectedClassFilter}` : ''}</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-slate-200 bg-white rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">Previous</button>
            <button className="px-4 py-2 bg-blue-600 font-bold text-white rounded-xl shadow-sm">1</button>
            <button className="px-4 py-2 border border-slate-200 bg-white rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">Next</button>
          </div>
        </div>
      </div>

      {/* ID Card Modal */}
      {selectedStudentForID && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden print:w-full print:shadow-none animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center print:hidden bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><IdCard className="w-5 h-5" /> Student ID Card</h3>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="p-2 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                  <Printer className="w-5 h-5" />
                </button>
                <button onClick={() => setSelectedStudentForID(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 flex justify-center bg-[#f8fafc]" id="printable-id-card">
              {/* ID Card Visual Design */}
              <div className="w-[300px] h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative print:shadow-none flex flex-col">
                {/* Header Banner */}
                <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 relative flex items-center justify-center px-4">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                  <div className="text-center relative z-10 text-white w-full">
                    <h2 className="font-black text-xl tracking-wider leading-tight">BHOGAMUR JATIYA VIDYA NIKETON</h2>
                    <p className="text-[10px] text-blue-100 font-medium tracking-widest uppercase">Student Identity Card</p>
                  </div>
                  {/* Decorative curved bottom */}
                  <div className="absolute -bottom-4 left-0 right-0 h-8 bg-white/10 blur-xl" />
                </div>

                {/* Photo & Details Layer */}
                <div className="flex flex-col items-center -mt-12 relative z-20 flex-1 px-6">
                  {/* Profile Photo */}
                  <div className="w-24 h-24 bg-white rounded-full p-1.5 shadow-lg mb-4">
                     <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStudentForID.name}`} alt={selectedStudentForID.name} />
                     </div>
                  </div>

                  {/* Student Info */}
                  <h3 className="text-xl font-bold text-slate-800 text-center uppercase tracking-tight">{selectedStudentForID.name}</h3>
                  <p className="text-sm font-semibold text-blue-600 mt-1 mb-5">{selectedStudentForID.id}</p>

                  <div className="w-full space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Class/Sec</span>
                      <span className="font-bold text-slate-800">{selectedStudentForID.class} - {selectedStudentForID.section}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Roll No.</span>
                      <span className="font-bold text-slate-800">{selectedStudentForID.roll}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Session</span>
                      <span className="font-bold text-slate-800">2023 - 2024</span>
                    </div>
                  </div>

                  {/* QR Code Container */}
                  <div className="mt-auto mb-6 flex flex-col items-center">
                    <div className="p-2 bg-white rounded-xl shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)] border border-slate-100">
                      <QRCodeSVG 
                        value={JSON.stringify({ 
                          id: selectedStudentForID.id, 
                          name: selectedStudentForID.name, 
                          class: selectedStudentForID.class, 
                          section: selectedStudentForID.section 
                        })} 
                        size={80} 
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-2 font-medium tracking-wide">SCAN FOR ATTENDANCE</p>
                  </div>
                </div>

                <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600 w-full" />
              </div>
            </div>
            
            <style>
              {`
                @media print {
                  body * { visibility: hidden; }
                  #printable-id-card, #printable-id-card * { visibility: visible; }
                  #printable-id-card { position: absolute; left: 0; top: 0; }
                }
              `}
            </style>
          </div>
        </div>
      , document.body)}

      {/* View Photo Modal */}
      {viewingPhotoUrl && createPortal(
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingPhotoUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setViewingPhotoUrl(null); }} 
              className="absolute -top-12 md:-top-4 md:-right-12 text-white hover:text-slate-300 p-2 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={viewingPhotoUrl} 
              alt="Student Photo Full" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" 
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      , document.body)}

      {/* Add/Edit Student Modal */}
      {(isAddStudentModalOpen || editingStudent) && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
             {/* Modal Header (Fixed) */}
             <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                     <UserPlus className="w-6 h-6 text-blue-600" /> 
                     {editingStudent ? 'Edit Student Details' : 'New Admission Form'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{editingStudent ? 'Update the details for the existing student' : 'Fill in the details to enroll a new student into the system'}</p>
               </div>
               <button 
                 onClick={() => { setIsAddStudentModalOpen(false); setEditingStudent(null); stopCamera(); }} 
                 className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             {/* Modal Body (Scrollable) */}
             <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
        <form key={editingStudent?.id || 'new'} id="add-student-form" className="space-y-8" onSubmit={(e) => { 
          e.preventDefault(); 
          const formData = new FormData(e.currentTarget);
          
          const rawId = (formData.get('admId') as string || '').trim().toUpperCase();
          const admId = rawId || `ADM${Date.now()}${Math.floor(Math.random() * 100)}`;
          const isIdCollision = students.some(s => s.id === admId && (!editingStudent || editingStudent.id !== admId));
          
          if (isIdCollision) {
            alert('Admission ID must be unique. This ID is already assigned to another student.');
            return;
          }

          const newStudent = {
            id: admId,
            name: (formData.get('fullName') as string || 'UNKNOWN STUDENT').trim().toUpperCase(),
            gender: (formData.get('gender') as string || 'Male'),
            class: (formData.get('class') as string || 'Class 1'),
            section: (formData.get('section') as string || 'A').toUpperCase(),
            roll: (formData.get('roll') as string || editingStudent?.roll || '-').trim().toUpperCase(),
            parentName: (formData.get('fatherName') as string || '-').trim().toUpperCase(),
            phone: (formData.get('mobile') as string || '-').trim(),
            status: (formData.get('status') as string || 'Active'),
            admissionDate: ensureDDMMYYYY(formData.get('admissionDate') as string || new Date().toISOString().split('T')[0]),
            dob: ensureDDMMYYYY(formData.get('dob') as string || '-'),
            motherName: (formData.get('motherName') as string || '-').trim().toUpperCase(),
            address: (formData.get('address') as string || '-').trim().toUpperCase(),
            aadhaar: (formData.get('aadhaar') as string || '-').trim().toUpperCase(),
            pen: (formData.get('pen') as string || '-').trim().toUpperCase(),
            apaar: (formData.get('apaar') as string || '-').trim().toUpperCase(),
            photoUrl: photoPreview || editingStudent?.photoUrl,
          };

          if (editingStudent) {
            setStudents(prev => prev.map(s => s.id === editingStudent.id ? newStudent : s));
            setEditingStudent(null);
          } else {
            setStudents(prev => [newStudent, ...prev]);
            setIsAddStudentModalOpen(false);
          }
          setPhotoPreview(null);
        }}>
                 
                 {/* Section 1: Academic Details */}
                 <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</div> 
                      Academic Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Admission No. (Adm Id)</label>
                        <input type="text" name="admId" defaultValue={editingStudent?.id} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="e.g. ADM2023001" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Date of Admission</label>
                        <input 
                          type="text" 
                          name="admissionDate" 
                          maxLength={10}
                          placeholder="DD/MM/YYYY"
                          defaultValue={editingStudent?.admissionDate ? formatDateForInput(editingStudent.admissionDate) : formatDateForInput(new Date().toISOString().split('T')[0])} 
                          onChange={handleDateInputChange}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Class</label>
                        <select name="class" defaultValue={editingStudent?.class} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase">
                          <option value="">Select Class</option>
                          {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Section</label>
                        <div className="relative">
                           <select name="section" defaultValue={editingStudent?.section} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none text-sm uppercase">
                             <option value="">Select Section</option>
                             <option value="A">Section A</option>
                             <option value="B">Section B</option>
                             <option value="C">Section C</option>
                             <option value="D">Section D</option>
                           </select>
                           <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                             <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                           </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Roll No.</label>
                        <input type="text" name="roll" defaultValue={editingStudent?.roll} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="e.g. 1" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Status</label>
                        <select name="status" defaultValue={editingStudent?.status || 'Active'} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase">
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                 </div>

                 {/* Section 2: Student Details & Photo */}
                 <div className="flex flex-col lg:flex-row gap-6">
                   <div className="flex-1 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</div> 
                        Personal Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         <div className="space-y-1.5 md:col-span-2">
                           <label className="text-sm font-semibold text-slate-700">Full Name</label>
                           <input type="text" name="fullName" defaultValue={editingStudent?.name} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="Student's Legal Name" />
                         </div>
                         <div className="space-y-1.5">
                           <label className="text-sm font-semibold text-slate-700">Gender</label>
                           <select name="gender" defaultValue={editingStudent?.gender || "Male"} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase">
                             <option value="Male">Male</option>
                             <option value="Female">Female</option>
                             <option value="Other">Other</option>
                           </select>
                         </div>
                         <div className="space-y-1.5">
                           <label className="text-sm font-semibold text-slate-700">Date of Birth (D.O.B)</label>
                           <input 
                             type="text" 
                             name="dob" 
                             maxLength={10}
                             placeholder="DD/MM/YYYY" 
                             defaultValue={editingStudent?.dob ? formatDateForInput(editingStudent.dob) : ""} 
                             onChange={handleDateInputChange}
                             className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" 
                           />
                         </div>
                         <div className="space-y-1.5 md:col-span-2">
                           <label className="text-sm font-semibold text-slate-700">Mobile Number</label>
                           <input type="tel" name="mobile" defaultValue={editingStudent?.phone} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="+1 (___) ___-____" />
                         </div>
                      </div>
                   </div>
                       
                   {/* Photo Upload */}
                   <div className="w-full lg:w-64 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center shrink-0">
                     <label className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center justify-between w-full">
                       <span>Student Photo</span>
                       {!isCameraActive ? (
                         <button type="button" onClick={() => startCamera()} className="text-blue-500 hover:bg-blue-50 p-1 rounded-md transition-colors" title="Capture from Camera">
                           <Camera className="w-4 h-4" />
                         </button>
                       ) : (
                         <div className="flex gap-1">
                           <button type="button" onClick={toggleCamera} className="text-blue-500 hover:bg-blue-50 p-1 rounded-md transition-colors" title="Switch Camera">
                             <RefreshCcw className="w-4 h-4" />
                           </button>
                           <button type="button" onClick={stopCamera} className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors" title="Cancel Camera">
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       )}
                     </label>
                     <div className="relative group w-36 h-44 rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden shadow-sm flex flex-col">
                        {isCameraActive ? (
                          <>
                            <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover z-20 ${facingMode === "user" ? "scale-x-[-1]" : ""}`} />
                            <button type="button" onClick={capturePhoto} className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold shadow-md z-30 hover:bg-white transition-colors flex items-center gap-1">
                              <Camera className="w-3 h-3" /> Snap
                            </button>
                          </>
                        ) : (
                          <>
                            <input 
                              type="file" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                              accept="image/*"
                              onChange={handlePhotoUpload}
                            />
                            <div className="absolute inset-0 w-full h-full hover:border-blue-400 hover:bg-blue-50/50 transition-colors flex items-center justify-center cursor-pointer">
                               {photoPreview ? (
                                 <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                               ) : (
                                 <div className="flex flex-col items-center p-4 text-center text-slate-400 group-hover:text-blue-500">
                                   <ImageIcon className="w-8 h-8 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                                   <span className="text-xs font-semibold">Click to upload<br/>passport size</span>
                                 </div>
                               )}
                            </div>
                          </>
                        )}
                     </div>
                     {!isCameraActive && (
                       <div className="mt-4 w-full">
                          <input 
                            type="text" 
                            placeholder="Or paste photo URL"
                            value={photoPreview || ''}
                            onChange={(e) => {
                              setPhotoPreview(e.target.value);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-center"
                          />
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Section 3: Family Details & Address */}
                 <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                       <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</div> 
                       Family & Address
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Father's Name</label>
                        <input type="text" name="fatherName" defaultValue={editingStudent?.parentName} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Mother's Name</label>
                        <input type="text" name="motherName" defaultValue={editingStudent?.motherName} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700">Residential Address</label>
                        <textarea name="address" defaultValue={(editingStudent as any)?.address || "NAGAON, ASSAM"} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-20 text-sm uppercase" placeholder="Full residential street address..."></textarea>
                      </div>
                    </div>
                 </div>

                 {/* Section 4: Identification Details */}
                 <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                       <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs">4</div> 
                       National Identification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Aadhaar No. (12 Digits)</label>
                        <input type="text" name="aadhaar" defaultValue={(editingStudent as any)?.aadhaar} pattern="\d{12}" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="XXXX XXXX XXXX" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">PEN No. (Permanent Ed. No.)</label>
                        <input type="text" name="pen" defaultValue={(editingStudent as any)?.pen} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="Enter PEN" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">APAAR ID (One Nation ID)</label>
                        <input type="text" name="apaar" defaultValue={(editingStudent as any)?.apaar} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm uppercase" placeholder="Enter APAAR ID" />
                      </div>
                    </div>
                 </div>

               </form>
             </div>

             {/* Modal Footer (Fixed) */}
             <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0 rounded-b-3xl">
               <button 
                 type="button"
                 onClick={() => { setIsAddStudentModalOpen(false); setEditingStudent(null); }}
                 className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
               >
                 Cancel
               </button>
               <button 
                 type="submit"
                 form="add-student-form"
                 className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-blue-700 shadow-blue-500/20 transition-all active:scale-95"
               >
                 {editingStudent ? 'Save Changes' : 'Save & Enroll Student'}
               </button>
             </div>
          </div>
        </div>
      , document.body)}

      {/* Excel Copy-Paste Modal */}
      {showBulkPasteModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
             {/* Header */}
             <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50 rounded-t-3xl">
               <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                     <FileSpreadsheet className="w-6 h-6 text-indigo-600" /> 
                     Excel/Sheets Copy-Paste Student Entry (Classwise)
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Copy rows from Excel or Google Sheets and paste (Ctrl+V) directly into any cell below. You can also edit manually.</p>
               </div>
               <button 
                 onClick={async () => {
                   if (parsedBulkStudents.length > 0) {
                     const isConfirmed = await confirm({
                       title: 'Discard Changes',
                       message: 'Are you sure you want to close? Your pasted data will be lost.',
                       variant: 'warning',
                       confirmLabel: 'Close Anyway',
                       cancelLabel: 'Keep Editing'
                     });
                     if (isConfirmed) {
                       setShowBulkPasteModal(false);
                     }
                   } else {
                     setShowBulkPasteModal(false);
                   }
                 }} 
                 className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors border border-transparent hover:border-slate-200 bg-white shadow-sm"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             {/* Main content wrapper */}
             <div className="flex-1 overflow-hidden flex flex-col p-6 min-h-0">
                {/* Control Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-indigo-50/40 border border-indigo-100 p-4 rounded-2xl mb-4 shrink-0">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-1">Default Batch Class</label>
                      <select 
                        value={bulkClass} 
                        onChange={(e) => setBulkClass(e.target.value)}
                        className="bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-1">Default Batch Section</label>
                      <select 
                        value={bulkSection} 
                        onChange={(e) => setBulkSection(e.target.value)}
                        className="bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                        <option value="D">Section D</option>
                      </select>
                    </div>

                    <div className="text-xs text-indigo-800 font-medium max-w-sm sm:max-w-md lg:max-w-lg mt-1">
                      💡 If "Class" or "Section" cells are left blank, the default values chosen above will auto-fill.
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setBulkGridData(prev => [...prev, ...Array.from({ length: 15 }, () => Array(15).fill(''))])}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      Add 15 Rows
                    </button>
                    <button 
                      onClick={async () => {
                        const isConfirmed = await confirm({
                          title: 'Clear Grid',
                          message: 'Are you sure you want to clear the entry grid?',
                          variant: 'danger',
                          confirmLabel: 'Clear',
                          cancelLabel: 'Cancel'
                        });
                        if (isConfirmed) {
                          setBulkGridData(Array.from({ length: 15 }, () => Array(15).fill('')));
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Grid
                    </button>
                  </div>
                </div>

                {/* Grid & Live Preview - split layout */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
                  {/* Grid section */}
                  <div className="flex-1 min-h-0 flex flex-col border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-inner">
                    <div className="overflow-auto flex-1 custom-scrollbar">
                      <table className="w-full text-left border-collapse select-text">
                        <thead className="sticky top-0 z-30 shadow-sm">
                          <tr>
                            <th className="bg-slate-100 text-slate-400 text-xs w-10 text-center border-b border-r border-slate-200 select-none font-bold py-3 uppercase">
                              #
                            </th>
                            {bulkHeaders.map((header, idx) => (
                              <th key={idx} className="bg-slate-100 border-b border-r border-slate-200 px-3 py-2 text-slate-700 font-bold text-xs select-none min-w-[150px] whitespace-nowrap">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bulkGridData.map((row, ri) => (
                            <tr key={ri} className="hover:bg-indigo-50/20 group">
                              <td className="bg-slate-50 text-slate-400 text-xs text-center border-b border-r border-slate-200 font-bold select-none py-2">
                                {ri + 1}
                              </td>
                              {row.map((cell, ci) => (
                                <td key={`${ri}-${ci}`} className="border-b border-r border-slate-200 p-0 relative min-w-[150px]">
                                  <input 
                                    className="w-full px-3 py-2 outline-none focus:bg-indigo-50/50 focus:ring-1 focus:ring-indigo-400 text-xs font-medium border-0 m-0 bg-transparent text-slate-800"
                                    value={cell}
                                    onChange={(e) => updateGridCell(ri, ci, e.target.value)}
                                    onPaste={(e) => handleGridPaste(e, ri, ci)}
                                    placeholder={ci === 0 ? "John Doe" : ci === 5 ? "Father Name" : ci === 7 ? "Male" : ""}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sidebar/Validation/Preview */}
                  <div className="w-full lg:w-80 border border-slate-200 bg-slate-50 rounded-2xl p-4 overflow-y-auto flex flex-col shrink-0 custom-scrollbar">
                     <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2 shrink-0">
                        <ClipboardList className="w-4 h-4 text-blue-600" /> Live Validation Preview
                     </h3>
                     
                     {parsedBulkStudents.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                          <ClipboardList className="w-12 h-12 mb-3 stroke-1 opacity-40 text-slate-500 animate-pulse" />
                          <p className="text-xs font-semibold leading-relaxed">
                            Click on any cell inside the grid and press <kbd className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded text-[10px] font-bold shadow-xs">Ctrl+V</kbd> to paste rows from your Excel sheet directly!
                          </p>
                        </div>
                     ) : (
                        <div className="flex-1 min-h-0 flex flex-col space-y-3">
                          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Validated Entries</span>
                            <span className="bg-emerald-600 text-white rounded-full px-2.5 py-0.5 text-xs font-black">{parsedBulkStudents.length}</span>
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {parsedBulkStudents.map((s, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-sm hover:border-indigo-200 transition-all">
                                <div className="flex justify-between items-start mb-1.5">
                                  <span className="font-bold text-slate-900 truncate max-w-[140px]">{s.name}</span>
                                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded animate-fade-in">
                                    {s.class} ({s.section})
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-500 font-medium">
                                  <div>Roll: <strong className="text-slate-750">{s.roll}</strong></div>
                                  <div className="truncate">ID: <span className="text-slate-755 font-semibold">{s.id.length > 12 ? s.id.slice(0, 10) + '..' : s.id}</span></div>
                                  <div className="col-span-2 truncate">Father: <strong className="text-slate-700">{s.parentName}</strong></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                     )}
                  </div>
                </div>

             </div>

             {/* Footer */}
             <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
               <button 
                 onClick={async () => {
                   if (parsedBulkStudents.length > 0) {
                     const isConfirmed = await confirm({
                       title: 'Discard Changes',
                       message: 'Are you sure you want to close? Your pasted data will be lost.',
                       variant: 'warning',
                       confirmLabel: 'Close Anyway',
                       cancelLabel: 'Keep Editing'
                     });
                     if (isConfirmed) {
                       setShowBulkPasteModal(false);
                     }
                   } else {
                     setShowBulkPasteModal(false);
                   }
                 }}
                 className="px-6 py-2.5 text-sm font-bold text-slate-650 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200 bg-white shadow-xs"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleSaveBulkStudents}
                 disabled={parsedBulkStudents.length === 0}
                 className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
               >
                 <UserPlus className="w-4 h-4" />
                 Enroll & Save {parsedBulkStudents.length} Students
               </button>
             </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
