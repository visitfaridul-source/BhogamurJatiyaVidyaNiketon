import { useState, lazy, Suspense, useMemo } from 'react';
import { Search, Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Filter, FileSpreadsheet, QrCode, ScanFace, ListOrdered, Save, Edit2, X, Loader2, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSchool } from '@/context/SchoolContext';
import { useWebsite } from '@/context/WebsiteContext';

const QRScanner = lazy(() => import('@/components/attendance/QRScanner'));
const FaceScanner = lazy(() => import('@/components/attendance/FaceScanner'));

const initialMockAttendance = [
  { id: '1', date: new Date().toISOString(), class: 'Class 10', section: 'A', present: 42, absent: 3, late: 0, status: 'Completed', markedBy: 'Face ID System' },
  { id: '2', date: new Date().toISOString(), class: 'Class 8', section: 'B', present: 38, absent: 1, late: 2, status: 'Completed', markedBy: 'QR Scanner' },
  { id: '3', date: new Date().toISOString(), class: 'Class 12', section: 'A', present: 30, absent: 5, late: 0, status: 'Completed', markedBy: 'Mrs. Emily Brown' },
];

type ActiveTab = 'overview' | 'qr' | 'face';

export default function Attendance() {
  const { students, teachers } = useSchool();
  const { settings } = useWebsite();
  const [memberType, setMemberType] = useState<'Student' | 'Teacher' | 'Other Staff'>('Student');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [attendanceData, setAttendanceData] = useState(initialMockAttendance);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

  // Persistent daily manual attendance registry
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: 'Present' | 'Absent' | 'Late'; remarks: string }>>(() => {
    const saved = localStorage.getItem('bhogamur_attendance_registry');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const handleUpdateAttendanceStatus = (id: string, newStatus: 'Present' | 'Absent' | 'Late') => {
    setAttendanceMap(prev => {
      const key = `${date}:${id}`;
      const record = prev[key] || { status: 'Present', remarks: '' };
      const updated = {
        ...prev,
        [key]: {
          ...record,
          status: newStatus
        }
      };
      localStorage.setItem('bhogamur_attendance_registry', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateRemarks = (id: string, text: string) => {
    setAttendanceMap(prev => {
      const key = `${date}:${id}`;
      const record = prev[key] || { status: 'Present', remarks: '' };
      const updated = {
        ...prev,
        [key]: {
          ...record,
          remarks: text
        }
      };
      localStorage.setItem('bhogamur_attendance_registry', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateInTime = (id: string, text: string) => {
    setAttendanceMap(prev => {
      const key = `${date}:${id}`;
      const record = prev[key] || { status: 'Present', remarks: '', inTime: '', outTime: '', earlyOutReason: '' };
      const updated = {
        ...prev,
        [key]: {
          ...record,
          inTime: text
        }
      };
      localStorage.setItem('bhogamur_attendance_registry', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateOutTime = (id: string, text: string) => {
    setAttendanceMap(prev => {
      const key = `${date}:${id}`;
      const record = prev[key] || { status: 'Present', remarks: '', inTime: '', outTime: '', earlyOutReason: '' };
      const updated = {
        ...prev,
        [key]: {
          ...record,
          outTime: text
        }
      };
      localStorage.setItem('bhogamur_attendance_registry', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateEarlyOutReason = (id: string, text: string) => {
    setAttendanceMap(prev => {
      const key = `${date}:${id}`;
      const record = prev[key] || { status: 'Present', remarks: '', inTime: '', outTime: '', earlyOutReason: '' };
      const updated = {
        ...prev,
        [key]: {
          ...record,
          earlyOutReason: text
        }
      };
      localStorage.setItem('bhogamur_attendance_registry', JSON.stringify(updated));
      return updated;
    });
  };

  const currentLevelStats = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    if (memberType === 'Student') {
      const activeList = selectedClass ? students.filter(s => s.class === selectedClass) : students;
      activeList.forEach(student => {
        const record = attendanceMap[`${date}:${student.id}`];
        const status = record?.status || 'Present';
        if (status === 'Present') presentCount++;
        else if (status === 'Absent') absentCount++;
        else if (status === 'Late') lateCount++;
      });
      return {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: activeList.length
      };
    } else if (memberType === 'Teacher') {
      teachers.forEach(teacher => {
        const record = attendanceMap[`${date}:${teacher.id}`];
        const status = record?.status || 'Present';
        if (status === 'Present') presentCount++;
        else if (status === 'Absent') absentCount++;
        else if (status === 'Late') lateCount++;
      });
      return {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: teachers.length
      };
    } else {
      const staffList = settings.staffMembers || [];
      staffList.forEach((staff: any) => {
        const record = attendanceMap[`${date}:${staff.id}`];
        const status = record?.status || 'Present';
        if (status === 'Present') presentCount++;
        else if (status === 'Absent') absentCount++;
        else if (status === 'Late') lateCount++;
      });
      return {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: staffList.length
      };
    }
  }, [students, teachers, settings.staffMembers, memberType, selectedClass, date, attendanceMap]);

  const classes = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = selectedClass ? s.class.toLowerCase().trim() === selectedClass.toLowerCase().trim() : true;
      const matchesSearch = searchQuery
        ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.class && s.class.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (s.roll && s.roll.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchesClass && matchesSearch;
    });
  }, [students, selectedClass, searchQuery]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch = searchQuery
        ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchesSearch;
    });
  }, [teachers, searchQuery]);

  const filteredStaff = useMemo(() => {
    return (settings.staffMembers || []).filter((st: any) => {
      const matchesSearch = searchQuery
        ? st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          st.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (st.role && st.role.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchesSearch;
    });
  }, [settings.staffMembers, searchQuery]);

  const filteredAttendanceData = useMemo(() => {
    return attendanceData.filter(record => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return record.class.toLowerCase().includes(query) ||
             record.markedBy.toLowerCase().includes(query) ||
             record.status.toLowerCase().includes(query);
    });
  }, [attendanceData, searchQuery]);

  const exportAttendanceDetails = () => {
    let csvHeader = "";
    let csvRows = [];

    if (selectedClass) {
      csvHeader = "Roll No,Student Name,Class,Section,Status,In Time,Out Time,Early Out Reason,Remarks\n";
      const classStudents = students.filter(s => s.class === selectedClass);
      classStudents.forEach((student) => {
        const record = attendanceMap[`${date}:${student.id}`];
        const status = record?.status || 'Present';
        const inTime = record?.inTime || (status !== 'Absent' ? '09:00' : '');
        const outTime = record?.outTime || (status !== 'Absent' ? '15:00' : '');
        const earlyOutReason = record?.earlyOutReason || '';
        const remarks = record?.remarks || '';
        csvRows.push(`${student.roll || ''},"${student.name}","${student.class}","${student.section || 'A'}",${status},"${inTime}","${outTime}","${earlyOutReason}","${remarks}"`);
      });
    } else {
      csvHeader = "Class,Section,Total Students,Present,Absent,Late\n";
      classes.forEach(c => {
        const classStudents = students.filter(s => s.class === c);
        let present = 0;
        let absent = 0;
        let late = 0;
        classStudents.forEach(st => {
          const record = attendanceMap[`${date}:${st.id}`];
          const status = record?.status || 'Present';
          if (status === 'Present') present++;
          else if (status === 'Absent') absent++;
          else if (status === 'Late') late++;
        });
        csvRows.push(`"${c}",A,${classStudents.length},${present},${absent},${late}`);
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvHeader + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_${selectedClass ? selectedClass : 'Overview'}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printClassList = () => {
    let htmlContent = `
      <html>
        <head>
          <title>Class List</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${selectedClass ? selectedClass + ' - ' : 'All Classes '}Attendance Sheet</h2>
            <p>Date: ${format(new Date(date), 'MMMM dd, yyyy')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%">Roll No</th>
                <th style="width: 40%">Student Name</th>
                <th style="width: 20%">Class / Section</th>
                <th style="width: 30%">Attendance / Signature</th>
              </tr>
            </thead>
            <tbody>
    `;

    const studentsToPrint = selectedClass ? students.filter(s => s.class === selectedClass) : students;

    studentsToPrint.forEach(student => {
      htmlContent += `
        <tr>
          <td>${student.roll || '-'}</td>
          <td><b>${student.name}</b></td>
          <td>${student.class}${student.section ? ' - ' + student.section : ''}</td>
          <td></td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      win.print();
    }
  };

  const openEditModal = (record: any) => {
    setEditRecord({ ...record });
    setIsEditModalOpen(true);
  };

  const handleModalChange = (field: string, value: string) => {
    setEditRecord((prev: any) => ({ ...prev, [field]: value }));
  };

  const saveEditModal = () => {
    setAttendanceData(prev => prev.map(record => {
      if (record.id === editRecord.id) {
        return { 
          ...editRecord,
          present: parseInt(editRecord.present) || 0,
          absent: parseInt(editRecord.absent) || 0,
          late: parseInt(editRecord.late) || 0
        };
      }
      return record;
    }));
    setIsEditModalOpen(false);
    setEditRecord(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Smart Attendance</h1>
          <p className="text-slate-500 text-sm mt-1">AI-powered tracking, QR scanning, and daily reports.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={printClassList} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors shadow-sm">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Blank List</span>
          </button>
          <button onClick={exportAttendanceDetails} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-full sm:w-fit overflow-x-auto shadow-sm">
        <TabButton 
          active={activeTab === 'overview'} 
          onClick={() => setActiveTab('overview')} 
          icon={ListOrdered} 
          label="Overview" 
        />
        <TabButton 
          active={activeTab === 'qr'} 
          onClick={() => setActiveTab('qr')} 
          icon={QrCode} 
          label="QR Scanner" 
        />
        <TabButton 
          active={activeTab === 'face'} 
          onClick={() => setActiveTab('face')} 
          icon={ScanFace} 
          label="Face Recognition" 
        />
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
             {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 hover:shadow-md transition-all">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors"></div>
                 <div className="flex items-center gap-4 relative z-10">
                   <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                     <CheckCircle className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Present</p>
                     <h3 className="text-2xl font-black text-slate-900 mt-1">{currentLevelStats.present}</h3>
                   </div>
                 </div>
               </div>
               <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 hover:shadow-md transition-all">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full blur-2xl group-hover:bg-rose-100 transition-colors"></div>
                 <div className="flex items-center gap-4 relative z-10">
                   <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100">
                     <XCircle className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Absent</p>
                     <h3 className="text-2xl font-black text-slate-900 mt-1">{currentLevelStats.absent}</h3>
                   </div>
                 </div>
               </div>
               <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 hover:shadow-md transition-all">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100 transition-colors"></div>
                 <div className="flex items-center gap-4 relative z-10">
                   <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100">
                     <Clock className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Late Arrivals</p>
                     <h3 className="text-2xl font-black text-slate-900 mt-1">{currentLevelStats.late}</h3>
                   </div>
                 </div>
               </div>
               <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
                 <div className="flex items-center gap-4 relative z-10">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                     <ScanFace className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Presence Rate</p>
                     <h3 className="text-2xl font-black text-slate-900 mt-1">{currentLevelStats.total > 0 ? Math.round((currentLevelStats.present / currentLevelStats.total) * 100) : 100}%</h3>
                   </div>
                 </div>
               </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              {/* Member Type Selection Tabs */}
              <div className="flex border-b border-slate-200 p-4 gap-2 bg-white flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setMemberType('Student');
                    setViewMode('detailed');
                  }}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    memberType === 'Student' 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10" 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  👥 Students List ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMemberType('Teacher');
                    setViewMode('detailed');
                    setSelectedClass('');
                  }}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    memberType === 'Teacher' 
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/10" 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  🎓 Teachers List ({teachers.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMemberType('Other Staff');
                    setViewMode('detailed');
                    setSelectedClass('');
                  }}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    memberType === 'Other Staff' 
                      ? "bg-amber-600 text-white shadow-md shadow-amber-500/10" 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  💼 Other Staff List ({settings.staffMembers?.length || 0})
                </button>
              </div>

              <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between gap-4 bg-slate-50/50">
                <div className="flex flex-wrap gap-4 flex-1 items-center">
                  {memberType === 'Student' && (
                    <div className="relative min-w-[200px]">
                      <select
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={selectedClass}
                        onChange={(e) => {
                          setSelectedClass(e.target.value);
                          if (e.target.value) {
                            setViewMode('detailed');
                          }
                        }}
                      >
                        <option value="">All Classes (Summary)</option>
                        {classes.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="relative max-w-xs w-full">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder={memberType === 'Student' ? "Search student or summary..." : memberType === 'Teacher' ? "Search teacher..." : "Search staff member..."} 
                      className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium shadow-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative max-w-[200px] w-full">
                     <input 
                       type="date"
                       value={date}
                       onChange={(e) => setDate(e.target.value)}
                       className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                     />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {memberType === 'Student' && !selectedClass && (
                    <div className="flex bg-slate-200/60 p-1 rounded-xl whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setViewMode('detailed')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          viewMode === 'detailed' ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        👥 Student-wise ({filteredStudents.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('summary')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          viewMode === 'summary' ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        📊 Summaries ({filteredAttendanceData.length})
                      </button>
                    </div>
                  )}
                  <button className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 text-sm font-bold px-5 shadow-sm transition-colors">
                    <Filter className="w-4 h-4" /> Filter
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    {selectedClass || viewMode === 'detailed' ? (
                      <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{memberType === 'Student' ? 'Roll No' : 'ID'}</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{memberType === 'Student' ? 'Student Name' : memberType === 'Teacher' ? 'Teacher Name' : 'Staff Name'}</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{memberType === 'Student' ? 'Class / Section' : memberType === 'Teacher' ? 'Subject / Department' : 'Role / Responsibility'}</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Status</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">In Time</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Out Time</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Early Out Reason</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Remarks</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Class / Section</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Date</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Present</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Absent</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Late</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Marked By</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Status / Action</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedClass || viewMode === 'detailed' ? (
                      memberType === 'Student' ? (
                        filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-10 text-center font-medium text-slate-400">
                              No students found matching your criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((student) => {
                            const record = attendanceMap[`${date}:${student.id}`];
                            const status = record?.status || 'Present';
                            const remarks = record?.remarks || '';
                            return (
                              <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-900">{student.roll || '-'}</td>
                                <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                                  <img
                                    src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name)}`}
                                    alt="avatar"
                                    className="w-8 h-8 rounded-full border border-slate-200 bg-white"
                                    referrerPolicy="no-referrer"
                                  />
                                  {student.name}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-600">{student.class} - {student.section || 'A'}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendanceStatus(student.id, 'Present')}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === 'Present' 
                                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                      )}
                                    >
                                      Present
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendanceStatus(student.id, 'Absent')}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === 'Absent' 
                                          ? "bg-rose-600 border-rose-600 text-white shadow-sm" 
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600"
                                      )}
                                    >
                                      Absent
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendanceStatus(student.id, 'Late')}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === 'Late' 
                                          ? "bg-amber-500 border-amber-500 text-white shadow-sm" 
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600"
                                      )}
                                    >
                                      Late
                                    </button>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="time" 
                                    value={record?.inTime || (status !== 'Absent' ? '09:00' : '')}
                                    disabled={status === 'Absent'}
                                    onChange={(e) => handleUpdateInTime(student.id, e.target.value)}
                                    className="px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="time" 
                                    value={record?.outTime || (status !== 'Absent' ? '15:00' : '')}
                                    disabled={status === 'Absent'}
                                    onChange={(e) => handleUpdateOutTime(student.id, e.target.value)}
                                    className="px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1 w-full max-w-[180px]">
                                    <input 
                                      type="text" 
                                      placeholder="Leave early reason..." 
                                      value={record?.earlyOutReason || ""}
                                      disabled={status === 'Absent'}
                                      onChange={(e) => handleUpdateEarlyOutReason(student.id, e.target.value)}
                                      className="px-2 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    {record?.outTime && record?.outTime < "14:00" && !record?.earlyOutReason && status !== 'Absent' && (
                                      <span className="text-[10px] text-rose-600 font-bold animate-pulse">⚠️ Early leave? Provide reason</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="text" 
                                    placeholder="Enter remarks..." 
                                    value={remarks}
                                    onChange={(e) => handleUpdateRemarks(student.id, e.target.value)}
                                    className="px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 w-full max-w-[200px] font-semibold"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )
                      ) : memberType === 'Teacher' ? (
                        filteredTeachers.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-10 text-center font-medium text-slate-400">
                              No teachers found matching your criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredTeachers.map((teacher) => {
                            const record = attendanceMap[`${date}:${teacher.id}`];
                            const status = record?.status || 'Present';
                            const remarks = record?.remarks || '';
                            return (
                              <tr key={teacher.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-900">{teacher.id || '-'}</td>
                                <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                                  <img
                                    src={teacher.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(teacher.name)}`}
                                    alt="avatar"
                                    className="w-8 h-8 rounded-full border border-slate-200 bg-white"
                                    referrerPolicy="no-referrer"
                                  />
                                  {teacher.name}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-600">{teacher.department || teacher.subject || 'Faculty'}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendanceStatus(teacher.id, 'Present')}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === 'Present' 
                                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                      )}
                                    >
                                      Present
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendanceStatus(teacher.id, 'Absent')}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === 'Absent' 
                                          ? "bg-rose-600 border-rose-600 text-white shadow-sm" 
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600"
                                      )}
                                    >
                                      Absent
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendanceStatus(teacher.id, 'Late')}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === 'Late' 
                                          ? "bg-amber-500 border-amber-500 text-white shadow-sm" 
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600"
                                      )}
                                    >
                                      Late
                                    </button>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="time" 
                                    value={record?.inTime || (status !== 'Absent' ? '09:00' : '')}
                                    disabled={status === 'Absent'}
                                    onChange={(e) => handleUpdateInTime(teacher.id, e.target.value)}
                                    className="px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="time" 
                                    value={record?.outTime || (status !== 'Absent' ? '15:00' : '')}
                                    disabled={status === 'Absent'}
                                    onChange={(e) => handleUpdateOutTime(teacher.id, e.target.value)}
                                    className="px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1 w-full max-w-[180px]">
                                    <input 
                                      type="text" 
                                      placeholder="Leave early reason..." 
                                      value={record?.earlyOutReason || ""}
                                      disabled={status === 'Absent'}
                                      onChange={(e) => handleUpdateEarlyOutReason(teacher.id, e.target.value)}
                                      className="px-2 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    {record?.outTime && record?.outTime < "14:00" && !record?.earlyOutReason && status !== 'Absent' && (
                                      <span className="text-[10px] text-rose-600 font-bold animate-pulse">⚠️ Early leave? Provide reason</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="text" 
                                    placeholder="Enter remarks..." 
                                    value={remarks}
                                    onChange={(e) => handleUpdateRemarks(teacher.id, e.target.value)}
                                    className="px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 w-full max-w-[200px] font-semibold"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )
                      ) : (
                        filteredStaff.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-10 text-center font-medium text-slate-400">
                              No staff members found matching your criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredStaff.map((staff) => {
                            const record = attendanceMap[`${date}:${staff.id}`];
                            const status = record?.status || 'Present';
                            const remarks = record?.remarks || '';
                            return (
                              <tr key={staff.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-900">{staff.id || '-'}</td>
                                <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                                  <img
                                    src={staff.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(staff.name)}`}
                                    alt="avatar"
                                    className="w-8 h-8 rounded-full border border-slate-200 bg-white"
                                    referrerPolicy="no-referrer"
                                  />
                                  {staff.name}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-600">{staff.role || 'Institution Staff'}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendanceStatus(staff.id, 'Present')}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === 'Present' 
                                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                      )}
                                    >
                                      Present
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendanceStatus(staff.id, 'Absent')}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === 'Absent' 
                                          ? "bg-rose-600 border-rose-600 text-white shadow-sm" 
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600"
                                      )}
                                    >
                                      Absent
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateAttendanceStatus(staff.id, 'Late')}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === 'Late' 
                                          ? "bg-amber-500 border-amber-500 text-white shadow-sm" 
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600"
                                      )}
                                    >
                                      Late
                                    </button>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="time" 
                                    value={record?.inTime || (status !== 'Absent' ? '09:00' : '')}
                                    disabled={status === 'Absent'}
                                    onChange={(e) => handleUpdateInTime(staff.id, e.target.value)}
                                    className="px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="time" 
                                    value={record?.outTime || (status !== 'Absent' ? '15:00' : '')}
                                    disabled={status === 'Absent'}
                                    onChange={(e) => handleUpdateOutTime(staff.id, e.target.value)}
                                    className="px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1 w-full max-w-[180px]">
                                    <input 
                                      type="text" 
                                      placeholder="Leave early reason..." 
                                      value={record?.earlyOutReason || ""}
                                      disabled={status === 'Absent'}
                                      onChange={(e) => handleUpdateEarlyOutReason(staff.id, e.target.value)}
                                      className="px-2 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    {record?.outTime && record?.outTime < "14:00" && !record?.earlyOutReason && status !== 'Absent' && (
                                      <span className="text-[10px] text-rose-600 font-bold animate-pulse">⚠️ Early leave? Provide reason</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="text" 
                                    placeholder="Enter remarks..." 
                                    value={remarks}
                                    onChange={(e) => handleUpdateRemarks(staff.id, e.target.value)}
                                    className="px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 w-full max-w-[200px] font-semibold"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )
                      )
                    ) : (
                      filteredAttendanceData.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 font-bold text-slate-900">{record.class}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                          <td className="px-6 py-4 text-emerald-600 font-black text-base">
                            {record.present}
                          </td>
                          <td className="px-6 py-4 text-rose-600 font-black text-base">
                            {record.absent}
                          </td>
                          <td className="px-6 py-4 text-amber-600 font-black text-base">
                            {record.late}
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-medium flex items-center gap-2">
                             {record.markedBy === 'Face ID System' ? (
                                <span className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md mt-1.5 font-bold text-xs"><ScanFace className="w-3.5 h-3.5" /> AI Verified</span>
                             ) : record.markedBy === 'QR Scanner' ? (
                                <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md mt-1.5 font-bold text-xs"><QrCode className="w-3.5 h-3.5" /> QR Scanned</span>
                             ) : (
                                <span className="mt-1.5 block font-bold text-slate-700">{record.markedBy}</span>
                             )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold">
                                {record.status}
                              </span>
                              <button onClick={() => openEditModal(record)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'qr' && (
          <Suspense fallback={<div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center"><Loader2 className="w-8 h-8 animate-spin mb-4" />Loading Scanner...</div>}>
            <QRScanner onExit={() => setActiveTab('overview')} />
          </Suspense>
        )}
        {activeTab === 'face' && <FaceScanner onExit={() => setActiveTab('overview')} />}
      </div>

      {isEditModalOpen && editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-xl text-slate-800">Edit Attendance Record</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Class / Section</label>
                <input type="text" value={editRecord.class} disabled className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Present</label>
                <input type="number" value={editRecord.present} onChange={(e) => handleModalChange('present', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Absent</label>
                <input type="number" value={editRecord.absent} onChange={(e) => handleModalChange('absent', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Late</label>
                <input type="number" value={editRecord.late} onChange={(e) => handleModalChange('late', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 mt-auto">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={saveEditModal} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 whitespace-nowrap",
        active 
          ? "bg-slate-900 text-white shadow-sm" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-white" : "text-slate-400")} />
      <span>{label}</span>
    </button>
  );
}
