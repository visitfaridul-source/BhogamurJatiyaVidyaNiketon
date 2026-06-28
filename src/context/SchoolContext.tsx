import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

// Common Types
export interface Student {
  id: string;
  name: string;
  gender?: string;
  class: string;
  section: string;
  roll: string;
  parentName: string;
  phone: string;
  status: string;
  avatar?: string;
  photoUrl?: string; // from forms
  dob?: string;
  admissionDate?: string;
  motherName?: string;
  address?: string;
  aadhaar?: string;
  pen?: string;
  apaar?: string;
}

export interface OnlineAdmissionForm {
  id: string; // temp ID
  submitDate: string;
  name: string;
  gender?: string;
  class: string;
  dob: string;
  parentName: string;
  motherName: string;
  phone: string;
  address: string;
  aadhaar: string;
  pen: string;
  apaar: string;
  photoUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Teacher {
  id: string;
  name: string;
  gender?: string;
  subject: string;
  qualification: string;
  phone: string;
  email: string;
  status: string;
  avatar?: string;
  fatherName?: string;
  dob?: string;
  joiningDate?: string;
  aadhaar?: string;
  pan?: string;
  address?: string;
}

export interface SubjectMark {
  subject: string;
  maxMarks: number;
  obtainedMarks: number;
}

export interface StudentResult {
  id: string;
  studentId: string;
  studentName: string;
  roll?: string;
  className: string;
  examName: string;
  subjects: SubjectMark[];
  totalMarks: number;
  percentage: number;
  grade: string;
  status: 'Pass' | 'Fail';
  remarks: string;
}

export interface AcademicSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CourseMaterial {
  id: string;
  title: string;
  type: 'PDF' | 'Video' | 'Link' | 'Document';
  url: string;
  size?: string;
  uploadDate: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  class: string;
  subject: string;
  teacherId?: string;
  thumbnailUrl?: string;
  materials: CourseMaterial[];
}

interface SchoolContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  onlineAdmissions: OnlineAdmissionForm[];
  setOnlineAdmissions: React.Dispatch<React.SetStateAction<OnlineAdmissionForm[]>>;
  results: StudentResult[];
  setResults: React.Dispatch<React.SetStateAction<StudentResult[]>>;
  sessions: AcademicSession[];
  setSessions: React.Dispatch<React.SetStateAction<AcademicSession[]>>;
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  isSyncing: boolean;
  syncStatus: 'synced' | 'pending' | 'syncing' | 'error';
  isOnline: boolean;
  syncAllToFirebase: () => Promise<void>;
  resetFirestoreToMock: () => Promise<void>;
  firestoreDbEmpty: boolean;
  dbStats: {
    students: number;
    teachers: number;
    onlineAdmissions: number;
    results: number;
    sessions: number;
    courses: number;
    attendance: number;
    fees: number;
    events: number;
  };
  attendanceMap: Record<string, { status: 'Present' | 'Absent' | 'Late'; remarks: string; inTime?: string; outTime?: string; earlyOutReason?: string }>;
  saveAttendanceRecord: (memberId: string, date: string, fields: { status?: 'Present' | 'Absent' | 'Late'; remarks?: string; inTime?: string; outTime?: string; earlyOutReason?: string }) => Promise<void>;
  deleteAttendanceRecord: (memberId: string, date: string) => Promise<void>;
  feesTransactions: any[];
  saveFeeTransaction: (tx: any) => Promise<void>;
  deleteFeeTransaction: (id: string) => Promise<void>;
  schoolEvents: any[];
  saveSchoolEvent: (event: any) => Promise<void>;
  deleteSchoolEvent: (id: string) => Promise<void>;
}

const mockStudents: Student[] = [
  { id: 'ADM2023001', name: 'AARAV SHARMA', gender: 'Male', class: 'Class 10', section: 'A', roll: '101', parentName: 'RAJESH SHARMA', phone: '+1 (555) 123-4567', dob: '15/08/2008', admissionDate: '24/04/2023', status: 'Active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav' },
  { id: 'ADM2023002', name: 'SOPHIA CHEN', gender: 'Female', class: 'Class 10', section: 'A', roll: '102', parentName: 'DAVID CHEN', phone: '+1 (555) 987-6543', dob: '12/10/2008', admissionDate: '25/04/2023', status: 'Active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia' }
];

const mockTeachers: Teacher[] = [
  { id: 'T001', name: 'DR. SARAH JENKINS', gender: 'Female', subject: 'Mathematics', qualification: 'Ph.D. in Math', phone: '+1 (555) 123-0001', email: 'sarah.j@school.com', dob: '12/03/1985', joiningDate: '01/06/2018', status: 'Present', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: 'T002', name: 'MICHAEL CHANG', gender: 'Male', subject: 'Physics', qualification: 'M.Sc. Physics', phone: '+1 (555) 123-0002', email: 'm.chang@school.com', dob: '22/07/1988', joiningDate: '15/07/2020', status: 'Present', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael' }
];

const mockAdmissions: OnlineAdmissionForm[] = [
  {
    id: 'REQ-001',
    submitDate: '30/05/2026',
    name: 'JOHN DOE',
    gender: 'Male',
    class: 'Class 5',
    dob: '12/05/2013',
    parentName: 'RICHARD DOE',
    motherName: 'JANE DOE',
    phone: '9876543210',
    address: '123 Main St, Springfield',
    aadhaar: '123412341234',
    pen: '',
    apaar: '',
    status: 'Pending'
  }
];

const mockResults: StudentResult[] = [
  {
    id: 'RES-001',
    studentId: 'ADM2023001',
    studentName: 'AARAV SHARMA',
    className: 'Class 10 - A',
    examName: 'Final Examination 2023-2024',
    subjects: [
      { subject: 'Mathematics', maxMarks: 100, obtainedMarks: 95 },
      { subject: 'Science', maxMarks: 100, obtainedMarks: 88 },
      { subject: 'English', maxMarks: 100, obtainedMarks: 92 },
      { subject: 'Hindi', maxMarks: 100, obtainedMarks: 85 },
      { subject: 'Social Studies', maxMarks: 100, obtainedMarks: 90 },
    ],
    totalMarks: 450,
    percentage: 90,
    grade: 'A+',
    status: 'Pass',
    remarks: 'Excellent performance. Keep it up!'
  }
];

const mockSessions: AcademicSession[] = [
  { id: '1', name: '2023-2024', startDate: '2023-04-01', endDate: '2024-03-31', isActive: false },
  { id: '2', name: '2024-2025', startDate: '2024-04-01', endDate: '2025-03-31', isActive: true },
];

const mockCourses: Course[] = [
  {
    id: 'C001',
    title: 'Advanced Mathematics',
    description: 'Comprehensive guide to high school mathematics.',
    class: 'Class 10',
    subject: 'Mathematics',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600',
    materials: [
      { id: 'M001', title: 'Chapter 1: Algebra.pdf', type: 'PDF', url: '#', size: '2.5 MB', uploadDate: '2023-10-01' },
      { id: 'M002', title: 'Trigonometry Basics', type: 'Video', url: '#', size: '45 MB', uploadDate: '2023-10-05' }
    ],
  },
  {
    id: 'C002',
    title: 'Physics Mechanics',
    description: 'In-depth study of classical mechanics and kinematics.',
    class: 'Class 10',
    subject: 'Physics',
    thumbnailUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&q=80&w=600',
    materials: [
      { id: 'M003', title: 'Newton Laws Notes.docx', type: 'Document', url: '#', size: '1.2 MB', uploadDate: '2023-10-05' },
    ],
  }
];

const mockEvents = [
  { id: '1', title: 'Summer Vacation Begins', date: '2026-06-01', type: 'Holiday' },
  { id: '2', title: 'First Periodic Assessment', date: '2026-07-15', type: 'Academic' },
  { id: '3', title: 'Annual Sports Meet 2026', date: '2026-11-20', type: 'Co-Curricular' }
];

const mockFees = [
  { id: 'INV-2023-F01', studentId: 'ADM2023001', studentName: 'AARAV SHARMA', class: 'Class 10', type: 'Term Fee Collection', date: new Date().toISOString(), amount: 7500, method: 'UPI', status: 'Paid', mode: 'UPI' },
  { id: 'INV-2023-F02', studentId: 'ADM2023002', studentName: 'SOPHIA CHEN', class: 'Class 10', type: 'Admission Processing', date: new Date().toISOString(), amount: 1500, method: 'Cash', status: 'Paid', mode: 'Cash' }
];

const mockAttendance = [
  { id: 'ADM2023001', date: new Date().toISOString().split('T')[0], status: 'Present', remarks: 'Arrived early', inTime: '08:15', outTime: '14:30', earlyOutReason: '' },
  { id: 'ADM2023002', date: new Date().toISOString().split('T')[0], status: 'Present', remarks: 'Signed in by parent', inTime: '08:20', outTime: '14:30', earlyOutReason: '' }
];

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdminUser = user && (user.role === 'Super Admin' || user.role === 'Admin');

  const [students, setStudentsState] = useState<Student[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [onlineAdmissions, setOnlineAdmissionsState] = useState<OnlineAdmissionForm[]>([]);
  const [results, setResultsState] = useState<StudentResult[]>([]);
  const [sessions, setSessionsState] = useState<AcademicSession[]>([]);
  const [courses, setCoursesState] = useState<Course[]>([]);
  
  const [attendanceMap, setAttendanceMapState] = useState<Record<string, { status: 'Present' | 'Absent' | 'Late'; remarks: string; inTime?: string; outTime?: string; earlyOutReason?: string }>>({});
  const [feesTransactions, setFeesTransactionsState] = useState<any[]>([]);
  const [schoolEvents, setSchoolEventsState] = useState<any[]>([]);

  // Track Firestore actual database statistics
  const [dbStats, setDbStats] = useState({
    students: 0,
    teachers: 0,
    onlineAdmissions: 0,
    results: 0,
    sessions: 0,
    courses: 0,
    attendance: 0,
    fees: 0,
    events: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Firestore Real-time Snapshot listeners
  useEffect(() => {
    let unsubStudents = () => {};
    let unsubTeachers = () => {};
    let unsubAdmissions = () => {};
    let unsubResults = () => {};
    let unsubSessions = () => {};
    let unsubCourses = () => {};
    let unsubAttendance = () => {};
    let unsubFees = () => {};
    let unsubEvents = () => {};

    // 1. Students - only if logged in
    if (user) {
      unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
        const data: Student[] = [];
        snapshot.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() } as Student);
        });
        setDbStats(prev => ({ ...prev, students: snapshot.size }));
        if (snapshot.size === 0) {
          setStudentsState([]);
        } else {
          setStudentsState(data);
        }
      }, () => {
        // Suppress background listener error in console
        setStudentsState([]);
      });
    } else {
      setStudentsState([]);
    }

    // 2. Teachers - only if logged in
    if (user) {
      unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
        const data: Teacher[] = [];
        snapshot.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() } as Teacher);
        });
        setDbStats(prev => ({ ...prev, teachers: snapshot.size }));
        if (snapshot.size === 0) {
          setTeachersState([]);
        } else {
          setTeachersState(data);
        }
      }, () => {
        // Suppress background listener error in console
        setTeachersState([]);
      });
    } else {
      setTeachersState([]);
    }

    // 3. Online Admissions - only if Admin user
    if (isAdminUser) {
      unsubAdmissions = onSnapshot(collection(db, 'onlineAdmissions'), (snapshot) => {
        const data: OnlineAdmissionForm[] = [];
        snapshot.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() } as OnlineAdmissionForm);
        });
        setDbStats(prev => ({ ...prev, onlineAdmissions: snapshot.size }));
        if (snapshot.size === 0) {
          setOnlineAdmissionsState([]);
        } else {
          setOnlineAdmissionsState(data);
        }
      }, () => {
        // Suppress background listener error in console
        setOnlineAdmissionsState([]);
      });
    } else {
      setOnlineAdmissionsState([]);
    }

    // 4. Results - only if logged in (public results page queries on-demand)
    if (user) {
      unsubResults = onSnapshot(collection(db, 'results'), (snapshot) => {
        const data: StudentResult[] = [];
        snapshot.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() } as StudentResult);
        });
        setDbStats(prev => ({ ...prev, results: snapshot.size }));
        if (snapshot.size === 0) {
          setResultsState([]);
        } else {
          setResultsState(data);
        }
      }, () => {
        // Suppress background listener error in console
        setResultsState([]);
      });
    } else {
      setResultsState([]);
    }

    // 5. Academic Sessions (Unconditional, small, needed for course listing/timetable on public pages)
    unsubSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      const data: AcademicSession[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as AcademicSession);
      });
      setDbStats(prev => ({ ...prev, sessions: snapshot.size }));
      if (snapshot.size === 0) {
        setSessionsState([]);
      } else {
        setSessionsState(data);
      }
    }, () => {
      // Suppress background listener error in console
      setSessionsState([]);
    });

    // 6. Courses (Unconditional, small, needed for public course directory)
    unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const data: Course[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Course);
      });
      setDbStats(prev => ({ ...prev, courses: snapshot.size }));
      if (snapshot.size === 0) {
        setCoursesState([]);
      } else {
        setCoursesState(data);
      }
    }, () => {
      // Suppress background listener error in console
      setCoursesState([]);
    });

    // 7. Attendance - only if logged in (sensitive, large collection)
    if (user) {
      unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
        const data: Record<string, any> = {};
        snapshot.forEach(doc => {
          const item = doc.data();
          const docId = item.id || doc.id.split('_')[1] || doc.id;
          const key = `${item.date}:${docId}`;
          data[key] = {
            status: item.status,
            remarks: item.remarks || '',
            inTime: item.inTime || '',
            outTime: item.outTime || '',
            earlyOutReason: item.earlyOutReason || ''
          };
        });
        setDbStats(prev => ({ ...prev, attendance: snapshot.size }));
        if (snapshot.size === 0) {
          setAttendanceMapState({});
        } else {
          setAttendanceMapState(data);
        }
      }, () => {
        setAttendanceMapState({});
      });
    } else {
      setAttendanceMapState({});
    }

    // 8. Fees & Transactions - only if logged in (sensitive, large collection)
    if (user) {
      unsubFees = onSnapshot(collection(db, 'fees'), (snapshot) => {
        const data: any[] = [];
        snapshot.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setDbStats(prev => ({ ...prev, fees: snapshot.size }));
        if (snapshot.size === 0) {
          setFeesTransactionsState([]);
        } else {
          setFeesTransactionsState(data);
        }
      }, () => {
        setFeesTransactionsState([]);
      });
    } else {
      setFeesTransactionsState([]);
    }

    // 9. School Events - only if logged in (only shown inside admin dashboard)
    if (user) {
      unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
        const data: any[] = [];
        snapshot.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setDbStats(prev => ({ ...prev, events: snapshot.size }));
        if (snapshot.size === 0) {
          setSchoolEventsState([]);
        } else {
          setSchoolEventsState(data);
        }
      }, () => {
        setSchoolEventsState([]);
      });
    } else {
      setSchoolEventsState([]);
    }

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubAdmissions();
      unsubResults();
      unsubSessions();
      unsubCourses();
      unsubAttendance();
      unsubFees();
      unsubEvents();
    };
  }, [user, isAdminUser]);

  // Admin-triggered one-time bootstrapping disabled to prevent mock data from automatically uploading to Firestore
  useEffect(() => {
    // Left empty intentionally to prevent static mock data from saving to Firebase.
    // Real data is saved exclusively via admin manual entries.
    localStorage.setItem('bhogamur_school_bootstrapped_v2', 'true');
    localStorage.setItem('bhogamur_school_bootstrapped', 'true');
  }, [isAdminUser]);

  // Syncing customized setState actions back to Firestore securely
  const setStudents = async (value: React.SetStateAction<Student[]>) => {
    try {
      const current = students;
      const next = typeof value === 'function' ? (value as any)(current) : value;

      // Optimistic visual update
      setStudentsState(next);

      const currentIds = new Set(current.map(s => s.id));
      const nextIds = new Set(next.map(s => s.id));

      // 1. Delete removed
      for (const s of current) {
        if (!nextIds.has(s.id)) {
          try {
            await deleteDoc(doc(db, 'students', s.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `students/${s.id}`);
          }
        }
      }

      // 2. Create / Update altered
      for (const s of next) {
        const existing = current.find(item => item.id === s.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(s)) {
          try {
            await setDoc(doc(db, 'students', s.id), s);
            
            // Automatically register face if they have an uploaded photo or avatar
            const hasPhoto = s.photoUrl || (s.avatar && !s.avatar.includes("dicebear.com"));
            if (hasPhoto) {
              await setDoc(doc(db, "registeredFaces", s.id), {
                id: s.id,
                registered: true,
                registeredAt: new Date().toISOString(),
                autoRegistered: true,
                source: "Student Photo Registration"
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `students/${s.id}`);
          }
        }
      }
    } catch (e) {
      console.error("Error updating students on Firestore: ", e);
    }
  };

  const setTeachers = async (value: React.SetStateAction<Teacher[]>) => {
    try {
      const current = teachers;
      const next = typeof value === 'function' ? (value as any)(current) : value;

      setTeachersState(next);

      const currentIds = new Set(current.map(t => t.id));
      const nextIds = new Set(next.map(t => t.id));

      for (const t of current) {
        if (!nextIds.has(t.id)) {
          try {
            await deleteDoc(doc(db, 'teachers', t.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `teachers/${t.id}`);
          }
        }
      }

      for (const t of next) {
        const existing = current.find(item => item.id === t.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(t)) {
          try {
            await setDoc(doc(db, 'teachers', t.id), t);
            
            // Automatically register face if they have an uploaded photo or avatar
            const hasPhoto = t.avatar && !t.avatar.includes("dicebear.com");
            if (hasPhoto) {
              await setDoc(doc(db, "registeredFaces", t.id), {
                id: t.id,
                registered: true,
                registeredAt: new Date().toISOString(),
                autoRegistered: true,
                source: "Teacher Photo Registration"
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `teachers/${t.id}`);
          }
        }
      }
    } catch (e) {
      console.error("Error updating teachers on Firestore: ", e);
    }
  };

  const setOnlineAdmissions = async (value: React.SetStateAction<OnlineAdmissionForm[]>) => {
    try {
      const current = onlineAdmissions;
      const next = typeof value === 'function' ? (value as any)(current) : value;

      setOnlineAdmissionsState(next);

      const currentIds = new Set(current.map(a => a.id));
      const nextIds = new Set(next.map(a => a.id));

      for (const a of current) {
        if (!nextIds.has(a.id)) {
          try {
            await deleteDoc(doc(db, 'onlineAdmissions', a.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `onlineAdmissions/${a.id}`);
          }
        }
      }

      for (const a of next) {
        const existing = current.find(item => item.id === a.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(a)) {
          try {
            await setDoc(doc(db, 'onlineAdmissions', a.id), a);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `onlineAdmissions/${a.id}`);
          }
        }
      }
    } catch (e) {
      console.error("Error updating admissions on Firestore: ", e);
    }
  };

  const setResults = async (value: React.SetStateAction<StudentResult[]>) => {
    try {
      const current = results;
      const next = typeof value === 'function' ? (value as any)(current) : value;

      setResultsState(next);

      const currentIds = new Set(current.map(r => r.id));
      const nextIds = new Set(next.map(r => r.id));

      for (const r of current) {
        if (!nextIds.has(r.id)) {
          try {
            await deleteDoc(doc(db, 'results', r.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `results/${r.id}`);
          }
        }
      }

      for (const r of next) {
        const existing = current.find(item => item.id === r.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(r)) {
          try {
            await setDoc(doc(db, 'results', r.id), r);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `results/${r.id}`);
          }
        }
      }
    } catch (e) {
      console.error("Error updating results on Firestore: ", e);
    }
  };

  const setSessions = async (value: React.SetStateAction<AcademicSession[]>) => {
    try {
      const current = sessions;
      const next = typeof value === 'function' ? (value as any)(current) : value;

      setSessionsState(next);

      const currentIds = new Set(current.map(s => s.id));
      const nextIds = new Set(next.map(s => s.id));

      for (const s of current) {
        if (!nextIds.has(s.id)) {
          try {
            await deleteDoc(doc(db, 'sessions', s.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `sessions/${s.id}`);
          }
        }
      }

      for (const s of next) {
        const existing = current.find(item => item.id === s.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(s)) {
          try {
            await setDoc(doc(db, 'sessions', s.id), s);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `sessions/${s.id}`);
          }
        }
      }
    } catch (e) {
      console.error("Error updating sessions on Firestore: ", e);
    }
  };

  const setCourses = async (value: React.SetStateAction<Course[]>) => {
    try {
      const current = courses;
      const next = typeof value === 'function' ? (value as any)(current) : value;

      setCoursesState(next);

      const currentIds = new Set(current.map(c => c.id));
      const nextIds = new Set(next.map(c => c.id));

      for (const c of current) {
        if (!nextIds.has(c.id)) {
          try {
            await deleteDoc(doc(db, 'courses', c.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `courses/${c.id}`);
          }
        }
      }

      for (const c of next) {
        const existing = current.find(item => item.id === c.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(c)) {
          try {
            await setDoc(doc(db, 'courses', c.id), c);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `courses/${c.id}`);
          }
        }
      }
    } catch (e) {
      console.error("Error updating courses on Firestore: ", e);
    }
  };

  const firestoreDbEmpty = dbStats.students === 0 && dbStats.teachers === 0;
  const syncStatus = firestoreDbEmpty ? 'pending' : 'synced';

  const syncAllToFirebase = async () => {
    setIsSyncing(true);
    try {
      console.log("Forcing manual complete sync to Firebase Firestore...");
      
      // 1. Students
      try {
        for (const s of students) {
          await setDoc(doc(db, 'students', s.id), s);
        }
      } catch (err: any) {
        throw new Error(`Failed writing block [students] (ID: ${students[0]?.id || 'N/A'}): ${err.message || err}`);
      }
      
      // 2. Teachers
      try {
        for (const t of teachers) {
          await setDoc(doc(db, 'teachers', t.id), t);
        }
      } catch (err: any) {
        throw new Error(`Failed writing block [teachers] (ID: ${teachers[0]?.id || 'N/A'}): ${err.message || err}`);
      }
      
      // 3. Online Admissions
      try {
        for (const a of onlineAdmissions) {
          await setDoc(doc(db, 'onlineAdmissions', a.id), a);
        }
      } catch (err: any) {
        throw new Error(`Failed writing block [onlineAdmissions] (ID: ${onlineAdmissions[0]?.id || 'N/A'}): ${err.message || err}`);
      }
      
      // 4. Results
      try {
        for (const r of results) {
          await setDoc(doc(db, 'results', r.id), r);
        }
      } catch (err: any) {
        throw new Error(`Failed writing block [results] (ID: ${results[0]?.id || 'N/A'}): ${err.message || err}`);
      }
      
      // 5. Sessions
      try {
        for (const s of sessions) {
          await setDoc(doc(db, 'sessions', s.id), s);
        }
      } catch (err: any) {
        throw new Error(`Failed writing block [sessions] (ID: ${sessions[0]?.id || 'N/A'}): ${err.message || err}`);
      }
      
      // 6. Courses
      try {
        for (const c of courses) {
          await setDoc(doc(db, 'courses', c.id), c);
        }
      } catch (err: any) {
        throw new Error(`Failed writing block [courses] (ID: ${courses[0]?.id || 'N/A'}): ${err.message || err}`);
      }

      setDbStats({
        students: students.length,
        teachers: teachers.length,
        onlineAdmissions: onlineAdmissions.length,
        results: results.length,
        sessions: sessions.length,
        courses: courses.length,
        attendance: 0,
        fees: 0,
        events: 0
      });
      
    } catch (e) {
      console.error("Manual direct sync to Firebase failed:", e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  const saveAttendanceRecord = async (memberId: string, date: string, fields: { status?: 'Present' | 'Absent' | 'Late'; remarks?: string; inTime?: string; outTime?: string; earlyOutReason?: string }) => {
    try {
      const docId = `${date}_${memberId}`;
      const docRef = doc(db, 'attendance', docId);

      const currentMapKey = `${date}:${memberId}`;
      const existing = attendanceMap[currentMapKey] || { status: 'Present', remarks: '', inTime: '', outTime: '', earlyOutReason: '' };

      const updatedRecord = {
        id: memberId,
        date: date,
        status: fields.status !== undefined ? fields.status : existing.status,
        remarks: fields.remarks !== undefined ? fields.remarks : existing.remarks,
        inTime: fields.inTime !== undefined ? fields.inTime : (existing.inTime || ''),
        outTime: fields.outTime !== undefined ? fields.outTime : (existing.outTime || ''),
        earlyOutReason: fields.earlyOutReason !== undefined ? fields.earlyOutReason : (existing.earlyOutReason || '')
      };

      await setDoc(docRef, updatedRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendance/${date}_${memberId}`);
    }
  };

  const deleteAttendanceRecord = async (memberId: string, date: string) => {
    try {
      const docId = `${date}_${memberId}`;
      const docRef = doc(db, 'attendance', docId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `attendance/${date}_${memberId}`);
    }
  };

  const saveFeeTransaction = async (tx: any) => {
    try {
      const docRef = doc(db, 'fees', tx.id);
      await setDoc(docRef, tx);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `fees/${tx.id}`);
    }
  };

  const deleteFeeTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'fees', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `fees/${id}`);
    }
  };

  const saveSchoolEvent = async (event: any) => {
    try {
      const docRef = doc(db, 'events', event.id);
      await setDoc(docRef, event);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `events/${event.id}`);
    }
  };

  const deleteSchoolEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
    }
  };

  const resetFirestoreToMock = async () => {
    setIsSyncing(true);
    try {
      console.log("Purging all Firestore documents and states to a completely clean database...");
      
      // Clean existing state lists in firestore first
      for (const s of students) {
        try { await deleteDoc(doc(db, 'students', s.id)); } catch {}
      }
      for (const t of teachers) {
        try { await deleteDoc(doc(db, 'teachers', t.id)); } catch {}
      }
      for (const r of results) {
        try { await deleteDoc(doc(db, 'results', r.id)); } catch {}
      }
      for (const s of sessions) {
        try { await deleteDoc(doc(db, 'sessions', s.id)); } catch {}
      }
      for (const c of courses) {
        try { await deleteDoc(doc(db, 'courses', c.id)); } catch {}
      }
      for (const a of onlineAdmissions) {
        try { await deleteDoc(doc(db, 'onlineAdmissions', a.id)); } catch {}
      }

      // Also clean existing attendance, fees, and events collections dynamically
      try {
        const feesSnap = await getDocs(collection(db, 'fees'));
        for (const d of feesSnap.docs) {
          await deleteDoc(doc(db, 'fees', d.id));
        }
      } catch {}

      try {
        const eventsSnap = await getDocs(collection(db, 'events'));
        for (const d of eventsSnap.docs) {
          await deleteDoc(doc(db, 'events', d.id));
        }
      } catch {}

      try {
        const attendanceSnap = await getDocs(collection(db, 'attendance'));
        for (const d of attendanceSnap.docs) {
          await deleteDoc(doc(db, 'attendance', d.id));
        }
      } catch {}

      // Clear local states
      setStudentsState([]);
      setTeachersState([]);
      setOnlineAdmissionsState([]);
      setResultsState([]);
      setSessionsState([]);
      setCoursesState([]);
      setAttendanceMapState({});
      setFeesTransactionsState([]);
      setSchoolEventsState([]);
      
    } catch (e) {
      console.error("Database hard reset failed:", e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SchoolContext.Provider value={{
      students, setStudents,
      teachers, setTeachers,
      onlineAdmissions, setOnlineAdmissions,
      results, setResults,
      sessions, setSessions,
      courses, setCourses,
      isSyncing,
      syncStatus,
      isOnline,
      syncAllToFirebase,
      resetFirestoreToMock,
      firestoreDbEmpty,
      dbStats,
      attendanceMap, saveAttendanceRecord, deleteAttendanceRecord,
      feesTransactions, saveFeeTransaction, deleteFeeTransaction,
      schoolEvents, saveSchoolEvent, deleteSchoolEvent
    }}>
      {children}
    </SchoolContext.Provider>
  );
}


export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
}
