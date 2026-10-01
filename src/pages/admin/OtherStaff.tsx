import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Briefcase, 
  Shield, 
  Phone, 
  Mail, 
  Clock, 
  MapPin, 
  Calendar, 
  Edit2, 
  Trash2, 
  X, 
  Download, 
  Printer, 
  UserCheck, 
  Camera, 
  Upload, 
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  Wrench,
  DollarSign
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmationContext';
import { cn, compressImage } from '@/lib/utils';

export interface OtherStaffMember {
  id: string;
  name: string;
  role: string; // Guard, Accountant, Clerk, Receptionist, Sweeper, Technician, Caretaker, etc.
  department: string; // Security, Accounts, Admin Office, Facilities, IT & Maintenance
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email?: string;
  shift: string; // Day Shift, Morning Shift, Night Shift, Full Time
  salary?: string;
  joiningDate: string;
  aadhaar?: string;
  address?: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  avatar?: string;
  emergencyContact?: string;
}

const DEFAULT_STAFF_LIST: OtherStaffMember[] = [
  {
    id: 'STF-GRD-01',
    name: 'RAMESHWAR BORA',
    role: 'Security Guard',
    department: 'Security',
    gender: 'Male',
    phone: '+91 94351-88201',
    shift: 'Day Shift (07:00 AM - 03:00 PM)',
    salary: '₹14,500 / month',
    joiningDate: '12/03/2021',
    aadhaar: '4589 1204 8831',
    address: 'Bhogamur Village, Ward 4',
    status: 'Active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rameshwar'
  },
  {
    id: 'STF-GRD-02',
    name: 'BIREN SAIKIA',
    role: 'Security Guard',
    department: 'Security',
    gender: 'Male',
    phone: '+91 94351-88202',
    shift: 'Night Guard (03:00 PM - 11:00 PM)',
    salary: '₹15,000 / month',
    joiningDate: '15/08/2022',
    aadhaar: '9812 4321 0092',
    address: 'Near Station Road, Sonitpur',
    status: 'Active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Biren'
  },
  {
    id: 'STF-ACC-01',
    name: 'DEEPJYOTI KALITA',
    role: 'Accountant',
    department: 'Accounts & Finance',
    gender: 'Male',
    phone: '+91 98640-12903',
    email: 'accounts@bjvn.edu',
    shift: 'Standard Hours (08:30 AM - 04:00 PM)',
    salary: '₹28,000 / month',
    joiningDate: '01/06/2019',
    aadhaar: '7721 9912 3456',
    address: 'Main Town, Tezpur',
    status: 'Active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Deepjyoti'
  },
  {
    id: 'STF-CLK-01',
    name: 'MINAKSHI DEVI',
    role: 'Head Clerk',
    department: 'Admin Office',
    gender: 'Female',
    phone: '+91 97060-44102',
    email: 'clerk@bjvn.edu',
    shift: 'Standard Hours (08:00 AM - 03:30 PM)',
    salary: '₹22,500 / month',
    joiningDate: '10/01/2020',
    aadhaar: '3310 8821 7741',
    address: 'Bhogamur South, Block B',
    status: 'Active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Minakshi'
  },
  {
    id: 'STF-REC-01',
    name: 'PRIYANKA BHARALI',
    role: 'Receptionist',
    department: 'Admin Office',
    gender: 'Female',
    phone: '+91 98540-77190',
    email: 'reception@bjvn.edu',
    shift: 'School Front Desk (08:00 AM - 03:00 PM)',
    salary: '₹18,000 / month',
    joiningDate: '05/04/2023',
    aadhaar: '5561 2290 1148',
    address: 'College Road, Ward 2',
    status: 'Active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priyanka'
  },
  {
    id: 'STF-TEC-01',
    name: 'ANUPAM CHOUDHURY',
    role: 'Lab & IT Technician',
    department: 'IT & Maintenance',
    gender: 'Male',
    phone: '+91 91270-33821',
    email: 'techsupport@bjvn.edu',
    shift: 'Standard Hours (08:00 AM - 04:00 PM)',
    salary: '₹24,000 / month',
    joiningDate: '18/11/2021',
    aadhaar: '8834 5512 6601',
    address: 'Bhogamur North',
    status: 'Active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anupam'
  },
  {
    id: 'STF-CTK-01',
    name: 'BHABESH HAZARIKA',
    role: 'Caretaker',
    department: 'Facilities',
    gender: 'Male',
    phone: '+91 94350-99431',
    shift: 'Full Day Care (07:30 AM - 04:30 PM)',
    salary: '₹16,500 / month',
    joiningDate: '01/02/2018',
    aadhaar: '1290 8844 7712',
    address: 'Campus Staff Quarters, Bhogamur',
    status: 'Active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bhabesh'
  },
  {
    id: 'STF-SWP-01',
    name: 'LAKHI DAS',
    role: 'Sweeper / Cleaning Staff',
    department: 'Facilities',
    gender: 'Female',
    phone: '+91 96130-55201',
    shift: 'Morning & Afternoon Clean (06:30 AM - 02:30 PM)',
    salary: '₹12,000 / month',
    joiningDate: '10/05/2022',
    aadhaar: '6612 4490 8823',
    address: 'Village Colony, Bhogamur',
    status: 'Active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lakhi'
  }
];

const PRESET_ROLES = [
  'Security Guard',
  'Accountant',
  'Head Clerk',
  'Junior Clerk',
  'Receptionist',
  'Sweeper / Cleaning Staff',
  'Lab & IT Technician',
  'Caretaker',
  'Bus Driver / Transport',
  'Peon / Office Attendant',
  'Cook / Canteen Staff',
  'Librarian Assistant',
  'Electrician / Plumber'
];

const PRESET_DEPARTMENTS = [
  'Security',
  'Accounts & Finance',
  'Admin Office',
  'Facilities',
  'IT & Maintenance',
  'Transport',
  'Library & Labs'
];

export default function OtherStaff() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const [staffList, setStaffList] = useState<OtherStaffMember[]>(() => {
    try {
      const local = localStorage.getItem('school_other_staff_v1');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return DEFAULT_STAFF_LIST;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<OtherStaffMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<OtherStaffMember>>({
    name: '',
    role: 'Security Guard',
    department: 'Security',
    gender: 'Male',
    phone: '',
    email: '',
    shift: 'Day Shift (07:00 AM - 03:00 PM)',
    salary: '',
    joiningDate: new Date().toLocaleDateString('en-GB'),
    aadhaar: '',
    address: '',
    status: 'Active',
    avatar: ''
  });

  // Sync with Firestore
  useEffect(() => {
    let unsub = () => {};
    if (user) {
      unsub = onSnapshot(collection(db, 'other_staff'), (snapshot) => {
        if (!snapshot.empty) {
          const list: OtherStaffMember[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          setStaffList(list);
          localStorage.setItem('school_other_staff_v1', JSON.stringify(list));
        } else {
          // If firestore empty, seed defaults
          DEFAULT_STAFF_LIST.forEach((item) => {
            setDoc(doc(db, 'other_staff', item.id), item).catch(() => {});
          });
          setStaffList(DEFAULT_STAFF_LIST);
          localStorage.setItem('school_other_staff_v1', JSON.stringify(DEFAULT_STAFF_LIST));
        }
      }, (err) => {
        console.warn('Silent fallback to local staff list:', err);
      });
    }
    return () => unsub();
  }, [user]);

  // Save to local storage when state changes
  const updateStaffState = (updated: OtherStaffMember[]) => {
    setStaffList(updated);
    try {
      localStorage.setItem('school_other_staff_v1', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    const newId = `STF-${Date.now().toString().slice(-4)}`;
    setFormData({
      id: newId,
      name: '',
      role: 'Security Guard',
      department: 'Security',
      gender: 'Male',
      phone: '',
      email: '',
      shift: 'Day Shift (07:00 AM - 03:00 PM)',
      salary: '',
      joiningDate: new Date().toLocaleDateString('en-GB'),
      aadhaar: '',
      address: '',
      status: 'Active',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newId}`
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: OtherStaffMember) => {
    setEditingStaff(staff);
    setFormData(staff);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Remove Staff Member',
      message: `Are you sure you want to remove "${name}" from the non-teaching staff directory?`,
      confirmText: 'Remove',
      type: 'danger'
    });

    if (isConfirmed) {
      const next = staffList.filter((s) => s.id !== id);
      updateStaffState(next);
      try {
        await deleteDoc(doc(db, 'other_staff', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `other_staff/${id}`);
      }
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMsg('Staff name is required.');
      return;
    }
    if (!formData.phone?.trim()) {
      setErrorMsg('Phone number is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const staffId = editingStaff ? editingStaff.id : (formData.id || `STF-${Date.now().toString().slice(-4)}`);
      const payload: OtherStaffMember = {
        id: staffId,
        name: formData.name.trim().toUpperCase(),
        role: formData.role || 'General Staff',
        department: formData.department || 'Facilities',
        gender: formData.gender || 'Male',
        phone: formData.phone.trim(),
        email: formData.email?.trim() || '',
        shift: formData.shift || 'Standard Shift',
        salary: formData.salary || '',
        joiningDate: formData.joiningDate || new Date().toLocaleDateString('en-GB'),
        aadhaar: formData.aadhaar || '',
        address: formData.address || '',
        status: formData.status || 'Active',
        avatar: formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${staffId}`
      };

      if (editingStaff) {
        const next = staffList.map((s) => (s.id === staffId ? payload : s));
        updateStaffState(next);
      } else {
        const next = [payload, ...staffList];
        updateStaffState(next);
      }

      await setDoc(doc(db, 'other_staff', staffId), payload);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving staff:', err);
      setErrorMsg('Failed to save staff record. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 400, 0.8);
        setFormData((prev) => ({ ...prev, avatar: compressed }));
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }
  };

  // Filtered List
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        staff.name.toLowerCase().includes(q) ||
        staff.id.toLowerCase().includes(q) ||
        staff.role.toLowerCase().includes(q) ||
        staff.phone.includes(q) ||
        (staff.department && staff.department.toLowerCase().includes(q));

      const matchesRole =
        roleFilter === 'All' ||
        (roleFilter === 'Guards' && staff.role.toLowerCase().includes('guard')) ||
        (roleFilter === 'Accountant' && staff.role.toLowerCase().includes('accountant')) ||
        (roleFilter === 'Clerks' && staff.role.toLowerCase().includes('clerk')) ||
        (roleFilter === 'Receptionist' && staff.role.toLowerCase().includes('receptionist')) ||
        (roleFilter === 'Sweepers' && staff.role.toLowerCase().includes('sweeper')) ||
        (roleFilter === 'Technicians' && staff.role.toLowerCase().includes('technician')) ||
        (roleFilter === 'Caretakers' && staff.role.toLowerCase().includes('caretaker')) ||
        staff.role.toLowerCase() === roleFilter.toLowerCase();

      const matchesDept = departmentFilter === 'All' || staff.department === departmentFilter;
      const matchesStatus = statusFilter === 'All' || staff.status === statusFilter;

      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [staffList, searchQuery, roleFilter, departmentFilter, statusFilter]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'Staff ID,Name,Role/Designation,Department,Gender,Phone,Shift,Salary,Joining Date,Status,Address\n';
    const rows = filteredStaff.map((s) =>
      `"${s.id}","${s.name}","${s.role}","${s.department}","${s.gender}","${s.phone}","${s.shift}","${s.salary || ''}","${s.joiningDate}","${s.status}","${s.address || ''}"`
    );
    const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Other_Staff_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Roster
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Other Staff Management</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Non-Teaching & Support
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage Security Guards, Accountants, Clerks, Receptionists, Sweepers, Technicians, Caretakers, etc.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Download CSV Spreadsheet"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Print Staff Directory"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print List</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Staff</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
            <h3 className="text-xl font-extrabold text-slate-800">{staffList.length}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</p>
            <h3 className="text-xl font-extrabold text-emerald-700">
              {staffList.filter((s) => s.status === 'Active').length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Security & Guards</p>
            <h3 className="text-xl font-extrabold text-slate-800">
              {staffList.filter((s) => s.role.toLowerCase().includes('guard')).length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Facilities & Tech</p>
            <h3 className="text-xl font-extrabold text-slate-800">
              {staffList.filter((s) => s.department === 'Facilities' || s.department.includes('IT')).length}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID, role, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Departments</option>
              {PRESET_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Quick Role Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          {[
            { label: 'All Staff', key: 'All' },
            { label: '🛡️ Guards', key: 'Guards' },
            { label: '💰 Accountant', key: 'Accountant' },
            { label: '📋 Clerks', key: 'Clerks' },
            { label: '📞 Receptionists', key: 'Receptionist' },
            { label: '🧹 Sweepers', key: 'Sweepers' },
            { label: '🔧 Technicians', key: 'Technicians' },
            { label: '🏫 Caretakers', key: 'Caretakers' }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setRoleFilter(item.key)}
              className={cn(
                "px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer text-xs",
                roleFilter === item.key
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid Cards */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No staff members found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or role filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top Badge & Actions */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 font-mono">
                    {staff.id}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(staff)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Staff Member"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(staff.id, staff.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Staff"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Profile Avatar & Info */}
                <div className="flex items-center gap-3.5 mb-4">
                  <img
                    src={staff.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${staff.id}`}
                    alt={staff.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-xs bg-slate-50"
                  />
                  <div>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight leading-snug">
                      {staff.name}
                    </h4>
                    <p className="text-xs font-bold text-amber-700 mt-0.5 flex items-center gap-1">
                      <span>{staff.role}</span>
                    </p>
                    <span className="inline-block text-[10px] text-slate-400 font-medium">
                      {staff.department}
                    </span>
                  </div>
                </div>

                {/* Details Pills */}
                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-2xl border border-slate-100 font-medium">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-800">{staff.phone}</span>
                  </div>
                  
                  {staff.shift && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] truncate text-slate-600">{staff.shift}</span>
                    </div>
                  )}

                  {staff.salary && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700">{staff.salary}</span>
                    </div>
                  )}

                  {staff.joiningDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] text-slate-500">Joined: {staff.joiningDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                  staff.status === 'Active'
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : staff.status === 'On Leave'
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-600"
                )}>
                  ● {staff.status}
                </span>

                <span className="text-[11px] text-slate-400 font-mono">
                  {staff.gender}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingStaff ? 'Edit Staff Member' : 'Add Non-Teaching Staff'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Guard, Accountant, Clerk, Receptionist, Sweeper, Technician, etc.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveStaff} className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Photo Upload & Preview */}
              <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <img
                  src={formData.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=new'}
                  alt="Staff Preview"
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 bg-white"
                />
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Staff Photo / Avatar</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-xs">
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">Accepts PNG, JPG or camera uploads</p>
                </div>
              </div>

              {/* Name & ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. RAMESHWAR BORA"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Staff ID</label>
                  <input
                    type="text"
                    value={formData.id || ''}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="STF-001"
                  />
                </div>
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation / Role *</label>
                  <input
                    list="role-list"
                    type="text"
                    required
                    value={formData.role || ''}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Security Guard, Accountant, Sweeper"
                  />
                  <datalist id="role-list">
                    {PRESET_ROLES.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department || 'Facilities'}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {PRESET_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="+91 94351-XXXXX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="staff@school.edu"
                  />
                </div>
              </div>

              {/* Shift & Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duty Shift / Hours</label>
                  <input
                    type="text"
                    value={formData.shift || ''}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Day Shift (07:00 AM - 03:00 PM)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salary / Compensation</label>
                  <input
                    type="text"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. ₹15,000 / month"
                  />
                </div>
              </div>

              {/* Status, Gender, Joining Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender || 'Male'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status || 'Active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="text"
                    value={formData.joiningDate || ''}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
              </div>

              {/* Aadhaar & Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Village / Town, District, Ward Number"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingStaff ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
