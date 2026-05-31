import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Quote, Award, BookOpen, Heart, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebsite } from '@/context/WebsiteContext';

export default function PrincipalMessagePage() {
  const navigate = useNavigate();
  const { settings } = useWebsite();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-800 font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-semibold group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Back to Home</span>
          </button>
          
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md border border-white/20">
                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
            <span className="text-slate-900 font-bold tracking-tight text-sm lg:text-base hidden sm:block">
              {settings.schoolName || "Bhogamur Jatiya Vidya Niketon"}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 sm:pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-100 relative overflow-hidden"
          >
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex justify-center mb-8 text-blue-500">
                <Quote className="w-12 h-12 sm:w-16 sm:h-16 opacity-20" />
              </div>
              
              {settings.principalImageUrl && (
                <div className="flex justify-center mb-10">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full blur-2xl opacity-45 group-hover:opacity-65 transition-opacity duration-500"></div>
                    
                    <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden bg-slate-950 p-[3px] shadow-2xl flex items-center justify-center">
                      {/* Neon Gradient Spinners */}
                      <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_340deg,#3b82f6_360deg)] animate-[spin_4s_linear_infinite]" />
                      <div className="absolute inset-[-100%] bg-[conic-gradient(from_180deg,transparent_0_340deg,#e879f9_360deg)] animate-[spin_4s_linear_infinite]" />
                      
                      <div className="relative h-full w-full rounded-[calc(1.5rem-2px)] overflow-hidden bg-slate-940 flex items-center justify-center isolate">
                        <img 
                          src={settings.principalImageUrl} 
                          alt="Principal" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Sleek diagonal glass flash sweep scan effect */}
                        <div className="absolute inset-y-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none group-hover:animate-[shimmer_1.2s_ease-in-out] z-20" />
                        
                        {/* Clean warm subtle gradient overlay on hover */}
                        <div className="absolute inset-0 bg-indigo-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <h1 className="text-3xl sm:text-5xl font-tiro font-bold text-center text-slate-900 mb-6 drop-shadow-sm leading-tight">
                {settings.principalMessageTitle || "From the Principal's Desk"}
              </h1>
              <div className="w-24 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto rounded-full mb-12"></div>

              <div className="prose prose-lg prose-slate max-w-none text-slate-600 leading-relaxed font-medium">
                {(settings.principalMessageQuote || "Education is not just about academic excellence, but about nurturing character, creativity, and compassion in every child.") && (
                <p className="text-xl sm:text-2xl text-slate-700 leading-snug font-tiro italic mb-8 border-l-4 border-blue-500 pl-6 text-center sm:text-left">
                  "{settings.principalMessageQuote || "Education is not just about academic excellence, but about nurturing character, creativity, and compassion in every child."}"
                </p>
                )}

                {(settings.principalMessageBody || "Dear Parents, Students, and Well-wishers,\n\nIt gives me immense pleasure to welcome you to our distinguished institution. We have consistently strived to create an environment that encourages curiosity, critical thinking, and innovation. We believe that every child is unique and possesses extraordinary potential waiting to be discovered.\n\nOur dedicated faculty focuses on delivering a holistic educational experience. Beyond the rigorous academic curriculum, we emphasize the importance of sports, arts, and moral values. We aim to equip our students not just with knowledge, but with the wisdom to use it for the betterment of society.\n\nAs we navigate the challenges and opportunities of the 21st century, our focus remains steadfast on preparing our youth to be responsible global citizens. We value the partnership of our parents in this deeply rewarding journey and look forward to building a brighter future together.\n\nLet us work hand in hand to help our students soar to new heights.").split('\n').map((paragraph, index) => {
                  if (!paragraph.trim()) return null;
                  return (
                    <p key={index} className="mb-6 whitespace-pre-wrap">
                      {paragraph}
                    </p>
                  );
                })}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-10">
                  <div className="bg-blue-50/50 rounded-2xl p-6 text-center border border-blue-100/50">
                    <Award className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-900 mb-2">Excellence</h3>
                    <p className="text-sm text-slate-500">Striving for the highest standards in everything we do.</p>
                  </div>
                  <div className="bg-indigo-50/50 rounded-2xl p-6 text-center border border-indigo-100/50">
                    <BookOpen className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-900 mb-2">Knowledge</h3>
                    <p className="text-sm text-slate-500">Fostering a lifelong love for learning and discovery.</p>
                  </div>
                  <div className="bg-purple-50/50 rounded-2xl p-6 text-center border border-purple-100/50">
                    <Heart className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-900 mb-2">Character</h3>
                    <p className="text-sm text-slate-500">Building integrity, empathy, and strong moral values.</p>
                  </div>
                </div>

                <div className="mt-12 flex items-center justify-between border-t border-slate-100 pt-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 font-tiro mb-1">{settings.principalName || "Dr. S. K. Sharma"}</h3>
                    <p className="text-blue-600 font-semibold tracking-wide text-sm uppercase">{settings.principalTitle || "Principal"}</p>
                    <p className="text-slate-500 text-sm mt-1">{settings.schoolName}</p>
                  </div>
                  
                  {settings.principalSignatureUrl ? (
                    <div className="h-20 flex items-center">
                      <img src={settings.principalSignatureUrl} alt="Signature" className="h-full object-contain max-w-[150px] opacity-80 mix-blend-multiply" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 opacity-60">
                      <Award className="w-10 h-10 text-slate-300" />
                    </div>
                  )}
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
