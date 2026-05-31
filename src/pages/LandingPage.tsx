import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useWebsite } from '@/context/WebsiteContext';
import { 
  BookOpen, 
  ChevronRight, 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  Wallet,
  Menu,
  X,
  Play,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Bell,
  Download,
  PlayCircle,
  ArrowRight,
  ChevronDown,
  Clock,
  Star,
  Volume2,
  Calendar,
  Sparkles,
  Info,
  User,
  Briefcase,
  Shield,
  MessageCircle,
  Award,
  Monitor,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const navigate = useNavigate();
  const { settings } = useWebsite();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-800 font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-2 inset-x-0 z-50 pointer-events-none px-4 sm:px-6">
        <div className="max-w-7xl mx-auto w-full">
          {/* Floating Menu Pill */}
          <div className="pointer-events-auto bg-slate-900/60 backdrop-blur-xl shadow-lg shadow-blue-900/10 border border-slate-700/50 rounded-full px-4 sm:px-6 py-2 flex items-center justify-between gap-4 w-full">
            
            {/* Logo on the Left */}
            <div 
              className="flex items-center gap-3 shrink-0 cursor-pointer pl-1"
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md border border-white/20">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              )}
              <span className="text-white font-bold tracking-tight hidden md:block drop-shadow-md text-sm lg:text-base">
                {settings.schoolName || "Bhogamur Jatiya Vidya Niketon"}
              </span>
            </div>

            {/* Nav Links */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 overflow-x-auto hide-scrollbar w-full sm:w-auto ml-auto pr-2 sm:pr-0">
              <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xs sm:text-sm font-semibold text-white drop-shadow-md hover:text-blue-200 transition-colors whitespace-nowrap px-2 py-1">
                Home
              </button>
              <button onClick={() => navigate('/gallery')} className="text-xs sm:text-sm font-semibold text-white drop-shadow-md hover:text-blue-200 transition-colors whitespace-nowrap px-2 py-1">
                Gallery
              </button>
              <button onClick={() => navigate('/result')} className="text-xs sm:text-sm font-semibold text-white drop-shadow-md hover:text-blue-200 transition-colors whitespace-nowrap px-2 py-1">
                Check Result
              </button>
              <button onClick={() => navigate('/our-staff')} className="text-xs sm:text-sm font-semibold text-white drop-shadow-md hover:text-blue-200 transition-colors whitespace-nowrap px-2 py-1">
                Our Staff
              </button>
              <button onClick={() => navigate('/online-admission')} className="text-xs sm:text-sm font-semibold text-white drop-shadow-md hover:text-blue-200 transition-colors whitespace-nowrap px-2 py-1">
                Online Admission
              </button>
              <button onClick={() => navigate('/contact')} className="text-xs sm:text-sm font-semibold text-white drop-shadow-md hover:text-blue-200 transition-colors whitespace-nowrap px-2 py-1">
                Contact
              </button>
              <button onClick={() => navigate('/login?role=admin')} className="text-xs sm:text-sm font-semibold bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-1 transition-colors whitespace-nowrap flex items-center gap-1.5 border border-white/30 ml-2">
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
              {/* Spacer to ensure last item is fully visible when scrolled */}
              <div className="w-1 sm:w-2 shrink-0"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 md:pb-16 px-4 bg-slate-900 text-white relative z-40 flex flex-col justify-center min-h-[45vh] lg:min-h-[50vh]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80" />
          
          {/* Animated Glow Blobs - Intense */}
          <motion.div 
            animate={{ 
              scale: [1, 1.25, 1],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-40 -right-20 w-[500px] h-[500px] bg-blue-500/50 rounded-full blur-[80px] pointer-events-none mix-blend-screen" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.3, 0.7, 0.3]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/40 rounded-full blur-[90px] pointer-events-none mix-blend-screen" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute top-[20%] left-[30%] w-[450px] h-[450px] bg-purple-500/40 rounded-full blur-[80px] pointer-events-none mix-blend-screen" 
          />
          
          {settings.heroOverlayImageUrl && (
            <>
              <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 object-cover mix-blend-overlay" style={{ backgroundImage: `url(${settings.heroOverlayImageUrl})` }}></div>
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/80 to-slate-900 pointer-events-none"></div>
            </>
          )}
        </div>
        
        <div className="max-w-[1400px] mx-auto relative z-10 w-full mt-4 lg:mt-6 flex flex-col lg:flex-row items-center gap-6 lg:gap-6 px-2 sm:px-6">
          
          {/* Left Column: Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left relative z-50"
          >
            <h1 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-tiro font-bold tracking-tight leading-[1.2] pb-2 bg-gradient-to-r from-amber-400 via-rose-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-md select-none"
            >
              {settings.heroHeadline}
            </h1>
            
            <p className="text-slate-200 text-sm sm:text-base md:text-xl font-tiro font-bold mt-3 lg:mt-4 max-w-xl mx-auto lg:mx-0 leading-relaxed border-l-4 border-green-500 pl-4 py-1.5 bg-gradient-to-r from-green-500/10 to-transparent">
               {settings.aboutText || "য’ত সপোনৰ আৰম্ভণি হয় আৰু ভৱিষ্যত উজলি উঠে।"}
            </p>
            
            {/* Call to Action Buttons */}
            <div className="flex flex-row flex-wrap items-center justify-center lg:justify-start gap-3 mt-6 lg:mt-8 w-full">
              <button 
                onClick={() => navigate('/courses')}
                className="flex items-center justify-center gap-2 bg-white text-slate-900 font-bold text-sm sm:text-base px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
              >
                Our Courses 
                <BookOpen className="w-4.5 h-4.5" />
              </button>
              <button 
                onClick={() => navigate('/prospectus')}
                className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 text-white font-bold text-sm sm:text-base px-6 py-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
              >
                <Download className="w-4.5 h-4.5" />
                Prospectus
              </button>
              <button 
                onClick={() => navigate('/video')}
                className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 text-white font-bold text-sm sm:text-base px-6 py-3 rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
              >
                <PlayCircle className="w-4.5 h-4.5" />
                Watch Tour
              </button>
            </div>

            {/* Principal & Vice Principal Quick Cards for Mobile/Tablet (Visible on < xl) */}
            <div className="flex xl:hidden flex-wrap items-center justify-center lg:justify-start gap-4 mt-8 w-full border-t border-white/10 pt-6">
              {/* Principal Card */}
              <div 
                onClick={() => navigate('/prospectus')}
                className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 hover:border-amber-400/30 cursor-pointer active:scale-95 transition-all w-[240px] max-w-full text-left"
              >
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-amber-400/50 shrink-0 bg-slate-950 p-0.5 flex items-center justify-center">
                  <img 
                    src={settings.principalHeroImage || settings.principalImageUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain" 
                    alt="Principal" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] font-bold text-amber-300 tracking-wider uppercase leading-none">Principal</p>
                  <p className="text-xs font-black text-white/95 truncate leading-snug mt-1">{settings.principalHeroName || settings.principalName || "Dr. S. K. Sharma"}</p>
                  <p className="text-[10px] text-white/60 font-bold flex items-center gap-1 mt-0.5">
                    Prospectus PDF <Download className="w-3 h-3 text-amber-300" />
                  </p>
                </div>
              </div>

              {/* Vice Principal Card */}
              <div 
                onClick={() => navigate('/video')}
                className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 hover:border-blue-400/30 cursor-pointer active:scale-95 transition-all w-[240px] max-w-full text-left"
              >
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-blue-400/50 shrink-0 bg-slate-950 p-0.5 flex items-center justify-center">
                  <img 
                    src={settings.vicePrincipalHeroImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain" 
                    alt="Vice Principal" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] font-bold text-blue-300 tracking-wider uppercase leading-none">Vice Principal</p>
                  <p className="text-xs font-black text-white/95 truncate leading-snug mt-1">{settings.vicePrincipalHeroName || "Pranjal Dutta"}</p>
                  <p className="text-[10px] text-white/60 font-bold flex items-center gap-1 mt-0.5">
                    Watch Video Tour <PlayCircle className="w-3 h-3 text-blue-300" />
                  </p>
                </div>
              </div>
            </div>

          </motion.div>

          {/* Right Column: Hero Visuals / Gallery Grid */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full lg:w-1/2 flex flex-col items-center justify-center relative mt-16 lg:mt-0"
          >
            {/* Glowing Gallery Grid Section with Side Buttons integrated for desktop */}
            <div className="flex flex-row items-center justify-center gap-4 xl:gap-8 w-full z-10 relative">
              
              {/* Left Button (Desktop) - Principal with Prospectus info */}
              <div className="hidden xl:flex flex-col items-center justify-center shrink-0 -mr-6 z-20">
                <div 
                  onClick={() => navigate('/prospectus')} 
                  className="group flex flex-col items-center justify-center gap-2.5 bg-slate-900/80 backdrop-blur-md hover:bg-slate-900/95 text-white p-4 rounded-[2rem] transition-all duration-500 shadow-2xl border border-white/15 hover:-translate-x-2 hover:border-amber-400/30 cursor-pointer w-[130px] text-center"
                >
                   <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-400/60 shadow-lg group-hover:scale-105 transition-all duration-500 bg-slate-950 p-0.5 flex items-center justify-center">
                      <img 
                        src={settings.principalHeroImage || settings.principalImageUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300"} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain animate-fade-in" 
                        alt="Principal" 
                      />
                   </div>
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-amber-300 tracking-wide uppercase">Principal</span>
                      <span className="text-[11px] font-black text-white/95 truncate max-w-[105px] leading-tight block">{settings.principalHeroName || settings.principalName || "Dr. S. K. Sharma"}</span>
                   </div>
                   <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-900 text-amber-300 transition-all duration-300 shadow-inner">
                      <Download className="w-4 h-4" />
                   </div>
                   <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/80 group-hover:text-amber-300 transition-colors">Prospectus</span>
                </div>
              </div>

              {/* Elegant Gallery Container */}
              <div className="relative w-full max-w-[600px] mx-auto z-10">
                {/* Soft Glassy Outline Backdrop */}
                <div className="absolute inset-[-10px] sm:inset-[-20px] rounded-[2rem] sm:rounded-[3rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl -z-10" />
                
                <div className="w-full grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 items-center justify-center p-2 sm:p-4">
                  {settings.heroGalleryImages?.slice(0,4).map((img, idx) => {
                    if (idx === 2) {
                      return (
                         <div 
                           key={idx} 
                           className="relative group rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-blue-400/30 bg-gradient-to-br from-blue-900 to-slate-900 text-white flex flex-col items-center justify-center p-4 hover:shadow-blue-900/50"
                           onClick={() => navigate('/principal-message')}
                         >
                           <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 mb-2 sm:mb-3 opacity-80 group-hover:scale-110 transition-transform duration-500" />
                           <div className="font-tiro font-bold text-center text-sm sm:text-base lg:text-lg text-blue-50 leading-tight mb-1 group-hover:text-white transition-colors">
                             Principal's Message
                           </div>
                           <div className="text-[10px] sm:text-xs text-blue-200/70 text-center line-clamp-2 mt-1">
                             A vision for tomorrow's leaders. Read our principal's welcome note.
                           </div>
                           <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors duration-500"></div>
                           <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                              <span className="text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase flex items-center gap-1 group-hover:-translate-y-1 transition-transform duration-300">
                                Read Now <ArrowRight className="w-3 h-3 ml-1" />
                              </span>
                           </div>
                         </div>
                      );
                    }
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                           "relative group rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/15",
                           idx === 0 || idx === 3 ? "scale-95" : "scale-100",
                           idx === 0 ? "origin-top-right" : idx === 3 ? "origin-bottom-left" : ""
                        )}
                        onClick={() => setSelectedImage(img)}
                      >
                         <div className="relative h-full w-full bg-slate-800 flex items-center justify-center overflow-hidden">
                           <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" alt={`Hero ${idx + 1}`} />
                           <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors duration-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 transform translate-y-4 group-hover:translate-y-0">Expand</span>
                           </div>
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Button (Desktop) - Vice Principal with Watch Video info */}
              <div className="hidden xl:flex flex-col items-center justify-center shrink-0 -ml-6 z-20">
                 <div 
                   onClick={() => navigate('/video')} 
                   className="group flex flex-col items-center justify-center gap-2.5 bg-slate-900/80 backdrop-blur-md hover:bg-slate-900/95 text-white p-4 rounded-[2rem] transition-all duration-500 shadow-2xl border border-white/15 hover:translate-x-2 hover:border-blue-400/30 cursor-pointer w-[130px] text-center"
                 >
                   <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-blue-400/60 shadow-lg group-hover:scale-105 transition-all duration-500 mx-auto bg-slate-950 p-0.5 flex items-center justify-center">
                      <img 
                        src={settings.vicePrincipalHeroImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300"} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain animate-fade-in" 
                        alt="Vice Principal" 
                      />
                   </div>
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-blue-300 tracking-wide uppercase leading-tight">Vice Principal</span>
                      <span className="text-[11px] font-black text-white/95 truncate max-w-[105px] leading-tight block">{settings.vicePrincipalHeroName || "Pranjal Dutta"}</span>
                   </div>
                   <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-blue-400 group-hover:text-slate-900 text-blue-300 transition-all duration-300 shadow-inner mx-auto">
                      <PlayCircle className="w-4 h-4" />
                   </div>
                   <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/80 group-hover:text-blue-300 transition-colors">Watch Tour</span>
                 </div>
              </div>

            </div>

            {/* Disabled Old Button */}
            <div className="hidden">
              <div className="hidden xl:flex flex-col items-center justify-center shrink-0 -ml-6 z-20">
                 <button onClick={() => navigate('/video')} className="group flex flex-col items-center justify-center gap-3 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-5 rounded-3xl transition-all duration-500 shadow-2xl border border-white/20 hover:translate-x-2">
                   <div className="w-12 h-12 rounded-full bg-slate-900/40 flex items-center justify-center group-hover:bg-slate-900/60 transition-colors shadow-inner">
                      <PlayCircle className="w-5 h-5 text-white" />
                   </div>
                   <span className="text-xs font-bold uppercase tracking-widest max-w-[100px] text-center leading-tight text-white/90">Watch Video Tour</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Updates & Notifications Section (Assamese Theme) */}
      <section id="updates" className="py-24 bg-[#fffdf9] relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center">
            {/* Quick Links Sidebar */}
            <div className="w-full">
              <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 shadow-2xl h-[550px] flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col h-full overflow-hidden">
                  <div className="shrink-0">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white mb-6 backdrop-blur-sm">
                       <Sparkles className="w-4 h-4 text-blue-400" />
                       <span className="text-xs font-bold tracking-widest uppercase">Quick Actions</span>
                    </div>
                    
                    <h3 className="text-3xl font-black mb-2 tracking-tight font-sans">
                       Student Portal
                    </h3>
                    <p className="text-sm text-slate-300 mb-8 font-medium">
                       Access all important links and resources for your academic journey.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                    <button 
                      onClick={() => navigate('/online-class')}
                      className="group flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl transition-all duration-300"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Monitor className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                             <div className="font-bold text-white text-lg">Online Class</div>
                             <div className="text-xs text-slate-400 font-medium">Join live sessions</div>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                    
                    <button 
                      onClick={() => navigate('/online-admission')}
                      className="group flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl transition-all duration-300"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                             <ClipboardList className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                             <div className="font-bold text-white text-lg">Admission Form</div>
                             <div className="text-xs text-slate-400 font-medium">Apply for new session</div>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                    
                    <button 
                      onClick={() => navigate('/fee-structure')}
                      className="group flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl transition-all duration-300"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Wallet className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                             <div className="font-bold text-white text-lg">Fee Structure</div>
                             <div className="text-xs text-slate-400 font-medium">View detailed plans</div>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                    
                    <button 
                      onClick={() => navigate('/timetable')}
                      className="group flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl transition-all duration-300"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Calendar className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                             <div className="font-bold text-white text-lg">Time Table</div>
                             <div className="text-xs text-slate-400 font-medium">Class schedules</div>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full">
              <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-4 sm:p-6 shadow-2xl shadow-red-900/10 h-[550px] flex flex-col relative overflow-hidden ticker-container">
                 <div className="flex items-center gap-3 mb-6 relative z-30 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                     <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                       <Bell className="w-5 h-5 text-red-600 animate-pulse" />
                     </div>
                     <div className="min-w-0">
                       <style>{`
                          @keyframes blinkColor {
                            0% { color: #ef4444; }
                            25% { color: #8b5cf6; }
                            50% { color: #ec4899; }
                            75% { color: #f59e0b; }
                            100% { color: #ef4444; }
                          }
                          .animate-color-blink {
                            animation: blinkColor 2s linear infinite;
                          }
                       `}</style>
                       <h4 className="text-base font-bold text-slate-800 leading-tight truncate animate-color-blink">Notification Board</h4>
                       <p className="text-[10px] text-slate-500 font-medium animate-color-blink">Scroll to see more</p>
                     </div>
                 </div>

                 {/* Gradient Overlays for smooth scrolling edges */}
                 <div className="absolute top-[70px] left-0 right-0 h-20 bg-gradient-to-b from-white/90 via-white/50 to-transparent z-20 pointer-events-none rounded-t-[2.5rem]"></div>
                 <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/90 via-white/80 to-transparent z-20 pointer-events-none rounded-b-[2.5rem]"></div>

                 <div className="flex-1 overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                    <div className="flex flex-col gap-6 pt-4 pb-6">
                       {(settings.updatesList || []).map((update, idx) => (
                           <NotificationCard key={`${update.id}-${idx}`} update={update} />
                       ))}
                    </div>
                 </div>
              </div>
            </div>

            <div className="w-full">
              <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-[2.5rem] p-4 sm:p-6 shadow-2xl shadow-blue-900/20 h-[550px] flex flex-col relative overflow-hidden">
                 <div className="flex items-center gap-3 mb-6 relative z-30 bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 shadow-sm shrink-0">
                     <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                       <Award className="w-5 h-5 text-blue-400 animate-pulse" />
                     </div>
                     <div className="min-w-0">
                       <h4 className="text-base font-bold text-white leading-tight truncate">{settings.toppersSubtitle || "HSLC & HS Toppers"}</h4>
                       <p className="text-[10px] text-blue-200 font-medium">Scroll to see more</p>
                     </div>
                 </div>

                 <div className="flex-1 overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                    <div className="flex flex-col gap-6 pt-4 pb-6">
                       {(settings.toppersList || []).map((topper, idx) => (
                           <TopperCard key={`${topper.id}-${idx}`} topper={topper} />
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      {settings.galleryImages && settings.galleryImages.length > 0 && (
        <section className="py-24 bg-white relative">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">{settings.galleryTitle || 'Campus Life'}</h2>
              <h3 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4 tracking-tight">{settings.gallerySubtitle || 'A glimpse into our vibrant school'}</h3>
              <p className="text-lg text-slate-500 font-medium">{settings.galleryDescription || 'Explore the world-class facilities and joyful moments at our campus.'}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {settings.galleryImages.map((img, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: i * 0.1 }}
                   className={cn(
                     "group relative bg-white rounded-[1.5rem] overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 cursor-pointer p-[3px]",
                     i === 0 ? "md:col-span-2 md:row-span-2 aspect-square" : "aspect-square"
                   )}
                 >
                    {/* Neon Spinners visible on hover in a subtle way */}
                    <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_340deg,#0ea5e9_360deg)] animate-[spin_3s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-[-100%] bg-[conic-gradient(from_180deg,transparent_0_340deg,#e879f9_360deg)] animate-[spin_3s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative h-full w-full rounded-[calc(1.5rem-3px)] overflow-hidden bg-slate-900 flex items-center justify-center isolate">
                      <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center duration-300">
                        <span className="text-white text-xs font-bold uppercase tracking-widest border border-white/30 backdrop-blur-sm px-3 py-1 rounded-full">View</span>
                      </div>
                    </div>
                 </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 pt-20 pb-10 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-6">
                {settings.logoUrl ? (
                   <img src={settings.logoUrl} alt={settings.schoolName} className="h-8 object-contain brightness-0 invert" />
                ) : (
                   <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                     <BookOpen className="w-5 h-5" />
                   </div>
                )}
                <span className="text-xl font-bold text-white tracking-tight">{settings.schoolName}</span>
              </div>
              <p className="text-sm mb-6 max-w-xs font-tiro text-slate-300 italic">{settings.aboutText}</p>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer" />
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer" />
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer" />
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><button onClick={() => navigate('/gallery')} className="hover:text-white transition-colors text-left">Gallery</button></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Support</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors text-left">Contact Us</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Connect</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start gap-3">
                   <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
                   <span>{settings.address}</span>
                </li>
                <li className="flex items-center gap-3">
                   <Phone className="w-5 h-5 text-blue-500 shrink-0" />
                   <span>{settings.phone}</span>
                </li>
                <li className="flex items-center gap-3">
                   <Mail className="w-5 h-5 text-blue-500 shrink-0" />
                   <span>{settings.email}</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>&copy; 2026 {settings.schoolName} Systems Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>

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
    </div>
  );
}

function UpdateCard({ update, index }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="break-inside-avoid relative bg-white rounded-3xl border border-red-900/5 shadow-xl shadow-red-900/5 overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500"
    >
      {update.isImportant && (
        <div className="absolute top-4 right-4 z-20 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-red-600/30 flex items-center gap-1.5">
           <Star className="w-3.5 h-3.5 fill-white" /> Important
        </div>
      )}
      
      {update.imageUrl ? (
        <div className="relative aspect-video overflow-hidden">
           <img src={update.imageUrl} alt={update.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
           <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white/90 text-sm font-medium">
             <Calendar className="w-4 h-4" /> {update.date}
           </div>
        </div>
      ) : (
        <div className="px-6 mx-auto pt-6 pb-2">
            <div className="inline-flex items-center gap-2 text-slate-500 text-sm font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
               <Calendar className="w-4 h-4 text-red-500" /> {update.date}
            </div>
        </div>
      )}

      <div className="p-6">
        <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-red-700 transition-colors leading-tight font-tiro">{update.title}</h4>
        <p className="text-slate-600 leading-relaxed font-medium">{update.description}</p>
        
        <div className="mt-6 flex items-center text-red-600 font-bold text-sm uppercase tracking-wide group-hover:gap-3 transition-all">
          Read More <ArrowRight className="w-4 h-4 ml-2" />
        </div>
      </div>
      
      {/* Bottom Assamese motif border decoration */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </motion.div>
  );
}

function NotificationCard({ update }: any) {
  // Parse date safely, expecting format like "May 01, 2026"
  const dateParts = update.date?.split(' ') || ['Unknown', '00', '0000'];
  const month = dateParts[0];
  const day = dateParts[1]?.replace(',', '');

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 p-4 sm:p-5 flex gap-4 w-full">
      {update.imageUrl ? (
         <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden shadow-sm aspect-square">
             <img src={update.imageUrl} alt={update.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
         </div>
      ) : (
         <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl bg-red-50 text-red-600 flex flex-col items-center justify-center border border-red-100 uppercase tracking-widest text-xs font-bold shrink-0 aspect-square">
             <span className="text-[10px] sm:text-xs opacity-80">{month}</span>
             <span className="text-xl sm:text-2xl font-black">{day}</span>
         </div>
      )}
      
      <div className="flex-1 min-w-0 flex flex-col justify-center">
         <div className="flex items-start justify-between gap-2 mb-1">
             <h4 className="font-bold text-slate-800 line-clamp-1 group-hover:text-red-700 transition-colors text-sm sm:text-base leading-tight">
               {update.title}
             </h4>
             {update.isImportant && (
               <div className="shrink-0 flex items-center justify-center pt-1">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
               </div>
             )}
         </div>
         <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mb-2 leading-relaxed font-medium">
           {update.description}
         </p>
         <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-auto">
             <Calendar className="w-3.5 h-3.5 text-red-400/70" /> {update.date}
         </div>
      </div>
    </div>
  );
}

function TopperCard({ topper }: any) {
  return (
    <div className="group relative bg-slate-800 border border-slate-700/50 rounded-2xl shadow-sm overflow-hidden hover:bg-slate-700/50 hover:border-slate-600 transition-all duration-300 p-4 sm:p-5 flex gap-4 w-full">
      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden shadow-md aspect-square bg-slate-950 border border-slate-600/50 p-1 flex items-center justify-center">
          <img src={topper.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topper.name}`} alt={topper.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-center">
         <div className="flex items-start justify-between gap-2 mb-1">
             <h4 className="font-bold text-white line-clamp-1 text-sm sm:text-base leading-tight">
               {topper.name}
             </h4>
             <div className="shrink-0 flex items-center justify-center">
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {topper.percentage}
                </span>
             </div>
         </div>
         <p className="text-xs sm:text-sm text-blue-200/80 mb-2 font-medium">
           {topper.stream} | {topper.year}
         </p>
         <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-yellow-400 uppercase tracking-wider mt-auto">
             <Award className="w-3.5 h-3.5" /> {topper.rank}
         </div>
      </div>
    </div>
  );
}
