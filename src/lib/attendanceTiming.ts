import { useState, useEffect, useCallback } from 'react';

export type TimingPresetKey =
  | 'regular'
  | 'exam_extended'
  | 'exam_morning'
  | 'exam_evening'
  | 'custom';

export interface ClassTimingOverride {
  id: string;
  className: string;
  shiftName: string; // e.g. "Morning Exam Shift", "Evening Exam Shift"
  schoolStartTime: string; // e.g. "07:30" or "12:30"
  lateCutoff: string; // e.g. "08:00" or "13:00"
  halfDayCutoff: string; // e.g. "10:00" or "14:30"
  earlyLeaveCutoff: string; // e.g. "12:30" or "16:30"
  closingTime: string; // e.g. "12:30" or "16:30"
  note?: string;
}

export interface AttendanceTimingConfig {
  activePreset: TimingPresetKey;
  activeSessionName: string;
  schoolStartTime: string; // e.g. "08:00"
  lateCutoff: string; // e.g. "08:45"
  halfDayCutoff: string; // e.g. "11:30"
  earlyLeaveCutoff: string; // e.g. "14:30" or "16:30"
  closingTime: string; // e.g. "14:30" or "16:30"
  isExamMode: boolean;
  examNote?: string;
  allowManualOverride: boolean;
  classOverrides: ClassTimingOverride[];
  lastUpdated?: string;
  updatedBy?: string;
}

export const TIMING_STORAGE_KEY = 'school_attendance_timing_config_v2';

export const DEFAULT_TIMING_CONFIG: AttendanceTimingConfig = {
  activePreset: 'regular',
  activeSessionName: 'Regular School Day',
  schoolStartTime: '08:00',
  lateCutoff: '08:45',
  halfDayCutoff: '11:30',
  earlyLeaveCutoff: '14:30',
  closingTime: '14:30',
  isExamMode: false,
  examNote: '',
  allowManualOverride: true,
  classOverrides: [],
  lastUpdated: new Date().toISOString()
};

export const PRESETS: Record<Exclude<TimingPresetKey, 'custom'>, AttendanceTimingConfig> = {
  regular: {
    activePreset: 'regular',
    activeSessionName: 'Regular School Day (08:00 AM - 02:30 PM)',
    schoolStartTime: '08:00',
    lateCutoff: '08:45',
    halfDayCutoff: '11:30',
    earlyLeaveCutoff: '14:30',
    closingTime: '14:30',
    isExamMode: false,
    examNote: 'Standard school timetable and dismissals',
    allowManualOverride: true,
    classOverrides: []
  },
  exam_extended: {
    activePreset: 'exam_extended',
    activeSessionName: 'Examination Extended Day (Closes at 04:30 PM)',
    schoolStartTime: '08:00',
    lateCutoff: '08:45',
    halfDayCutoff: '12:30',
    earlyLeaveCutoff: '16:30',
    closingTime: '16:30',
    isExamMode: true,
    examNote: 'Special examination hours - Departure before 04:30 PM is marked as Early Leave',
    allowManualOverride: true,
    classOverrides: []
  },
  exam_morning: {
    activePreset: 'exam_morning',
    activeSessionName: 'Morning Exam Shift (07:30 AM - 12:30 PM)',
    schoolStartTime: '07:30',
    lateCutoff: '08:00',
    halfDayCutoff: '10:00',
    earlyLeaveCutoff: '12:30',
    closingTime: '12:30',
    isExamMode: true,
    examNote: 'Early morning examination session',
    allowManualOverride: true,
    classOverrides: []
  },
  exam_evening: {
    activePreset: 'exam_evening',
    activeSessionName: 'Afternoon / Evening Exam Shift (12:30 PM - 04:30 PM)',
    schoolStartTime: '12:30',
    lateCutoff: '13:00',
    halfDayCutoff: '14:30',
    earlyLeaveCutoff: '16:30',
    closingTime: '16:30',
    isExamMode: true,
    examNote: 'Afternoon/Evening examination session for senior classes',
    allowManualOverride: true,
    classOverrides: []
  }
};

/**
 * Converts "16:30" to "04:30 PM", or "08:45" to "08:45 AM"
 */
export function formatTime12h(time24?: string): string {
  if (!time24 || !time24.includes(':')) return time24 || '--:--';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayHStr = displayH < 10 ? `0${displayH}` : `${displayH}`;
  const displayMStr = m < 10 ? `0${m}` : `${m}`;
  return `${displayHStr}:${displayMStr} ${ampm}`;
}

/**
 * Loads current timing config from localStorage
 */
export function loadAttendanceTimingConfig(): AttendanceTimingConfig {
  try {
    const raw = localStorage.getItem(TIMING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_TIMING_CONFIG,
        ...parsed,
        classOverrides: Array.isArray(parsed.classOverrides) ? parsed.classOverrides : []
      };
    }
  } catch (e) {
    console.warn('Failed to parse attendance timing config from storage, using defaults:', e);
  }
  return DEFAULT_TIMING_CONFIG;
}

/**
 * Saves current timing config to localStorage and broadcasts update event
 */
export function saveAttendanceTimingConfig(config: AttendanceTimingConfig): void {
  try {
    const payload: AttendanceTimingConfig = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(TIMING_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('attendance-timing-updated', { detail: payload }));
  } catch (e) {
    console.error('Failed to save attendance timing config to storage:', e);
  }
}

export interface ResolvedTiming {
  sessionName: string;
  schoolStartTime: string;
  lateCutoff: string;
  halfDayCutoff: string;
  earlyLeaveCutoff: string;
  closingTime: string;
  isExamMode: boolean;
  isClassSpecific: boolean;
  note?: string;
  isLate: (timeStr: string) => boolean;
  isEarlyLeave: (timeStr: string) => boolean;
}

/**
 * Resolves the applicable timing parameters for a specific student or teacher.
 * If a class override exists for student's class, that class's custom times apply.
 * Otherwise, the global active config applies.
 */
export function resolveTimingForMember(
  config: AttendanceTimingConfig,
  className?: string
): ResolvedTiming {
  const normClass = (className || '').trim().toLowerCase();
  
  if (normClass && config.classOverrides && config.classOverrides.length > 0) {
    const matched = config.classOverrides.find(
      (o) => o.className.trim().toLowerCase() === normClass
    );
    if (matched) {
      return {
        sessionName: matched.shiftName || config.activeSessionName,
        schoolStartTime: matched.schoolStartTime || config.schoolStartTime,
        lateCutoff: matched.lateCutoff || config.lateCutoff,
        halfDayCutoff: matched.halfDayCutoff || config.halfDayCutoff,
        earlyLeaveCutoff: matched.earlyLeaveCutoff || config.earlyLeaveCutoff,
        closingTime: matched.closingTime || config.closingTime,
        isExamMode: config.isExamMode,
        isClassSpecific: true,
        note: matched.note || config.examNote,
        isLate: (timeStr: string) => {
          if (!timeStr) return false;
          return timeStr > matched.lateCutoff;
        },
        isEarlyLeave: (timeStr: string) => {
          if (!timeStr) return false;
          return timeStr < matched.earlyLeaveCutoff;
        }
      };
    }
  }

  // Global fallback
  return {
    sessionName: config.activeSessionName,
    schoolStartTime: config.schoolStartTime,
    lateCutoff: config.lateCutoff,
    halfDayCutoff: config.halfDayCutoff,
    earlyLeaveCutoff: config.earlyLeaveCutoff,
    closingTime: config.closingTime,
    isExamMode: config.isExamMode,
    isClassSpecific: false,
    note: config.examNote,
    isLate: (timeStr: string) => {
      if (!timeStr) return false;
      return timeStr > config.lateCutoff;
    },
    isEarlyLeave: (timeStr: string) => {
      if (!timeStr) return false;
      return timeStr < config.earlyLeaveCutoff;
    }
  };
}

/**
 * Custom React Hook to subscribe to attendance timing config in real-time
 */
export function useAttendanceTiming() {
  const [config, setConfig] = useState<AttendanceTimingConfig>(loadAttendanceTimingConfig);

  useEffect(() => {
    // Initial sync
    setConfig(loadAttendanceTimingConfig());

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AttendanceTimingConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      } else {
        setConfig(loadAttendanceTimingConfig());
      }
    };

    window.addEventListener('attendance-timing-updated', handleUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === TIMING_STORAGE_KEY) {
        setConfig(loadAttendanceTimingConfig());
      }
    });

    return () => {
      window.removeEventListener('attendance-timing-updated', handleUpdate);
    };
  }, []);

  const updateConfig = useCallback((newConfig: AttendanceTimingConfig) => {
    saveAttendanceTimingConfig(newConfig);
    setConfig(newConfig);
  }, []);

  const resolveForClass = useCallback(
    (className?: string) => resolveTimingForMember(config, className),
    [config]
  );

  return {
    timingConfig: config,
    updateTimingConfig: updateConfig,
    resolveForClass
  };
}
