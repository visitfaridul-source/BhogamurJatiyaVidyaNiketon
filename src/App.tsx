/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { SchoolProvider } from './context/SchoolContext';
import { WebsiteProvider } from './context/WebsiteContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OnlineAdmission from './pages/OnlineAdmission';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import Teachers from './pages/admin/Teachers';
import Fees from './pages/admin/Fees';
import IdCardGenerator from './pages/admin/IdCardGenerator';
import Settings from './pages/admin/Settings';

const Attendance = lazy(() => import('./pages/admin/Attendance'));
const FaceRecognitionAttendance = lazy(() => import('./pages/admin/FaceRecognitionAttendance'));
import Promotions from './pages/admin/Promotions';
import AdmissionData from './pages/admin/AdmissionData';
import StaffPage from './pages/StaffPage';
import StaffManagement from './pages/admin/StaffManagement';
import ProspectusPage from './pages/ProspectusPage';
import VideoPage from './pages/VideoPage';
import ResultsManagement from './pages/admin/ResultsManagement';
import ResultPage from './pages/ResultPage';
import ContactPage from './pages/ContactPage';
import Sessions from './pages/admin/Sessions';
import Roles from './pages/admin/Roles';
import ManageAdmins from './pages/admin/ManageAdmins';
import ManageCourses from './pages/admin/ManageCourses';
import WebsitePagesSettings from './pages/admin/WebsitePagesSettings';
import PrincipalMessagePage from './pages/PrincipalMessagePage';
import WhatsAppMessages from './pages/admin/WhatsAppMessages';

import GalleryPage from './pages/GalleryPage';
import CoursesPage from './pages/CoursesPage';
import TimetablePage from './pages/TimetablePage';
import OnlineClassesPage from './pages/OnlineClassesPage';
import VirtualClassroom from './pages/VirtualClassroom';
import FeeStructurePage from './pages/FeeStructurePage';
import { AuthProvider } from './context/AuthContext';
import { ConfirmationProvider } from './context/ConfirmationContext';

export default function App() {
  return (
    <AuthProvider>
      <ConfirmationProvider>
        <WebsiteProvider>
        <SchoolProvider>
        <HashRouter>
          <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div></div>}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/our-staff" element={<StaffPage />} />
            <Route path="/prospectus" element={<ProspectusPage />} />
            <Route path="/video" element={<VideoPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/online-class" element={<OnlineClassesPage />} />
            <Route path="/classroom/:id" element={<VirtualClassroom />} />
            <Route path="/fee-structure" element={<FeeStructurePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/online-admission" element={<OnlineAdmission />} />
            <Route path="/principal-message" element={<PrincipalMessagePage />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="promotions" element={<Promotions />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="staffs" element={<StaffManagement />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="whatsapp-messages" element={<WhatsAppMessages />} />
              <Route path="results" element={<ResultsManagement />} />
              <Route path="face-recognition" element={<FaceRecognitionAttendance />} />
              <Route path="fees" element={<Fees />} />
              <Route path="id-cards" element={<IdCardGenerator />} />
              <Route path="settings" element={<Settings />} />
              <Route path="website-pages" element={<WebsitePagesSettings />} />
              <Route path="admission-data" element={<AdmissionData />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="roles" element={<Roles />} />
              <Route path="users" element={<ManageAdmins />} />
              <Route path="courses" element={<ManageCourses />} />
            </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </SchoolProvider>
    </WebsiteProvider>
      </ConfirmationProvider>
    </AuthProvider>
  );
}
