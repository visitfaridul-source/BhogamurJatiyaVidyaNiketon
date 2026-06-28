import React, { useState, useMemo } from 'react';
import { useWebsite } from '../context/WebsiteContext';
import { useSchool } from '../context/SchoolContext';
import { Mail, Phone, ExternalLink, X, User, GraduationCap, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffPage() {
  const { settings } = useWebsite();
  const { teachers } = useSchool();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Combine custom website staff with school teachers, avoiding redundancy
  const combinedStaff = useMemo(() => {
    const list = [...(settings.staffMembers || [])];
    
    // Create sets of existing keys for easy duplicate checking
    const existingNames = new Set(list.map(s => s.name.trim().toLowerCase()));
    const existingEmails = new Set(list.map(s => s.email?.trim().toLowerCase()).filter(Boolean));
    const existingPhones = new Set(list.map(s => s.phone?.trim()).filter(Boolean));

    // Convert teachers into WebsiteStaffMember structure
    const teacherStaffMembers = (teachers || []).map(t => ({
      id: `teacher-${t.id}`,
      name: t.name,
      gender: t.gender,
      role: `${t.subject} Teacher`.toUpperCase(),
      bio: `${t.qualification || 'Educator'} specializing in ${t.subject}. Dedicated to teaching excellence and student success.`,
      imageUrl: t.avatar || '',
      email: t.email || '',
      phone: t.phone || '',
      isFromTeachersDb: true
    }));

    // Filter out duplicates (redundant entries)
    const nonDuplicateTeachers = teacherStaffMembers.filter(t => {
      const nameKey = t.name.trim().toLowerCase();
      const emailKey = t.email?.trim().toLowerCase();
      const phoneKey = t.phone?.trim();

      const isDuplicateName = existingNames.has(nameKey);
      const isDuplicateEmail = emailKey ? existingEmails.has(emailKey) : false;
      const isDuplicatePhone = phoneKey ? existingPhones.has(phoneKey) : false;

      return !isDuplicateName && !isDuplicateEmail && !isDuplicatePhone;
    });

    return [...list, ...nonDuplicateTeachers];
  }, [settings.staffMembers, teachers]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30">
      {/* Navigation - Duplicated from LandingPage for simplicity, normally should extract to a shared component */}
      <nav className="fixed top-2 inset-x-0 z-50 pointer-events-none px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4 w-full">
          <div className="pointer-events-auto bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-blue-900/10 border border-slate-700/50 rounded-full px-4 sm:px-8 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-6 lg:gap-8 w-full max-w-full hide-scrollbar">
            <div className="flex items-center gap-2 sm:gap-6 lg:gap-8 overflow-x-auto mx-auto">
              <button onClick={() => navigate('/')} className="text-xs sm:text-sm font-semibold text-white drop-shadow-md hover:text-blue-200 transition-colors whitespace-nowrap px-2 py-1">
                Home
              </button>
              <button disabled className="text-xs sm:text-sm font-semibold text-white drop-shadow-md transition-colors whitespace-nowrap px-2 py-1">
                Our Staff
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <section className="pt-24 pb-8 px-4 bg-slate-900 text-white clip-path-slant relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
            <motion.h1 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-3xl md:text-5xl font-black tracking-tight mb-2"
            >
                {settings.staffPageTitle} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-200">{settings.staffPageTitleHighlight}</span>
            </motion.h1>
            <motion.p 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto font-medium"
            >
                {settings.staffPageSubtitle}
            </motion.p>
        </div>
      </section>

      {/* Staff Grid */}
      <section className="py-10 px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto">
            {combinedStaff && combinedStaff.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-6">
                    {combinedStaff.map((staff, index) => (
                        <motion.div 
                           key={staff.id}
                           initial={{ opacity: 0, y: 20 }}
                           whileInView={{ opacity: 1, y: 0 }}
                           viewport={{ once: true }}
                           transition={{ delay: index * 0.1 }}
                           className="group relative bg-white rounded-[1.5rem] overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 flex flex-col"
                        >
                            {/* Glowing Neon animated border for high-fidelity photo frames */}
                            <div 
                              className="relative aspect-square overflow-hidden bg-slate-950 p-[3px] cursor-pointer border-b border-slate-950"
                              onClick={() => staff.imageUrl && setSelectedImage(staff.imageUrl)}
                            >
                                {/* Neon Gradient Spinners */}
                                <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_340deg,#3b82f6_360deg)] animate-[spin_4s_linear_infinite]" />
                                <div className="absolute inset-[-100%] bg-[conic-gradient(from_180deg,transparent_0_340deg,#e879f9_360deg)] animate-[spin_4s_linear_infinite]" />
                                
                                <div className="relative h-full w-full rounded-[calc(1.5rem-3px)] rounded-b-none overflow-hidden bg-slate-900 flex items-center justify-center p-1.5 isolate">
                                    {staff.imageUrl ? (
                                        <div className="relative h-full w-full bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
                                          <img 
                                              src={staff.imageUrl} 
                                              alt={staff.name} 
                                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                          />
                                          
                                          {/* Sleek diagonal glass flash sweep scan effect */}
                                          <div className="absolute inset-y-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none group-hover:animate-[shimmer_1s_ease-in-out] z-20" />
                                          
                                          {/* Clean warm subtle gradient overlay on hover */}
                                          <div className="absolute inset-0 bg-indigo-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
                                          
                                          {/* Sleek expandable badge prompt */}
                                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] z-30">
                                            <span className="text-white text-[10px] font-black uppercase tracking-wider bg-indigo-600 shadow-lg px-4 py-2 rounded-full transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                              Expand Photo
                                            </span>
                                          </div>
                                        </div>
                                    ) : (
                                        /* High-End, Warm Academic Portrait Placeholder with glowing spinners and shimmers */
                                        <div className="relative h-full w-full rounded-lg overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 flex flex-col items-center justify-center p-6 select-none">
                                          {/* Sleek diagonal glass flash sweep scan effect */}
                                          <div className="absolute inset-y-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none group-hover:animate-[shimmer_1.2s_ease-in-out] z-20" />
                                          
                                          {/* Decorative subtle background icon for texture */}
                                          <div className="absolute -right-6 -bottom-6 text-white/5 w-24 h-24 stroke-1 pointer-events-none">
                                            <BookOpen className="w-full h-full opacity-20" />
                                          </div>
                                          
                                          {/* Stylized rounded circular badge for user display */}
                                          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-slate-900/90 border border-slate-750 shadow-md group-hover:border-blue-500/35 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] transition-all duration-300 z-10">
                                            <User className="w-7 h-7 text-indigo-400 group-hover:text-blue-400 transition-colors" />
                                            
                                            {/* Stylized tiny gold badge overlay */}
                                            <div className="absolute -top-1 -right-0.5 bg-amber-500 text-white rounded-full p-1 shadow-sm border border-slate-900">
                                              <GraduationCap className="w-3 h-3" />
                                            </div>
                                          </div>
                                          
                                          {/* Staff details abbreviation key label */}
                                          <div className="mt-4 text-center z-10">
                                            <span className="text-xs font-bold text-white/90 tracking-wide font-sans block max-w-[140px] truncate">
                                              {staff.name}
                                            </span>
                                            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest block mt-0.5">
                                              {staff.role}
                                            </span>
                                          </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-full mb-3 self-start">
                                    {staff.role}
                                </div>
                                <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-2 leading-tight">{staff.name}</h3>
                                <p className="text-slate-600 text-sm line-clamp-3 mb-5 leading-relaxed flex-1">
                                    {staff.bio || "A dedicated member of our institution, committed to excellence and student success."}
                                </p>
                                
                                <div className="flex gap-2 mt-auto">
                                   {staff.email && (
                                     <a href={`mailto:${staff.email}`} className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors border border-slate-100">
                                        <Mail className="w-4 h-4" />
                                     </a>
                                   )}
                                   {staff.phone && (
                                     <a href={`tel:${staff.phone}`} className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors border border-slate-100">
                                        <Phone className="w-4 h-4" />
                                     </a>
                                   )}
                                   {staff.linkedinUrl && (
                                     <a href={staff.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors border border-slate-100">
                                        <ExternalLink className="w-4 h-4" />
                                     </a>
                                   )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="py-32 text-center text-slate-500 bg-white rounded-[2rem] border border-slate-100">
                    <p className="text-2xl font-medium mb-2">No staff members listed yet.</p>
                    <p>Please check back later or update via the admin panel.</p>
                </div>
            )}
        </div>
      </section>
      
      {/* Full Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage} 
              alt="Full view" 
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer minimal */}
      <footer className="bg-slate-900 py-8 text-center text-slate-400 mt-auto">
        <p>&copy; {new Date().getFullYear()} {settings.schoolName}. All rights reserved.</p>
      </footer>
    </div>
  );
}
