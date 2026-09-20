import React, { useState, useMemo, useRef } from 'react';
import { useSchool } from '@/context/SchoolContext';
import { useWebsite, WhatsAppNotificationConfig, defaultWhatsAppConfig } from '@/context/WebsiteContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Search,
  Copy,
  ExternalLink,
  Edit3,
  Save,
  RotateCcw,
  Users,
  Check,
  Share2,
  Phone,
  Sparkles,
  UserCheck,
  UserX,
  Play,
  Calendar,
  Layers,
  FileText,
  HelpCircle,
  Eye,
  Settings,
  ChevronRight,
  ShieldCheck,
  Bell,
  Power,
  Lock,
  Unlock,
  EyeOff,
  Smartphone,
  ShieldAlert,
  GraduationCap,
  Zap,
  CheckCheck,
  Download,
  Loader2,
  Globe,
  Webhook,
  FileSpreadsheet,
  Info,
  XCircle,
  Key,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatWhatsAppNumber,
  isValidWhatsAppPhone,
  interpolateTemplate,
  createWhatsAppLink,
  StudentMessageContext,
  executeBulkWhatsAppDispatch,
  BulkDispatchItem,
  DispatchResult,
  sendTestWhatsAppMessage,
  TestMessageResult
} from '@/lib/whatsappUtils';

type NotificationType = 'attendance' | 'general' | 'fee' | 'holiday' | 'custom';
type AttendanceFilter = 'all' | 'absent' | 'present' | 'early-leave' | 'late' | 'invalid-phone';
type ActiveTab = 'send' | 'templates' | 'history';

interface DispatchLog {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  phone: string;
  status: string;
  type: string;
  timestamp: string;
  message: string;
}

export default function WhatsAppMessages() {
  const { user } = useAuth();
  const { students, attendanceMap } = useSchool();
  const { settings, updateSettings } = useWebsite();

  // Active Top Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('send');

  // Filters - Defaults to '' ("Select") to optimize data read and computation
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [notificationType, setNotificationType] = useState<NotificationType>('attendance');
  const [statusFilter, setStatusFilter] = useState<AttendanceFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Custom / General Notice Fields
  const [customTitle, setCustomTitle] = useState<string>('School Announcement');
  const [customBody, setCustomBody] = useState<string>('');
  const [holidayDate, setHolidayDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [holidayReason, setHolidayReason] = useState<string>('Local Holiday');
  const [reopeningDate, setReopeningDate] = useState<string>('');
  const [examDate, setExamDate] = useState<string>('');

  // Selected Student IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sent Tracking (local state per session)
  const [sentRecords, setSentRecords] = useState<Record<string, string>>({});
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);

  // Sequential Multi-Sender Queue Modal
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);

  // Bulk Instant Dispatch Modal & Execution State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ completed: number; total: number; latest?: DispatchResult }>({
    completed: 0,
    total: 0
  });
  const [bulkResults, setBulkResults] = useState<DispatchResult[] | null>(null);
  const [bulkSelectedDispatchMode, setBulkSelectedDispatchMode] = useState<'direct_batch' | 'meta_cloud_api' | 'webhook'>('direct_batch');
  const [copiedBroadcastPack, setCopiedBroadcastPack] = useState(false);
  const [showBulkCredentialsEdit, setShowBulkCredentialsEdit] = useState(false);
  const [batchTabProgress, setBatchTabProgress] = useState<{ nextIndex: number; total: number } | null>(null);

  // Live Test WhatsApp Connection State
  const [testTargetPhone, setTestTargetPhone] = useState('');
  const [testMessageText, setTestMessageText] = useState('Test notification from Bhogamur Jatiya Vidya Niketon WhatsApp System');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testApiResult, setTestApiResult] = useState<TestMessageResult | null>(null);

  // Single Student Custom Edit Modal
  const [editingStudentContext, setEditingStudentContext] = useState<{
    student: any;
    customMessage: string;
  } | null>(null);

  // Template Configuration State (for Super Admin)
  const whatsappConfig = settings.whatsappConfig || defaultWhatsAppConfig;
  const [tempConfig, setTempConfig] = useState<WhatsAppNotificationConfig>({
    ...defaultWhatsAppConfig,
    ...whatsappConfig
  });
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<keyof WhatsAppNotificationConfig>('attendanceAbsentTemplate');
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false);

  // Live simulation interactive status selector
  const [simulatedStatus, setSimulatedStatus] = useState<'Absent' | 'Early Leave' | 'Present' | 'Late'>('Absent');

  // Derived Admin switches
  const isSimulationEnabled = tempConfig.enableLiveChatSimulation ?? true;
  const isLiveChatAllowed = tempConfig.allowLiveWhatsAppChat ?? true;

  // Toggle Live Simulation Preview ON/OFF
  const handleToggleSimulation = async (forcedState?: boolean) => {
    const nextState = forcedState !== undefined ? forcedState : !isSimulationEnabled;
    const updated = { ...tempConfig, enableLiveChatSimulation: nextState };
    setTempConfig(updated);
    try {
      await updateSettings({ whatsappConfig: updated });
    } catch (err) {
      console.error('Error saving simulation toggle:', err);
    }
  };

  // Toggle Allow / Block Live WhatsApp Chat & Notifications
  const handleToggleAllowLiveChat = async (forcedState?: boolean) => {
    const nextState = forcedState !== undefined ? forcedState : !isLiveChatAllowed;
    const updated = { ...tempConfig, allowLiveWhatsAppChat: nextState };
    setTempConfig(updated);
    try {
      await updateSettings({ whatsappConfig: updated });
    } catch (err) {
      console.error('Error saving allow live chat toggle:', err);
    }
  };

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedBatchNumbers, setCopiedBatchNumbers] = useState(false);

  // Textarea ref for placeholder insertion
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  // All distinct classes from student list
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    students.forEach(s => {
      if (s.class && s.class.trim()) {
        classSet.add(s.class.trim());
      }
    });
    return Array.from(classSet).sort((a, b) => {
      // Natural sort
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [students]);

  // All distinct sections for selected class
  const availableSections = useMemo(() => {
    if (!selectedClass || selectedClass === 'All') return [];
    const sectionSet = new Set<string>();
    students.forEach(s => {
      if (s.class === selectedClass && s.section && s.section.trim()) {
        sectionSet.add(s.section.trim());
      }
    });
    return Array.from(sectionSet).sort();
  }, [students, selectedClass]);

  // Derive attendance status for student on the chosen date
  const getStudentAttendance = (studentId: string) => {
    const key = `${date}:${studentId}`;
    const record = attendanceMap[key];
    if (!record) {
      return {
        status: 'Not Recorded' as const,
        inTime: '',
        outTime: '',
        earlyOutReason: '',
        remarks: ''
      };
    }
    const hasEarlyOut = (record.earlyOutReason && record.earlyOutReason.trim() !== '') || (record.outTime && record.outTime.trim() !== '');
    let resolvedStatus: 'Present' | 'Absent' | 'Early Leave' | 'Late' | 'Not Recorded' = record.status || 'Not Recorded';
    if (record.status === 'Present' && hasEarlyOut) {
      resolvedStatus = 'Early Leave';
    }
    return {
      status: resolvedStatus,
      inTime: record.inTime || '',
      outTime: record.outTime || '',
      earlyOutReason: record.earlyOutReason || '',
      remarks: record.remarks || ''
    };
  };

  // Helper to build resolved message context for a given student
  const buildContext = (student: any): StudentMessageContext => {
    const att = getStudentAttendance(student.id);
    return {
      studentName: student.name,
      parentName: student.parentName,
      className: student.class,
      section: student.section,
      roll: student.roll,
      phone: student.phone,
      date: format(new Date(date), 'dd/MM/yyyy'),
      status: att.status,
      inTime: att.inTime,
      outTime: att.outTime,
      earlyOutReason: att.earlyOutReason,
      remarks: att.remarks,
      schoolName: settings.schoolName || 'Bhogamur Jatiya Vidya Niketon',
      senderName: tempConfig.senderName || 'Principal',
      customTitle,
      customBody,
      holidayDate: format(new Date(holidayDate), 'dd/MM/yyyy'),
      holidayReason,
      reopeningDate,
      examDate
    };
  };

  // Resolve message string based on notification type and student status
  const getResolvedMessage = (student: any): string => {
    const ctx = buildContext(student);
    const cfg = settings.whatsappConfig || defaultWhatsAppConfig;

    if (notificationType === 'attendance') {
      if (ctx.status === 'Absent') {
        return interpolateTemplate(cfg.attendanceAbsentTemplate, ctx);
      }
      if (ctx.status === 'Early Leave') {
        return interpolateTemplate(cfg.attendanceEarlyLeaveTemplate, ctx);
      }
      if (ctx.status === 'Late') {
        return interpolateTemplate(cfg.attendanceLateTemplate, ctx);
      }
      // Default to Present template
      return interpolateTemplate(cfg.attendancePresentTemplate, ctx);
    }

    if (notificationType === 'general') {
      return interpolateTemplate(cfg.generalNoticeTemplate, ctx);
    }

    if (notificationType === 'fee') {
      return interpolateTemplate(cfg.feeReminderTemplate, ctx);
    }

    if (notificationType === 'holiday') {
      return interpolateTemplate(cfg.holidayNoticeTemplate, ctx);
    }

    if (notificationType === 'custom') {
      return interpolateTemplate(customBody || 'Notice from school: {student_name} (Class {class})', ctx);
    }

    return interpolateTemplate(cfg.attendancePresentTemplate, ctx);
  };

  // Filtered Students list - Return empty when no class is selected to optimize data read & rendering
  const filteredStudents = useMemo(() => {
    if (!selectedClass) {
      return [];
    }

    return students.filter(student => {
      // Class filter
      if (selectedClass !== 'All' && student.class !== selectedClass) {
        return false;
      }

      // Section filter
      if (selectedSection !== 'All' && student.section !== selectedSection) {
        return false;
      }

      // Attendance status filter
      const att = getStudentAttendance(student.id);
      if (statusFilter === 'absent' && att.status !== 'Absent') return false;
      if (statusFilter === 'present' && att.status !== 'Present') return false;
      if (statusFilter === 'early-leave' && att.status !== 'Early Leave') return false;
      if (statusFilter === 'late' && att.status !== 'Late') return false;
      if (statusFilter === 'invalid-phone' && isValidWhatsAppPhone(student.phone)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = student.name?.toLowerCase().includes(q);
        const matchRoll = student.roll?.toLowerCase().includes(q);
        const matchPhone = student.phone?.toLowerCase().includes(q);
        const matchParent = student.parentName?.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchPhone && !matchParent) return false;
      }

      return true;
    });
  }, [students, selectedClass, selectedSection, statusFilter, searchQuery, date, attendanceMap]);

  // Class Attendance Statistics for the selected criteria
  const classStats = useMemo(() => {
    let total = 0;
    let present = 0;
    let absent = 0;
    let earlyLeave = 0;
    let late = 0;
    let validPhone = 0;

    if (!selectedClass) {
      return { total, present, absent, earlyLeave, late, validPhone };
    }

    const baseList = selectedClass === 'All' 
      ? students 
      : students.filter(s => s.class === selectedClass && (selectedSection === 'All' || s.section === selectedSection));

    baseList.forEach(s => {
      total++;
      const att = getStudentAttendance(s.id);
      if (att.status === 'Present') present++;
      else if (att.status === 'Absent') absent++;
      else if (att.status === 'Early Leave') earlyLeave++;
      else if (att.status === 'Late') late++;
      if (isValidWhatsAppPhone(s.phone)) validPhone++;
    });

    return { total, present, absent, earlyLeave, late, validPhone };
  }, [students, selectedClass, selectedSection, date, attendanceMap]);

  // Checkbox handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAbsentOnly = () => {
    const absentIds = filteredStudents
      .filter(s => getStudentAttendance(s.id).status === 'Absent')
      .map(s => s.id);
    setSelectedIds(new Set(absentIds));
  };

  // Dispatch single WhatsApp message
  const handleSendSingle = (student: any, customMsg?: string) => {
    if (!isLiveChatAllowed) {
      alert('Live WhatsApp Chat & Dispatch is currently BLOCKED by School Admin. An Administrator can enable live chat in the Configure Templates tab or banner.');
      return;
    }
    const msg = customMsg || getResolvedMessage(student);
    const countryCode = (settings.whatsappConfig?.defaultCountryCode) || '91';
    const link = createWhatsAppLink(student.phone, msg, countryCode);

    if (!link) {
      alert(`Invalid phone number provided for ${student.name}: "${student.phone || 'None'}"`);
      return;
    }

    // Open WhatsApp in new tab
    window.open(link, '_blank');

    // Mark as sent
    const nowTime = format(new Date(), 'hh:mm a');
    setSentRecords(prev => ({ ...prev, [student.id]: nowTime }));

    // Append to dispatch log
    setDispatchLogs(prev => [
      {
        id: `${student.id}-${Date.now()}`,
        studentId: student.id,
        studentName: student.name,
        className: student.class,
        phone: student.phone,
        status: 'Sent via WhatsApp',
        type: notificationType,
        timestamp: nowTime,
        message: msg
      },
      ...prev
    ]);
  };

  // Copy message for single student
  const handleCopyMessage = (student: any) => {
    const msg = getResolvedMessage(student);
    navigator.clipboard.writeText(msg);
    setCopiedId(student.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy all comma-separated numbers for broadcast lists
  const handleCopyAllNumbers = () => {
    if (!selectedClass) {
      alert('Please select a Target Class first.');
      return;
    }
    const targets = selectedIds.size > 0 
      ? filteredStudents.filter(s => selectedIds.has(s.id))
      : filteredStudents;

    const numbers = targets
      .map(s => formatWhatsAppNumber(s.phone, settings.whatsappConfig?.defaultCountryCode || '91'))
      .filter(n => n.length >= 10);

    if (numbers.length === 0) {
      alert('No valid phone numbers found for the selected criteria.');
      return;
    }

    const text = numbers.join(', ');
    navigator.clipboard.writeText(text);
    setCopiedBatchNumbers(true);
    setTimeout(() => setCopiedBatchNumbers(false), 2500);
  };

  // Bulk target students (class-wise, respect selection if any checkboxes ticked, or entire class if none ticked)
  const bulkStudents = useMemo(() => {
    if (!selectedClass) return [];
    if (selectedIds.size > 0) {
      return filteredStudents.filter(s => selectedIds.has(s.id));
    }
    return filteredStudents;
  }, [filteredStudents, selectedIds, selectedClass]);

  const handleOpenBulkModal = () => {
    if (!isLiveChatAllowed) {
      alert('Live WhatsApp Chat & Dispatch is currently BLOCKED by School Admin. An Administrator can enable live chat in the Configure Templates tab or banner.');
      return;
    }
    if (!selectedClass) {
      alert('Please select a Target Class first.');
      return;
    }
    if (bulkStudents.length === 0) {
      alert('No students found to dispatch messages to. Please select at least one student or choose a class with students.');
      return;
    }
    setBulkResults(null);
    setBulkProgress({ completed: 0, total: bulkStudents.length });
    setBulkSelectedDispatchMode(tempConfig.dispatchMode || 'direct_batch');
    setIsBulkModalOpen(true);
  };

  const handleLaunchQueueFromBulk = () => {
    setIsBulkModalOpen(false);
    setQueueIndex(0);
    setIsQueueModalOpen(true);
  };

  const handleOpenBatchWebTabs = (batchSize = 5) => {
    const validStudents = bulkStudents.filter(s => isValidWhatsAppPhone(s.phone));
    if (validStudents.length === 0) {
      alert('No students with valid WhatsApp phone numbers found in the selection.');
      return;
    }
    const startIndex = batchTabProgress?.nextIndex || 0;
    const batch = validStudents.slice(startIndex, startIndex + batchSize);

    if (batch.length === 0) {
      alert('All students in the selection have already had their WhatsApp Web chats opened!');
      setBatchTabProgress(null);
      return;
    }

    const countryCode = tempConfig.defaultCountryCode || '91';
    batch.forEach(student => {
      const msg = getResolvedMessage(student);
      const link = createWhatsAppLink(student.phone, msg, countryCode);
      window.open(link, '_blank');
    });

    const nextIndex = startIndex + batch.length;
    setBatchTabProgress({
      nextIndex: nextIndex >= validStudents.length ? 0 : nextIndex,
      total: validStudents.length
    });
  };

  const handleRunTestMessage = async () => {
    if (!testTargetPhone.trim()) {
      alert('Please enter a mobile phone number to receive the test WhatsApp message.');
      return;
    }
    setIsTestingApi(true);
    setTestApiResult(null);
    try {
      const res = await sendTestWhatsAppMessage(testTargetPhone, testMessageText, {
        dispatchMode: tempConfig.dispatchMode || 'direct_batch',
        defaultCountryCode: tempConfig.defaultCountryCode || '91',
        metaPhoneNumberId: tempConfig.metaPhoneNumberId,
        metaAccessToken: tempConfig.metaAccessToken,
        webhookUrl: tempConfig.webhookUrl,
        webhookAuthKey: tempConfig.webhookAuthKey
      });
      setTestApiResult(res);
      if ((tempConfig.dispatchMode || 'direct_batch') === 'direct_batch' && res.details?.link) {
        window.open(res.details.link, '_blank');
      }
    } catch (err: any) {
      setTestApiResult({
        success: false,
        message: err.message || 'Failed to dispatch test message'
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleSaveInlineCredentials = async () => {
    setIsSavingTemplates(true);
    try {
      await updateSettings({ whatsappConfig: tempConfig });
      setShowBulkCredentialsEdit(false);
      alert('WhatsApp Gateway credentials saved successfully!');
    } catch (err) {
      console.error('Error saving credentials:', err);
      alert('Failed to save credentials.');
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const handleStartBulkDispatch = async () => {
    if (bulkStudents.length === 0) return;

    // Validate credentials for automated background modes
    if (bulkSelectedDispatchMode === 'meta_cloud_api') {
      if (!tempConfig.metaPhoneNumberId?.trim() || !tempConfig.metaAccessToken?.trim()) {
        setShowBulkCredentialsEdit(true);
        alert('Meta WhatsApp Cloud API credentials missing! Please enter your Meta Phone Number ID and Permanent Access Token below, or launch the Step-by-Step WhatsApp Queue (100% Free).');
        return;
      }
    } else if (bulkSelectedDispatchMode === 'webhook') {
      if (!tempConfig.webhookUrl?.trim()) {
        setShowBulkCredentialsEdit(true);
        alert('Webhook Gateway endpoint URL missing! Please enter your Webhook URL below, or launch the Step-by-Step WhatsApp Queue (100% Free).');
        return;
      }
    } else if (bulkSelectedDispatchMode === 'direct_batch') {
      // Direct batch without an API: redirect to interactive queue or batch tabs
      handleLaunchQueueFromBulk();
      return;
    }

    setIsBulkSending(true);
    setBulkResults(null);
    setBulkProgress({ completed: 0, total: bulkStudents.length });

    // Prepare dispatch items with tailored interpolated messages
    const items: BulkDispatchItem[] = bulkStudents.map(student => ({
      studentId: student.id,
      studentName: student.name,
      className: student.class,
      roll: student.roll,
      parentName: student.parentName,
      phone: student.phone,
      message: getResolvedMessage(student)
    }));

    const results = await executeBulkWhatsAppDispatch(items, {
      defaultCountryCode: tempConfig.defaultCountryCode || '91',
      dispatchMode: bulkSelectedDispatchMode,
      metaPhoneNumberId: tempConfig.metaPhoneNumberId,
      metaAccessToken: tempConfig.metaAccessToken,
      webhookUrl: tempConfig.webhookUrl,
      webhookAuthKey: tempConfig.webhookAuthKey,
      onProgress: (completed, total, latest) => {
        setBulkProgress({ completed, total, latest });
      }
    });

    setBulkResults(results);
    setIsBulkSending(false);

    // Update sent records and dispatch logs
    const newSentRecords: Record<string, string> = { ...sentRecords };
    const newLogs: DispatchLog[] = [];

    results.forEach(res => {
      if (res.status === 'sent') {
        newSentRecords[res.studentId] = res.timestamp;
      }
      newLogs.push({
        id: `bulk-${res.studentId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: res.studentId,
        studentName: res.studentName,
        className: res.className,
        phone: res.phone,
        status: res.status === 'sent' ? 'Sent (Bulk)' : res.status === 'skipped_invalid_phone' ? 'Skipped (No Phone)' : `Failed (${res.errorMessage || 'Error'})`,
        type: notificationType,
        timestamp: res.timestamp,
        message: res.messageText
      });
    });

    setSentRecords(newSentRecords);
    setDispatchLogs(prev => [...newLogs, ...prev]);
  };

  const handleDownloadBulkReportCsv = () => {
    if (!bulkResults || bulkResults.length === 0) return;
    const headers = ['Student ID', 'Student Name', 'Class', 'Roll', 'Phone', 'Status', 'Timestamp', 'Message'];
    const rows = bulkResults.map(r => [
      `"${r.studentId}"`,
      `"${r.studentName}"`,
      `"${r.className}"`,
      `"${r.roll || ''}"`,
      `"${r.phone}"`,
      `"${r.status}"`,
      `"${format(new Date(r.timestamp), 'yyyy-MM-dd hh:mm:ss a')}"`,
      `"${r.messageText.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WhatsApp_Bulk_Dispatch_${selectedClass || 'Class'}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyBroadcastPack = () => {
    const validRecipients = bulkStudents.filter(s => isValidWhatsAppPhone(s.phone));
    const phones = validRecipients
      .map(s => formatWhatsAppNumber(s.phone, tempConfig.defaultCountryCode || '91'))
      .join(', ');
    
    const sampleMsg = bulkStudents.length > 0 ? getResolvedMessage(bulkStudents[0]) : '';
    const fullPack = `--- RECIPIENT PHONE NUMBERS (${validRecipients.length}) ---\n${phones}\n\n--- MESSAGE TEMPLATE ---\n${sampleMsg}`;
    
    navigator.clipboard.writeText(fullPack);
    setCopiedBroadcastPack(true);
    setTimeout(() => setCopiedBroadcastPack(false), 2500);
  };

  // Queue runner list
  const queueStudents = useMemo(() => {
    if (selectedIds.size === 0) return filteredStudents;
    return filteredStudents.filter(s => selectedIds.has(s.id));
  }, [filteredStudents, selectedIds]);

  const handleStartQueue = () => {
    if (!isLiveChatAllowed) {
      alert('Live WhatsApp Chat & Dispatch is currently BLOCKED by School Admin. An Administrator can enable live chat in the Configure Templates tab or banner.');
      return;
    }
    if (!selectedClass) {
      alert('Please select a Target Class before starting the WhatsApp queue.');
      return;
    }
    if (queueStudents.length === 0) {
      alert('Please select at least one student or choose a class with students.');
      return;
    }
    setQueueIndex(0);
    setIsQueueModalOpen(true);
  };

  // Save template configuration to Firestore
  const handleSaveTemplates = async () => {
    setIsSavingTemplates(true);
    try {
      await updateSettings({
        whatsappConfig: tempConfig
      });
      setTemplateSaveSuccess(true);
      setTimeout(() => setTemplateSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save WhatsApp templates:', err);
      alert('Failed to save templates. Please check connection.');
    } finally {
      setIsSavingTemplates(false);
    }
  };

  // Insert placeholder tag into active template textarea
  const handleInsertTag = (tag: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = (tempConfig[selectedTemplateKey] as string) || '';

    const newVal = currentVal.substring(0, start) + tag + currentVal.substring(end);
    setTempConfig(prev => ({ ...prev, [selectedTemplateKey]: newVal }));

    // Reset cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Available tag placeholders
  const placeholderTags = [
    { tag: '{student_name}', label: 'Student Name' },
    { tag: '{parent_name}', label: 'Parent Name' },
    { tag: '{class}', label: 'Class' },
    { tag: '{section}', label: 'Section' },
    { tag: '{roll}', label: 'Roll No' },
    { tag: '{phone}', label: 'Phone' },
    { tag: '{date}', label: 'Date' },
    { tag: '{status}', label: 'Attendance Status' },
    { tag: '{in_time}', label: 'In-Time' },
    { tag: '{out_time}', label: 'Early Out Time' },
    { tag: '{early_out_reason}', label: 'Early Out Reason' },
    { tag: '{school_name}', label: 'School Name' },
    { tag: '{sender_name}', label: 'Sender Signature' },
    { tag: '{message_body}', label: 'Custom Message' },
    { tag: '{notice_title}', label: 'Notice Title' },
    { tag: '{holiday_date}', label: 'Holiday Date' },
    { tag: '{holiday_reason}', label: 'Holiday Reason' },
    { tag: '{reopening_date}', label: 'Reopening Date' }
  ];

  // Template titles for tab selection
  const templateDefinitions: { key: keyof WhatsAppNotificationConfig; title: string; desc: string; icon: any }[] = [
    { key: 'attendanceAbsentTemplate', title: 'Absent Alert', desc: 'Sent when student is marked absent', icon: UserX },
    { key: 'attendanceEarlyLeaveTemplate', title: 'Early Leave Notice', desc: 'Sent when student leaves school early with reason', icon: Clock },
    { key: 'attendancePresentTemplate', title: 'Present Confirmation', desc: 'Daily arrival & attendance confirmation', icon: UserCheck },
    { key: 'attendanceLateTemplate', title: 'Late Arrival Alert', desc: 'Sent when student arrives after official start time', icon: AlertCircle },
    { key: 'generalNoticeTemplate', title: 'General Notice / Circular', desc: 'School announcements, circulars & events', icon: Bell },
    { key: 'feeReminderTemplate', title: 'Fee Payment Reminder', desc: 'Gentle reminder regarding pending fees', icon: FileText },
    { key: 'holidayNoticeTemplate', title: 'Holiday Advisory', desc: 'Notification about upcoming school closure and reopening', icon: Calendar },
    { key: 'examScheduleTemplate', title: 'Exam Schedule', desc: 'Upcoming test dates and examination guidelines', icon: Sparkles },
  ];

  // Mock student for template preview
  const sampleStudent = {
    id: 'SAMPLE001',
    name: 'Aarav Sharma',
    parentName: 'Rajesh Sharma',
    class: selectedClass !== 'All' ? selectedClass : 'Class 5',
    section: 'A',
    roll: '07',
    phone: '9876543210'
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-inner">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp Student Notifications</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Manual / On-Demand
              </span>
              {isLiveChatAllowed ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Chat: Allowed
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Live Chat: Blocked
                </span>
              )}
              {isSimulationEnabled ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Simulation: ON
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <EyeOff className="w-3 h-3 text-amber-600" />
                  Simulation: OFF
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Send class-wise WhatsApp attendance notifications (Present, Absent, Early Leave) and school notices to student admission numbers.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl self-start md:self-auto">
          <button
            id="tab-send-messages"
            onClick={() => setActiveTab('send')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === 'send'
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Send className="w-4 h-4 text-emerald-600" />
            Send Messages
          </button>
          <button
            id="tab-configure-templates"
            onClick={() => setActiveTab('templates')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === 'templates'
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Settings className="w-4 h-4 text-blue-600" />
            Configure Templates
          </button>
          <button
            id="tab-dispatch-history"
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === 'history'
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            Activity Log ({dispatchLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: SEND MESSAGES */}
      {activeTab === 'send' && (
        <div className="space-y-6">
          {/* Admin Blocked Alert Banner if Live WhatsApp Chat is blocked */}
          {!isLiveChatAllowed && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    Live WhatsApp Chat is Currently Blocked by Admin
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-800 uppercase">
                      Blocked
                    </span>
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Outgoing WhatsApp messaging to student parent numbers is disabled. Super Admin can allow live chat below or in Configure Templates.
                  </p>
                </div>
              </div>
              <button
                id="btn-allow-live-chat-banner"
                onClick={() => handleToggleAllowLiveChat(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shrink-0 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Allow Live WhatsApp Chat</span>
              </button>
            </div>
          )}

          {/* WhatsApp Delivery Mode & Diagnostic Banner */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white">Bulk WhatsApp Delivery Mode</h4>
                  {(tempConfig.dispatchMode || 'direct_batch') === 'meta_cloud_api' ? (
                    tempConfig.metaAccessToken && tempConfig.metaPhoneNumberId ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Meta Cloud API: Configured
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        Meta Cloud API: Credentials Missing
                      </span>
                    )
                  ) : (tempConfig.dispatchMode || 'direct_batch') === 'webhook' ? (
                    tempConfig.webhookUrl ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Webhook Gateway: Configured
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        Webhook: URL Missing
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-400" />
                      WhatsApp Web Queue (100% Free • No API Key Needed)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  {(tempConfig.dispatchMode || 'direct_batch') === 'meta_cloud_api'
                    ? tempConfig.metaAccessToken && tempConfig.metaPhoneNumberId
                      ? 'Automated background delivery is enabled via official Meta WhatsApp Business Cloud API.'
                      : 'Meta Cloud API is selected, but Phone Number ID or Access Token is missing. Messages cannot reach students in the background until configured.'
                    : (tempConfig.dispatchMode || 'direct_batch') === 'webhook'
                    ? tempConfig.webhookUrl
                      ? 'Automated dispatch will be forwarded to your custom WhatsApp Webhook server.'
                      : 'Webhook Gateway is selected, but Endpoint URL is missing.'
                    : 'WhatsApp does not allow websites to silently send background messages without an official API key. To reach students 100% free with zero setup, use the "Step-by-Step WhatsApp Queue" (pre-fills message for each parent) or copy the "Broadcast Pack".'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configure & Test Gateway</span>
              </button>
            </div>
          </div>

          {/* Filter & Configuration Control Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Class Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Target Class</span>
                  {!selectedClass && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Select Required
                    </span>
                  )}
                </label>
                <select
                  id="select-class-filter"
                  value={selectedClass}
                  onChange={e => {
                    setSelectedClass(e.target.value);
                    setSelectedSection('All');
                    setSelectedIds(new Set());
                  }}
                  className={cn(
                    "w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all",
                    !selectedClass
                      ? "border-amber-400 bg-amber-50/40 text-amber-900 font-semibold ring-1 ring-amber-400/40"
                      : "border-slate-300 text-slate-900"
                  )}
                >
                  <option value="">-- Select Class --</option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                  <option value="All">All Classes (Full School)</option>
                </select>
              </div>

              {/* Section Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Section
                </label>
                <select
                  id="select-section-filter"
                  value={selectedSection}
                  onChange={e => {
                    setSelectedSection(e.target.value);
                    setSelectedIds(new Set());
                  }}
                  disabled={!selectedClass || selectedClass === 'All'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="All">{!selectedClass ? 'Select Class First' : 'All Sections'}</option>
                  {availableSections.map(sec => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendance Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Attendance Date
                </label>
                <div className="relative">
                  <input
                    id="input-attendance-date"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notification Purpose */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Notification Type
                </label>
                <select
                  id="select-notification-type"
                  value={notificationType}
                  onChange={e => setNotificationType(e.target.value as NotificationType)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="attendance">📋 Daily Attendance (Present/Absent/Early)</option>
                  <option value="general">📢 General School Announcement</option>
                  <option value="fee">💳 School Fee Reminder</option>
                  <option value="holiday">🏖️ Holiday / Event Advisory</option>
                  <option value="custom">✍️ Custom One-Off Message</option>
                </select>
              </div>
            </div>

            {/* Custom/General Message Input Row if selected */}
            {(notificationType === 'general' || notificationType === 'custom') && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    Message Content for {!selectedClass ? 'Target Class' : selectedClass === 'All' ? 'All Classes' : selectedClass}
                  </span>
                  <span className="text-xs text-slate-500">
                    Placeholders like <code className="text-blue-600">{'{student_name}'}</code> will be auto-replaced
                  </span>
                </div>
                {notificationType === 'general' && (
                  <input
                    type="text"
                    placeholder="Notice Heading (e.g. Science Fair Tomorrow / Parent Teacher Meeting)"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                )}
                <textarea
                  rows={3}
                  placeholder="Type the message body here. Parents will receive this customized with their child's name and roll number..."
                  value={customBody}
                  onChange={e => setCustomBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Holiday Input Fields */}
            {notificationType === 'holiday' && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Holiday Date</label>
                  <input
                    type="date"
                    value={holidayDate}
                    onChange={e => setHolidayDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Occasion / Reason</label>
                  <input
                    type="text"
                    value={holidayReason}
                    onChange={e => setHolidayReason(e.target.value)}
                    placeholder="e.g. Bihu / Independence Day"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Reopening Date</label>
                  <input
                    type="text"
                    value={reopeningDate}
                    onChange={e => setReopeningDate(e.target.value)}
                    placeholder="e.g. Next Monday, 22 Sept"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}

            {/* Quick Status Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Filter by:</span>
                <button
                  id="filter-status-all"
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    statusFilter === 'all'
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  All ({classStats.total})
                </button>
                <button
                  id="filter-status-absent"
                  onClick={() => setStatusFilter('absent')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
                    statusFilter === 'absent'
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  )}
                >
                  <UserX className="w-3.5 h-3.5" />
                  Absentees Only ({classStats.absent})
                </button>
                <button
                  id="filter-status-early-leave"
                  onClick={() => setStatusFilter('early-leave')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
                    statusFilter === 'early-leave'
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Early Leave ({classStats.earlyLeave})
                </button>
                <button
                  id="filter-status-present"
                  onClick={() => setStatusFilter('present')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
                    statusFilter === 'present'
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  )}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Present ({classStats.present})
                </button>
                <button
                  id="filter-status-invalid-phone"
                  onClick={() => setStatusFilter('invalid-phone')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    statusFilter === 'invalid-phone'
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  )}
                >
                  Missing Phone ({classStats.total - classStats.validPhone})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-search-students"
                  type="text"
                  placeholder="Search name, roll, phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Bulk Action Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-2xl shadow-md">
            <div className="flex items-center gap-4">
              <label className={cn("flex items-center gap-2.5 select-none", !selectedClass ? "opacity-50 cursor-not-allowed" : "cursor-pointer")}>
                <input
                  id="checkbox-select-all"
                  type="checkbox"
                  disabled={!selectedClass || filteredStudents.length === 0}
                  checked={Boolean(selectedClass && selectedIds.size > 0 && selectedIds.size === filteredStudents.length)}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700"
                />
                <span className="text-sm font-semibold">
                  {!selectedClass 
                    ? 'Select Class First' 
                    : selectedIds.size === 0 
                    ? 'Select All' 
                    : `Selected ${selectedIds.size} of ${filteredStudents.length}`}
                </span>
              </label>

              {Boolean(selectedClass && classStats.absent > 0) && (
                <button
                  id="btn-select-absent-only"
                  onClick={handleSelectAbsentOnly}
                  className="text-xs bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 px-2.5 py-1 rounded-md border border-rose-500/30 transition-colors"
                >
                  Select All Absentees ({classStats.absent})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Primary ⚡ Send Bulk WhatsApp at Once Button */}
              <button
                id="btn-send-bulk-all-at-once"
                onClick={handleOpenBulkModal}
                disabled={!selectedClass || filteredStudents.length === 0}
                className={cn(
                  "flex items-center gap-2 px-4.5 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95",
                  !selectedClass || filteredStudents.length === 0
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 ring-1 ring-emerald-400/40 cursor-pointer"
                )}
                title="Send personalized WhatsApp messages to all selected students at once without one-by-one clicking"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Send Bulk at Once ({!selectedClass ? 0 : bulkStudents.length})</span>
              </button>

              {/* Sequential Multi-Sender Queue button (Secondary) */}
              <button
                id="btn-start-multi-send"
                onClick={handleStartQueue}
                disabled={!selectedClass}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95",
                  !selectedClass
                    ? "bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer"
                )}
                title="Open sequential queue to preview and send one-by-one"
              >
                <Play className="w-3.5 h-3.5 fill-slate-300" />
                <span>Step-by-Step Queue</span>
              </button>

              {/* Copy Broadcast Numbers */}
              <button
                id="btn-copy-batch-numbers"
                onClick={handleCopyAllNumbers}
                disabled={!selectedClass}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors",
                  !selectedClass
                    ? "bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer"
                )}
              >
                {copiedBatchNumbers ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Numbers Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copy Numbers (CSV)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Student List Cards / Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                {!selectedClass 
                  ? 'Target Class: Please select a class' 
                  : `${selectedClass === 'All' ? 'All Classes' : selectedClass} Student List (${filteredStudents.length})`}
              </span>
              <div className="flex items-center gap-3">
                {Boolean(selectedClass && filteredStudents.length > 0) && (
                  <button
                    type="button"
                    onClick={handleOpenBulkModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer active:scale-95"
                  >
                    <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                    <span>Send Bulk ({bulkStudents.length})</span>
                  </button>
                )}
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {!selectedClass 
                    ? 'Select a class above to preview student admission contacts' 
                    : 'Click "Send Bulk at Once" or individual "Send WhatsApp"'}
                </span>
              </div>
            </div>

            {!selectedClass ? (
              <div className="p-8 sm:p-12 text-center space-y-4 bg-slate-50/60">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-sm">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base font-bold text-slate-800">
                    Select a Target Class to View Students
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    To optimize read performance and fast-track attendance notifications, please choose a target class from the dropdown above or click any class shortcut below:
                  </p>
                </div>

                {/* Quick Class Shortcut Chips */}
                {availableClasses.length > 0 && (
                  <div className="pt-2 flex flex-wrap justify-center items-center gap-2 max-w-2xl mx-auto">
                    {availableClasses.map(cls => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          setSelectedClass(cls);
                          setSelectedSection('All');
                          setSelectedIds(new Set());
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        {cls}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClass('All');
                        setSelectedSection('All');
                        setSelectedIds(new Set());
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all cursor-pointer active:scale-95"
                    >
                      All Classes
                    </button>
                  </div>
                )}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No students match the current filters in {selectedClass}</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting the section or status filter above to find students.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredStudents.map(student => {
                  const att = getStudentAttendance(student.id);
                  const isSelected = selectedIds.has(student.id);
                  const hasValidPhone = isValidWhatsAppPhone(student.phone);
                  const isSent = !!sentRecords[student.id];
                  const resolvedMsg = getResolvedMessage(student);

                  return (
                    <div
                      key={student.id}
                      className={cn(
                        "p-4 md:px-6 md:py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors",
                        isSelected ? "bg-emerald-50/40" : "hover:bg-slate-50/70",
                        isSent && "bg-slate-50"
                      )}
                    >
                      {/* Left: Checkbox + Student Info */}
                      <div className="flex items-start md:items-center gap-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(student.id)}
                          className="mt-1 md:mt-0 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{student.name}</span>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              Roll: {student.roll || 'N/A'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {student.class} {student.section ? `(${student.section})` : ''}
                            </span>
                            {/* Attendance Badge */}
                            {att.status === 'Absent' && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                <UserX className="w-3 h-3" />
                                Absent
                              </span>
                            )}
                            {att.status === 'Early Leave' && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Early Leave {att.outTime ? `(${att.outTime})` : ''}
                              </span>
                            )}
                            {att.status === 'Present' && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                Present {att.inTime ? `(${att.inTime})` : ''}
                              </span>
                            )}
                            {att.status === 'Late' && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Late {att.inTime ? `(${att.inTime})` : ''}
                              </span>
                            )}
                            {att.status === 'Not Recorded' && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                                Unmarked
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span>Parent: <strong className="text-slate-700">{student.parentName || 'N/A'}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className={cn("font-medium", hasValidPhone ? "text-slate-800" : "text-rose-600")}>
                                {student.phone || 'No phone provided'}
                              </span>
                              {!hasValidPhone && (
                                <span className="text-rose-500 font-semibold">(Invalid)</span>
                              )}
                            </span>
                            {att.earlyOutReason && (
                              <>
                                <span>•</span>
                                <span className="text-amber-700 font-medium">Reason: {att.earlyOutReason}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Message Preview & Action Buttons */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {isSent && (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Sent {sentRecords[student.id]}
                          </span>
                        )}

                        {/* Copy Message Text */}
                        <button
                          title="Copy tailored WhatsApp message to clipboard"
                          onClick={() => handleCopyMessage(student)}
                          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                          {copiedId === student.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit custom text for student */}
                        <button
                          title="Preview or edit custom message for this student"
                          onClick={() => setEditingStudentContext({ student, customMessage: resolvedMsg })}
                          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Direct Send on WhatsApp */}
                        <button
                          disabled={!hasValidPhone}
                          onClick={() => handleSendSingle(student)}
                          className={cn(
                            "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95",
                            hasValidPhone
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          )}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURE MESSAGE TEMPLATES (SUPER ADMIN) */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Configure WhatsApp Notification Templates</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Super Admin can configure standard messages for attendance (Present, Absent, Early Leave) and other school actions.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  id="btn-reset-default-templates"
                  onClick={() => {
                    if (confirm('Reset all templates to system defaults?')) {
                      setTempConfig(defaultWhatsAppConfig);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Defaults
                </button>

                <button
                  id="btn-save-templates-db"
                  onClick={handleSaveTemplates}
                  disabled={isSavingTemplates}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingTemplates ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : templateSaveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Saved to Database!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Templates to Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Admin WhatsApp Controls & Permissions (Master Toggles) */}
            <div className="p-4.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold tracking-tight text-slate-100">
                    Super Admin WhatsApp Controls & Permissions
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Global System Policy Controls
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Control 1: Master Live Chat Dispatch Permission */}
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-200">
                        Live WhatsApp Chat & Dispatch
                      </span>
                      {isLiveChatAllowed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ALLOWED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Allow or block school staff from initiating live WhatsApp chats and sending attendance notices to students.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Status: {isLiveChatAllowed ? 'Live Chat is Active' : 'Live Chat is Blocked'}
                    </span>
                    <button
                      id="btn-admin-toggle-allow-live-chat"
                      type="button"
                      onClick={() => handleToggleAllowLiveChat()}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer",
                        isLiveChatAllowed
                          ? "bg-rose-600 hover:bg-rose-500 text-white"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      )}
                    >
                      {isLiveChatAllowed ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Block Live Chat</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Allow Live Chat</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Control 2: Live WhatsApp Chat Simulation Preview ON / OFF */}
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-200">
                        Live WhatsApp Chat Simulation
                      </span>
                      {isSimulationEnabled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ACTIVE / ON
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          MUTED / OFF
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Render real-time interactive WhatsApp bubble preview dynamically reflecting template keystrokes and attendance statuses.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Preview: {isSimulationEnabled ? 'Showing Real-time Mockup' : 'Preview Paused'}
                    </span>
                    <button
                      id="btn-admin-toggle-live-simulation"
                      type="button"
                      onClick={() => handleToggleSimulation()}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer",
                        isSimulationEnabled
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      )}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isSimulationEnabled ? 'Turn OFF' : 'Turn ON'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* General Settings (Sender & Country Code) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Country Code (e.g. 91 for India)
                </label>
                <input
                  type="text"
                  value={tempConfig.defaultCountryCode}
                  onChange={e => setTempConfig(prev => ({ ...prev, defaultCountryCode: e.target.value.replace(/\D/g, '') }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="91"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sender Signature / School Authority
                </label>
                <input
                  type="text"
                  value={tempConfig.senderName}
                  onChange={e => setTempConfig(prev => ({ ...prev, senderName: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="Principal, Bhogamur Jatiya Vidya Niketon"
                />
              </div>
            </div>

            {/* Bulk WhatsApp Dispatch & Gateway Settings */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700/80 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Bulk WhatsApp Dispatch Gateway</h3>
                    <p className="text-xs text-slate-300">
                      Configure how all-at-once bulk messages are processed for classes and selected students.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 w-fit">
                  {tempConfig.dispatchMode === 'meta_cloud_api' ? 'Meta Cloud API' : tempConfig.dispatchMode === 'webhook' ? 'Webhook Gateway' : 'Instant Parallel'}
                </span>
              </div>

              {/* Mode Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label
                  onClick={() => setTempConfig(prev => ({ ...prev, dispatchMode: 'direct_batch' }))}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between",
                    (tempConfig.dispatchMode || 'direct_batch') === 'direct_batch'
                      ? "bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-400/40 text-white"
                      : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold">WhatsApp Web Queue (100% Free)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Opens WhatsApp Web for each recipient with the personalized message pre-filled. You click Send & Next. 100% reliable, zero API setup.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setTempConfig(prev => ({ ...prev, dispatchMode: 'meta_cloud_api' }))}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between",
                    tempConfig.dispatchMode === 'meta_cloud_api'
                      ? "bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-400/40 text-white"
                      : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold">Meta WhatsApp Cloud API</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Official background delivery via Meta Cloud API. Meta gives 1,000 free conversations/month. Requires Meta Phone Number ID & Token.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setTempConfig(prev => ({ ...prev, dispatchMode: 'webhook' }))}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between",
                    tempConfig.dispatchMode === 'webhook'
                      ? "bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-400/40 text-white"
                      : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Webhook className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold">Webhook Gateway API</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Forwards message payload to your custom server or third-party WhatsApp Gateway (UltraMsg, Wassenger, WPPConnect, Baileys, etc.).
                    </p>
                  </div>
                </label>
              </div>

              {/* Conditional credentials fields for Meta API */}
              {tempConfig.dispatchMode === 'meta_cloud_api' && (
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-700/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      Meta WhatsApp Cloud API Credentials
                    </span>
                    <a
                      href="https://developers.facebook.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Meta Developer Portal <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Meta Phone Number ID <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={tempConfig.metaPhoneNumberId || ''}
                        onChange={e => setTempConfig(prev => ({ ...prev, metaPhoneNumberId: e.target.value.trim() }))}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                        placeholder="e.g. 104857291827461"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Permanent System User Access Token <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="password"
                        value={tempConfig.metaAccessToken || ''}
                        onChange={e => setTempConfig(prev => ({ ...prev, metaAccessToken: e.target.value.trim() }))}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                        placeholder="EAA..."
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                    💡 <strong>Meta Cloud API Rule:</strong> WhatsApp Meta Business API offers 1,000 free conversations every month. For test apps in Developer Mode, your recipient numbers must be added to the allowed phone list in the Meta App Dashboard. For production dispatches, Meta requires a pre-approved template for business-initiated chats.
                  </p>
                </div>
              )}

              {/* Conditional credentials fields for Webhook */}
              {tempConfig.dispatchMode === 'webhook' && (
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-700/70 space-y-3">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Webhook className="w-3.5 h-3.5" />
                    Webhook Gateway Endpoint Settings
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Webhook Endpoint URL <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="url"
                        value={tempConfig.webhookUrl || ''}
                        onChange={e => setTempConfig(prev => ({ ...prev, webhookUrl: e.target.value.trim() }))}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                        placeholder="https://api.myschool.edu/whatsapp/dispatch"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Authorization Key / Bearer Token (Optional)
                      </label>
                      <input
                        type="password"
                        value={tempConfig.webhookAuthKey || ''}
                        onChange={e => setTempConfig(prev => ({ ...prev, webhookAuthKey: e.target.value.trim() }))}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                        placeholder="Bearer token or secret key"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE CONNECTION TEST BENCH */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    Test Live WhatsApp Connection
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Verify that messages reach your own WhatsApp number
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Your WhatsApp Mobile Number
                    </label>
                    <input
                      type="text"
                      value={testTargetPhone}
                      onChange={e => setTestTargetPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                      placeholder="e.g. 9876543210"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Test Message
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testMessageText}
                        onChange={e => setTestMessageText(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={handleRunTestMessage}
                        disabled={isTestingApi}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        {isTestingApi ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Test</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Test Feedback Display */}
                {testApiResult && (
                  <div
                    className={cn(
                      "p-3 rounded-xl border text-xs leading-relaxed space-y-1",
                      testApiResult.success
                        ? "bg-emerald-950/60 border-emerald-600/80 text-emerald-200"
                        : "bg-rose-950/60 border-rose-600/80 text-rose-200"
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {testApiResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Test Delivered Successfully!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Test Delivery Failed</span>
                        </>
                      )}
                    </div>
                    <p className="text-slate-300">{testApiResult.message}</p>
                    {testApiResult.details && (
                      <pre className="text-[10px] font-mono bg-black/40 p-2 rounded border border-white/10 overflow-x-auto text-slate-300">
                        {JSON.stringify(testApiResult.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Template Selection Sidebar + Editor Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Template List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Select Template To Edit:
                </span>
                {templateDefinitions.map(item => {
                  const Icon = item.icon;
                  const isSelected = selectedTemplateKey === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSelectedTemplateKey(item.key)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3",
                        isSelected
                          ? "bg-blue-50/70 border-blue-500 text-blue-950 shadow-sm"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm block truncate">{item.title}</span>
                        <span className="text-xs text-slate-500 block truncate mt-0.5">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Columns: Editor & Live WhatsApp Simulation */}
              <div className="lg:col-span-2 space-y-4">
                {/* Editor Container */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      Editing: {templateDefinitions.find(t => t.key === selectedTemplateKey)?.title}
                    </span>
                    <span className="text-xs text-slate-400">
                      {((tempConfig[selectedTemplateKey] as string) || '').length} characters
                    </span>
                  </div>

                  {/* Clickable placeholder tag chips */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-500">Insert Dynamic Tag:</span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                      {placeholderTags.map(p => (
                        <button
                          key={p.tag}
                          type="button"
                          onClick={() => handleInsertTag(p.tag)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 text-xs font-mono border border-slate-200 transition-colors"
                          title={`Click to insert ${p.label}`}
                        >
                          + {p.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={templateTextareaRef}
                    rows={6}
                    value={(tempConfig[selectedTemplateKey] as string) || ''}
                    onChange={e => setTempConfig(prev => ({ ...prev, [selectedTemplateKey]: e.target.value }))}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-sans text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Type template message here..."
                  />
                </div>

                {/* WhatsApp Chat Simulation Preview */}
                {isSimulationEnabled ? (
                  <div className="bg-[#0b141a] rounded-2xl overflow-hidden border border-slate-700/80 shadow-xl space-y-0">
                    {/* WhatsApp Top Header Bar */}
                    <div className="bg-[#202c33] px-4 py-3 text-white flex items-center justify-between border-b border-slate-700/60">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-inner">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#202c33] rounded-full"></span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-100">Live WhatsApp Chat Simulation</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              LIVE SYNC
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Simulating: Parent of Aarav Sharma (Class 5-A) • Online
                          </p>
                        </div>
                      </div>

                      {/* Admin ON/OFF Toggle */}
                      <button
                        id="btn-toggle-simulation-widget-off"
                        type="button"
                        onClick={() => handleToggleSimulation(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Turn OFF Live Simulation Preview"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Simulation: ON</span>
                      </button>
                    </div>

                    {/* Condition Switcher Pills */}
                    <div className="bg-[#111b21] px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 text-xs">
                      <span className="text-slate-400 font-medium text-[11px]">
                        Simulate Condition:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(['Absent', 'Present', 'Early Leave', 'Late'] as const).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setSimulatedStatus(st)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                              simulatedStatus === st
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-[#202c33] text-slate-300 hover:bg-[#2a3942]"
                            )}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat Background & Message Area */}
                    <div className="p-4 sm:p-5 bg-[#0b141a] min-h-[220px] flex flex-col justify-end space-y-3">
                      {/* Date Badge */}
                      <div className="flex justify-center">
                        <span className="bg-[#182229] text-slate-400 text-[11px] px-3 py-1 rounded-lg uppercase tracking-wider font-mono shadow-sm">
                          TODAY
                        </span>
                      </div>

                      {/* Real-time WhatsApp Bubble */}
                      <div className="bg-[#005c4b] text-[#e9edef] p-3.5 rounded-2xl rounded-tr-none max-w-lg ml-auto shadow-md text-sm font-sans whitespace-pre-wrap leading-relaxed border border-emerald-500/20">
                        {interpolateTemplate(
                          (tempConfig[selectedTemplateKey] as string) || '',
                          {
                            ...buildContext(sampleStudent),
                            status: simulatedStatus,
                            inTime: '08:45 AM',
                            outTime: '11:30 AM',
                            earlyOutReason: 'Doctor Appointment permission',
                            senderName: tempConfig.senderName
                          }
                        )}
                        <div className="text-[10px] text-emerald-200/80 text-right mt-2 flex items-center justify-end gap-1.5 font-mono">
                          <span>{format(new Date(), 'hh:mm a')}</span>
                          <span className="text-cyan-300 font-bold">✓✓</span>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Simulated Bottom Bar */}
                    <div className="bg-[#202c33] px-4 py-2.5 flex items-center gap-3 text-slate-400 border-t border-slate-800">
                      <div className="flex-1 bg-[#2a3942] text-slate-400 text-xs px-3.5 py-2 rounded-xl border border-slate-700/50 flex items-center justify-between">
                        <span className="italic">Type a reply as parent... (Simulation Mode)</span>
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                      <EyeOff className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100">Live WhatsApp Chat Simulation is Turned OFF</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          MUTED
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        The real-time WhatsApp bubble preview is blocked by Admin. Template editing above remains fully functional.
                      </p>
                    </div>
                    <div className="pt-2 flex justify-center">
                      <button
                        id="btn-turn-on-live-simulation"
                        type="button"
                        onClick={() => handleToggleSimulation(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Turn ON Live WhatsApp Chat Simulation</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISPATCH ACTIVITY LOGS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">WhatsApp Notification Activity Log</h2>
              <p className="text-xs text-slate-500">
                Log of messages dispatched during the current active session.
              </p>
            </div>
            {dispatchLogs.length > 0 && (
              <button
                onClick={() => setDispatchLogs([])}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                Clear Session Log
              </button>
            )}
          </div>

          {dispatchLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Clock className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No messages dispatched yet in this session</p>
              <p className="text-xs text-slate-400">
                When you send WhatsApp messages to students from the Send tab, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Message Excerpt</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatchLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-slate-500">{log.timestamp}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{log.studentName}</td>
                      <td className="py-3 px-4 text-slate-600">{log.className}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{log.phone}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={log.message}>
                        {log.message}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          Sent
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SEQUENTIAL MULTI-SEND QUEUE MODAL */}
      <AnimatePresence>
        {isQueueModalOpen && queueStudents.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200"
            >
              {/* Queue Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">WhatsApp Multi-Send Queue</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                      {queueIndex + 1} of {queueStudents.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Send one-by-one to prevent browser popup blocking. Click "Send on WhatsApp" then "Next".
                  </p>
                </div>
                <button
                  onClick={() => setIsQueueModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 transition-all duration-300"
                  style={{ width: `${((queueIndex + 1) / queueStudents.length) * 100}%` }}
                />
              </div>

              {/* Current Student in Queue */}
              {(() => {
                const currentStudent = queueStudents[queueIndex];
                if (!currentStudent) return null;

                const att = getStudentAttendance(currentStudent.id);
                const msg = getResolvedMessage(currentStudent);
                const hasValidPhone = isValidWhatsAppPhone(currentStudent.phone);
                const isCurrentSent = !!sentRecords[currentStudent.id];

                return (
                  <div className="p-6 space-y-6">
                    {/* Student Info Card */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-900">{currentStudent.name}</span>
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
                            {currentStudent.class}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-semibold">
                            Roll: {currentStudent.roll}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Parent: <strong className="text-slate-700">{currentStudent.parentName || 'N/A'}</strong> | Phone:{' '}
                          <strong className={hasValidPhone ? 'text-emerald-700' : 'text-rose-600'}>
                            {currentStudent.phone || 'None'}
                          </strong>
                        </p>
                      </div>

                      {/* Status */}
                      <div>
                        {att.status === 'Absent' && (
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Absent
                          </span>
                        )}
                        {att.status === 'Early Leave' && (
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Early Leave
                          </span>
                        )}
                        {att.status === 'Present' && (
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Present
                          </span>
                        )}
                        {att.status === 'Not Recorded' && (
                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-200 text-slate-600">
                            Unmarked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Message Preview */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Tailored Message to be Sent:
                      </span>
                      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-slate-900 text-sm whitespace-pre-wrap leading-relaxed font-sans shadow-inner">
                        {msg}
                      </div>
                    </div>

                    {/* Modal Controls */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        disabled={queueIndex === 0}
                        onClick={() => setQueueIndex(prev => Math.max(0, prev - 1))}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      >
                        ← Previous
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            if (queueIndex < queueStudents.length - 1) {
                              setQueueIndex(prev => prev + 1);
                            } else {
                              setIsQueueModalOpen(false);
                            }
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Skip
                        </button>

                        <button
                          disabled={!hasValidPhone}
                          onClick={() => {
                            handleSendSingle(currentStudent, msg);
                            // Auto advance after 400ms
                            setTimeout(() => {
                              if (queueIndex < queueStudents.length - 1) {
                                setQueueIndex(prev => prev + 1);
                              } else {
                                setIsQueueModalOpen(false);
                              }
                            }, 400);
                          }}
                          className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95",
                            hasValidPhone
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                              : "bg-slate-300 text-slate-500 cursor-not-allowed"
                          )}
                        >
                          <Send className="w-4 h-4" />
                          {isCurrentSent ? 'Resend on WhatsApp' : 'Send on WhatsApp & Next'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SINGLE STUDENT CUSTOM MESSAGE PREVIEW MODAL */}
      <AnimatePresence>
        {editingStudentContext && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">
                  Message for {editingStudentContext.student.name}
                </h3>
                <button
                  onClick={() => setEditingStudentContext(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <p>Phone Number: <strong>{editingStudentContext.student.phone || 'None'}</strong></p>
                <p>Class: <strong>{editingStudentContext.student.class}</strong> | Roll: <strong>{editingStudentContext.student.roll}</strong></p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Customized WhatsApp Message:</label>
                <textarea
                  rows={6}
                  value={editingStudentContext.customMessage}
                  onChange={e => setEditingStudentContext(prev => prev ? ({ ...prev, customMessage: e.target.value }) : null)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(editingStudentContext.customMessage);
                    alert('Message copied to clipboard!');
                  }}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Text
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingStudentContext(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => {
                      handleSendSingle(editingStudentContext.student, editingStudentContext.customMessage);
                      setEditingStudentContext(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send on WhatsApp
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚡ BULK WHATSAPP INSTANT DISPATCH MODAL (ALL AT ONCE) */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                    <Zap className="w-5 h-5 fill-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">Send Bulk WhatsApp Messages at Once</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Class {selectedClass}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Dispatches tailored messages to all {bulkStudents.length} selected students at once without one-by-one clicking.
                    </p>
                  </div>
                </div>

                {!isBulkSending && (
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* STATE 1: PREPARATION & CONFIRMATION (Before sending) */}
                {!isBulkSending && !bulkResults && (
                  <>
                    {/* Summary Metric Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Target Class</span>
                        <span className="text-sm font-bold text-slate-900 block truncate">
                          {selectedClass === 'All' ? 'All Classes' : selectedClass}
                          {selectedSection !== 'All' && ` (${selectedSection})`}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Recipients</span>
                        <span className="text-sm font-bold text-emerald-700 block">
                          {bulkStudents.length} Students
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Valid Numbers</span>
                        <span className="text-sm font-bold text-blue-700 block">
                          {bulkStudents.filter(s => isValidWhatsAppPhone(s.phone)).length} Ready
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Notification</span>
                        <span className="text-sm font-bold text-slate-900 block capitalize">
                          {notificationType}
                        </span>
                      </div>
                    </div>

                    {/* Dispatch Mode Selector */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Choose Delivery Gateway:
                        </label>
                        <span className="text-[11px] text-slate-500">
                          {bulkSelectedDispatchMode === 'direct_batch' ? 'Zero setup • 100% free' : 'Automated background gateway'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setBulkSelectedDispatchMode('direct_batch')}
                          className={cn(
                            "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                            bulkSelectedDispatchMode === 'direct_batch'
                              ? "bg-blue-50/90 border-blue-500 text-blue-950 ring-2 ring-blue-400/40"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold">WhatsApp Web Queue</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-tight">
                            100% Free & Reliable. Opens WhatsApp Web for each parent with message pre-filled.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBulkSelectedDispatchMode('meta_cloud_api')}
                          className={cn(
                            "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                            bulkSelectedDispatchMode === 'meta_cloud_api'
                              ? "bg-emerald-50/90 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400/40"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold">Meta Cloud API</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-tight">
                            {tempConfig.metaAccessToken && tempConfig.metaPhoneNumberId
                              ? '✓ Official Meta API configured'
                              : '⚠️ Requires Meta Phone ID & Token'}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBulkSelectedDispatchMode('webhook')}
                          className={cn(
                            "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                            bulkSelectedDispatchMode === 'webhook'
                              ? "bg-purple-50/90 border-purple-500 text-purple-950 ring-2 ring-purple-400/40"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Webhook className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-bold">Webhook Gateway</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-tight">
                            {tempConfig.webhookUrl ? '✓ Custom Webhook configured' : '⚠️ Requires Webhook Endpoint URL'}
                          </p>
                        </button>
                      </div>

                      {/* Mode-Specific Guidance / Credentials Config */}
                      {bulkSelectedDispatchMode === 'direct_batch' && (
                        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-2">
                          <div className="flex items-center gap-2 font-bold text-blue-950">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Recommended: 100% Free Direct Parent Delivery</span>
                          </div>
                          <p className="text-blue-800 leading-relaxed text-[11px]">
                            Because WhatsApp does not allow arbitrary web browsers to send silent messages directly to parent phones without paid Meta API approval, the <strong>Step-by-Step WhatsApp Queue</strong> prepares each parent’s tailored note with 1-click delivery.
                          </p>
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleOpenBatchWebTabs(5)}
                              className="px-3 py-1 bg-white border border-blue-300 rounded-lg text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                            >
                              Or Open in Batches of 5 Web Tabs
                            </button>
                            {batchTabProgress && (
                              <span className="text-[11px] font-mono text-blue-700">
                                (Opened {batchTabProgress.nextIndex} of {batchTabProgress.total})
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {bulkSelectedDispatchMode === 'meta_cloud_api' && (!tempConfig.metaAccessToken || !tempConfig.metaPhoneNumberId) && (
                        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Meta Cloud API Credentials Required</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowBulkCredentialsEdit(!showBulkCredentialsEdit)}
                              className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                            >
                              {showBulkCredentialsEdit ? 'Hide Fields' : 'Enter Credentials Here'}
                            </button>
                          </div>
                          <p className="text-amber-800 text-[11px] leading-relaxed">
                            To deliver automated background messages directly without opening WhatsApp Web, you must provide your Meta Business Phone Number ID and Permanent Access Token.
                          </p>
                          {(showBulkCredentialsEdit || (!tempConfig.metaAccessToken || !tempConfig.metaPhoneNumberId)) && (
                            <div className="space-y-2 pt-1 bg-white p-3 rounded-xl border border-amber-200">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Meta Phone Number ID</label>
                                <input
                                  type="text"
                                  value={tempConfig.metaPhoneNumberId || ''}
                                  onChange={e => setTempConfig(prev => ({ ...prev, metaPhoneNumberId: e.target.value.trim() }))}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                                  placeholder="e.g. 104857291827461"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Permanent Access Token</label>
                                <input
                                  type="password"
                                  value={tempConfig.metaAccessToken || ''}
                                  onChange={e => setTempConfig(prev => ({ ...prev, metaAccessToken: e.target.value.trim() }))}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                                  placeholder="EAA..."
                                />
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <a
                                  href="https://developers.facebook.com"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  Meta Developer Console <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={handleSaveInlineCredentials}
                                  disabled={isSavingTemplates}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm"
                                >
                                  {isSavingTemplates ? 'Saving...' : 'Save Credentials'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {bulkSelectedDispatchMode === 'webhook' && !tempConfig.webhookUrl && (
                        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Webhook URL Required</span>
                          </div>
                          <p className="text-amber-800 text-[11px] leading-relaxed">
                            Please provide the endpoint URL of your custom WhatsApp server (UltraMsg, Wassenger, WPPConnect, Baileys, etc.)
                          </p>
                          <div className="space-y-2 pt-1 bg-white p-3 rounded-xl border border-amber-200">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Webhook Endpoint URL</label>
                              <input
                                type="url"
                                value={tempConfig.webhookUrl || ''}
                                onChange={e => setTempConfig(prev => ({ ...prev, webhookUrl: e.target.value.trim() }))}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                                placeholder="https://api.yourschool.edu/whatsapp/send"
                              />
                            </div>
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={handleSaveInlineCredentials}
                                disabled={isSavingTemplates}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-sm"
                              >
                                {isSavingTemplates ? 'Saving...' : 'Save URL'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tailored Message Preview */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          Message Preview (Sample for {bulkStudents[0]?.name || 'Student'})
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Auto-personalized with student name, class & attendance
                        </span>
                      </div>
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-slate-900 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-inner">
                        {bulkStudents.length > 0 ? getResolvedMessage(bulkStudents[0]) : 'No student selected'}
                      </div>
                    </div>

                    {/* Preview of Students List */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Recipients in Queue ({bulkStudents.length} Total):
                      </span>
                      <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
                        {bulkStudents.map((s, idx) => {
                          const hasPhone = isValidWhatsAppPhone(s.phone);
                          return (
                            <div key={s.id} className="py-1.5 px-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-slate-400 font-mono text-[10px] w-4">{idx + 1}.</span>
                                <span className="font-semibold text-slate-800 truncate">{s.name}</span>
                                <span className="text-[10px] text-slate-500">Roll: {s.roll}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn("text-[11px] font-mono font-medium", hasPhone ? "text-slate-600" : "text-rose-500")}>
                                  {s.phone || 'No Phone'}
                                </span>
                                {hasPhone ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                ) : (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Missing</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* STATE 2: LIVE DISPATCHING PROGRESS */}
                {isBulkSending && (
                  <div className="py-8 px-4 text-center space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="w-20 h-20 rounded-full border-4 border-slate-100 border-t-emerald-600 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-emerald-600 fill-emerald-600 animate-pulse" />
                      </div>
                    </div>

                    <div className="space-y-2 max-w-md mx-auto">
                      <h4 className="text-lg font-bold text-slate-900">
                        Dispatching Bulk Messages at Once...
                      </h4>
                      <p className="text-xs text-slate-500">
                        Sending personalized WhatsApp notifications to {bulkProgress.total} students in parallel. This will only take a moment!
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5 max-w-lg mx-auto">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600">Progress:</span>
                        <span className="text-emerald-700 font-mono">
                          {bulkProgress.completed} / {bulkProgress.total} ({Math.round((bulkProgress.completed / Math.max(1, bulkProgress.total)) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-200"
                          style={{ width: `${(bulkProgress.completed / Math.max(1, bulkProgress.total)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Live Student Ticker */}
                    {bulkProgress.latest && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto text-xs text-left flex items-center justify-between">
                        <div className="truncate">
                          <span className="text-slate-400 text-[11px] block">Currently Dispatched:</span>
                          <span className="font-bold text-slate-800">{bulkProgress.latest.studentName}</span>
                          <span className="text-slate-500 font-mono ml-2">({bulkProgress.latest.phone})</span>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold shrink-0",
                          bulkProgress.latest.status === 'sent' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        )}>
                          {bulkProgress.latest.status === 'sent' ? '✓ Dispatched' : 'Skipped'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* STATE 3: COMPLETED REPORT WITH DIAGNOSTICS */}
                {!isBulkSending && bulkResults && (
                  <div className="space-y-5">
                    {(() => {
                      const sentCount = bulkResults.filter(r => r.status === 'sent').length;
                      const failedCount = bulkResults.filter(r => r.status === 'failed').length;
                      const skippedCount = bulkResults.filter(r => r.status === 'skipped_invalid_phone').length;

                      return (
                        <>
                          {sentCount > 0 ? (
                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                                <CheckCheck className="w-6 h-6" />
                              </div>
                              <h4 className="text-base font-bold text-emerald-950">
                                {sentCount} Bulk WhatsApp Messages Successfully Dispatched!
                              </h4>
                              <p className="text-xs text-emerald-700 max-w-md mx-auto">
                                Messages were sent through the selected gateway. Sent status has been logged in activity history.
                              </p>
                            </div>
                          ) : (
                            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-300 text-center space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-sm">
                                <AlertCircle className="w-6 h-6" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-base font-bold text-amber-950">
                                  Bulk Messages Could Not Reach WhatsApp
                                </h4>
                                <p className="text-xs text-amber-800 max-w-md mx-auto leading-relaxed">
                                  Automated background API calls require active Meta credentials or an accessible webhook. To guarantee 100% delivery right now with zero setup, use the <strong>Step-by-Step WhatsApp Queue</strong>.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsBulkModalOpen(false);
                                  setBulkResults(null);
                                  handleLaunchQueueFromBulk();
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Sparkles className="w-4 h-4" />
                                <span>Send via Step-by-Step WhatsApp Queue (100% Free)</span>
                              </button>
                            </div>
                          )}

                          {/* Result Stats */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-center">
                              <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">Sent Successfully</span>
                              <span className="text-xl font-extrabold text-emerald-900">
                                {sentCount}
                              </span>
                            </div>
                            <div className="p-3 bg-rose-50/80 rounded-2xl border border-rose-200 text-center">
                              <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider block">Failed / Unreachable</span>
                              <span className="text-xl font-extrabold text-rose-900">
                                {failedCount}
                              </span>
                            </div>
                            <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-center">
                              <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">Skipped (No Phone)</span>
                              <span className="text-xl font-extrabold text-amber-900">
                                {skippedCount}
                              </span>
                            </div>
                          </div>

                          {/* Dispatch Breakdown List with Error Details */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                              Detailed Dispatch Log & Diagnosis:
                            </span>
                            <div className="max-h-52 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
                              {bulkResults.map((r, i) => (
                                <div key={i} className="py-2 px-2 flex items-start justify-between gap-3">
                                  <div className="truncate flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-900">{r.studentName}</span>
                                      <span className="text-slate-400 font-mono text-[11px]">{r.phone}</span>
                                    </div>
                                    {r.errorMessage && (
                                      <p className="text-[10px] text-rose-600 leading-tight mt-0.5 font-sans">
                                        Reason: {r.errorMessage}
                                      </p>
                                    )}
                                  </div>
                                  <div className="shrink-0 pt-0.5">
                                    {r.status === 'sent' ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                        <Check className="w-3 h-3" />
                                        Sent
                                      </span>
                                    ) : r.status === 'skipped_invalid_phone' ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                                        Skipped (No Phone)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                        Failed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {!isBulkSending && !bulkResults && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyBroadcastPack}
                      className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 font-semibold px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedBroadcastPack ? 'Copied Broadcast Pack!' : 'Copy Broadcast Pack (Numbers + Msg)'}
                    </button>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsBulkModalOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleStartBulkDispatch}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer",
                          bulkSelectedDispatchMode === 'direct_batch'
                            ? "bg-blue-600 hover:bg-blue-500"
                            : bulkSelectedDispatchMode === 'webhook'
                            ? "bg-purple-600 hover:bg-purple-500"
                            : "bg-emerald-600 hover:bg-emerald-500"
                        )}
                      >
                        {bulkSelectedDispatchMode === 'direct_batch' ? (
                          <>
                            <Sparkles className="w-4 h-4 fill-white" />
                            <span>START WHATSAPP QUEUE ({bulkStudents.length})</span>
                          </>
                        ) : bulkSelectedDispatchMode === 'webhook' ? (
                          <>
                            <Webhook className="w-4 h-4" />
                            <span>DISPATCH VIA WEBHOOK ({bulkStudents.length})</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4" />
                            <span>DISPATCH VIA META API ({bulkStudents.length})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {isBulkSending && (
                  <div className="w-full text-center text-xs text-slate-500 py-1 font-medium">
                    Processing in parallel... please keep this window open for a moment.
                  </div>
                )}

                {!isBulkSending && bulkResults && (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadBulkReportCsv}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download CSV Report
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyBroadcastPack}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedBroadcastPack ? 'Copied!' : 'Copy Numbers'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsBulkModalOpen(false);
                        setBulkResults(null);
                      }}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      Done & Return to List
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
