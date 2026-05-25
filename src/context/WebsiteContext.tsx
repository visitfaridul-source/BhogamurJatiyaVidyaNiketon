import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export interface WebsiteStaffMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  email?: string;
  phone?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
}

export interface PromoVideo {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
}

export interface SchoolUpdate {
  id: string;
  title: string;
  date: string;
  description: string;
  imageUrl?: string;
  isImportant?: boolean;
}

export interface Topper {
  id: string;
  name: string;
  rank: string;
  percentage: string;
  stream: string;
  imageUrl?: string;
  year: string;
}

export interface TimetableSlot {
  id: string;
  classId: string;
  day: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  type: string;
}

export interface OnlineClassEvent {
  id: string;
  subject: string;
  class: string;
  teacher: string;
  time: string;
  students: number;
  meetLink: string;
}

export interface FeeStructureItem {
  id: string;
  class: string;
  admissionFee: string;
  tuitionFee: string;
  annualFee: string;
  totalAnnual: string;
}

export interface FeeStructureTier {
  id: string;
  tierName: string;
  tierSubtitle: string;
  items: FeeStructureItem[];
}

export interface WebsiteSettings {
  // Core
  schoolName: string;
  idCardSchoolName?: string;
  logoUrl: string | null;
  
  // Our Staff Setup
  staffMembers: WebsiteStaffMember[];

  // Landing Page Hero
  heroHeadline: string;
  heroSubtitle: string;
  heroGalleryImages: string[];
  heroOverlayImageUrl?: string;
  
  // Landing Page Features Section
  featuresTitle: string;
  featuresSubtitle: string;
  featuresDescription: string;
  
  // Landing Page Updates/Notifications Section
  updatesTitle: string;
  updatesSubtitle: string;
  updatesList: SchoolUpdate[];

  // Landing Page Toppers Section
  toppersTitle: string;
  toppersSubtitle: string;
  toppersList: Topper[];
  
  // Prospectus & Video
  prospectusUrl?: string;
  promoVideos: PromoVideo[];
  
  // Landing Page Gallery Section
  galleryTitle: string;
  gallerySubtitle: string;
  galleryDescription: string;
  
  // Gallery Page
  galleryPageTitle: string;
  galleryPageSubtitle: string;
  galleryPageItems: { id: string | number; src: string; category: string; title: string }[];
  
  // Staff Page
  staffPageTitle: string;
  staffPageTitleHighlight: string;
  staffPageSubtitle: string;
  
  // Result Page
  resultPageTitle: string;
  resultPageSubtitle: string;
  
  // Admission Page
  admissionPageTitle: string;
  admissionPageSubtitle: string;
  
  // Video Page
  videoPageTitle: string;
  videoPageSubtitle: string;
  
  // Contact Page
  contactPageHeadlineLeft: string;
  contactPageHeadlineRight: string;
  contactPageSubtitle: string;
  
  // Login Page texts
  loginBoxTitle: string;
  loginBoxSubtitle: string;
  
  // Contact & Social
  phone: string;
  email: string;
  address: string;
  aboutText: string;
  
  // Gallery Images
  galleryImages: string[];
  
  // Principal Area
  principalImageUrl?: string;
  principalName?: string;
  principalTitle?: string;
  principalSignatureUrl?: string;
  principalMessageTitle?: string;
  principalMessageQuote?: string;
  principalMessageBody?: string;
  
  // Login Sidebar
  watermarkUrl?: string;
  
  // Login Sidebar
  loginSidebarHeading: string;
  loginSidebarLogoUrl?: string;
  loginSidebarQuoteAuthor: string;
  loginSidebarQuoteRole: string;
  loginSidebarQuoteAvatarUrl?: string;
  
  // Custom Pages
  timetableSlots: TimetableSlot[];
  timetableClasses: string[];
  timetableDays: string[];
  
  onlineClasses: OnlineClassEvent[];
  
  feeStructures: FeeStructureTier[];
}

const defaultSettings: WebsiteSettings = {
  schoolName: "Bhogamur Jatiya Vidya Niketon",
  logoUrl: null,
  staffMembers: [
    {
      id: "staff-1",
      name: "Dr. Sarah Jenkins",
      role: "Principal",
      bio: "With over 20 years of experience in education leadership, Dr. Jenkins guides our school with vision and compassion.",
      imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800",
      email: "principal@smartschool.com"
    },
    {
      id: "staff-2",
      name: "David Chen",
      role: "Vice Principal",
      bio: "Mr. Chen oversees academic operations and ensures excellence in our daily curriculum and student development.",
      imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=800",
      email: "vprincipal@smartschool.com"
    },
    {
      id: "staff-3",
      name: "Anita Sharma",
      role: "Head of Administration",
      bio: "Mrs. Sharma ensures the smooth functioning of school operations, bridging communication between parents and staff.",
      imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=800"
    }
  ],
  heroHeadline: "ভগামুৰ জাতীয় বিদ্যা নিকেতন",
  heroSubtitle: "A premium, colorful, and fully responsive platform for administration, teachers, students, and parents. Simplify attendance, fees, exams, and more in one unified dashboard.",
  heroGalleryImages: [
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1427504494785-319ce808e063?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800"
  ],
  
  featuresTitle: "Capabilities",
  featuresSubtitle: "Everything you need to run your school",
  featuresDescription: "From admissions to alumni, we provide a unified workflow that saves hours of administrative work.",
  
  updatesTitle: "Updates & Notifications",
  updatesSubtitle: "Stay informed about the latest news and announcements",
  updatesList: [
    {
      id: "u-1",
      title: "Admission Open for 2026-2027",
      date: "May 01, 2026",
      description: "Admissions are now open for all classes. Please visit the online admission portal to apply.",
      imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop",
      isImportant: true
    },
    {
      id: "u-2",
      title: "Annual Sports Week",
      date: "April 15, 2026",
      description: "The annual sports week will commence from the 2nd week of May. Students are encouraged to register their names.",
      imageUrl: "https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=800&auto=format&fit=crop",
      isImportant: false
    },
    {
      id: "u-3",
      title: "Holiday Announcement",
      date: "April 10, 2026",
      description: "The school will remain closed on account of Bihu holidays from 13th to 16th April.",
      imageUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=800&auto=format&fit=crop",
      isImportant: true
    }
  ],
  
  toppersTitle: "Excellence",
  toppersSubtitle: "HSLC & HS Toppers",
  toppersList: [
    {
      id: "t1",
      name: "Ravi Kumar",
      rank: "State Rank 1",
      percentage: "99.2%",
      stream: "HSLC",
      year: "2025",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ravi"
    },
    {
      id: "t2",
      name: "Priya Sharma",
      rank: "State Rank 3",
      percentage: "98.5%",
      stream: "Science (HS)",
      year: "2025",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
    },
    {
      id: "t3",
      name: "Amit Das",
      rank: "State Rank 5",
      percentage: "97.8%",
      stream: "Arts (HS)",
      year: "2025",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit"
    },
    {
      id: "t4",
      name: "Sneha Roy",
      rank: "District Topper",
      percentage: "96.5%",
      stream: "HSLC",
      year: "2024",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha"
    },
    {
      id: "t5",
      name: "Rahul Verma",
      rank: "State Rank 8",
      percentage: "97.1%",
      stream: "Commerce (HS)",
      year: "2025",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"
    },
    {
      id: "t6",
      name: "Kavita Singh",
      rank: "District Rank 2",
      percentage: "95.9%",
      stream: "Science (HS)",
      year: "2024",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kavita"
    }
  ],

  prospectusUrl: "",
  promoVideos: [
    {
      id: "v-1",
      title: "Campus Tour",
      description: "Discover what makes our school the perfect place for your child's education and growth.",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    }
  ],
  
  galleryTitle: "Campus Life",
  gallerySubtitle: "A glimpse into our vibrant school",
  galleryDescription: "Explore the world-class facilities and joyful moments at our campus.",
  
  galleryPageTitle: "School Gallery",
  galleryPageSubtitle: "Explore the vibrant life, extraordinary facilities, and memorable moments captured at our campus.",
  galleryPageItems: [
    { id: 1, src: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop', category: 'Campus', title: 'Main Building Front' },
    { id: 2, src: 'https://images.unsplash.com/photo-1577896849786-738ed6c78bc3?q=80&w=800&auto=format&fit=crop', category: 'Events', title: 'Annual Science Fair' },
    { id: 3, src: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=800&auto=format&fit=crop', category: 'Academics', title: 'Computer Lab' },
    { id: 4, src: 'https://images.unsplash.com/photo-1519452328224-2ce1b16bbd90?q=80&w=800&auto=format&fit=crop', category: 'Campus', title: 'Library Study Area' },
    { id: 5, src: 'https://images.unsplash.com/photo-1587691592099-24045742c181?q=80&w=800&auto=format&fit=crop', category: 'Academics', title: 'Physics Experiment' },
    { id: 6, src: 'https://images.unsplash.com/photo-1511629091441-ee46146481b6?q=80&w=800&auto=format&fit=crop', category: 'Events', title: 'Sports Day 2023' },
    { id: 7, src: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop', category: 'Campus', title: 'Classroom Overview' },
    { id: 8, src: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop', category: 'Academics', title: 'Group Study' },
    { id: 9, src: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=800&auto=format&fit=crop', category: 'Events', title: 'Graduation Ceremony' },
  ],
  
  staffPageTitle: "Meet Our",
  staffPageTitleHighlight: "Educators",
  staffPageSubtitle: "The passionate individuals dedicated to shaping the future of our students.",
  
  resultPageTitle: "Check Student Result",
  resultPageSubtitle: "Enter credentials below to view the official marksheet.",
  
  admissionPageTitle: "Online Admission Form",
  admissionPageSubtitle: "Please fill out this form carefully. All provided information will be used for the admission process.",
  
  videoPageTitle: "Video Tours & Highlights",
  videoPageSubtitle: "Explore different aspects of our campus, facilities, and student life through these videos.",
  
  contactPageHeadlineLeft: "LET'S",
  contactPageHeadlineRight: "CONNECT.",
  contactPageSubtitle: "Whether you have a question about admissions, fee structures, or just want to say hello—we're ready to listen.",
  
  loginBoxTitle: "Welcome Back",
  loginBoxSubtitle: "Please select your role to continue securely.",

  phone: "+1 (555) 123-4567",
  email: "hello@bhogamurjatiyavidyaniketon.com",
  address: "123 Education Ave, Tech District, SF, CA 94103",
  aboutText: "য’ত সপোনৰ আৰম্ভণি হয় আৰু ভৱিষ্যত উজলি উঠে।",
  galleryImages: [],
  principalImageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800",
  principalName: "Dr. S. K. Sharma",
  principalTitle: "Principal",
  principalMessageTitle: "From the Principal's Desk",
  principalMessageQuote: "Education is not just about academic excellence, but about nurturing character, creativity, and compassion in every child.",
  principalMessageBody: "Dear Parents, Students, and Well-wishers,\n\nIt gives me immense pleasure to welcome you to our distinguished institution. We have consistently strived to create an environment that encourages curiosity, critical thinking, and innovation. We believe that every child is unique and possesses extraordinary potential waiting to be discovered.\n\nOur dedicated faculty focuses on delivering a holistic educational experience. Beyond the rigorous academic curriculum, we emphasize the importance of sports, arts, and moral values. We aim to equip our students not just with knowledge, but with the wisdom to use it for the betterment of society.\n\nAs we navigate the challenges and opportunities of the 21st century, our focus remains steadfast on preparing our youth to be responsible global citizens. We value the partnership of our parents in this deeply rewarding journey and look forward to building a brighter future together.\n\nLet us work hand in hand to help our students soar to new heights.",
  principalSignatureUrl: undefined,
  watermarkUrl: undefined,
  loginSidebarHeading: "Empowering education through technology.",
  loginSidebarLogoUrl: undefined,
  loginSidebarQuoteAuthor: "Dr. Sarah Jenkins",
  loginSidebarQuoteRole: "Principal, Oakbridge Academy",
  loginSidebarQuoteAvatarUrl: undefined,
  timetableSlots: [
    { id: '1', classId: 'Grade 10', day: 'Monday', time: '08:00 AM - 08:45 AM', subject: 'Mathematics', teacher: 'Mr. Sharma', room: 'Room 101', type: 'Theory' },
    { id: '2', classId: 'Grade 10', day: 'Monday', time: '08:50 AM - 09:35 AM', subject: 'Physics', teacher: 'Mrs. Gupta', room: 'Lab 2', type: 'Practical' },
    { id: '3', classId: 'Grade 10', day: 'Monday', time: '09:40 AM - 10:25 AM', subject: 'English Lib', teacher: 'Ms. Davis', room: 'Room 105', type: 'Theory' },
    { id: '4', classId: 'Grade 10', day: 'Monday', time: '10:25 AM - 10:45 AM', subject: 'Break', teacher: '-', room: '-', type: 'Break' },
    { id: '5', classId: 'Grade 10', day: 'Monday', time: '10:45 AM - 11:30 AM', subject: 'Chemistry', teacher: 'Dr. Singh', room: 'Lab 1', type: 'Practical' },
    { id: '6', classId: 'Grade 10', day: 'Monday', time: '11:35 AM - 12:20 PM', subject: 'Computer Science', teacher: 'Mr. Kumar', room: 'Computer Lab', type: 'Theory' },
  ],
  timetableClasses: ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'],
  timetableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  onlineClasses: [
    { id: '1', subject: 'Mathematics (Algebra)', class: 'Grade 10', teacher: 'Mr. Sharma', time: '10:00 AM - 11:30 AM', students: 45, meetLink: 'https://meet.google.com' },
    { id: '2', subject: 'Physics (Mechanics)', class: 'Grade 11', teacher: 'Mrs. Gupta', time: '11:45 AM - 01:00 PM', students: 38, meetLink: 'https://meet.google.com' },
    { id: '3', subject: 'English (Literature)', class: 'Grade 9', teacher: 'Ms. Davis', time: '02:00 PM - 03:00 PM', students: 42, meetLink: 'https://meet.google.com' },
  ],
  feeStructures: [
    {
      id: "fs-1",
      tierName: 'Primary & Middle School',
      tierSubtitle: 'Fee details for Kindergarten through Grade 8',
      items: [
        { id: "fs-1-1", class: 'Kindergarten', admissionFee: '₹15,000', tuitionFee: '₹2,500/month', annualFee: '₹1,500/yr', totalAnnual: '₹46,500' },
        { id: "fs-1-2", class: 'Grade 1 to 5', admissionFee: '₹18,000', tuitionFee: '₹3,000/month', annualFee: '₹2,000/yr', totalAnnual: '₹56,000' },
        { id: "fs-1-3", class: 'Grade 6 to 8', admissionFee: '₹20,000', tuitionFee: '₹3,500/month', annualFee: '₹2,500/yr', totalAnnual: '₹64,500' },
      ]
    },
    {
      id: "fs-2",
      tierName: 'High School & Secondary',
      tierSubtitle: 'Fee details for Grade 9 through 12',
      items: [
        { id: "fs-2-1", class: 'Grade 9 to 10', admissionFee: '₹25,000', tuitionFee: '₹4,500/month', annualFee: '₹3,500/yr', totalAnnual: '₹82,500' },
        { id: "fs-2-2", class: 'Grade 11 to 12 (Science)', admissionFee: '₹30,000', tuitionFee: '₹5,500/month', annualFee: '₹4,000/yr', totalAnnual: '₹100,000' },
        { id: "fs-2-3", class: 'Grade 11 to 12 (Arts/Commerce)', admissionFee: '₹30,000', tuitionFee: '₹5,000/month', annualFee: '₹2,000/yr', totalAnnual: '₹92,000' },
      ]
    }
  ]
};

interface WebsiteContextType {
  settings: WebsiteSettings;
  updateSettings: (newSettings: Partial<WebsiteSettings>) => void;
}

const WebsiteContext = createContext<WebsiteContextType | undefined>(undefined);

export const WebsiteProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<WebsiteSettings>(defaultSettings);

  // Firestore Snapshot listener for live website settings
  useEffect(() => {
    const docRef = doc(db, 'settings', 'website');
    const unsub = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const parsed = snapshot.data() as WebsiteSettings;
        
        // Migration for old default values
        if (
            parsed.heroHeadline === "Manage your school with complete ease." ||
            parsed.heroHeadline === "Bhogamur Jatiya Vidya Niketon" ||
            parsed.heroHeadline === "Bhogamur Jatiya Viyda Niketon" ||
            parsed.heroHeadline === "Bhogamur Jatiya Viyda Niketon ভগামুৰ জাতীয় বিদ্যা নিকেতন" ||
            parsed.heroHeadline === ""
        ) {
            parsed.heroHeadline = "ভগামুৰ জাতীয় বিদ্যা নিকেতন";
        }
        
        if (
            !parsed.aboutText ||
            parsed.aboutText === "The most comprehensive and beautifully designed Bhogamur Jatiya Vidya Niketon available." ||
            parsed.aboutText.includes("comprehensive and beautifully designed")
        ) {
            parsed.aboutText = "য’ত সপোনৰ আৰম্ভণি হয় আৰু ভৱিষ্যত উজলি উঠে।";
        }
        
        if (
            parsed.schoolName === "School Management System" || 
            parsed.schoolName === "Smart School" ||
            parsed.schoolName === "My App" ||
            !parsed.schoolName
        ) {
            parsed.schoolName = "Bhogamur Jatiya Vidya Niketon";
        }

        setSettings({ ...defaultSettings, ...parsed });
      } else {
        // If settings doc doesn't exist in Firestore yet, bootstrap if signed in as an admin
        const userEmail = auth.currentUser?.email?.toLowerCase();
        const allowedAdminEmails = ['visitfaridul@gmail.com', 'bjvnhs@gmail.com'];
        if (userEmail && allowedAdminEmails.includes(userEmail)) {
          console.log("Admin logged in. Bootstrapping default website settings template to Firestore...");
          setDoc(doc(db, 'settings', 'website'), defaultSettings).catch(err => {
            console.error("Failed to bootstrap default website settings on Firestore: ", err);
          });
        }
      }
    }, (error) => {
      console.warn("Website settings listener background error: ", error.message);
    });

    return () => unsub();
  }, []);

  const updateSettings = async (newSettings: Partial<WebsiteSettings>) => {
    try {
      const nextSettings = { ...settings, ...newSettings };
      
      // Optimistic update
      setSettings(nextSettings);

      // Save to Firestore
      try {
        await setDoc(doc(db, 'settings', 'website'), nextSettings, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'settings/website');
      }
    } catch (e) {
      console.error("Error setting website configurations: ", e);
    }
  };

  return (
    <WebsiteContext.Provider value={{ settings, updateSettings }}>
      {children}
    </WebsiteContext.Provider>
  );
};


export const useWebsite = () => {
  const context = useContext(WebsiteContext);
  if (context === undefined) {
    throw new Error('useWebsite must be used within a WebsiteProvider');
  }
  return context;
};
