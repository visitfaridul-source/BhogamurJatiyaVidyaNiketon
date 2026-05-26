import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ShieldCheck, Users, GraduationCap, ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebsite } from '@/context/WebsiteContext';
import { useAuth, UserRole } from '@/context/AuthContext';
import { auth, db, handleFirestoreError, OperationType } from '@/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';

type Role = 'Super Admin' | 'Admin' | 'Teacher' | 'Student' | 'Parent' | null;

export default function LoginPage() {
  const navigate = useNavigate();
  const { settings } = useWebsite();
  const { user, loginAsSuperAdminDirectly } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [fullName, setFullName] = useState('');

  // If already logged in, redirect
  React.useEffect(() => {
    if (user && (user.role === 'Admin' || user.role === 'Super Admin')) {
      navigate('/admin/dashboard');
    } else if (user) {
      if (user.role === 'Student' || user.role === 'Parent') {
        navigate('/admin/results');
      } else {
        navigate('/admin/dashboard');
      }
    }
  }, [user, navigate]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setErrorMessage('');
    setSuccessMessage('');
    setIsFirstTime(false);
    setFullName('');
  };

  const handleForgotPassword = async () => {
    if (!username) {
      setErrorMessage('Please enter your email address in the field below first, then click "Forgot password?".');
      return;
    }
    setIsAnimating(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await sendPasswordResetEmail(auth, username);
      setSuccessMessage(`Password reset link has been sent to ${username}! Please check your Inbox and Spam folder.`);
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setErrorMessage(err.message || 'Failed to send password reset email. Please make sure the email is correct.');
    } finally {
      setIsAnimating(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole || !username || !password) return;
    if (isFirstTime && !fullName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    
    setIsAnimating(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (isFirstTime) {
      // Registration Flow
      const regEmail = username.trim().toLowerCase();
      const allowedAdminEmails = ['visitfaridul@gmail.com', 'bjvnhs@gmail.com'];

      if (!allowedAdminEmails.includes(regEmail)) {
        setErrorMessage('Security Restriction: Self-registration for Super Admin is strictly pre-authorized. Only designated school master emails (such as visitfaridul@gmail.com or bjvnhs@gmail.com) are allowed to initialize a primary Super Admin account directly. For other accounts, please request an administrator to create one for you.');
        setIsAnimating(false);
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, username.trim(), password);
        const firebaseUser = userCredential.user;
        
        // Write details to users collection in Firestore
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            name: fullName,
            email: regEmail,
            role: 'Super Admin',
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }

        setSuccessMessage('Super Admin account created successfully! Redirecting...');
      } catch (error: any) {
        console.error("Registration error:", error);
        const errStr = (error?.code || error?.message || String(error)).toLowerCase();
        
        if (errStr.includes('email-already-in-use') || errStr.includes('already-in-use')) {
          setErrorMessage('This email is already in use. Please sign in instead.');
        } else if (errStr.includes('weak-password') || errStr.includes('weak')) {
          setErrorMessage('The password is too weak. Please use at least 6 characters.');
        } else if (errStr.includes('invalid-email') || errStr.includes('invalid')) {
          setErrorMessage('Please enter a valid email address.');
        } else if (errStr.includes('operation-not-allowed')) {
          setErrorMessage('Developer Error: Email/Password authentication is not enabled in Firebase Console.');
        } else {
          setErrorMessage(error.message || 'Registration failed. Please try again.');
        }
        setIsAnimating(false);
      }
      return;
    }

    // Direct Login Bypass for Mubarak Hussain & Bjvn@1968
    const isMubarakDirect = (username.trim().toLowerCase() === 'mubarak hussain' || username.trim().toLowerCase() === 'visitfaridul@gmail.com') && password === 'Bjvn@1968';

    if (isMubarakDirect) {
      try {
        // Authenticate with real Firebase Auth so they have actual write permissions on Firestore (required for Vercel/production)
        await signInWithEmailAndPassword(auth, 'visitfaridul@gmail.com', 'Bjvn@1968');
        // Clear any direct bypass session to ensure the real Firebase Auth is active
        localStorage.removeItem('direct_super_admin_session');
      } catch (authError: any) {
        console.warn("Direct Firebase sign-in failed, attempting to auto-register Mubarak Hussain Super Admin:", authError);
        const errCode = authError?.code;
        if (errCode === 'auth/user-not-found' || errCode === 'auth/invalid-credential' || String(authError).includes('invalid-credential') || String(authError).includes('user-not-found')) {
          try {
            // Auto-register the Super Admin account dynamically to grant proper Firebase permissions
            const userCred = await createUserWithEmailAndPassword(auth, 'visitfaridul@gmail.com', 'Bjvn@1968');
            const firebaseUser = userCred.user;
            
            // Create user document in Firestore on the spot
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              name: 'Mubarak Hussain',
              email: 'visitfaridul@gmail.com',
              role: 'Super Admin',
              createdAt: new Date().toISOString()
            });
            localStorage.removeItem('direct_super_admin_session');
          } catch (regError) {
            console.error("Auto-registration of direct bypass also failed, falling back to client-only bypass:", regError);
            // Fallback to client-only bypass as a safe safety recovery measure
            loginAsSuperAdminDirectly('Mubarak Hussain', 'visitfaridul@gmail.com');
          }
        } else {
          // General fallback
          loginAsSuperAdminDirectly('Mubarak Hussain', 'visitfaridul@gmail.com');
        }
      } finally {
        setIsAnimating(false);
      }
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, username, password);
      // Wait for auth context to update and redirect via useEffect above
    } catch (error: any) {
      const errStr = (error?.code || error?.message || String(error)).toLowerCase();
      
      if (errStr.includes('user-not-found') || errStr.includes('invalid-credential') || errStr.includes('wrong-password')) {
        setErrorMessage('Invalid username or password. If this is your first time logging in, please select the "Super Admin" card and then use the link "First time? Create initial Super Admin account" below.');
      } else if (errStr.includes('operation-not-allowed')) {
        setErrorMessage('Developer Error: Email/Password authentication is not enabled in Firebase Console.');
      } else {
        setErrorMessage('Login failed. Please check your credentials.');
      }
      setIsAnimating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[100px]" />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-white rounded-[2rem] shadow-2xl overflow-hidden relative z-10 border border-white/50">
        
        {/* Left Side - Brand/Image */}
        <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-12 text-white relative overflow-hidden">
          {/* Abstract graphic */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 right-10 w-64 h-64 bg-emerald-500 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-80 h-80 bg-blue-500 rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10 w-full max-w-lg mb-8 lg:mb-0">
             <button 
               onClick={() => navigate('/')} 
               className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium mb-12"
             >
               <Home className="w-4 h-4" /> Back to Home
             </button>
             <div className="flex items-center gap-3 mb-8">
               {settings.loginSidebarLogoUrl ? (
                 <img src={settings.loginSidebarLogoUrl} alt={settings.schoolName} className="h-16 object-contain" />
               ) : (
                 <>
                   {settings.logoUrl ? (
                     <img src={settings.logoUrl} alt={settings.schoolName} className="w-10 h-10 object-contain" />
                   ) : (
                     <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                       <BookOpen className="w-6 h-6" />
                     </div>
                   )}
                   <span className="text-2xl font-bold tracking-tight">{settings.schoolName || 'Bhogamur Jatiya Vidya Niketon'}</span>
                 </>
               )}
             </div>
             
             {/* Futuristic School ERP Dashboard Image Frame */}
             <div className="relative group w-full perspective-1000">
               <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-500"></div>
               <div className="relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-indigo-500/20 bg-slate-900/80 backdrop-blur-md transform transition-transform duration-500 hover:scale-[1.02]">
                 <div className="absolute top-0 left-0 right-0 h-10 bg-black/40 backdrop-blur border-b border-white/10 flex items-center px-4 gap-2 z-10">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                    </div>
                    <div className="mx-auto flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                       <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">Bhogamur Jatiya Vidya Niketon OS Live</span>
                    </div>
                 </div>
                 
                 <div className="pt-10 relative">
                   <img 
                     src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200" 
                     alt="School ERP Dashboard Overview" 
                     className="w-full h-auto object-cover opacity-80 mix-blend-screen hover:opacity-100 transition-opacity duration-500"
                     style={{ maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)", WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)" }}
                   />
                   
                   {/* Overlay Elements for Futuristic Feel */}
                   <div className="absolute top-16 left-6 right-6 bottom-16 border border-indigo-500/20 rounded-xl pointer-events-none"></div>
                   <div className="absolute top-20 left-10 p-3 bg-indigo-900/50 backdrop-blur border border-indigo-500/30 rounded-lg text-xs font-mono text-indigo-200 pointer-events-none">
                     [SYSCFG] Opt: ACTIVE
                   </div>
                 </div>
               </div>
             </div>
          </div>

          <div className="relative z-10">
             <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-slate-800">
                    <img src={settings.loginSidebarQuoteAvatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Principal"} alt={settings.loginSidebarQuoteAuthor} className="w-full h-full object-cover rounded-full" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-white">{settings.loginSidebarQuoteAuthor}</p>
                   <p className="text-xs text-slate-400">{settings.loginSidebarQuoteRole}</p>
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="p-8 lg:p-12 xl:p-16 flex flex-col justify-center relative">
          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div
                key="role-selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-md mx-auto relative"
              >
                <div className="flex justify-start lg:hidden mb-8">
                  <button 
                    onClick={() => navigate('/')} 
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
                  >
                    <Home className="w-4 h-4" /> Back to Home
                  </button>
                </div>
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold text-slate-900 mb-3">{settings.loginBoxTitle || 'Welcome Back'}</h2>
                  <p className="text-slate-500">{settings.loginBoxSubtitle || 'Please select your role to continue securely.'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <RoleCard role="Super Admin" icon={ShieldCheck} onClick={() => handleRoleSelect('Super Admin')} color="text-amber-600 bg-amber-50 border-amber-100 ring-amber-500" />
                  <RoleCard role="Admin" icon={ShieldCheck} onClick={() => handleRoleSelect('Admin')} color="text-rose-600 bg-rose-50 border-rose-100 ring-rose-500" />
                  <RoleCard role="Teacher" icon={Users} onClick={() => handleRoleSelect('Teacher')} color="text-blue-600 bg-blue-50 border-blue-100 ring-blue-500" />
                  <RoleCard role="Student" icon={GraduationCap} onClick={() => handleRoleSelect('Student')} color="text-emerald-600 bg-emerald-50 border-emerald-100 ring-emerald-500" />
                  <RoleCard role="Parent" icon={Users} onClick={() => handleRoleSelect('Parent')} color="text-purple-600 bg-purple-50 border-purple-100 ring-purple-500" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-md mx-auto"
              >
                <button 
                  onClick={() => setSelectedRole(null)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition-colors font-medium text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Role
                </button>

                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    {isFirstTime ? 'Create Super Admin' : `${selectedRole} Login`}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {isFirstTime 
                      ? 'Enter details to initialize your primary Super Admin account.' 
                      : 'Enter your credentials to access your account.'}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6">
                  {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium text-center">
                      {errorMessage}
                    </div>
                  )}
                  {successMessage && (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 font-bold text-center">
                        {successMessage}
                      </div>
                      <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-left space-y-2 text-[13px] text-amber-900 leading-relaxed shadow-sm">
                        <strong className="block text-sm text-amber-950 font-bold">⚠️ Link Expired Issue / लिंक एक्सपायर्ड प्रॉब्लम?</strong>
                        <ul className="list-decimal pl-4 space-y-1.5 font-medium text-amber-800">
                          <li>
                            <strong className="text-amber-950">Newest Email open karein:</strong> Agar aapne multiple times password reset request kiya hai, toh purane saare links automatic expire ho jaate hain. Apne inbox mein aane wala <strong>sabse aakhri (latest) email</strong> hi open karein.
                          </li>
                          <li>
                            <strong className="text-amber-950">Inbox clean karke dubara try karein:</strong> Apne inbox se pehle saare purane password reset mail delete kar dein. 1 minute wait karein, naya request send karein, aur turant naye link par click karein.
                          </li>
                          <li>
                            <strong className="text-amber-950">Private / Incognito tab ka use karein:</strong> Email link ko click karne ke bajae link ko copy karein aur use browser ke <strong>Incognito (Private) Window</strong> mein paste karke open karein.
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {isFirstTime && (
                    <div className="space-y-1 text-left">
                      <label className="text-sm font-semibold text-slate-700">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Mubarak Hussain" 
                        value={fullName}
                        required
                        onChange={(e) => { setFullName(e.target.value); setErrorMessage(''); setSuccessMessage(''); }}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50/50 text-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-1 text-left">
                    <label className="text-sm font-semibold text-slate-700">
                      {isFirstTime ? 'Email Address' : 'Email address or Username'}
                    </label>
                    <input 
                      type={isFirstTime ? 'email' : 'text'} 
                      placeholder={isFirstTime ? 'e.g. visitfaridul@gmail.com' : 'e.g. admin@school.com or username'} 
                      value={username}
                      required
                      onChange={(e) => { setUsername(e.target.value); setErrorMessage(''); setSuccessMessage(''); }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50/50 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-slate-700">Password</label>
                      {!isFirstTime && (
                        <button 
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 focus:outline-none"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      required
                      onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); setSuccessMessage(''); }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50/50 text-sm"
                    />
                  </div>

                  {!isFirstTime && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="remember" className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                      <label htmlFor="remember" className="text-sm text-slate-600">Remember me</label>
                    </div>
                  )}

                  <button 
                    disabled={isAnimating}
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 mt-4 shadow-lg hover:shadow-blue-500/30 group cursor-pointer"
                  >
                    {isAnimating ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1.5 w-full justify-center">
                        {isFirstTime ? 'Create Admin Account & Log In' : 'Sign In'}
                        <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                      </span>
                    )}
                  </button>

                  {selectedRole === 'Super Admin' && (
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsFirstTime(!isFirstTime);
                          setErrorMessage('');
                          setSuccessMessage('');
                          setUsername('');
                          setPassword('');
                          setFullName('');
                        }}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline focus:outline-none decoration-2 underline-offset-4 decoration-blue-100 transition-all"
                      >
                        {isFirstTime 
                          ? 'Already have an account? Sign In' 
                          : 'First time? Create initial Super Admin account'}
                      </button>
                    </div>
                  )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ role, icon: Icon, onClick, color }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 border border-slate-200 rounded-2xl hover:border-transparent hover:shadow-lg transition-all focus:outline-none focus:ring-2 bg-white group cursor-pointer h-36"
    >
      <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110", color.split(' ')[1], color.split(' ')[0])}>
        <Icon className="w-7 h-7" />
      </div>
      <span className="font-bold text-slate-800">{role}</span>
    </button>
  );
}

