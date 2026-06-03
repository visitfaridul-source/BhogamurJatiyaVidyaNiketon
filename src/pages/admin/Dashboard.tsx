import { 
  Users, 
  GraduationCap, 
  Wallet, 
  CalendarCheck, 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  Check, 
  X, 
  Eye, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Bookmark,
  Clock,
  UserX,
  UserMinus
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { format } from 'date-fns';
import { useSchool } from '@/context/SchoolContext';
import { useWebsite } from '@/context/WebsiteContext';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const historicalRevenueData = [
  { name: 'Jan', total: 0 },
  { name: 'Feb', total: 0 },
  { name: 'Mar', total: 0 },
  { name: 'Apr', total: 0 },
  { name: 'May', total: 0 },
  { name: 'Jun', total: 0 },
  { name: 'Jul', total: 0 },
];

const Render3DBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  if (!width || !height) return null;

  // Render a beautiful 3D isometric cuboid prism/column
  const depth = 5;
  const topPath = `M ${x} ${y} L ${x + depth} ${y - depth} L ${x + width + depth} ${y - depth} L ${x + width} ${y} Z`;
  const rightPath = `M ${x + width} ${y} L ${x + width + depth} ${y - depth} L ${x + width + depth} ${y + height - depth} L ${x + width} ${y + height} Z`;
  const frontPath = `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;

  // Shaded colors for isometric 3D illusion
  let frontColor = fill;
  let topColor = '#60a5fa';
  let rightColor = '#2563eb';

  if (fill === '#10b981') { // Present (Emerald)
    frontColor = '#10b981';
    topColor = '#34d399';
    rightColor = '#059669';
  } else if (fill === '#f43f5e') { // Absent (Rose)
    frontColor = '#f43f5e';
    topColor = '#fb7185';
    rightColor = '#e11d48';
  }

  return (
    <g>
      {/* Front Face */}
      <path d={frontPath} fill={frontColor} />
      {/* Top Face */}
      <path d={topPath} fill={topColor} />
      {/* Right Side Face */}
      <path d={rightPath} fill={rightColor} />
    </g>
  );
};

export const parseDateSafely = (dateStr: any): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  
  // check if format is DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-based
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // if format is YYYY-MM-DD
  const matchesYMD = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchesYMD) {
    const d = new Date(parseInt(matchesYMD[1], 10), parseInt(matchesYMD[2], 10) - 1, parseInt(matchesYMD[3], 10));
    if (!isNaN(d.getTime())) return d;
  }
  
  // Try fallback in native JS Date parser
  const dObj = new Date(str);
  if (!isNaN(dObj.getTime())) {
    return dObj;
  }
  return new Date();
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    students, setStudents, teachers, onlineAdmissions, setOnlineAdmissions,
    feesTransactions: transactions,
    schoolEvents: events,
    attendanceMap,
    saveSchoolEvent,
    deleteSchoolEvent,
    sessions
  } = useSchool();
  const { settings } = useWebsite();

  // Selected Session for Dashboard filtering
  const defaultSession = sessions?.find(s => s.isActive) || sessions?.[0];
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>('all');
  
  // Update selected session to default initially if it's set to 'all' and we want to enforce session view
  React.useEffect(() => {
    if (selectedSessionId === 'all' && defaultSession) {
       setSelectedSessionId(defaultSession.id);
    }
  }, [sessions]);

  // Derived session limits
  const activeSession = sessions?.find(s => s.id === selectedSessionId) || defaultSession;
  
  const isDateInActiveSession = (dateStr: any) => {
    if (!activeSession) return true;
    const d = parseDateSafely(dateStr);
    const start = parseDateSafely(activeSession.startDate);
    const end = parseDateSafely(activeSession.endDate);
    return d >= start && d <= end;
  };

  const isDateBeforeEndOfActiveSession = (dateStr: any) => {
     if (!activeSession) return true;
     const d = parseDateSafely(dateStr);
     const end = parseDateSafely(activeSession.endDate);
     return d <= end;
  };

  // Filter lists based on selected session
  const filteredStudents = useMemo(() => {
    if (!activeSession) return students;
    // For students, check admissionDate if it exists; assume they belong if admitted before end of session
    return students.filter(s => {
      // If admission Date is not there, we assume they are active. OR we check created date if present. 
      // Strictly speaking, if admitted strictly in this session or before
      if (!s.admissionDate) return true; 
      return isDateBeforeEndOfActiveSession(s.admissionDate);
    });
  }, [students, activeSession]);

  const filteredTeachers = useMemo(() => {
    if (!activeSession) return teachers;
    return teachers.filter(t => {
      if (!t.joinDate) return true;
      return isDateBeforeEndOfActiveSession(t.joinDate);
    });
  }, [teachers, activeSession]);

  const filteredTransactions = useMemo(() => {
    if (!activeSession) return transactions;
    return transactions.filter(t => isDateInActiveSession(t.date));
  }, [transactions, activeSession]);

  const filteredOnlineAdmissions = useMemo(() => {
    if (!activeSession) return onlineAdmissions;
    return onlineAdmissions.filter(a => isDateInActiveSession(a.submitDate || new Date()));
  }, [onlineAdmissions, activeSession]);

  const filteredEvents = useMemo(() => {
    if (!activeSession) return events;
    return events.filter(e => isDateInActiveSession(e.date));
  }, [events, activeSession]);

  // Selected Year for Chart Filter
  const [selectedChartPeriod, setSelectedChartPeriod] = useState<'This Year' | 'Last Year'>('This Year');

  // Interactive 3D Class-Wise Attendance View States
  const [attendancePeriod, setAttendancePeriod] = useState<'Daily' | 'Monthly' | 'Yearly'>('Daily');
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Modals/Overlays triggers
  const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAttendanceChoiceOpen, setIsAttendanceChoiceOpen] = useState(false);

  // Dynamic Attendance week indicator chart calculation
  const dynamicAttendanceData = useMemo(() => {
    const registry = attendanceMap || {};

    const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const current = new Date();
    const dayOfWeek = current.getDay(); // 0 is Sun, 1 is Mon...
    const monday = new Date(current);
    monday.setDate(current.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    return weekdayNames.map((name, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index);
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      let presentCount = 0;
      let absentCount = 0;

      Object.keys(registry).forEach(key => {
        if (key.startsWith(dateStr + ':')) {
          const record = registry[key];
          if (record.status === 'Present' || record.status === 'Late') {
            presentCount++;
          } else if (record.status === 'Absent') {
            absentCount++;
          }
        }
      });

      return {
        name,
        present: presentCount,
        absent: absentCount
      };
    });
  }, [students, teachers, attendanceMap]);


  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEventType, setNewEventType] = useState('Academic');

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    const item = {
      id: Math.random().toString(),
      title: newEventTitle.trim(),
      date: newEventDate,
      type: newEventType
    };
    saveSchoolEvent(item);
    setNewEventTitle('');
  };

  const handleDeleteEvent = (id: string) => {
    deleteSchoolEvent(id);
  };

  // Calculate dynamic fees totals
  const totalPaidSum = useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.status === 'Paid')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalOutstandingSum = useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.status === 'Pending' || tx.status === 'Overdue')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [filteredTransactions]);

  // Today's date string formatted as yyyy-MM-dd
  const todayDateStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Today's absent students count
  const absentStudentsCount = useMemo(() => {
    let count = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    filteredStudents.forEach(student => {
      const record = attendanceMap[`${today}:${student.id}`];
      if (record && record.status === 'Absent') {
        count++;
      }
    });
    return count;
  }, [filteredStudents, attendanceMap]);

  // Today's absent teachers count
  const absentTeachersCount = useMemo(() => {
    let count = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    filteredTeachers.forEach(teacher => {
      const record = attendanceMap[`${today}:${teacher.id}`];
      if (record && record.status === 'Absent') {
        count++;
      }
    });
    return count;
  }, [filteredTeachers, attendanceMap]);

  // Today's live teacher attendance stats breakdown
  const todayTeacherStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let earlyOut = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    filteredTeachers.forEach(teacher => {
      const record = attendanceMap[`${today}:${teacher.id}`];
      if (record) {
        if (record.status === 'Present' || record.status === 'LEFT' || record.status === 'EARLY LEAVE') {
          present++;
        }
        if (record.status === 'Late') {
          late++;
        }
        if (record.status === 'EARLY LEAVE' || !!record.earlyOutReason || (record.outTime && record.outTime < '14:30')) {
          earlyOut++;
        }
      }
    });
    return { present, late, earlyOut };
  }, [filteredTeachers, attendanceMap]);

  // Dynamic Revenue Selector Chart Data
  const dynamicRevenueData = useMemo(() => {
    if (selectedChartPeriod === 'Last Year') {
      return historicalRevenueData;
    }

    const monthMap: { [key: string]: number } = {
      'Jan': 45000,
      'Feb': 52000,
      'Mar': 48000,
      'Apr': 61000,
      'May': 55000,
      'Jun': 67000,
      'Jul': 72000,
    };

    filteredTransactions.forEach(tx => {
      if (tx.status === 'Paid') {
        try {
          const monthName = format(new Date(tx.date), 'MMM');
          if (monthName in monthMap) {
            monthMap[monthName] += Number(tx.amount) || 0;
          } else {
            monthMap[monthName] = Number(tx.amount) || 0;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    });

    return Object.keys(monthMap).map(name => ({
      name,
      total: monthMap[name]
    }));
  }, [transactions, selectedChartPeriod]);

  // Dynamic 3D Class-Wise Attendance calculation (Daily, Monthly, Yearly)
  const classWiseAttendanceData = useMemo(() => {
    // Define baseline of all standard classes to guarantee all classes are covered
    const baseClasses = [
      'Nursery', 'LKG', 'UKG',
      'Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 
      'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X'
    ];
    // Collect and sort unique classes from students list naturally
    const foundClasses = Array.from(new Set(filteredStudents.map(s => (s.class || 'Class I') as string))) as string[];
    const extraClasses = foundClasses.filter(c => !baseClasses.includes(c)).sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
    const classes = [...baseClasses, ...extraClasses];

    const classStudentCount: Record<string, number> = {};
    filteredStudents.forEach(s => {
      const c = (s.class || 'Class I') as string;
      classStudentCount[c] = (classStudentCount[c] || 0) + 1;
    });

    return classes.map(clsName => {
      let present = 0;
      let absent = 0;
      const totalStudentsInClass = classStudentCount[clsName as string] || 0;

      if (attendancePeriod === 'Daily') {
        filteredStudents.forEach(student => {
          if ((student.class || 'Class I') === clsName) {
            const record = attendanceMap[`${attendanceDate}:${student.id}`];
            if (record) {
              if (record.status === 'Present' || record.status === 'Late') {
                present++;
              } else if (record.status === 'Absent') {
                absent++;
              }
            }
          }
        });
      } else if (attendancePeriod === 'Monthly') {
        const monthPrefix = attendanceDate.substring(0, 7); // yyyy-MM
        Object.keys(attendanceMap).forEach(key => {
          if (key.startsWith(monthPrefix)) {
            const parts = key.split(':');
            if (parts.length >= 2) {
              const studentId = parts[1];
              const student = filteredStudents.find(s => s.id === studentId);
              if (student && (student.class || 'Class I') === clsName) {
                const record = attendanceMap[key];
                if (record.status === 'Present' || record.status === 'Late') {
                  present++;
                } else if (record.status === 'Absent') {
                  absent++;
                }
              }
            }
          }
        });
      } else { // Yearly
        const yearPrefix = attendanceDate.substring(0, 4); // yyyy
        Object.keys(attendanceMap).forEach(key => {
          if (key.startsWith(yearPrefix)) {
            const parts = key.split(':');
            if (parts.length >= 2) {
              const studentId = parts[1];
              const student = filteredStudents.find(s => s.id === studentId);
              if (student && (student.class || 'Class I') === clsName) {
                const record = attendanceMap[key];
                if (record.status === 'Present' || record.status === 'Late') {
                  present++;
                } else if (record.status === 'Absent') {
                  absent++;
                }
              }
            }
          }
        });
      }

      // Note: Removed old mock data fallback so chart only shows real data.
      return {
        name: clsName,
        Present: present,
        Absent: absent,
      };
    });
  }, [filteredStudents, attendanceMap, attendancePeriod, attendanceDate]);

  // Match live online admissions from database/state context
  const recentAdmissionsToShow = useMemo(() => {
    if (filteredOnlineAdmissions && filteredOnlineAdmissions.length > 0) {
      return filteredOnlineAdmissions.slice(0, 5).map((adm) => ({
        id: adm.id,
        name: adm.name,
        class: adm.class,
        date: adm.submitDate || new Date().toISOString(),
        status: adm.status,
        parentName: adm.parentName,
        motherName: adm.motherName,
        phone: adm.phone,
        dob: adm.dob,
        address: adm.address,
        aadhaar: adm.aadhaar,
        pen: adm.pen,
        apaar: adm.apaar,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(adm.name)}`
      }));
    }
    return [];
  }, [filteredOnlineAdmissions]);

  // Action methods: Approve & auto-enroll
  const handleProcessAdmissionOnDashboard = async (admId: string, finalStatus: 'Approved' | 'Rejected') => {
    // 1. Fetch form info
    const target = onlineAdmissions.find(x => x.id === admId);
    if (!target) {
      // Handle fallback list item update
      alert(`Updated mock application status to ${finalStatus}`);
      setSelectedAdmission(null);
      return;
    }

    // 2. Update status in onlineAdmissions list
    const updatedAdmissions = onlineAdmissions.map(adm => {
      if (adm.id === admId) {
        return { ...adm, status: finalStatus };
      }
      return adm;
    });
    
    await setOnlineAdmissions(updatedAdmissions);

    // 3. If approved, add student to students list
    if (finalStatus === 'Approved') {
      const alreadyRegistered = students.some(s => s.name.toLowerCase() === target.name.toLowerCase() && s.phone === target.phone);
      if (!alreadyRegistered) {
        const nextIdNumber = students.length + 1;
        const newStudent = {
          id: `ADM2026${String(nextIdNumber).padStart(3, '0')}`,
          name: target.name.toUpperCase(),
          class: target.class,
          section: 'A',
          roll: String(students.filter(s => s.class === target.class).length + 1),
          parentName: target.parentName.toUpperCase(),
          phone: target.phone,
          status: 'Active',
          avatar: target.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(target.name)}`,
          dob: target.dob,
          motherName: target.motherName.toUpperCase(),
          address: target.address,
          aadhaar: target.aadhaar,
          pen: target.pen || '',
          apaar: target.apaar || '',
          admissionDate: format(new Date(), 'yyyy-MM-dd')
        };
        await setStudents(prev => [...prev, newStudent]);
      }
    }
    
    // Close the review overlay sheet
    setSelectedAdmission(null);
  };

  // Format helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-fade-in relative pb-10">
      
      {/* Top Header Section — More Compact */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-indigo-600 block"></span>
            Dashboard Overview
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">Bhogamur Jatiya Vidya Niketon • Live Status Update Panel</p>
        </div>
        
        <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
          {sessions && sessions.length > 0 && (
            <div className="bg-white px-3 py-1.5 rounded-xl shadow-xs border border-slate-200 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Session:</span>
              <select 
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="text-xs sm:text-sm font-bold text-indigo-700 bg-transparent outline-none border-none cursor-pointer"
              >
                <option value="all">All Time (Cross Session)</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="bg-white px-3.5 py-1.5 rounded-xl shadow-xs border border-slate-200 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-bold text-slate-800 text-xs sm:text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row — Shrunk Padding, Tighter layouts, Highly Compact ("Chota Chota") */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard 
          title="Total Students" 
          value={filteredStudents.length.toLocaleString()} 
          icon={GraduationCap} 
          trend="Registered Students"
          trendUp={true}
          lightColors="bg-indigo-50 text-indigo-600 border-indigo-100"
        />
        <StatCard 
          title="Total Teachers" 
          value={filteredTeachers.length.toLocaleString()} 
          icon={Users} 
          trend="Active Faculty"
          trendUp={true}
          lightColors="bg-sky-50 text-sky-600 border-sky-100"
          onClick={() => navigate('/admin/attendance', { state: { activeTab: 'absent-manager', monitorCategoryFilter: 'Teacher' } })}
        >
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold hover:bg-emerald-100 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Present: {todayTeacherStats.present}
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold hover:bg-amber-100 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Late: {todayTeacherStats.late}
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold hover:bg-rose-100 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Early: {todayTeacherStats.earlyOut}
            </span>
          </div>
          <div className="text-[9px] text-slate-400 text-center mt-2 font-medium">
            (Click to view detailed list)
          </div>
        </StatCard>
        <StatCard 
          title="Students Absent Today" 
          value={absentStudentsCount.toLocaleString()} 
          icon={UserX} 
          trend={absentStudentsCount > 0 ? `${absentStudentsCount} absent today` : "100% Present"}
          trendUp={absentStudentsCount === 0}
          lightColors={absentStudentsCount > 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}
          onClick={() => navigate('/admin/attendance', { state: { activeTab: 'absent-manager', monitorCategoryFilter: 'Student', monitorStatusFilter: 'Absent' } })}
        />
        <StatCard 
          title="Teachers Absent Today" 
          value={absentTeachersCount.toLocaleString()} 
          icon={UserMinus} 
          trend={absentTeachersCount > 0 ? `${absentTeachersCount} absent today` : "All Faculty Present"}
          trendUp={absentTeachersCount === 0}
          lightColors={absentTeachersCount > 0 ? "bg-amber-50 text-amber-600 border-amber-150" : "bg-indigo-50 text-indigo-600 border-indigo-100"}
          onClick={() => navigate('/admin/attendance', { state: { activeTab: 'absent-manager', monitorCategoryFilter: 'Teacher', monitorStatusFilter: 'Absent' } })}
        />
      </div>

      {/* Charts Grid — Height reduced to h-[240px] for high-density elegance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Class-Wise Student Attendance 3D Chart */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-indigo-600"></span>
              Class-wise Attendance Analysis (3D View)
            </h2>
            
            {/* Range Selectors & Date picker */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Daily / Monthly / Yearly Tabs */}
              <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/60 font-medium">
                {(['Daily', 'Monthly', 'Yearly'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setAttendancePeriod(period)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      attendancePeriod === period 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
              
              {/* Calendar Date Reference */}
              <input 
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1 outline-none font-semibold cursor-pointer focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="h-[220px] min-w-[1100px] pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classWiseAttendanceData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <Tooltip 
                    cursor={{fill: 'rgba(99, 102, 241, 0.04)'}}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                    itemStyle={{ fontWeight: 700 }}
                    labelStyle={{ fontWeight: 600, color: '#475569' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '5px' }} />
                  <Bar 
                    dataKey="Present" 
                    name="Present" 
                    fill="#10b981" 
                    shape={<Render3DBar />}
                    barSize={18} 
                  />
                  <Bar 
                    dataKey="Absent" 
                    name="Absent" 
                    fill="#f43f5e" 
                    shape={<Render3DBar />}
                    barSize={18} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Attendance Chart */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-violet-600"></span>
            Attendance Ratio
          </h2>
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicAttendanceData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(241, 245, 249, 0.4)'}}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '5px' }} />
                <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Columns Grid - Recent Admissions List & Quick Actions / Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Recent Admissions with interactive click features */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-emerald-500"></span>
              Recent Admissions
            </h2>
            <button 
              onClick={() => navigate('/admin/admission-data')}
              className="text-emerald-600 hover:text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              View All
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3 font-medium">Click on any pending application to open approval or rejection review panel.</p>
          
          <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
            {recentAdmissionsToShow.map((student) => (
              <div 
                key={student.id + student.name} 
                onClick={() => setSelectedAdmission(student)}
                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/90 rounded-xl transition-all border border-slate-100 hover:border-slate-300 shadow-2xs cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white overflow-hidden border border-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{student.name}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{student.class} • {format(parseDateSafely(student.date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    student.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                    student.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                    'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                    {student.status}
                  </div>
                  <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Panel & Interactive Calendar Trigger */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-base font-bold text-slate-800 mb-3.5 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-amber-500"></span>
              Quick Navigation Actions
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickActionButton 
                icon={GraduationCap} 
                label="Admit Student" 
                subtext="Review database requests"
                color="bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 border-indigo-100/60" 
                onClick={() => navigate('/admin/admission-data')}
              />
              <QuickActionButton 
                icon={Wallet} 
                label="Collect Fees" 
                subtext="Settle bills & UPI receipt"
                color="bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border-emerald-100/60" 
                onClick={() => navigate('/admin/fees')}
              />
              <QuickActionButton 
                icon={CalendarCheck} 
                label="Mark Attendance" 
                subtext="Log manually / scanner"
                color="bg-purple-50 text-purple-700 hover:bg-purple-100/80 border-purple-100/60" 
                onClick={() => setIsAttendanceChoiceOpen(true)}
              />
              <QuickActionButton 
                icon={Users} 
                label="Manage Staff" 
                subtext="Register teachers & workers"
                color="bg-amber-50 text-amber-700 hover:bg-amber-100/80 border-amber-100/60" 
                onClick={() => navigate('/admin/staffs')}
              />
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-xl p-4 flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-white/10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/20">
                <Calendar className="w-5 h-5 text-indigo-300" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-white tracking-tight">Active Event Agenda</h3>
                  <span className="bg-rose-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">{filteredEvents.length} Scheduler Entries</span>
                </div>
                <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">View school planner. Schedule staff council events, terminal exams & official student holidays.</p>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => setIsCalendarOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-transparent px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 w-full justify-center shadow-md active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                View & Manage Event Calendar →
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: Admission Quick Review & Status Changer Overlay */}
      {selectedAdmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Header */}
            <div className="bg-slate-950 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base tracking-tight">Student Admission Review Form</h3>
              </div>
              <button 
                onClick={() => setSelectedAdmission(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Brief */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
              <img 
                src={selectedAdmission.avatar} 
                alt={selectedAdmission.name} 
                className="w-14 h-14 rounded-full bg-white border border-slate-200 outline-none p-0.5 object-cover shrink-0"
              />
              <div>
                <h4 className="font-extrabold text-slate-900 text-lg uppercase tracking-tight">{selectedAdmission.name}</h4>
                <p className="text-indigo-600 font-bold text-xs bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                  Proposed Enrollment: {selectedAdmission.class}
                </p>
                <p className="text-slate-400 text-[10px] mt-1 font-medium">Form ID: {selectedAdmission.id}</p>
              </div>
            </div>

            {/* Vital parameters */}
            <div className="p-5 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Parent / Guardian:</span>
                <p className="text-slate-800 font-bold flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {selectedAdmission.parentName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Mother Name:</span>
                <p className="text-slate-800 font-semibold">{selectedAdmission.motherName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Mobile Phone:</span>
                <p className="text-slate-800 font-bold flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedAdmission.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Birth Date (DOB):</span>
                <p className="text-slate-800 font-bold">{selectedAdmission.dob || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Residential Address:</span>
                <p className="text-slate-800 font-semibold flex items-start gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" /> {selectedAdmission.address || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Aadhaar ID Number:</span>
                <p className="text-slate-800 font-mono font-medium">{selectedAdmission.aadhaar || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Assam Board Identifier (PEN):</span>
                <p className="text-slate-800 font-mono font-medium">{selectedAdmission.pen || 'N/A'}</p>
              </div>
            </div>

            {/* Error alerts or Action Status indicators */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3">
              <span className="text-[11px] font-semibold text-slate-500">
                Current Status : 
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  selectedAdmission.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                  selectedAdmission.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                  'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  {selectedAdmission.status}
                </span>
              </span>

              <div className="flex gap-2">
                {selectedAdmission.status === 'Pending' ? (
                  <>
                    <button 
                      onClick={() => handleProcessAdmissionOnDashboard(selectedAdmission.id, 'Rejected')}
                      className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject Form
                    </button>
                    <button 
                      onClick={() => handleProcessAdmissionOnDashboard(selectedAdmission.id, 'Approved')}
                      className="inline-flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold px-4 py-1.5 rounded-lg shadow-xs transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve & Enroll Direct ✓
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setSelectedAdmission(null)}
                    className="bg-slate-800 text-white hover:bg-slate-700 text-xs font-bold px-4 py-1.5 rounded-lg"
                  >
                    Close Sheet
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}


      {/* MODAL 2: Full CRUD Events School Calendar Planner */}
      {isCalendarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full overflow-hidden shadow-2xl my-8 animate-scale-up">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-400" />
                <h3 className="font-extrabold text-base tracking-tight">Active Academic Event Agenda Planner</h3>
              </div>
              <button 
                onClick={() => setIsCalendarOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content divided in two columns: Left (Add Event), Right (List current month events) */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              
              {/* Left Column: Register New Schedule Event */}
              <form onSubmit={handleAddEvent} className="p-5 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Schedule General Event
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Event Name / Objective</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Teachers General Meet, Sports final"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Official Date</label>
                    <input 
                      type="date" 
                      required
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Classification</label>
                    <select 
                      value={newEventType}
                      onChange={(e) => setNewEventType(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Academic">Academic</option>
                      <option value="Holiday">School Holiday</option>
                      <option value="Meeting">Admin Meeting</option>
                      <option value="Exam">Terminal Exam</option>
                      <option value="Event">Festive Event</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 border-none text-white hover:bg-indigo-600 text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs active:scale-97 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Save To School Calendar
                </button>

                <div className="pt-3 border-t border-slate-100 flex items-start gap-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                  <Bookmark className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 leading-relaxed">Saving an event will directly publish the update live, allowing teachers and pupils to monitor scheduling alerts.</p>
                </div>
              </form>

              {/* Right Column: Event List agenda */}
              <div className="p-5 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                    <span>Scheduled Agenda</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600 normal-case font-bold">{filteredEvents.length} saved events</span>
                  </h4>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {filteredEvents.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No events logged. Try adding one on the left schema!
                      </div>
                    ) : (
                      filteredEvents.map(ev => (
                        <div key={ev.id} className="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs transition-colors group">
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">{ev.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                              📅 {format(parseDateSafely(ev.date), 'MMM dd, yyyy')} • 
                              <span className={`inline-block ml-1 px-1 rounded-sm text-[9px] font-bold ${
                                ev.type === 'Holiday' ? 'text-rose-600 bg-rose-50' :
                                ev.type === 'Exam' ? 'text-amber-600 bg-amber-50' :
                                ev.type === 'Meeting' ? 'text-blue-600 bg-blue-50' :
                                'text-emerald-600 bg-emerald-50'
                              }`}>{ev.type}</span>
                            </p>
                          </div>
                          <button 
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors"
                            title="Remove Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="text-right pt-4 border-t border-slate-100 mt-4">
                  <button 
                    onClick={() => setIsCalendarOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-1.5 rounded-lg"
                  >
                    Done Reviewing
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* MODAL 3: Mark Attendance Manual Register vs Face Recognition select Dialog */}
      {isAttendanceChoiceOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 transition-all">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Header */}
            <div className="bg-purple-950 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-base tracking-tight select-none">Attendance Log Mode</h3>
              </div>
              <button 
                onClick={() => setIsAttendanceChoiceOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">Choose whether you want to log daily entries manually using standard class registers, or boot the AI Camera Face Scanner of students/faculty members.</p>
              
              <button 
                onClick={() => {
                  setIsAttendanceChoiceOpen(false);
                  navigate('/admin/attendance');
                }}
                className="w-full flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/80 rounded-xl transition-all text-left active:scale-98"
              >
                <div>
                  <p className="text-xs font-bold text-indigo-900">1. Manual Class Register Mode</p>
                  <p className="text-[10px] text-indigo-600 mt-0.5">Toggle Present / Absent lists manually by section</p>
                </div>
                <Users className="w-4 h-4 text-indigo-500 shrink-0" />
              </button>

              <button 
                onClick={() => {
                  setIsAttendanceChoiceOpen(false);
                  navigate('/admin/face-recognition');
                }}
                className="w-full flex items-center justify-between p-3 bg-purple-50 border border-purple-200 hover:bg-purple-100/80 rounded-xl transition-all text-left active:scale-98"
              >
                <div>
                  <p className="text-xs font-bold text-purple-900">2. Realtime Face Scanner Mode</p>
                  <p className="text-[10px] text-purple-600 mt-0.5">Automulate face recognitions on digital camera scan</p>
                </div>
                <Clock className="w-4 h-4 text-purple-500 shrink-0" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => setIsAttendanceChoiceOpen(false)}
                className="text-slate-600 hover:text-slate-900 text-xs font-semibold hover:underline"
              >
                Cancel navigation
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Compact stat card layout design
function StatCard({ title, value, icon: Icon, trend, trendUp, lightColors, onClick, children }: any) {
  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 group hover:-translate-y-1 transition-all duration-300 shadow-3xs hover:shadow-xs select-none ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    >
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-center mb-3">
          <div className={`p-2 rounded-xl border ${lightColors}`}>
            <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full border shadow-3xs ${
            trendUp 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
              : 'bg-rose-50 text-rose-700 border-rose-100'
          }`}>
            {trend}
          </div>
        </div>
        <div>
          <h3 className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5">{title}</h3>
          <p className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight leading-none">{value}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

// Compact Quick Nav items
function QuickActionButton({ icon: Icon, label, subtext, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3.5 rounded-xl transition-all duration-300 border hover:-translate-y-0.5 text-center active:scale-97 cursor-pointer group ${color}`}
    >
      <div className="bg-white p-2 rounded-lg mb-2 shadow-sm border border-slate-200 group-hover:scale-105 transition-transform">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <span className="text-xs font-bold tracking-tight text-slate-900">{label}</span>
      <span className="text-[9px] text-slate-500 font-medium hidden sm:inline-block mt-0.5 leading-tight">{subtext}</span>
    </button>
  );
}
