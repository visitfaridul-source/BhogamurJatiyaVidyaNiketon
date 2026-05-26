import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type UserRole = 'Super Admin' | 'Admin' | 'Teacher' | 'Student' | 'Parent';

interface User {
  role: UserRole;
  name: string;
  username?: string;
  uid?: string;
}

export interface AdminCredential {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateUserRole: (uid: string, role: UserRole, name: string) => Promise<void>;
  loginAsSuperAdminDirectly: (name?: string, email?: string) => void;
  adminCredentials: AdminCredential[];
  setAdminCredentials: React.Dispatch<React.SetStateAction<AdminCredential[]>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('direct_super_admin_session');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch {
      // Ignored
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Still keeping local admin credentials config for backward compatibility
  const [adminCredentials, setAdminCredentials] = useState<AdminCredential[]>(() => {
    try {
      const saved = localStorage.getItem('school_admin_credentials');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      return [];
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('school_admin_credentials', JSON.stringify(adminCredentials));
    } catch {
      // Ignored
    }
  }, [adminCredentials]);

  useEffect(() => {
    const directSession = localStorage.getItem('direct_super_admin_session');
    if (directSession) {
      try {
        setUser(JSON.parse(directSession));
        setLoading(false);
      } catch {
        // Ignored
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If a real Firebase session is active, discard any legacy mock session to ensure writes save to the database correctly
        localStorage.removeItem('direct_super_admin_session');
      } else {
        const hasDirect = localStorage.getItem('direct_super_admin_session');
        if (hasDirect) {
          setLoading(false);
          return;
        }
      }

      if (firebaseUser) {
        // Fetch user role from Firestore
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (getErr) {
            handleFirestoreError(getErr, OperationType.GET, `users/${firebaseUser.uid}`);
            // Do not return early, fallback to a safe role so app doesn't freeze
            const email = firebaseUser.email?.toLowerCase();
            const allowedAdminEmails = ['visitfaridul@gmail.com', 'bjvnhs@gmail.com'];
            const fallbackRole: UserRole = (email && allowedAdminEmails.includes(email)) ? 'Super Admin' : 'Student';
            
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Error Loading',
              role: fallbackRole,
              username: firebaseUser.email || undefined
            });
            setLoading(false);
            return;
          }
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            let role = userData.role as UserRole || 'Student';
            
            // Auto-upgrade developer email to Super Admin just in case it was incorrectly set
            const userEmail = firebaseUser.email?.toLowerCase() || '';
            const allowedAdminEmails = ['visitfaridul@gmail.com', 'bjvnhs@gmail.com'];
            if (allowedAdminEmails.includes(userEmail) && role !== 'Super Admin') {
              role = 'Super Admin';
              try {
                await setDoc(userDocRef, { role: 'Super Admin' }, { merge: true });
              } catch (setErr) {
                handleFirestoreError(setErr, OperationType.WRITE, `users/${firebaseUser.uid}`);
              }
            }

            setUser({
              uid: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || 'User',
              role: role,
              username: firebaseUser.email || undefined
            });
          } else {
            // First time auth state listener without a user doc (e.g. they logged in before rules were fixed)
            const email = firebaseUser.email?.toLowerCase();
            const allowedAdminEmails = ['visitfaridul@gmail.com', 'bjvnhs@gmail.com'];
            const defaultRole: UserRole = (email && allowedAdminEmails.includes(email)) ? 'Super Admin' : 'Student';
            
            try {
              await setDoc(userDocRef, {
                name: firebaseUser.displayName || 'New User',
                email: firebaseUser.email,
                role: defaultRole,
                createdAt: new Date().toISOString()
              });
            } catch (setErr) {
              handleFirestoreError(setErr, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
            
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'New User',
              role: defaultRole,
              username: firebaseUser.email || undefined
            });
          }
        } catch (error) {
          // Fallback safely based on email without throwing scary errors in the console since handleFirestoreError already logs
          const email = firebaseUser.email?.toLowerCase();
          const allowedAdminEmails = ['visitfaridul@gmail.com', 'bjvnhs@gmail.com'];
          const fallbackRole: UserRole = (email && allowedAdminEmails.includes(email)) ? 'Super Admin' : 'Student';
          
          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Error Loading',
            role: fallbackRole,
            username: firebaseUser.email || undefined
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAsSuperAdminDirectly = (name = 'Mubarak Hussain', email = 'visitfaridul@gmail.com') => {
    const directUser: User = {
      uid: 'direct-super-admin-session-id',
      name: name,
      role: 'Super Admin',
      username: email
    };
    setUser(directUser);
    try {
      localStorage.setItem('direct_super_admin_session', JSON.stringify(directUser));
    } catch (e) {
      console.error(e);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('direct_super_admin_session');
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const updateUserRole = async (uid: string, role: UserRole, name: string) => {
    try {
      try {
        await setDoc(doc(db, 'users', uid), {
          role,
          name,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }
      
      if (user && user.uid === uid) {
        setUser(prev => prev ? { ...prev, role, name } : null);
      }
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, updateUserRole, loginAsSuperAdminDirectly, adminCredentials, setAdminCredentials }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
