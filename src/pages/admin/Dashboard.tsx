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
  Clock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { format } from 'date-fns';
import { useSchool } from '@/context/SchoolContext';
import { useWebsite } from '@/context/WebsiteContext';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const historicalRevenueData = [
  { name: 'Jan', total: 38000 },
  { name: 'Feb', total: 41000 },
  { name: 'Mar', total: 39000 },
  { name: 'Apr', total: 47000 },
  { name: 'May', total: 42000 },
  { name: 'Jun', total: 51000 },
  { name: 'Jul', total: 55000 },
];

const attendanceData = [
  { name: 'Mon', present: 95, absent: 5 },
  { name: 'Tue', present: 92, absent: 8 },
  { name: 'Wed', present: 96, absent: 4 },
  { name: 'Thu', present: 88, absent: 12 },
  { name: 'Fri', present: 94, absent: 6 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { students, setStudents, teachers, onlineAdmissions, setOnlineAdmissions } = useSchool();
  const { settings } = useWebsite();

  // Selected Year for Chart Filter
  const [selectedChartPeriod, setSelectedChartPeriod] = useState<'This Year' | 'Last Year'>('This Year');

  // Modals/Overlays triggers
  const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAttendanceChoiceOpen, setIsAttendanceChoiceOpen] = useState(false);

  // Load live fee transactions from localStorage, which matches the Fees billing system
  const [transactions] = useState<any[]>(() => {
    const saved = localStorage.getItem('bhogamur_fees_transactions');
    try {
      return saved ? JSON.parse(saved) : [
        { id: 'INV-2023-001', student: 'Aarav Sharma', class: 'Class 10 - A', amount: 15500, date: new Date().toISOString(), type: 'Term 1 Fee', status: 'Paid', mode: 'UPI' },
        { id: 'INV-2023-002', student: 'Diya Patel', class: 'Class 8 - B', amount: 4500, date: new Date().toISOString(), type: 'Transport Fee + Monthly', status: 'Pending', mode: '-' },
        { id: 'INV-2023-003', student: 'Rohan Gupta', class: 'Class 12 - Science', amount: 24000, date: new Date(Date.now() - 86400000).toISOString(), type: 'Term 1 Fee + Lab', status: 'Paid', mode: 'Bank Transfer' },
        { id: 'INV-2023-004', student: 'Ananya Verma', class: 'Class 5 - A', amount: 8500, date: new Date(Date.now() - 172800000).toISOString(), type: 'Tuition Fee (Q2)', status: 'Overdue', mode: '-' },
        { id: 'INV-2023-005', student: 'Karan Singh', class: 'Class 10 - B', amount: 12000, date: new Date(Date.now() - 259200000).toISOString(), type: 'Term 1 Fee', status: 'Paid', mode: 'Cash' },
      ];
    } catch (e) {
      return [];
    }
  });

  // Dynamic school events state
  const [events, setEvents] = useState<any[]>(() => {
    const saved = localStorage.getItem('bhogamur_school_events');
    try {
      return saved ? JSON.parse(saved) : [
        { id: '1', title: 'World Environment Day', date: '2026-06-05', type: 'Holiday' },
        { id: '2', title: 'Admissions Deadline', date: '2026-05-30', type: 'Academic' },
        { id: '3', title: 'First Term Exams Start', date: '2026-06-15', type: 'Exam' },
        { id: '4', title: 'Principal Advisory Meeting', date: '2026-05-28', type: 'Meeting' },
        { id: '5', title: 'Annual Sports Day Prep', date: '2026-06-01', type: 'Event' },
      ];
    } catch (e) {
      return [];
    }
  });

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
    const updated = [...events, item];
    setEvents(updated);
    localStorage.setItem('bhogamur_school_events', JSON.stringify(updated));
    setNewEventTitle('');
  };

  const handleDeleteEvent = (id: string) => {
    const updated = events.filter(ev => ev.id !== id);
    setEvents(updated);
    localStorage.setItem('bhogamur_school_events', JSON.stringify(updated));
  };

  // Calculate dynamic fees totals
  const totalPaidSum = useMemo(() => {
    return transactions
      .filter(tx => tx.status === 'Paid')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [transactions]);

  const totalOutstandingSum = useMemo(() => {
    return transactions
      .filter(tx => tx.status === 'Pending' || tx.status === 'Overdue')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [transactions]);

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

    transactions.forEach(tx => {
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

  // Match live online admissions from database/state context
  const recentAdmissionsToShow = useMemo(() => {
    if (onlineAdmissions && onlineAdmissions.length > 0) {
      return onlineAdmissions.slice(0, 5).map((adm) => ({
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
    return [
      { id: 'REQ-001', name: 'John Doe', class: 'Class 5', date: new Date().toISOString(), status: 'Pending', parentName: 'Richard Doe', motherName: 'Jane Doe', phone: '9876543210', dob: '2016-04-12', address: 'Bhogamur Village', aadhaar: '883901238910', pen: 'PEN11003', apaar: 'AP112209', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
      { id: 'REQ-002', name: 'Aarav Sharma', class: 'Class 10', date: new Date(Date.now() - 86400000).toISOString(), status: 'Approved', parentName: 'Rajesh Sharma', motherName: 'Seema Sharma', phone: '8877332211', dob: '2011-09-18', address: 'Goalpara, Assam', aadhaar: '321098453412', pen: 'PEN11044', apaar: 'AP111983', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav' }
    ];
  }, [onlineAdmissions]);

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
        <div className="bg-white px-3.5 py-1.5 rounded-xl shadow-xs border border-slate-200 flex items-center gap-2 w-full sm:w-auto">
          <CalendarCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-bold text-slate-800 text-xs sm:text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
        </div>
      </div>

      {/* Metrics Row — Shrunk Padding, Tighter layouts, Highly Compact ("Chota Chota") */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard 
          title="Total Students" 
          value={students.length.toLocaleString()} 
          icon={GraduationCap} 
          trend="Registered Students"
          trendUp={true}
          lightColors="bg-indigo-50 text-indigo-600 border-indigo-100"
        />
        <StatCard 
          title="Total Teachers" 
          value={teachers.length.toLocaleString()} 
          icon={Users} 
          trend="Active Faculty"
          trendUp={true}
          lightColors="bg-sky-50 text-sky-600 border-sky-100"
        />
        <StatCard 
          title="Fees Collected" 
          value={formatCurrency(totalPaidSum)} 
          icon={Wallet} 
          trend={`${transactions.filter(t => t.status === 'Paid').length} paid receipts`}
          trendUp={true}
          lightColors="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
        <StatCard 
          title="Total Outstanding" 
          value={formatCurrency(totalOutstandingSum)} 
          icon={IndianRupee} 
          trend={`${transactions.filter(t => t.status !== 'Paid').length} invoices unpaid`}
          trendUp={false}
          lightColors="bg-rose-50 text-rose-600 border-rose-100"
        />
      </div>

      {/* Charts Grid — Height reduced to h-[240px] for high-density elegance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-indigo-600"></span>
              Fee Collections ({selectedChartPeriod})
            </h2>
            <select 
              value={selectedChartPeriod} 
              onChange={(e) => setSelectedChartPeriod(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-2.5 py-1.5 outline-none font-semibold cursor-pointer"
            >
              <option value="This Year">This Year</option>
              <option value="Last Year">Last Year</option>
            </select>
          </div>
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicRevenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 700 }}
                  labelStyle={{ fontWeight: 600, color: '#64748b' }}
                />
                <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
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
              <BarChart data={attendanceData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(241, 245, 249, 0.4)'}}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '5px' }} />
                <Bar dataKey="present" name="Present %" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="absent" name="Absent %" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} />
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
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{student.class} • {format(new Date(student.date), 'MMM d, yyyy')}</p>
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
                  <span className="bg-rose-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">{events.length} Scheduler Entries</span>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
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
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600 normal-case font-bold">{events.length} saved events</span>
                  </h4>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {events.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No events logged. Try adding one on the left schema!
                      </div>
                    ) : (
                      events.map(ev => (
                        <div key={ev.id} className="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs transition-colors group">
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">{ev.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                              📅 {format(new Date(ev.date), 'MMM dd, yyyy')} • 
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
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
function StatCard({ title, value, icon: Icon, trend, trendUp, lightColors }: any) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 group hover:-translate-y-1 transition-all duration-300 shadow-3xs hover:shadow-xs select-none">
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
