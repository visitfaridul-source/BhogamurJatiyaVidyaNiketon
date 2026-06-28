import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWebsite, WebsiteStaffMember } from '../../context/WebsiteContext';
import { useConfirm } from '../../context/ConfirmationContext';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Briefcase, Mail, Phone, Link as LinkIcon, Camera, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../../lib/utils';

export default function StaffManagement() {
  const { settings, updateSettings } = useWebsite();
  const { confirm } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<WebsiteStaffMember>>({
    name: '',
    role: '',
    gender: 'Male',
    bio: '',
    imageUrl: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    facebookUrl: ''
  });

  const staff = settings.staffMembers || [];

  const handleOpenModal = (staffMember?: WebsiteStaffMember) => {
    setErrorMsg(null);
    if (staffMember) {
      setEditingId(staffMember.id);
      setFormData(staffMember);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        role: '',
        gender: 'Male',
        bio: '',
        imageUrl: '',
        email: '',
        phone: '',
        linkedinUrl: '',
        facebookUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setErrorMsg(null);
    setIsSaving(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (reader.result) {
          const compressed = await compressImage(reader.result as string, 300, 300, 0.75);
          setFormData(prev => ({ ...prev, imageUrl: compressed }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    setErrorMsg(null);

    const nameVal = (formData.name || 'UNKNOWN STAFF').trim().toUpperCase();
    const roleVal = (formData.role || 'STAFF MEMBER').trim().toUpperCase();
    const bioVal = (formData.bio || '').trim().toUpperCase();
    const emailVal = (formData.email || '').trim().toUpperCase();
    const phoneVal = (formData.phone || '').trim();
    const linkedinVal = (formData.linkedinUrl || '').trim();
    const facebookVal = (formData.facebookUrl || '').trim();

    const finalizedData = {
      ...formData,
      name: nameVal,
      role: roleVal,
      bio: bioVal,
      email: emailVal,
      phone: phoneVal,
      linkedinUrl: linkedinVal,
      facebookUrl: facebookVal
    };

    try {
      if (editingId) {
        const updatedStaff = staff.map(s => s.id === editingId ? { ...s, ...finalizedData } as WebsiteStaffMember : s);
        await updateSettings({ staffMembers: updatedStaff });
      } else {
        const newStaff: WebsiteStaffMember = {
          ...finalizedData,
          id: `staff-${Date.now()}`
        } as WebsiteStaffMember;
        await updateSettings({ staffMembers: [...staff, newStaff] });
      }
      handleCloseModal();
    } catch (err: any) {
      console.error("Save failed:", err);
      setErrorMsg(err?.message || String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Remove Staff Profile',
      message: 'Are you sure you want to remove this staff member? This action will permanently remove their profile card from the website.',
      variant: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (isConfirmed) {
      const updatedStaff = staff.filter(s => s.id !== id);
      setPageError(null);
      try {
        await updateSettings({ staffMembers: updatedStaff });
      } catch (err: any) {
        console.error("Delete failed:", err);
        setPageError(`Failed to delete profile: ${err?.message || String(err)}. Please ensure your Admin session is authenticated with Firestore.`);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Public Staff Profiles</h1>
          <p className="text-slate-500 mt-1">Manage the profiles shown on the public "Our Staff" page on the website.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add Staff Member
        </button>
      </div>

      {/* Page Level Error */}
      {pageError && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-sm font-semibold rounded-2xl flex justify-between items-start gap-4">
          <p className="flex-1">{pageError}</p>
          <button onClick={() => setPageError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Information Banner to prevent redundancy */}
      <div className="bg-blue-50/80 border border-blue-100/50 rounded-[2rem] p-6 flex gap-4 items-start shadow-sm">
        <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-md shrink-0">
          <Info className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-bold text-blue-900 text-sm md:text-base">Automatic Teacher Sync Active</h2>
          <p className="text-blue-700/90 text-xs md:text-sm mt-1 leading-relaxed">
            All academic teachers registered in the <strong>Teachers</strong> section are automatically synchronized and listed on the public "Our Staff" page of the website. 
            <strong> You do not need to re-register them here!</strong> Use this section only to add non-teaching staff, executive directors, or custom profiles requiring specific URLs.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {staff.map((member) => (
          <div key={member.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative group flex flex-col">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
               <button onClick={() => handleOpenModal(member)} className="p-2 bg-white text-slate-600 hover:text-blue-600 rounded-full shadow-md border border-slate-100 transition-colors">
                  <Edit2 className="w-4 h-4" />
               </button>
               <button onClick={() => handleDelete(member.id)} className="p-2 bg-white text-slate-600 hover:text-rose-600 rounded-full shadow-md border border-slate-100 transition-colors">
                  <Trash2 className="w-4 h-4" />
               </button>
            </div>
            
            <div className="mb-4 flex justify-center">
               {member.imageUrl ? (
                   <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 p-1 flex items-center justify-center">
                       <img src={member.imageUrl} alt={member.name} className="w-full h-full object-contain" />
                   </div>
               ) : (
                   <div className="w-24 h-24 rounded-2xl bg-blue-50 border-2 border-slate-100 flex items-center justify-center text-blue-300 shadow-sm">
                       <Briefcase className="w-10 h-10" />
                   </div>
               )}
            </div>
            
            <div className="flex-1">
               <div className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider rounded border border-amber-100 mb-2">
                 {member.role}
               </div>
               <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-800 text-lg uppercase">{member.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  member.gender === 'Female' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100' : 
                  member.gender === 'Other' ? 'bg-slate-50 text-slate-705 border-slate-200' : 
                  'bg-sky-50 text-sky-700 border-sky-100'
                }`}>
                  {member.gender || 'Male'}
                </span>
              </div>
               <p className="text-sm text-slate-500 line-clamp-2 mb-4">{member.bio}</p>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex gap-4 text-slate-400">
               {member.email && <Mail className="w-4 h-4" />}
               {member.phone && <Phone className="w-4 h-4" />}
               {member.linkedinUrl && <LinkIcon className="w-4 h-4" />}
            </div>
          </div>
        ))}
        {staff.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white/50 border border-slate-200 border-dashed rounded-[2rem]">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No staff profiles added yet. Click 'Add Staff Member' to get started.</p>
            </div>
        )}
      </div>

      {/* Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-xl text-slate-800">
                    {editingId ? 'Edit Staff Profile' : 'New Staff Profile'}
                  </h3>
                  <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  {errorMsg && (
                    <div className="p-4 mb-6 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5">
                       <X className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                       <div className="flex-1">
                         <p className="font-bold">Sync Failed (অনলাইন সঞ্চয় ব্যৰ্থ হৈছে):</p>
                         <p className="text-[10px] font-normal text-rose-600 mt-1">
                            {errorMsg}.<br/>
                            <strong className="font-semibold block mt-1.5">Troubleshooting Tips:</strong>
                            - Make sure you are signed in as an Admin with the official email address (e.g., <span className="font-mono bg-white px-1 py-0.5 border rounded">visitfaridul@gmail.com</span>).<br/>
                            - If you bypassed using mock/credentials, Firestore permissions will reject writes. Please log out, and re-login using authorized accounts.
                         </p>
                       </div>
                    </div>
                  )}

                  <form id="staff-form" onSubmit={handleSave} className="space-y-6">
                    {/* Photo Input (URL based & direct upload) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Profile Photo</label>
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                           <div className="w-16 h-16 rounded-2xl bg-slate-50 flex-shrink-0 overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center relative group p-1">
                              {formData.imageUrl ? (
                                <img src={formData.imageUrl} alt="preview" className="w-full h-full object-contain" />
                              ) : (
                                <Camera className="w-6 h-6 text-slate-300" />
                              )}
                           </div>
                           <div className="flex-1 space-y-2.5 w-full">
                              <div className="flex flex-wrap items-center gap-2">
                                 <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition inline-flex items-center gap-1.5">
                                    <Camera className="w-4 h-4 text-slate-500" />
                                    Browse Photo...
                                    <input 
                                       type="file" 
                                       accept="image/*" 
                                       onChange={handleFileChange}
                                       className="hidden" 
                                    />
                                 </label>
                                 {formData.imageUrl && (
                                    <button 
                                       type="button" 
                                       onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                       className="text-xs text-rose-500 hover:text-rose-600 font-bold px-3 py-2.5 border border-rose-100 bg-rose-50 rounded-xl hover:bg-rose-100 transition"
                                    >
                                       Remove Photo
                                    </button>
                                  )}
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Or use URL:</span>
                                 <input 
                                    type="url" 
                                    required={false}
                                    value={formData.imageUrl && typeof formData.imageUrl === 'string' && !formData.imageUrl.startsWith('data:') ? formData.imageUrl : ''} 
                                    onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                                    placeholder="https://images.unsplash.com/photo-..." 
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                 />
                              </div>
                           </div>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                        <input 
                          type="text" 
                          value={formData.name || ''} 
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Gender</label>
                        <select 
                          value={formData.gender || 'Male'} 
                          onChange={e => setFormData({...formData, gender: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase font-sans text-sm"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Role/Position</label>
                        <input 
                          type="text" 
                          value={formData.role || ''} 
                          onChange={e => setFormData({...formData, role: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                        />
                      </div>
                    </div>

                    <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2">Short Bio</label>
                       <textarea 
                         rows={3}
                         value={formData.bio || ''} 
                         onChange={e => setFormData({...formData, bio: e.target.value})}
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none uppercase"
                       ></textarea>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                        <input 
                          type="email" 
                          value={formData.email || ''} 
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
                        <input 
                          type="text" 
                          value={formData.phone || ''} 
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">LinkedIn URL</label>
                        <input 
                          type="url" 
                          value={formData.linkedinUrl || ''} 
                          onChange={e => setFormData({...formData, linkedinUrl: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Facebook URL</label>
                        <input 
                          type="url" 
                          value={formData.facebookUrl || ''} 
                          onChange={e => setFormData({...formData, facebookUrl: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </form>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-[2rem]">
                  <button type="button" disabled={isSaving} onClick={handleCloseModal} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    form="staff-form" 
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition flex items-center gap-2"
                  >
                    {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                    {isSaving ? (editingId ? 'Saving Changes...' : 'Saving Profile...') : (editingId ? 'Save Changes' : 'Save Profile')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
