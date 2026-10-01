import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Edit2, 
  Trash2, 
  Phone, 
  Mail, 
  Clock, 
  MapPin, 
  Calendar, 
  Download, 
  Printer, 
  Camera, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  Building2, 
  GraduationCap, 
  Sparkles,
  BookOpen,
  UserCheck,
  Search
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useWebsite } from '@/context/WebsiteContext';
import { useConfirm } from '@/context/ConfirmationContext';
import { cn, compressImage } from '@/lib/utils';

export interface AdministratorMember {
  id: string;
  name: string;
  designation: string; // Principal & Director, Vice Principal, Managing Secretary, Academic In-Charge, etc.
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  qualification: string;
  officeLocation?: string;
  officeHours?: string;
  joiningDate?: string;
  responsibilities?: string;
  bio?: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  avatar?: string;
  isPrimarySignatory?: boolean;
}

const DEFAULT_ADMINISTRATORS: AdministratorMember[] = [
  {
    id: 'ADM-EXEC-01',
    name: 'DR. S. K. SHARMA',
    designation: 'Principal & Director',
    gender: 'Male',
    phone: '+91 94350-00101',
    email: 'principal@bjvn.edu',
    qualification: 'M.A., M.Ed., Ph.D. in Educational Leadership',
    officeLocation: 'Principal Office, Administrative Block - Room 101',
    officeHours: '09:00 AM - 02:30 PM (Mon-Sat)',
    joiningDate: '01/06/2015',
    responsibilities: 'Overall institutional administration, academic leadership, board governance, and faculty development.',
    bio: 'Dedicated educator and leader with over 25 years of service in holistic education and academic excellence.',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    isPrimarySignatory: true
  },
  {
    id: 'ADM-EXEC-02',
    name: 'SMT. ANJANA HAZARIKA',
    designation: 'Vice Principal',
    gender: 'Female',
    phone: '+91 94350-00102',
    email: 'viceprincipal@bjvn.edu',
    qualification: 'M.Sc. (Physics), B.Ed., PGDEMA',
    officeLocation: 'Vice Principal Suite, Academic Wing - Room 102',
    officeHours: '08:30 AM - 03:00 PM (Mon-Sat)',
    joiningDate: '15/07/2017',
    responsibilities: 'Curriculum supervision, student discipline, parent relations, and daily school operations.',
    bio: 'Pioneering educator specializing in student counseling, pedagogical innovations, and institutional co-curriculars.',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=400',
    isPrimarySignatory: true
  },
  {
    id: 'ADM-EXEC-03',
    name: 'PRANJAL DUTTA',
    designation: 'Academic Coordinator & Senior Admin',
    gender: 'Male',
    phone: '+91 94350-00103',
    email: 'academics@bjvn.edu',
    qualification: 'M.A. (Assamese Literature), B.Ed.',
    officeLocation: 'Academic Coordination Cell - Room 104',
    officeHours: '08:00 AM - 03:00 PM',
    joiningDate: '01/04/2018',
    responsibilities: 'Teacher allocations, timetable execution, examination scheduling, and co-curricular programs.',
    bio: 'Senior academic coordinator fostering regional literary pride and structured evaluation methodologies.',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    isPrimarySignatory: false
  },
  {
    id: 'ADM-EXEC-04',
    name: 'KESHAB CHANDRA BARUAH',
    designation: 'Examination Controller',
    gender: 'Male',
    phone: '+91 94350-00104',
    email: 'exams@bjvn.edu',
    qualification: 'M.Sc. (Mathematics), M.Phil.',
    officeLocation: 'Exam Confidential Cell - Block C',
    officeHours: '09:00 AM - 04:00 PM',
    joiningDate: '10/01/2019',
    responsibilities: 'SEBA/Board exam registrations, internal assessments, report card generation, and evaluation logs.',
    bio: 'Experienced evaluation officer overseeing fair, timely, and disciplined examination standards.',
    status: 'Active',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KeshabBaruah',
    isPrimarySignatory: false
  }
];

const PRESET_DESIGNATIONS = [
  'Principal & Director',
  'Vice Principal',
  'Managing Trustee / Secretary',
  'Academic In-Charge / Coordinator',
  'Examination Controller',
  'Head Administrator',
  'Finance & Operations In-Charge',
  'Administrative Officer'
];

export default function Administrators() {
  const { user } = useAuth();
  const { settings, updateSettings } = useWebsite();
  const { confirm } = useConfirm();

  const [adminList, setAdminList] = useState<AdministratorMember[]>(() => {
    try {
      const local = localStorage.getItem('school_administrators_v1');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return DEFAULT_ADMINISTRATORS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdministratorMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<AdministratorMember>>({
    name: '',
    designation: 'Vice Principal',
    gender: 'Male',
    phone: '',
    email: '',
    qualification: '',
    officeLocation: '',
    officeHours: '08:30 AM - 03:00 PM',
    joiningDate: new Date().toLocaleDateString('en-GB'),
    responsibilities: '',
    bio: '',
    status: 'Active',
    avatar: '',
    isPrimarySignatory: false
  });

  // Sync with Firestore
  useEffect(() => {
    let unsub = () => {};
    if (user) {
      unsub = onSnapshot(collection(db, 'administrators'), (snapshot) => {
        if (!snapshot.empty) {
          const list: AdministratorMember[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          setAdminList(list);
          localStorage.setItem('school_administrators_v1', JSON.stringify(list));
        } else {
          // If firestore empty, seed defaults
          DEFAULT_ADMINISTRATORS.forEach((item) => {
            setDoc(doc(db, 'administrators', item.id), item).catch(() => {});
          });
          setAdminList(DEFAULT_ADMINISTRATORS);
          localStorage.setItem('school_administrators_v1', JSON.stringify(DEFAULT_ADMINISTRATORS));
        }
      }, (err) => {
        console.warn('Silent fallback to local administrators:', err);
      });
    }
    return () => unsub();
  }, [user]);

  const updateAdminState = (updated: AdministratorMember[]) => {
    setAdminList(updated);
    try {
      localStorage.setItem('school_administrators_v1', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleOpenAdd = () => {
    setEditingAdmin(null);
    const newId = `ADM-EXEC-${Date.now().toString().slice(-4)}`;
    setFormData({
      id: newId,
      name: '',
      designation: 'Vice Principal',
      gender: 'Male',
      phone: '',
      email: '',
      qualification: '',
      officeLocation: 'Administrative Wing',
      officeHours: '08:30 AM - 03:00 PM',
      joiningDate: new Date().toLocaleDateString('en-GB'),
      responsibilities: '',
      bio: '',
      status: 'Active',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newId}`,
      isPrimarySignatory: false
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (admin: AdministratorMember) => {
    setEditingAdmin(admin);
    setFormData(admin);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Remove Administrator',
      message: `Are you sure you want to remove "${name}" from the school administrative council?`,
      confirmText: 'Remove',
      type: 'danger'
    });

    if (isConfirmed) {
      const next = adminList.filter((a) => a.id !== id);
      updateAdminState(next);
      try {
        await deleteDoc(doc(db, 'administrators', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `administrators/${id}`);
      }
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMsg('Administrator name is required.');
      return;
    }
    if (!formData.phone?.trim()) {
      setErrorMsg('Phone contact is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const adminId = editingAdmin ? editingAdmin.id : (formData.id || `ADM-EXEC-${Date.now().toString().slice(-4)}`);
      const payload: AdministratorMember = {
        id: adminId,
        name: formData.name.trim().toUpperCase(),
        designation: formData.designation || 'Administrator',
        gender: formData.gender || 'Male',
        phone: formData.phone.trim(),
        email: formData.email?.trim() || '',
        qualification: formData.qualification?.trim() || '',
        officeLocation: formData.officeLocation || '',
        officeHours: formData.officeHours || '08:30 AM - 03:00 PM',
        joiningDate: formData.joiningDate || new Date().toLocaleDateString('en-GB'),
        responsibilities: formData.responsibilities || '',
        bio: formData.bio || '',
        status: formData.status || 'Active',
        avatar: formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminId}`,
        isPrimarySignatory: !!formData.isPrimarySignatory
      };

      if (editingAdmin) {
        const next = adminList.map((a) => (a.id === adminId ? payload : a));
        updateAdminState(next);
      } else {
        const next = [payload, ...adminList];
        updateAdminState(next);
      }

      // If this is Principal, also update website settings Principal fields
      if (payload.designation.toLowerCase().includes('principal') && !payload.designation.toLowerCase().includes('vice')) {
        updateSettings({
          principalName: payload.name,
          principalTitle: payload.designation,
          principalHeroName: payload.name,
          principalImageUrl: payload.avatar || settings.principalImageUrl
        } as any).catch(() => {});
      } else if (payload.designation.toLowerCase().includes('vice principal')) {
        updateSettings({
          vicePrincipalHeroName: payload.name,
          vicePrincipalHeroImage: payload.avatar || settings.vicePrincipalHeroImage
        } as any).catch(() => {});
      }

      await setDoc(doc(db, 'administrators', adminId), payload);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving administrator:', err);
      setErrorMsg('Failed to save administrator record. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 400, 0.85);
        setFormData((prev) => ({ ...prev, avatar: compressed }));
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }
  };

  // Filtered
  const filteredAdmins = useMemo(() => {
    return adminList.filter((admin) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        admin.name.toLowerCase().includes(q) ||
        admin.designation.toLowerCase().includes(q) ||
        admin.email.toLowerCase().includes(q) ||
        admin.phone.includes(q);

      const matchesDesignation =
        designationFilter === 'All' ||
        (designationFilter === 'Principal' && admin.designation.toLowerCase().includes('principal') && !admin.designation.toLowerCase().includes('vice')) ||
        (designationFilter === 'Vice Principal' && admin.designation.toLowerCase().includes('vice principal')) ||
        (designationFilter === 'Coordinator' && admin.designation.toLowerCase().includes('coordinator')) ||
        (designationFilter === 'Exam Controller' && admin.designation.toLowerCase().includes('exam'));

      return matchesSearch && matchesDesignation;
    });
  }, [adminList, searchQuery, designationFilter]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'ID,Name,Designation,Qualification,Email,Phone,Office Location,Office Hours,Status\n';
    const rows = filteredAdmins.map((a) =>
      `"${a.id}","${a.name}","${a.designation}","${a.qualification}","${a.email}","${a.phone}","${a.officeLocation || ''}","${a.officeHours || ''}","${a.status}"`
    );
    const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Administrative_Council_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Administrative Leadership</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                School Authorities
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Principal, Vice Principal, Directors, Academic Coordinators, and Authorized School Admins
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Directory</span>
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Council</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Administrator</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Authorities</p>
            <h3 className="text-xl font-extrabold text-slate-800">{adminList.length}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Executive Signatories</p>
            <h3 className="text-xl font-extrabold text-emerald-700">
              {adminList.filter((a) => a.isPrimarySignatory).length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Principal & VP</p>
            <h3 className="text-xl font-extrabold text-slate-800">
              {adminList.filter((a) => a.designation.toLowerCase().includes('principal')).length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Council</p>
            <h3 className="text-xl font-extrabold text-slate-800">
              {adminList.filter((a) => a.status === 'Active').length}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search administrator name, title, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs pb-1">
          {[
            { label: 'All Council', key: 'All' },
            { label: '🎓 Principal', key: 'Principal' },
            { label: '🎖️ Vice Principal', key: 'Vice Principal' },
            { label: '📚 Coordinators', key: 'Coordinator' },
            { label: '📝 Exam Controllers', key: 'Exam Controller' }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setDesignationFilter(item.key)}
              className={cn(
                "px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer text-xs",
                designationFilter === item.key
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Executive Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredAdmins.map((admin) => (
          <div
            key={admin.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group relative overflow-hidden"
          >
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />

            <div>
              {/* Header Badge & Action Icons */}
              <div className="flex items-start justify-between gap-3 mb-4 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 font-mono">
                    {admin.id}
                  </span>
                  {admin.isPrimarySignatory && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Authorized Signatory
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(admin)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Administrator Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Administrator"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Profile Details */}
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={admin.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${admin.id}`}
                  alt={admin.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100 shadow-sm shrink-0 bg-slate-50"
                />
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    {admin.name}
                  </h3>
                  <div className="text-xs font-bold text-indigo-700 mt-0.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{admin.designation}</span>
                  </div>
                  {admin.qualification && (
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      {admin.qualification}
                    </p>
                  )}
                </div>
              </div>

              {/* Responsibilities / Bio */}
              {admin.responsibilities && (
                <div className="mb-4 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/60 text-xs text-indigo-950">
                  <span className="font-bold text-indigo-700 block text-[10px] uppercase tracking-wider mb-0.5">Key Responsibilities:</span>
                  <p className="text-[11px] leading-relaxed text-slate-700">{admin.responsibilities}</p>
                </div>
              )}

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono font-medium text-slate-800">{admin.phone}</span>
                </div>
                {admin.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-700">{admin.email}</span>
                  </div>
                )}
                {admin.officeLocation && (
                  <div className="flex items-center gap-2 truncate sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-600 text-[11px]">{admin.officeLocation}</span>
                  </div>
                )}
                {admin.officeHours && (
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] text-slate-500">Office Hours: {admin.officeHours}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Status */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                admin.status === 'Active'
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600"
              )}>
                ● {admin.status}
              </span>

              {admin.joiningDate && (
                <span className="text-[11px] text-slate-400">
                  Since {admin.joiningDate}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Administrator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingAdmin ? 'Edit Administrator Profile' : 'Add School Administrator'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Principal, Vice Principal, Academic In-Charge, and Authorized Admins
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

            {/* Modal Form */}
            <form onSubmit={handleSaveAdmin} className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Photo Upload */}
              <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <img
                  src={formData.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'}
                  alt="Admin Preview"
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 bg-white"
                />
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Executive Portrait / Photo</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-xs">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Upload Portrait</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">High quality image for school website & official letterheads</p>
                </div>
              </div>

              {/* Name & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name & Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. DR. S. K. SHARMA"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Designation *</label>
                  <input
                    list="admin-designations"
                    type="text"
                    required
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Principal & Director"
                  />
                  <datalist id="admin-designations">
                    {PRESET_DESIGNATIONS.map((desig) => (
                      <option key={desig} value={desig} />
                    ))}
                  </datalist>
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="+91 94350-XXXXX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="principal@bjvn.edu"
                  />
                </div>
              </div>

              {/* Qualifications & Office Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qualifications / Degrees</label>
                  <input
                    type="text"
                    value={formData.qualification || ''}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="M.A., M.Ed., Ph.D."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Office Room / Location</label>
                  <input
                    type="text"
                    value={formData.officeLocation || ''}
                    onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Admin Block - Room 101"
                  />
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Key Responsibilities</label>
                <textarea
                  rows={2}
                  value={formData.responsibilities || ''}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Institutional administration, curriculum oversight, examination governance..."
                />
              </div>

              {/* Authorized Signatory & Status */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="signatory-check"
                    checked={formData.isPrimarySignatory || false}
                    onChange={(e) => setFormData({ ...formData, isPrimarySignatory: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="signatory-check" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Authorized Signatory for ID Cards & Documents
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Status:</span>
                  <select
                    value={formData.status || 'Active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
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
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingAdmin ? 'Save Changes' : 'Add Administrator'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
