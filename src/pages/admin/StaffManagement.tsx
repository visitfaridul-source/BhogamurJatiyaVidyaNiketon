import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWebsite, WebsiteStaffMember } from '../../context/WebsiteContext';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Briefcase, Mail, Phone, Link as LinkIcon, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffManagement() {
  const { settings, updateSettings } = useWebsite();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<WebsiteStaffMember>>({
    name: '',
    role: '',
    bio: '',
    imageUrl: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    facebookUrl: ''
  });

  const staff = settings.staffMembers || [];

  const handleOpenModal = (staffMember?: WebsiteStaffMember) => {
    if (staffMember) {
      setEditingId(staffMember.id);
      setFormData(staffMember);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        role: '',
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
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role) return;

    if (editingId) {
      const updatedStaff = staff.map(s => s.id === editingId ? { ...s, ...formData } as WebsiteStaffMember : s);
      updateSettings({ staffMembers: updatedStaff });
    } else {
      const newStaff: WebsiteStaffMember = {
        ...formData,
        id: `staff-${Date.now()}`
      } as WebsiteStaffMember;
      updateSettings({ staffMembers: [...staff, newStaff] });
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      const updatedStaff = staff.filter(s => s.id !== id);
      updateSettings({ staffMembers: updatedStaff });
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
            
            <div className="mb-4">
               {member.imageUrl ? (
                   <img src={member.imageUrl} alt={member.name} className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-sm" />
               ) : (
                   <div className="w-24 h-24 rounded-full bg-blue-50 border-4 border-slate-50 flex items-center justify-center text-blue-300 shadow-sm">
                       <Briefcase className="w-10 h-10" />
                   </div>
               )}
            </div>
            
            <div className="flex-1">
               <div className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider rounded border border-amber-100 mb-2">
                 {member.role}
               </div>
               <h3 className="font-bold text-slate-800 text-lg mb-1">{member.name}</h3>
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
      <AnimatePresence>
        {isModalOpen && createPortal(
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
                <form id="staff-form" onSubmit={handleSave} className="space-y-6">
                  {/* Photo Input (URL based & direct upload) */}
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Profile Photo</label>
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                         <div className="w-16 h-16 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center relative group">
                            {formData.imageUrl ? (
                              <img src={formData.imageUrl} alt="preview" className="w-full h-full object-cover" />
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
                                  value={formData.imageUrl && !formData.imageUrl.startsWith('data:') ? formData.imageUrl : ''} 
                                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                                  placeholder="https://images.unsplash.com/photo-..." 
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                               />
                            </div>
                         </div>
                      </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Full Name *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Role/Position *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.role} 
                        onChange={e => setFormData({...formData, role: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Short Bio</label>
                     <textarea 
                       rows={3}
                       value={formData.bio} 
                       onChange={e => setFormData({...formData, bio: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                     ></textarea>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                      <input 
                        type="email" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
                      <input 
                        type="text" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">LinkedIn URL</label>
                      <input 
                        type="url" 
                        value={formData.linkedinUrl} 
                        onChange={e => setFormData({...formData, linkedinUrl: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Facebook URL</label>
                      <input 
                        type="url" 
                        value={formData.facebookUrl} 
                        onChange={e => setFormData({...formData, facebookUrl: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-[2rem]">
                <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" form="staff-form" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">
                  Save Profile
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
