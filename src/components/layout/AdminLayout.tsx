import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useWebsite } from '@/context/WebsiteContext';
import { useAuth } from '@/context/AuthContext';
import { useSchool } from '@/context/SchoolContext';
import { auth } from '@/firebase';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase,
  GraduationCap, 
  CalendarCheck, 
  Wallet, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search,
  BookOpen,
  IdCard,
  Camera,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  FileText,
  Home,
  Clock,
  ShieldCheck,
  Library,
  CloudUpload,
  CloudOff,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/students', icon: GraduationCap, label: 'Students' },
  { path: '/admin/admission-data', icon: FileText, label: 'Admin Data' },
  { path: '/admin/courses', icon: Library, label: 'Courses' },
  { path: '/admin/promotions', icon: TrendingUp, label: 'Promotions' },
  { path: '/admin/teachers', icon: Users, label: 'Teachers' },
  { path: '/admin/staffs', icon: Briefcase, label: 'Website Staff' },
  { path: '/admin/website-pages', icon: BookOpen, label: 'Custom Pages' },
  { path: '/admin/attendance', icon: CalendarCheck, label: 'Attendance' },
  { path: '/admin/results', icon: BookOpen, label: 'Results' },
  { path: '/admin/face-recognition', icon: Camera, label: 'Face Scan' },
  { path: '/admin/fees', icon: Wallet, label: 'Fees' },
  { path: '/admin/id-cards', icon: IdCard, label: 'ID Cards' },
  { path: '/admin/sessions', icon: Clock, label: 'Sessions' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { 
    isSyncing, 
    syncStatus, 
    syncAllToFirebase, 
    resetFirestoreToMock, 
    firestoreDbEmpty, 
    dbStats 
  } = useSchool();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncDropdownOpen, setSyncDropdownOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useWebsite();

  // Open settings menu by default if we are on the settings page
  useState(() => {
    if (location.pathname === '/admin/settings') {
      setSettingsOpen(true);
    }
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden print:overflow-visible print:block print:h-auto">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-300 w-[280px] print:hidden",
          "transition-transform duration-300 ease-in-out md:transform-none md:translate-x-0 md:relative",
          !sidebarOpen && "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800 bg-slate-950">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity whitespace-nowrap overflow-hidden text-left">
             {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.schoolName} className="h-10 object-contain shrink-0" />
             ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
             )}
            <span className="text-xl font-bold text-white tracking-tight truncate">{settings.schoolName}</span>
          </button>
          <button className="md:hidden shrink-0" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
          {navItems.filter(item => {
            if (user.role === 'Super Admin' || user.role === 'Admin') return true;
            if (user.role === 'Teacher') {
              return ['Dashboard', 'Students', 'Attendance', 'Results', 'Face Scan', 'Sessions', 'Courses'].includes(item.label);
            }
            if (user.role === 'Student' || user.role === 'Parent') {
              return ['Results', 'Courses'].includes(item.label);
            }
            return false;
          }).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-semibold transition-all duration-200",
                  isActive 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
                onClick={() => {
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                {item.label}
              </NavLink>
            );
          })}
          
          { (user.role === 'Super Admin' || user.role === 'Admin') && (
             <div className="flex flex-col gap-2 mt-2">
               <NavLink
                 key="/admin/roles"
                 to="/admin/roles"
                 className={cn(
                   "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all duration-200",
                   location.pathname.includes('/admin/roles')
                     ? "bg-emerald-600 text-white shadow-sm" 
                     : "text-emerald-400 hover:bg-slate-800 hover:text-emerald-300"
                 )}
                 onClick={() => {
                   if (window.innerWidth < 768) setSidebarOpen(false);
                 }}
               >
                 <Users className={cn("w-5 h-5", location.pathname.includes('/admin/roles') ? "text-white" : "text-emerald-400")} />
                 Roles & Permissions
               </NavLink>
               <NavLink
                 key="/admin/users"
                 to="/admin/users"
                 className={cn(
                   "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium transition-all duration-200",
                   location.pathname.includes('/admin/users')
                     ? "bg-emerald-600 text-white shadow-sm" 
                     : "text-emerald-400 hover:bg-slate-800 hover:text-emerald-300"
                 )}
                 onClick={() => {
                   if (window.innerWidth < 768) setSidebarOpen(false);
                 }}
               >
                 <ShieldCheck className={cn("w-5 h-5", location.pathname.includes('/admin/users') ? "text-white" : "text-emerald-400")} />
                 User Credentials
               </NavLink>
             </div>
          )}
          
          { (user.role === 'Super Admin' || user.role === 'Admin') && (
            <div className="mt-4 border-t border-white/10 pt-4">
               <div className="space-y-1">
                 <button
                   className={cn(
                     "flex items-center justify-between w-full px-4 py-3.5 rounded-2xl font-medium transition-all duration-200",
                     location.pathname === '/admin/settings'
                       ? "bg-orange-600 text-white shadow-sm" 
                       : "text-slate-300 hover:bg-slate-800 hover:text-white"
                   )}
                   onClick={() => {
                     setSettingsOpen(!settingsOpen);
                     if (!settingsOpen && location.pathname !== '/admin/settings') {
                        navigate('/admin/settings');
                     }
                   }}
                 >
                   <div className="flex items-center gap-4">
                     <Settings className={cn("w-5 h-5")} />
                     Website Settings
                   </div>
                   {settingsOpen ? <ChevronUp className="w-5 h-5 opacity-70" /> : <ChevronDown className="w-5 h-5 opacity-70" />}
                 </button>
                 
                 <AnimatePresence>
                   {settingsOpen && (
                     <motion.div
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: "auto", opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="overflow-hidden"
                     >
                       <div className="pl-12 pr-2 py-2 space-y-1">
                         {[
                           { label: 'Branding & ID Card', id: 'branding' },
                           { label: 'Landing Page', id: 'landing' },
                           { label: 'Principal Message', id: 'principal' },
                           { label: 'Login Page', id: 'login' },
                           { label: 'Contact Info', id: 'contact' },
                           { label: 'Gallery Images', id: 'gallery' },
                         ].map(cat => {
                           const isCatActive = location.pathname === '/admin/settings' && location.search.includes(`category=${cat.id}`);
                           const isFallback = cat.id === 'branding' && location.pathname === '/admin/settings' && !location.search;
                           const active = isCatActive || isFallback;
                           
                           return (
                             <NavLink
                               key={cat.id}
                               to={`/admin/settings?category=${cat.id}`}
                               className={cn(
                                 "block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                 active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                               )}
                               onClick={() => {
                                 if (window.innerWidth < 768) setSidebarOpen(false);
                               }}
                             >
                               {cat.label}
                             </NavLink>
                           )
                         })}
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex flex-col gap-2">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-all w-full md:hidden"
          >
            <Home className="w-5 h-5 text-slate-400" />
            Back to Website
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-all w-full"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
            Logout
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 print:block print:h-auto print:overflow-visible">
        {/* Topbar */}
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100/80 border border-slate-200/60 rounded-2xl w-80 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <Search className="w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search students, teachers..." 
                className="bg-transparent border-none focus:outline-none w-full text-sm placeholder:text-slate-400 text-slate-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {/* Firebase Live Cloud Connection Control */}
            <div className="relative">
              <button 
                onClick={() => setSyncDropdownOpen(!syncDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 md:px-4 md:py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-xs md:text-sm font-bold transition-all shrink-0 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">Firebase Connected</span>
                <span className="sm:hidden">Ready</span>
              </button>

              <AnimatePresence>
                {syncDropdownOpen && (
                  <>
                    {/* Popover overlay backdrop to close */}
                    <div className="fixed inset-0 z-40" onClick={() => setSyncDropdownOpen(false)} />
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-xl border border-slate-100 p-5 z-50 flex flex-col gap-4 text-slate-800"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-blue-600" />
                          <h4 className="font-bold text-sm text-slate-900">Firebase Cloud Hub</h4>
                        </div>
                        {auth.currentUser ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold block">
                            Secure Cloud
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 font-bold block">
                            Local Session
                          </span>
                        )}
                      </div>

                      {/* DB Live breakdown stats */}
                      <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Firestore Active Documents</span>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Students:</span>
                            <span className="font-bold text-slate-800">{dbStats.students}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Teachers:</span>
                            <span className="font-bold text-slate-800">{dbStats.teachers}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Admissions:</span>
                            <span className="font-bold text-slate-800">{dbStats.onlineAdmissions}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Results:</span>
                            <span className="font-bold text-slate-800">{dbStats.results}</span>
                          </div>
                          <div className="flex items-center justify-between col-span-2">
                            <span className="text-slate-500">Sessions & Courses:</span>
                            <span className="font-bold text-slate-800">{dbStats.sessions} S, {dbStats.courses} C</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Attendance:</span>
                            <span className="font-bold text-slate-800">{dbStats.attendance || 0} Recs</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Fee Receipts:</span>
                            <span className="font-bold text-slate-800">{dbStats.fees || 0} Txns</span>
                          </div>
                          <div className="flex items-center justify-between col-span-2">
                            <span className="text-slate-500">Calendar Events:</span>
                            <span className="font-bold text-slate-800">{dbStats.events || 0} Scheduled</span>
                          </div>
                        </div>
                      </div>

                      {/* Check if user is in bypass login mode and show warning */}
                      {!auth.currentUser && (
                        <div className="p-2.5 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-left text-[11px] leading-relaxed">
                          <p className="font-bold mb-1">⚠️ Local Dev Session (Bypass Auth)</p>
                          <p className="opacity-90">Cloud writes are rejected because you are not authenticated with real Firebase Auth. Please enable "Email/Password" in your Firebase console and authenticate as `visitfaridul@gmail.com` to push securely.</p>
                        </div>
                      )}

                      {actionSuccessMessage && (
                        <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-center text-xs font-bold leading-snug">
                          {actionSuccessMessage}
                        </div>
                      )}

                      {actionErrorMessage && (
                        <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-left text-xs font-medium leading-relaxed max-h-36 overflow-y-auto">
                          <p className="font-bold mb-1">❌ Sync Failure Detail:</p>
                          <p>{actionErrorMessage}</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2.5">
                        <button
                          disabled={isSyncing}
                          onClick={async () => {
                            setActionSuccessMessage(null);
                            setActionErrorMessage(null);
                            try {
                              await syncAllToFirebase();
                              setActionSuccessMessage("✓ All records pushed inside Firebase Firestore successfully!");
                              setTimeout(() => setActionSuccessMessage(null), 5000);
                            } catch (e: any) {
                              const errStr = e.message || String(e);
                              if (errStr.includes("permission-denied") || errStr.includes("Missing or insufficient permissions")) {
                                setActionErrorMessage("Missing or insufficient privileges. To solve, please confirm you are authenticated with Firebase instead of a local direct-bypass session.");
                              } else {
                                setActionErrorMessage(errStr);
                              }
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CloudUpload className="w-4 h-4" />
                          {isSyncing ? "Syncing..." : "Push Data"}
                        </button>

                        <button
                          disabled={isSyncing}
                          onClick={async () => {
                            if (confirm("WARNING: This will completely overwrite all remote documents in Firebase with original mock student templates. Are you sure you want to perform a full database reset?")) {
                              setActionSuccessMessage(null);
                              setActionErrorMessage(null);
                              try {
                                await resetFirestoreToMock();
                                setActionSuccessMessage("✓ Database schema has been reset to mockup templates!");
                                setTimeout(() => setActionSuccessMessage(null), 5000);
                              } catch (e: any) {
                                const errStr = e.message || String(e);
                                if (errStr.includes("permission-denied") || errStr.includes("Missing or insufficient permissions")) {
                                  setActionErrorMessage("Missing or insufficient privileges on remote Firestore reset. Confirm you are signed in using real Firebase authentication.");
                                } else {
                                  setActionErrorMessage(errStr);
                                }
                              }
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200/60 disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Restore Clean Mock Data
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                        Active live synchronization with fallback sandbox mode. All features are fully functional.
                      </p>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button className="relative p-2 text-slate-500 bg-white shadow-sm border border-slate-100 md:bg-transparent md:shadow-none md:border-transparent hover:bg-slate-100 rounded-full transition-colors">
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              <span className="absolute top-1 right-1 md:top-1.5 md:right-1.5 w-2 md:w-2.5 h-2 md:h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-2 pl-3 md:pl-6 border-l border-slate-200">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-700">{user.name}</p>
                <p className="text-xs text-slate-500">{user.role}</p>
              </div>
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-0.5 shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={handleLogout}>
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Admin" className="w-7 h-7 md:w-9 md:h-9 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 print:p-0 relative print:overflow-visible print:block print:h-auto pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
