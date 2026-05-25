import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

// Common Types
export interface Student {
  id: string;
  name: string;
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
}

const mockStudents: Student[] = [
  { id: 'ADM2023001', name: 'AARAV SHARMA', class: 'Class 10', section: 'A', roll: '101', parentName: 'RAJESH SHARMA', phone: '+1 (555) 123-4567', status: 'Active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav' },
  { id: 'ADM2023002', name: 'SOPHIA CHEN', class: 'Class 10', section: 'A', roll: '102', parentName: 'DAVID CHEN', phone: '+1 (555) 987-6543', status: 'Active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia' }
];

const mockTeachers: Teacher[] = [
  { id: 'T001', name: 'DR. SARAH JENKINS', subject: 'Mathematics', qualification: 'Ph.D. in Math', phone: '+1 (555) 123-0001', email: 'sarah.j@school.com', status: 'Present', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: 'T002', name: 'MICHAEL CHANG', subject: 'Physics', qualification: 'M.Sc. Physics', phone: '+1 (555) 123-0002', email: 'm.chang@school.com', status: 'Present', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael' }
];

const mockAdmissions: OnlineAdmissionForm[] = [
  {
    id: 'REQ-001',
    submitDate: new Date().toISOString(),
    name: 'JOHN DOE',
    class: 'Class 5',
    dob: '2013-05-12',
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

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdminUser = user && (user.role === 'Super Admin' || user.role === 'Admin');

  const [students, setStudentsState] = useState<Student[]>(mockStudents);
  const [teachers, setTeachersState] = useState<Teacher[]>(mockTeachers);
  const [onlineAdmissions, setOnlineAdmissionsState] = useState<OnlineAdmissionForm[]>(mockAdmissions);
  const [results, setResultsState] = useState<StudentResult[]>(mockResults);
  const [sessions, setSessionsState] = useState<AcademicSession[]>(mockSessions);
  const [courses, setCoursesState] = useState<Course[]>(mockCourses);

  // Firestore Real-time Snapshot listeners
  useEffect(() => {
    // 1. Students
    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const data: Student[] = [];
      snapshot.forEach(doc => {
        data.push(doc.data() as Student);
      });
      if (data.length > 0 || localStorage.getItem('bhogamur_school_bootstrapped') === 'true') {
        setStudentsState(data);
      }
    }, (error) => {
      console.warn("students listener background error (safe if logged out): ", error.message);
    });

    // 2. Teachers
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const data: Teacher[] = [];
      snapshot.forEach(doc => {
        data.push(doc.data() as Teacher);
      });
      if (data.length > 0 || localStorage.getItem('bhogamur_school_bootstrapped') === 'true') {
        setTeachersState(data);
      }
    }, (error) => {
      console.warn("teachers listener background error (safe if logged out): ", error.message);
    });

    // 3. Online Admissions
    const unsubAdmissions = onSnapshot(collection(db, 'onlineAdmissions'), (snapshot) => {
      const data: OnlineAdmissionForm[] = [];
      snapshot.forEach(doc => {
        data.push(doc.data() as OnlineAdmissionForm);
      });
      if (data.length > 0 || localStorage.getItem('bhogamur_school_bootstrapped') === 'true') {
        setOnlineAdmissionsState(data);
      }
    }, (error) => {
      console.warn("onlineAdmissions listener background error (safe if logged out): ", error.message);
    });

    // 4. Results
    const unsubResults = onSnapshot(collection(db, 'results'), (snapshot) => {
      const data: StudentResult[] = [];
      snapshot.forEach(doc => {
        data.push(doc.data() as StudentResult);
      });
      if (data.length > 0 || localStorage.getItem('bhogamur_school_bootstrapped') === 'true') {
        setResultsState(data);
      }
    }, (error) => {
      console.warn("results listener background error: ", error.message);
    });

    // 5. Academic Sessions
    const unsubSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      const data: AcademicSession[] = [];
      snapshot.forEach(doc => {
        data.push(doc.data() as AcademicSession);
      });
      if (data.length > 0 || localStorage.getItem('bhogamur_school_bootstrapped') === 'true') {
        setSessionsState(data);
      }
    }, (error) => {
      console.warn("sessions listener background error: ", error.message);
    });

    // 6. Courses
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const data: Course[] = [];
      snapshot.forEach(doc => {
        data.push(doc.data() as Course);
      });
      if (data.length > 0 || localStorage.getItem('bhogamur_school_bootstrapped') === 'true') {
        setCoursesState(data);
      }
    }, (error) => {
      console.warn("courses listener background error: ", error.message);
    });

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubAdmissions();
      unsubResults();
      unsubSessions();
      unsubCourses();
    };
  }, []);

  // Admin-triggered one-time bootstrapping of Firestore with initial mock template datasets
  useEffect(() => {
    if (!isAdminUser) return;

    const runBootstrap = async () => {
      const isBootstrapped = localStorage.getItem('bhogamur_school_bootstrapped');
      if (isBootstrapped === 'true') return;

      try {
        console.log("Checking if collections are populated to bootstrap defaults...");
        
        const checkEmptyAndBootstrap = async (colPath: string, mockData: any[]) => {
          const snap = await getDocs(collection(db, colPath));
          if (snap.empty) {
            console.log(`Bootstrapping mock items for collection: ${colPath}`);
            for (const item of mockData) {
              await setDoc(doc(db, colPath, item.id), item);
            }
          }
        };

        await checkEmptyAndBootstrap('students', mockStudents);
        await checkEmptyAndBootstrap('teachers', mockTeachers);
        await checkEmptyAndBootstrap('onlineAdmissions', mockAdmissions);
        await checkEmptyAndBootstrap('results', mockResults);
        await checkEmptyAndBootstrap('sessions', mockSessions);
        await checkEmptyAndBootstrap('courses', mockCourses);

        localStorage.setItem('bhogamur_school_bootstrapped', 'true');
        console.log("Firestore successfully bootstrapped with default presets!");
      } catch (err) {
        console.error("Error when bootstrapping default records: ", err);
      }
    };

    runBootstrap();
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

  return (
    <SchoolContext.Provider value={{
      students, setStudents,
      teachers, setTeachers,
      onlineAdmissions, setOnlineAdmissions,
      results, setResults,
      sessions, setSessions,
      courses, setCourses
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
