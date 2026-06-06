import { useState, lazy, Suspense, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  FileSpreadsheet,
  QrCode,
  ScanFace,
  ListOrdered,
  Save,
  Edit2,
  X,
  Loader2,
  Download,
  Printer,
  UserX,
  Users,
  GraduationCap,
  Briefcase,
  Sparkles,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSchool } from "@/context/SchoolContext";
import { useWebsite } from "@/context/WebsiteContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

const QRScanner = lazy(() => import("@/components/attendance/QRScanner"));
const FaceScanner = lazy(() => import("@/components/attendance/FaceScanner"));

const initialMockAttendance = [
  {
    id: "1",
    date: new Date().toISOString(),
    class: "Class 10",
    section: "A",
    present: 42,
    absent: 3,
    late: 0,
    status: "Completed",
    markedBy: "Face ID System",
  },
  {
    id: "2",
    date: new Date().toISOString(),
    class: "Class 8",
    section: "B",
    present: 38,
    absent: 1,
    late: 2,
    status: "Completed",
    markedBy: "QR Scanner",
  },
  {
    id: "3",
    date: new Date().toISOString(),
    class: "Class 12",
    section: "A",
    present: 30,
    absent: 5,
    late: 0,
    status: "Completed",
    markedBy: "Mrs. Emily Brown",
  },
];

type ActiveTab = "overview" | "qr" | "face" | "absent-manager" | "monthly-ledger";

export default function Attendance() {
  const { students, teachers, attendanceMap, saveAttendanceRecord } =
    useSchool();
  const { settings } = useWebsite();
  const { user } = useAuth();
  const [memberType, setMemberType] = useState<
    "Student" | "Teacher"
  >("Student");

  useEffect(() => {
    if (user?.attendanceScope) {
      if (user.attendanceScope === "Only Students") {
        setMemberType("Student");
      } else if (user.attendanceScope === "Teachers" || user.attendanceScope === "Staff") {
        setMemberType("Teacher");
      }
    }
  }, [user]);
  const location = useLocation();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [faceScannerFilterType, setFaceScannerFilterType] = useState<"All" | "Student" | "Teacher">("All");
  const [faceScannerFilterClass, setFaceScannerFilterClass] = useState<string>("");
  const [viewMode, setViewMode] = useState<"detailed" | "summary" | "class-overview">("detailed");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAbsenteesOnly, setShowAbsenteesOnly] = useState(false);
  const [monitorStatusFilter, setMonitorStatusFilter] = useState<"All" | "Present" | "Absent" | "Late">("All");
  const [monitorCategoryFilter, setMonitorCategoryFilter] = useState<"All" | "Student" | "Teacher">("All");

  useEffect(() => {
    if (location.state) {
      const stateObj = location.state as any;
      if (stateObj.activeTab) {
        setActiveTab(stateObj.activeTab);
      }
      if (stateObj.monitorCategoryFilter) {
        setMonitorCategoryFilter(stateObj.monitorCategoryFilter);
      }
      if (stateObj.monitorStatusFilter) {
        setMonitorStatusFilter(stateObj.monitorStatusFilter);
      }
    }
  }, [location.state]);
  const [monitorClassFilter, setMonitorClassFilter] = useState<string>("");
  const [monitorTeacherFilter, setMonitorTeacherFilter] = useState<string>("");

  const [attendanceData, setAttendanceData] = useState(initialMockAttendance);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [registerMonth, setRegisterMonth] = useState<number>(new Date().getMonth());
  const [registerYear, setRegisterYear] = useState<number>(new Date().getFullYear());
  const [registerTeacher, setRegisterTeacher] = useState<string>("");
  const [registerClass, setRegisterClass] = useState<string>(selectedClass || "Class 10");
  const [registerSection, setRegisterSection] = useState<string>("");
  const [registerTargetType, setRegisterTargetType] = useState<"Student" | "Teacher">("Student");

  const availableRegisterSections = useMemo(() => {
    if (!registerClass) return [];
    const sections = new Set<string>();
    students.forEach((s) => {
      if (
        s.class.toLowerCase().trim() === registerClass.toLowerCase().trim() &&
        s.section
      ) {
        sections.add(s.section.toUpperCase().trim());
      }
    });
    return Array.from(sections).sort();
  }, [students, registerClass]);

  const handleUpdateAttendanceStatus = (
    id: string,
    newStatus: "Present" | "Absent" | "Late",
  ) => {
    saveAttendanceRecord(id, date, { status: newStatus });
  };

  const handleUpdateRemarks = (id: string, text: string) => {
    saveAttendanceRecord(id, date, { remarks: text });
  };

  const handleUpdateInTime = (id: string, text: string) => {
    saveAttendanceRecord(id, date, { inTime: text });
  };

  const handleUpdateOutTime = (id: string, text: string) => {
    saveAttendanceRecord(id, date, { outTime: text });
  };

  const handleUpdateEarlyOutReason = (id: string, text: string) => {
    saveAttendanceRecord(id, date, { earlyOutReason: text });
  };

  // Dynamic logic to automatically calculate missing attendances
  const getCalculatedStatus = (record: any, queryDate: string) => {
    if (record?.status) return record.status;

    // Do not automatically assume Absent just because it's past 10 AM or a previous day.
    // If not explicitly recorded as Absent, keep it as 'Not Recorded' so the user 
    // knows the data wasn't taken, rather than thinking the student was physically absent.
    return "Not Recorded";
  };

  const currentLevelStats = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    if (memberType === "Student") {
      const activeList = selectedClass
        ? students.filter((s) => s.class === selectedClass)
        : students;
      activeList.forEach((student) => {
        const record = attendanceMap[`${date}:${student.id}`];
        const status = getCalculatedStatus(record, date);
        if (status === "Present") presentCount++;
        else if (status === "Absent") absentCount++;
        else if (status === "Late") lateCount++;
      });
      return {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: activeList.length,
      };
    } else if (memberType === "Teacher") {
      teachers.forEach((teacher) => {
        const record = attendanceMap[`${date}:${teacher.id}`];
        const status = getCalculatedStatus(record, date);
        if (status === "Present") presentCount++;
        else if (status === "Absent") absentCount++;
        else if (status === "Late") lateCount++;
      });
      return {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: teachers.length,
      };
    } else {
      const staffList = settings.staffMembers || [];
      staffList.forEach((staff: any) => {
        const record = attendanceMap[`${date}:${staff.id}`];
        const status = getCalculatedStatus(record, date);
        if (status === "Present") presentCount++;
        else if (status === "Absent") absentCount++;
        else if (status === "Late") lateCount++;
      });
      return {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: staffList.length,
      };
    }
  }, [
    students,
    teachers,
    settings.staffMembers,
    memberType,
    selectedClass,
    date,
    attendanceMap,
  ]);

  const classes = [
    "Nursery",
    "LKG",
    "UKG",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Class 11",
    "Class 12",
  ];

  const classWiseStats = useMemo(() => {
    const stats: Record<
      string,
      { total: number; present: number; absent: number; late: number; sections: string[] }
    > = {};

    classes.forEach((c) => {
      stats[c] = { total: 0, present: 0, absent: 0, late: 0, sections: [] };
    });

    students.forEach((s) => {
      const classKey = s.class;
      if (!stats[classKey]) {
        stats[classKey] = { total: 0, present: 0, absent: 0, late: 0, sections: [] };
      }

      const secVal = (s.section || "A").toUpperCase().trim();
      if (!stats[classKey].sections.includes(secVal)) {
        stats[classKey].sections.push(secVal);
      }

      stats[classKey].total += 1;

      const record = attendanceMap[`${date}:${s.id}`];
      const status = getCalculatedStatus(record, date);
      if (status === "Present") {
        stats[classKey].present += 1;
      } else if (status === "Absent") {
        stats[classKey].absent += 1;
      } else if (status === "Late") {
        stats[classKey].late += 1;
      }
    });

    return stats;
  }, [students, classes, date, attendanceMap]);

  const filteredOverviewClasses = useMemo(() => {
    if (!searchQuery) return classes;
    return classes.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [classes, searchQuery]);

  const availableSections = useMemo(() => {
    if (!selectedClass) return [];
    const sections = new Set<string>();
    students.forEach((s) => {
      if (
        s.class.toLowerCase().trim() === selectedClass.toLowerCase().trim() &&
        s.section
      ) {
        sections.add(s.section.toUpperCase().trim());
      }
    });
    return Array.from(sections).sort();
  }, [students, selectedClass]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesClass = selectedClass
        ? s.class.toLowerCase().trim() === selectedClass.toLowerCase().trim()
        : true;
      const matchesSection = selectedSection
        ? (s.section || "").toUpperCase().trim() === selectedSection.toUpperCase().trim()
        : true;
      const matchesSearch = searchQuery
        ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.class &&
            s.class.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (s.roll && s.roll.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      let matchesAbsent = true;
      if (showAbsenteesOnly) {
         const record = attendanceMap[`${date}:${s.id}`];
         matchesAbsent = getCalculatedStatus(record, date) === "Absent";
      }
      return matchesClass && matchesSection && matchesSearch && matchesAbsent;
    });
  }, [students, selectedClass, selectedSection, searchQuery, showAbsenteesOnly, attendanceMap, date]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchesSearch = searchQuery
        ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.subject &&
            t.subject.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      let matchesAbsent = true;
      if (showAbsenteesOnly) {
         const record = attendanceMap[`${date}:${t.id}`];
         matchesAbsent = getCalculatedStatus(record, date) === "Absent";
      }
      return matchesSearch && matchesAbsent;
    });
  }, [teachers, searchQuery, showAbsenteesOnly, attendanceMap, date]);

  const filteredAttendanceData = useMemo(() => {
    return attendanceData.filter((record) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        record.class.toLowerCase().includes(query) ||
        record.markedBy.toLowerCase().includes(query) ||
        record.status.toLowerCase().includes(query)
      );
    });
  }, [attendanceData, searchQuery]);

  const currentMonitorData = useMemo(() => {
    // 1. Students
    const studentData = students
      .filter((s) => {
        if (monitorCategoryFilter !== "All" && monitorCategoryFilter !== "Student") return false;
        // If a teacher filter is active, we hide students when showing "All" category
        if (monitorTeacherFilter && monitorCategoryFilter === "All") return false;
        const matchesClass = monitorClassFilter ? s.class === monitorClassFilter : true;
        const matchesSearch = searchQuery
          ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.id.toLowerCase().includes(searchQuery.toLowerCase())
          : true;
        if (!matchesClass || !matchesSearch) return false;
        
        const record = attendanceMap[`${date}:${s.id}`];
        const status = getCalculatedStatus(record, date);
        if (monitorStatusFilter !== "All" && status !== monitorStatusFilter) return false;
        
        return true;
      })
      .map(s => {
        const record = attendanceMap[`${date}:${s.id}`];
        return {
          id: s.id,
          name: s.name,
          type: "Student" as const,
          details: `${s.class} - Sec ${s.section || 'A'}`,
          groupByKey: s.class, // For grouping students by class
          photoUrl: s.avatar || "",
          roll: s.roll || "",
          record
        };
      });

    // 2. Teachers
    const teacherData = teachers
      .filter((t) => {
        if (monitorCategoryFilter !== "All" && monitorCategoryFilter !== "Teacher") return false;
        const matchesTeacher = monitorTeacherFilter ? t.id === monitorTeacherFilter : true;
        if (!matchesTeacher) return false;
        const matchesSearch = searchQuery
          ? t.name.toLowerCase().includes(searchQuery.toLowerCase())
          : true;
        if (!matchesSearch) return false;

        const record = attendanceMap[`${date}:${t.id}`];
        const status = getCalculatedStatus(record, date);
        if (monitorStatusFilter !== "All" && status !== monitorStatusFilter) return false;
        
        return true;
      })
      .map(t => {
        const record = attendanceMap[`${date}:${t.id}`];
        return {
          id: t.id,
          name: t.name,
          type: "Teacher" as const,
          details: t.subject || "Educator",
          groupByKey: "Teachers",
          photoUrl: t.avatar || t.photoUrl || "",
          roll: "",
          record
        };
      });

    return [...studentData, ...teacherData];
  }, [students, teachers, monitorClassFilter, monitorTeacherFilter, searchQuery, attendanceMap, date, monitorStatusFilter, monitorCategoryFilter]);

  const exportAttendanceDetails = () => {
    let csvHeader = "";
    let csvRows = [];

    if (selectedClass) {
      csvHeader =
        "Roll No,Student Name,Class,Section,Status,In Time,Out Time\n";
      const classStudents = students.filter((s) => s.class === selectedClass);
      classStudents.forEach((student) => {
        const record = attendanceMap[`${date}:${student.id}`];
        const status = getCalculatedStatus(record, date);
        const inTime =
          record?.inTime ||
          (status !== "Absent" && status !== "Not Recorded" ? "09:00" : "");
        const outTime =
          record?.outTime ||
          (status !== "Absent" && status !== "Not Recorded" ? "15:00" : "");
        csvRows.push(
          `${student.roll || ""},"${student.name}","${student.class}","${student.section || "A"}",${status},"${inTime}","${outTime}"`,
        );
      });
    } else {
      csvHeader = "Class,Section,Total Students,Present,Absent,Late\n";
      classes.forEach((c) => {
        const classStudents = students.filter((s) => s.class === c);
        let present = 0;
        let absent = 0;
        let late = 0;
        classStudents.forEach((st) => {
          const record = attendanceMap[`${date}:${st.id}`];
          const status = getCalculatedStatus(record, date);
          if (status === "Present") present++;
          else if (status === "Absent") absent++;
          else if (status === "Late") late++;
        });
        csvRows.push(
          `"${c}",A,${classStudents.length},${present},${absent},${late}`,
        );
      });
    }

    const csvContent =
      "data:text/csv;charset=utf-8," + csvHeader + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Attendance_${selectedClass ? selectedClass : "Overview"}_${date}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAbsentList = () => {
    let csvHeader = "Roll No/ID,Name,Type/Class,Section,Status\n";
    let csvRows = [];

    let membersToFilter: any[] = [];
    if (memberType === "Student") {
       membersToFilter = selectedClass ? students.filter(s => s.class === selectedClass && (!selectedSection || s.section === selectedSection)) : students;
    } else if (memberType === "Teacher") {
       membersToFilter = teachers;
    } else {
       membersToFilter = settings.staffMembers || [];
    }

    const absentees = membersToFilter.filter(member => {
        const record = attendanceMap[`${date}:${member.id}`];
        const status = getCalculatedStatus(record, date);
        return status === "Absent";
    });

    if (absentees.length === 0) {
      alert("No absentees found for the selected criteria.");
      return;
    }

    absentees.forEach((member) => {
      const displayId = memberType === "Student" ? (member.roll || "") : (member.id || "");
      const typeLabel = memberType === "Student" ? member.class : (memberType === "Teacher" ? (member.subject || "Teacher") : (member.role || "Staff"));
      csvRows.push(
        `${displayId},"${member.name}","${typeLabel}","${member.section || ""}","Absent"`,
      );
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvHeader + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Absent_List_${memberType}_${selectedClass ? selectedClass : "All"}_${date}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMonitorList = () => {
    let csvHeader = "ID/Roll,Name,Type,Group/Class,Status,In Time,Out Time,Remarks\n";
    let csvRows: string[] = [];

    if (currentMonitorData.length === 0) {
      alert("No data available to export for the current filters.");
      return;
    }

    currentMonitorData.forEach((member) => {
      const record = attendanceMap[`${date}:${member.id}`];
      const status = getCalculatedStatus(record, date);
      const inTime = record?.inTime || "";
      const outTime = record?.outTime || "";
      const remarks = record?.remarks || "";

      csvRows.push(
        `"${member.roll || member.id}","${member.name}","${member.type}","${member.details}","${status}","${inTime}","${outTime}","${remarks}"`
      );
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvHeader + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Live_Monitor_List_${monitorStatusFilter}_${date}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printMonitorList = () => {
    if (currentMonitorData.length === 0) {
      alert("No data available to print for the current filters.");
      return;
    }

    let htmlContent = `
      <html>
        <head>
          <title>Live Monitor Report - ${date}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @media print {
              @page {
                size: landscape A4;
                margin: 10mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0;
              }
              .no-print {
                display: none !important;
              }
              .page-break {
                page-break-before: always;
              }
            }
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              padding: 20px;
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 15px;
            }
            .header h1 {
              margin: 0 0 5px 0;
              font-size: 24px;
              font-weight: 800;
              color: #1e293b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .header p {
              margin: 0;
              color: #64748b;
              font-size: 14px;
              font-weight: 500;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #f8fafc;
              color: #334155;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.5px;
              padding: 12px 15px;
              border: 1px solid #cbd5e1;
              text-align: left;
            }
            td {
              padding: 10px 15px;
              border: 1px solid #e2e8f0;
              font-size: 13px;
              color: #1e293b;
              font-weight: 500;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .status-present { color: #059669; font-weight: 700; }
            .status-absent { color: #e11d48; font-weight: 700; }
            .status-late { color: #d97706; font-weight: 700; }
            
            .print-btn-bar {
              background: #f1f5f9;
              padding: 12px 20px;
              border-radius: 8px;
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              margin-bottom: 20px;
              border: 1px solid #e2e8f0;
            }
            .action-btn {
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              background: #1e293b;
              color: white;
            }
            .close-btn {
              background: #fff;
              color: #334155;
              border: 1px solid #cbd5e1;
            }
          </style>
        </head>
        <body>
          <div class="print-btn-bar no-print">
            <span style="font-size: 13px; color: #1e40af; margin-right: auto; font-weight: 700;">
              Live Monitor Report (A4 Landscape)
            </span>
            <button class="action-btn close-btn" onclick="window.close()">Close</button>
            <button class="action-btn" onclick="window.print()">Print / Save PDF</button>
          </div>
          
          <div class="header">
            <h1>Live Attendance Monitor</h1>
            <p>Report Date: ${date} | Status Filter: ${monitorStatusFilter}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID/Roll</th>
                <th>Name</th>
                <th>Category</th>
                <th>Class/Role</th>
                <th>Status</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
    `;

    currentMonitorData.forEach((member) => {
      const record = attendanceMap[`${date}:${member.id}`];
      const status = getCalculatedStatus(record, date);
      const inTime = record?.inTime || "";
      const outTime = record?.outTime || "";
      const remarks = record?.remarks || "";

      let statusClass = "";
      if (status === "Present") statusClass = "status-present";
      if (status === "Absent") statusClass = "status-absent";
      if (status === "Late") statusClass = "status-late";

      htmlContent += `
        <tr>
          <td>${member.roll || member.id || "-"}</td>
          <td style="font-weight: 700;">${member.name}</td>
          <td>${member.type}</td>
          <td>${member.details || "-"}</td>
          <td class="${statusClass}">${status || "-"}</td>
          <td>${inTime || "-"}</td>
          <td>${outTime || "-"}</td>
          <td>${remarks || "-"}</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
          <div style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">
            <p>End of Report</p>
          </div>
        </body>
      </html>
    `;

    const win = window.open("", "", "width=1200,height=800");
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      setTimeout(() => {
        win.print();
      }, 500);
    }
  };

  const printClassList = () => {
    let htmlContent = `
      <html>
        <head>
          <title>Class List</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${selectedClass ? selectedClass + " - " : "All Classes "}Attendance Sheet</h2>
            <p>Date: ${format(new Date(date), "MMMM dd, yyyy")}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%">Roll No</th>
                <th style="width: 40%">Student Name</th>
                <th style="width: 20%">Class / Section</th>
                <th style="width: 30%">Attendance / Signature</th>
              </tr>
            </thead>
            <tbody>
    `;

    const studentsToPrint = selectedClass
      ? students.filter((s) => s.class === selectedClass)
      : students;

    studentsToPrint.forEach((student) => {
      htmlContent += `
        <tr>
          <td>${student.roll || "-"}</td>
          <td><b>${student.name}</b></td>
          <td>${student.class}${student.section ? " - " + student.section : ""}</td>
          <td></td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      win.print();
    }
  };

  const printMonthlyRegister = (monthVal: number, yearVal: number, teacherName: string, classVal: string, sectionVal: string, targetType: "Student" | "Teacher") => {
    const totalDays = new Date(yearVal, monthVal + 1, 0).getDate();
    const weekdayShorts = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    
    const daysArray = [];
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(yearVal, monthVal, d);
      const dayName = weekdayShorts[curDate.getDay()];
      const dateStr = `${yearVal}-${String(monthVal + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArray.push({
        dayNum: d,
        dayName: dayName,
        dateStr: dateStr
      });
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[monthVal];

    let membersList: any[] = [];
    let titleSubject = "";
    if (targetType === "Student") {
      membersList = students.filter((s) => s.class === classVal && (!sectionVal || s.section === sectionVal));
      membersList.sort((a, b) => {
        const rA = parseInt(a.roll) || 999;
        const rB = parseInt(b.roll) || 999;
        if (rA !== rB) return rA - rB;
        return a.name.localeCompare(b.name);
      });
      titleSubject = `Class: ${classVal}${sectionVal ? ' - Section ' + sectionVal : ''}`;
    } else {
      membersList = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
      titleSubject = "Faculty / Teachers";
    }

    let tableRowsHtml = "";

    membersList.forEach((member, index) => {
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let dailyStatusCells = "";
      
      daysArray.forEach((day) => {
        const record = attendanceMap[`${day.dateStr}:${member.id}`];
        let statusSymbol = "";
        let cellClass = "";
        
        if (record && record.status) {
          if (record.status === "Present") {
            statusSymbol = "P";
            presentCount++;
            cellClass = "p-cell";
          } else if (record.status === "Absent") {
            statusSymbol = "A";
            absentCount++;
            cellClass = "a-cell";
          } else if (record.status === "Late") {
            statusSymbol = "L";
            lateCount++;
            cellClass = "l-cell";
          }
        } else {
          const isSunday = day.dayName === "Su";
          if (isSunday) {
            statusSymbol = "Su";
            cellClass = "sunday-col";
          } else {
            statusSymbol = "";
            cellClass = "";
          }
        }

        dailyStatusCells += `<td class="${cellClass}">${statusSymbol}</td>`;
      });

      const displayRollOrId = targetType === "Student" ? (member.roll || index + 1) : (member.id || index + 1);

      tableRowsHtml += `
        <tr>
          <td class="roll-col">${displayRollOrId}</td>
          <td class="name-col">${member.name}</td>
          ${dailyStatusCells}
          <td class="total-col p-total">${presentCount}</td>
          <td class="total-col a-total">${absentCount}</td>
          <td class="total-col l-total">${lateCount}</td>
        </tr>
      `;
    });

    const displaySchoolName = settings.schoolName || "Bhogamur Jatiya Vidya Niketon";
    const logoImgUrl = settings.logoUrl || "";

    let htmlContent = `
      <html>
        <head>
          <title>Monthly Attendance Register - ${monthName} ${yearVal}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @media print {
              @page {
                size: landscape;
                margin: 5mm 8mm 5mm 8mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color: #000;
              }
              .no-print {
                display: none !important;
              }
            }
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              font-size: 10px;
              margin: 0;
              padding: 15px;
              color: #1e293b;
              background-color: #fff;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #cbd5e1;
              padding-bottom: 12px;
            }
            .school-title {
              font-size: 22px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
              color: #0f172a;
            }
            .register-subtitle {
              font-size: 14px;
              font-weight: 600;
              margin: 4px 0 0 0;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-info {
              font-size: 11px;
              font-weight: 700;
              display: flex;
              gap: 15px;
              margin-top: 10px;
            }
            .meta-info-item {
              padding: 4px 10px;
              border-radius: 4px;
              border: 1px solid #e2e8f0;
              background-color: #f8fafc;
              color: #334155;
            }
            .meta-info-item span {
              color: #64748b;
              font-weight: 600;
              margin-right: 6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              border: 1px solid #cbd5e1;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 4px 2px;
              text-align: center;
              font-size: 8.5px;
              line-height: 1.2;
            }
            th {
              background-color: #f1f5f9;
              font-weight: 700;
              color: #1e293b;
              text-transform: uppercase;
              font-size: 8px;
            }
            .main-head {
              font-size: 9px;
              padding: 6px 3px;
              background-color: #e2e8f0;
            }
            .name-col {
              text-align: left;
              padding-left: 8px;
              font-weight: 600;
              white-space: nowrap;
              min-width: 150px;
              color: #0f172a;
              border-right: 2px solid #cbd5e1 !important;
            }
            .roll-col {
              font-weight: 700;
              min-width: 40px;
              background-color: #f8fafc;
              border-right: 1.5px solid #e2e8f0;
            }
            /* Colors highlighting style for symbols */
            .p-cell {
              color: #15803d !important;
              font-weight: 800;
              font-size: 10px;
            }
            .a-cell {
              color: #b91c1c !important;
              font-weight: 800;
              font-size: 10px;
              background-color: #fef2f2 !important;
            }
            .l-cell {
              color: #b45309 !important;
              font-weight: 800;
              font-size: 10px;
            }
            .sunday-col {
              background-color: #f8fafc !important; 
              color: #64748b !important;
              font-size: 9px;
            }
            .sunday-header {
              background-color: #e2e8f0 !important;
              color: #475569 !important;
            }
            .total-col {
              font-weight: 800;
              min-width: 38px;
              font-size: 9.5px;
              border-left: 1.5px solid #cbd5e1;
            }
            .p-total {
              color: #15803d !important;
              background-color: #f0fdf4 !important;
            }
            .a-total {
              color: #b91c1c !important;
              background-color: #fef2f2 !important;
            }
            .l-total {
              color: #b45309 !important;
              background-color: #fffbeb !important;
            }
            .footer-sign {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              padding: 0 40px;
            }
            .signature-box {
              border-top: 1px solid #475569;
              width: 180px;
              text-align: center;
              padding-top: 6px;
              font-size: 11px;
              font-weight: 600;
              color: #334155;
            }
            .print-btn-bar {
              background: #f1f5f9;
              padding: 12px 20px;
              border-bottom: 2px solid #cbd5e1;
              display: flex;
              gap: 12px;
              justify-content: flex-end;
              align-items: center;
              font-family: sans-serif;
              border-radius: 8px;
              margin-bottom: 15px;
            }
            .action-btn {
              background: #2563eb;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              font-size: 12.5px;
              font-weight: bold;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
              transition: all 0.2s;
            }
            .action-btn:hover {
              background: #1d4ed8;
              transform: translateY(-1px);
            }
            .close-btn {
              background: white;
              color: #475569;
              border: 1px solid #cbd5e1;
              box-shadow: none;
            }
            .close-btn:hover {
              background: #e2e8f0;
              color: #0f172a;
            }
            /* Row zebra coloring */
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            tr:hover {
              background-color: #f1f5f9;
            }
          </style>
        </head>
        <body>
          <div class="print-btn-bar no-print">
            <span style="font-size: 13px; color: #1e40af; margin-right: auto; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              🌈 Printable Landscape Attendance Ledger Sheet
            </span>
            <button class="action-btn close-btn" onclick="window.close()">Close</button>
            <button class="action-btn" onclick="window.print()">Print Ledger / Save as PDF</button>
          </div>
          
          <div class="header-container">
            <div>
              <h1 class="school-title">${displaySchoolName}</h1>
              <h2 class="register-subtitle">Monthly Attendance Register Ledger</h2>
              
              <div class="meta-info">
                <div class="meta-info-item"><span>Month:</span>${monthName} ${yearVal}</div>
                ${targetType === "Teacher" ? "" : `<div class="meta-info-item"><span>T. Name:</span>${teacherName || "N/A"}</div>`}
                <div class="meta-info-item"><span>Category / Section:</span>${titleSubject}</div>
              </div>
            </div>
            ${logoImgUrl ? `<img src="${logoImgUrl}" alt="School Logo" style="height: 48px; object-fit: contain; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.1));" onerror="this.style.display='none'" />` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" class="main-head roll-col">${targetType === "Student" ? "Roll No" : "ID"}</th>
                <th rowspan="2" class="main-head name-col">${targetType === "Student" ? "Student Name" : "Name"}</th>
                ${daysArray.map(day => `<th class="main-head ${day.dayName === 'Su' ? 'sunday-header' : ''}">${day.dayNum}</th>`).join('')}
                <th rowspan="2" class="main-head total-col p-total" title="Total Present">P</th>
                <th rowspan="2" class="main-head total-col a-total" title="Total Absent">A</th>
                <th rowspan="2" class="main-head total-col l-total" title="Total Late">L</th>
              </tr>
              <tr>
                ${daysArray.map(day => `<th class="${day.dayName === 'Su' ? 'sunday-header' : ''}" style="font-size: 7px; padding: 2px 1px;">${day.dayName}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="footer-sign">
            <div class="signature-box">Verified By Signature</div>
            <div class="signature-box">Principal / Auth. Signature</div>
          </div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      setTimeout(() => {
        win.print();
      }, 500);
    }
  };

  const printMonthlyEarlyOutRegister = (monthVal: number, yearVal: number, teacherName: string, classVal: string, sectionVal: string, targetType: "Student" | "Teacher") => {
    const totalDays = new Date(yearVal, monthVal + 1, 0).getDate();
    const weekdayShorts = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    
    const daysArray = [];
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(yearVal, monthVal, d);
      daysArray.push({
        dayNum: d,
        dayName: weekdayShorts[curDate.getDay()],
        dateStr: `${yearVal}-${String(monthVal + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[monthVal];

    let membersList: any[] = [];
    let titleSubject = "";
    if (targetType === "Student") {
      membersList = students.filter((s) => s.class === classVal && (!sectionVal || s.section === sectionVal));
      membersList.sort((a, b) => {
        const rA = parseInt(a.roll) || 999;
        const rB = parseInt(b.roll) || 999;
        if (rA !== rB) return rA - rB;
        return a.name.localeCompare(b.name);
      });
      titleSubject = `Class: ${classVal}${sectionVal ? ' - Section ' + sectionVal : ''}`;
    } else {
      membersList = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
      titleSubject = "Faculty / Teachers";
    }

    const earlyOutEvents: {
      date: string;
      id: string;
      name: string;
      rollOrId: string | number;
      outTime: string;
      reason: string;
    }[] = [];

    membersList.forEach((member, index) => {
      const displayRollOrId = targetType === "Student" ? (member.roll || index + 1) : (member.id || index + 1);
      
      daysArray.forEach((day) => {
        const record = attendanceMap[`${day.dateStr}:${member.id}`];
        if (record) {
          const isEarly = record.status === "EARLY LEAVE" || !!record.earlyOutReason || (record.outTime && record.outTime < "14:30");
          if (isEarly) {
            earlyOutEvents.push({
              date: day.dateStr,
              id: member.id,
              name: member.name,
              rollOrId: displayRollOrId,
              outTime: record.outTime || "Before 02:30 PM",
              reason: record.earlyOutReason || record.remarks || "Early Departure"
            });
          }
        }
      });
    });

    let tableRowsHtml = "";
    if (earlyOutEvents.length === 0) {
      tableRowsHtml = `
        <tr>
          <td colspan="5" style="padding: 30px; text-align: center; color: #64748b; font-size: 13px; font-weight: bold;">
            🎉 No Early Out records registered for this month!
          </td>
        </tr>
      `;
    } else {
      earlyOutEvents.sort((a, b) => a.date.localeCompare(b.date));
      earlyOutEvents.forEach((ev) => {
        tableRowsHtml += `
          <tr>
            <td style="font-weight: 700; color: #0f172a; padding: 10px 8px;">${ev.date}</td>
            <td style="font-weight: 700; background-color: #f8fafc; padding: 10px 8px;">${ev.rollOrId}</td>
            <td style="text-align: left; font-weight: 600; padding: 10px 8px; color: #1e293b;">${ev.name}</td>
            <td style="font-weight: bold; color: #0f766e; padding: 10px 8px;">${ev.outTime}</td>
            <td style="text-align: left; padding: 10px 8px; color: #475569; font-style: italic;">${ev.reason}</td>
          </tr>
        `;
      });
    }

    const displaySchoolName = settings.schoolName || "Bhogamur Jatiya Vidya Niketon";
    const logoImgUrl = settings.logoUrl || "";

    let htmlContent = `
      <html>
        <head>
          <title>Monthly Early Out Report - ${monthName} ${yearVal}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @media print {
              @page {
                size: portrait;
                margin: 10mm 15mm 10mm 15mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color: #000;
              }
              .no-print {
                display: none !important;
              }
            }
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              font-size: 11px;
              margin: 0;
              padding: 20px;
              color: #1e293b;
              background-color: #fff;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 25px;
              border-bottom: 3px solid #0f766e;
              padding-bottom: 15px;
            }
            .school-title {
              font-size: 24px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
              color: #0f172a;
            }
            .register-subtitle {
              font-size: 15px;
              font-weight: 700;
              margin: 4px 0 0 0;
              color: #0f766e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-info {
              font-size: 11px;
              font-weight: 700;
              display: flex;
              gap: 15px;
              margin-top: 10px;
            }
            .meta-info-item {
              padding: 5px 12px;
              border-radius: 6px;
              border: 1px solid #ccfbf1;
              background-color: #f0fdfa;
              color: #115e59;
            }
            .meta-info-item span {
              color: #0d9488;
              font-weight: 600;
              margin-right: 6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              border: 1px solid #cbd5e1;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              text-align: center;
              font-size: 11px;
              line-height: 1.4;
            }
            th {
              background-color: #f1f5f9;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              font-size: 10px;
              border-bottom: 2px solid #cbd5e1;
            }
            .footer-sign {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              padding: 0 40px;
            }
            .signature-box {
              border-top: 1px solid #475569;
              width: 200px;
              text-align: center;
              padding-top: 8px;
              font-size: 11px;
              font-weight: 600;
              color: #334155;
            }
            .print-btn-bar {
              background: #f1f5f9;
              padding: 12px 20px;
              border-bottom: 2px solid #cbd5e1;
              display: flex;
              gap: 12px;
              justify-content: flex-end;
              align-items: center;
              font-family: sans-serif;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .action-btn {
              background: #0d9488;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              font-size: 12.5px;
              font-weight: bold;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(13, 148, 136, 0.2);
              transition: all 0.2s;
            }
            .action-btn:hover {
              background: #0f766e;
              transform: translateY(-1px);
            }
            .close-btn {
              background: white;
              color: #475569;
              border: 1px solid #cbd5e1;
              box-shadow: none;
            }
            .close-btn:hover {
              background: #e2e8f0;
              color: #0f172a;
            }
            tr:nth-child(even) {
              background-color: #fcfdfd;
            }
            tr:hover {
              background-color: #f0fdfa;
            }
          </style>
        </head>
        <body>
          <div class="print-btn-bar no-print">
            <span style="font-size: 13px; color: #0d9488; margin-right: auto; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              🚪 Monthly Early Out (शीघ्र प्रस्थान/छुट्टी) Report 
            </span>
            <button class="action-btn close-btn" onclick="window.close()">Close</button>
            <button class="action-btn" onclick="window.print()">Print Report / Save as PDF</button>
          </div>
          
          <div class="header-container">
            <div>
              <h1 class="school-title">${displaySchoolName}</h1>
              <h2 class="register-subtitle">Monthly Early Out Register Report</h2>
              
              <div class="meta-info">
                <div class="meta-info-item"><span>Month:</span>${monthName} ${yearVal}</div>
                ${targetType === "Teacher" ? "" : `<div class="meta-info-item"><span>T. Name:</span>${teacherName || "N/A"}</div>`}
                <div class="meta-info-item"><span>Category / Section:</span>${titleSubject}</div>
              </div>
            </div>
            ${logoImgUrl ? `<img src="${logoImgUrl}" alt="School Logo" style="height: 52px; object-fit: contain; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.1));" onerror="this.style.display='none'" />` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 15%">Date (दिनांक)</th>
                <th style="width: 12%">${targetType === "Student" ? "Roll No" : "ID"}</th>
                <th style="width: 25%">Name (नाम)</th>
                <th style="width: 15%">Out Time (जाने का समय)</th>
                <th>Reason / Remarks (कारण / टिप्पणी)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="footer-sign">
            <div class="signature-box">Verified By Signature</div>
            <div class="signature-box">Principal / Auth. Signature</div>
          </div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      setTimeout(() => {
        win.print();
      }, 500);
    }
  };

  const exportMonthlyEarlyOutCSV = (monthVal: number, yearVal: number, teacherName: string, classVal: string, sectionVal: string, targetType: "Student" | "Teacher") => {
    const totalDays = new Date(yearVal, monthVal + 1, 0).getDate();
    const weekdayShorts = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    
    const daysArray = [];
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(yearVal, monthVal, d);
      daysArray.push({
        num: d,
        day: weekdayShorts[curDate.getDay()],
        dateStr: `${yearVal}-${String(monthVal + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[monthVal];

    let csvContent = `MONTHLY EARLY OUT REPORT (शीघ्र प्रस्थान सूची) - ${monthName.toUpperCase()} ${yearVal}\n`;
    csvContent += `School Name,${settings.schoolName || "Bhogamur Jatiya Vidya Niketon"}\n`;
    csvContent += `T. Name,${teacherName || "N/A"}\n`;
    if (targetType === "Student") {
        csvContent += `Category / Subject,Class ${classVal}${sectionVal ? ' - Section ' + sectionVal : ''}\n\n`;
    } else {
        csvContent += `Category / Subject,Faculty & Teachers\n\n`;
    }

    csvContent += `"Date (दिनांक)","${targetType === "Student" ? "Roll No" : "ID"}","Name (नाम)","Out Time (जाने का समय)","Reason / Remarks (कारण)"\n`;

    let membersList: any[] = [];
    if (targetType === "Student") {
      membersList = students.filter((s) => s.class === classVal && (!sectionVal || s.section === sectionVal));
      membersList.sort((a, b) => (parseInt(a.roll) || 999) - (parseInt(b.roll) || 999));
    } else {
      membersList = [...teachers].sort((a,b) => a.name.localeCompare(b.name));
    }

    const earlyOutEvents: {
      date: string;
      rollOrId: string | number;
      name: string;
      outTime: string;
      reason: string;
    }[] = [];

    membersList.forEach((member, index) => {
      const displayRollOrId = targetType === "Student" ? (member.roll || index + 1) : (member.id || index + 1);
      
      daysArray.forEach((day) => {
        const record = attendanceMap[`${day.dateStr}:${member.id}`];
        if (record) {
          const isEarly = record.status === "EARLY LEAVE" || !!record.earlyOutReason || (record.outTime && record.outTime < "14:30");
          if (isEarly) {
            earlyOutEvents.push({
              date: day.dateStr,
              rollOrId: displayRollOrId,
              name: member.name,
              outTime: record.outTime || "Before 02:30 PM",
              reason: record.earlyOutReason || record.remarks || "Early Departure"
            });
          }
        }
      });
    });

    if (earlyOutEvents.length === 0) {
      csvContent += `"No early leave records found for this period"\n`;
    } else {
      earlyOutEvents.sort((a, b) => a.date.localeCompare(b.date));
      earlyOutEvents.forEach((ev) => {
        csvContent += `"${ev.date}","${ev.rollOrId}","${ev.name}","${ev.outTime}","${ev.reason}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const encodedUri = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Monthly_EarlyOuts_${monthName}_${yearVal}_${targetType === "Student" ? classVal : targetType}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMonthlyRegisterCSV = (monthVal: number, yearVal: number, teacherName: string, classVal: string, sectionVal: string, targetType: "Student" | "Teacher") => {
    const totalDays = new Date(yearVal, monthVal + 1, 0).getDate();
    const weekdayShorts = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    
    const daysArray = [];
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(yearVal, monthVal, d);
      daysArray.push({
        num: d,
        day: weekdayShorts[curDate.getDay()],
        dateStr: `${yearVal}-${String(monthVal + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[monthVal];

    let csvContent = `MONTHLY ATTENDANCE REGISTER - ${monthName.toUpperCase()} ${yearVal}\n`;
    csvContent += `School Name,${settings.schoolName || "Bhogamur Jatiya Vidya Niketon"}\n`;
    csvContent += `T. Name,${teacherName || "N/A"}\n`;
    if (targetType === "Student") {
        csvContent += `Category / Subject,Class ${classVal}${sectionVal ? ' - Section ' + sectionVal : ''}\n\n`;
    } else {
        csvContent += `Category / Subject,Faculty & Teachers\n\n`;
    }

    const row1 = [targetType === "Student" ? "Roll No" : "ID", targetType === "Student" ? "Student Name" : "Teacher Name"];
    daysArray.forEach(d => row1.push(String(d.num)));
    row1.push("Total Present", "Total Absent", "Total Late");
    csvContent += row1.map(cell => `"${cell}"`).join(",") + "\n";

    const row2 = ["", ""];
    daysArray.forEach(d => row2.push(d.day));
    row2.push("", "", "");
    csvContent += row2.map(cell => `"${cell}"`).join(",") + "\n";

    let membersList: any[] = [];
    if (targetType === "Student") {
      membersList = students.filter((s) => s.class === classVal && (!sectionVal || s.section === sectionVal));
      membersList.sort((a, b) => (parseInt(a.roll) || 999) - (parseInt(b.roll) || 999));
    } else {
      membersList = [...teachers].sort((a,b) => a.name.localeCompare(b.name));
    }

    membersList.forEach((member, index) => {
      const rowData = [targetType === "Student" ? (member.roll || index + 1) : (member.id || index + 1), member.name];
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      daysArray.forEach((day) => {
        const record = attendanceMap[`${day.dateStr}:${member.id}`];
        let symbol = "";
        if (record && record.status) {
          if (record.status === "Present") {
            symbol = "P";
            presentCount++;
          } else if (record.status === "Absent") {
            symbol = "A";
            absentCount++;
          } else if (record.status === "Late") {
            symbol = "L";
            lateCount++;
          }
        } else if (day.day === "Su") {
          symbol = "Su";
        }
        rowData.push(symbol);
      });

      rowData.push(String(presentCount), String(absentCount), String(lateCount));
      csvContent += rowData.map(cell => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const encodedUri = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Monthly_Register_${monthName}_${yearVal}_${targetType === "Student" ? classVal : targetType}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEditModal = (record: any) => {
    setEditRecord({ ...record });
    setIsEditModalOpen(true);
  };

  const handleModalChange = (field: string, value: string) => {
    setEditRecord((prev: any) => ({ ...prev, [field]: value }));
  };

  const saveEditModal = () => {
    setAttendanceData((prev) =>
      prev.map((record) => {
        if (record.id === editRecord.id) {
          return {
            ...editRecord,
            present: parseInt(editRecord.present) || 0,
            absent: parseInt(editRecord.absent) || 0,
            late: parseInt(editRecord.late) || 0,
          };
        }
        return record;
      }),
    );
    setIsEditModalOpen(false);
    setEditRecord(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Smart Attendance
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            AI-powered tracking, QR scanning, and daily reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (selectedClass) {
                setRegisterClass(selectedClass);
              }
              if (teachers.length > 0 && !registerTeacher) {
                setRegisterTeacher(teachers[0].name);
              }
              setRegisterTargetType(memberType === "Teacher" ? "Teacher" : "Student");
              setIsMonthlyModalOpen(true);
            }}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Monthly Register</span>
          </button>
          <button
            onClick={printClassList}
            className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Blank List</span>
          </button>
          <button
            onClick={exportAttendanceDetails}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
          <button
            onClick={exportAbsentList}
            className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors shadow-sm cursor-pointer"
          >
            <UserX className="w-4 h-4" />
            <span className="hidden sm:inline">Absent List</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-full sm:w-fit overflow-x-auto shadow-sm">
        <TabButton
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          icon={ListOrdered}
          label="Overview"
        />
        <TabButton
          active={activeTab === "qr"}
          onClick={() => setActiveTab("qr")}
          icon={QrCode}
          label="QR Scanner"
          disabled={settings.enableQrAttendance === false}
        />
        <div className="flex items-stretch bg-white rounded-xl">
          <TabButton
            active={activeTab === "face"}
            onClick={() => setActiveTab("face")}
            icon={ScanFace}
            label="Face Recognition"
            disabled={settings.enableFaceAttendance === false}
          />
          {activeTab === "face" && settings.enableFaceAttendance !== false && (
            <div className="flex items-center gap-1 border-l border-slate-100 pl-1 py-1 mr-1">
              <div className="relative">
                <select 
                  className="bg-slate-50 border hover:bg-slate-100 border-slate-200 text-[11px] font-bold tracking-tight text-slate-700 py-1.5 pl-2.5 pr-6 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none transition-colors"
                  value={faceScannerFilterType}
                  onChange={(e) => {
                    setFaceScannerFilterType(e.target.value as any);
                    if (e.target.value !== "Student") setFaceScannerFilterClass("");
                  }}
                  title="Dictionary Filter Type"
                >
                  <option value="All">All Profiles</option>
                  <option value="Student">Students Only</option>
                  <option value="Teacher">Staff Only</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
              </div>
              {faceScannerFilterType === "Student" && (
                <div className="relative">
                  <select 
                    className="bg-slate-50 border hover:bg-slate-100 border-slate-200 text-[11px] font-bold tracking-tight text-slate-700 py-1.5 pl-2.5 pr-6 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[100px] appearance-none transition-colors"
                    value={faceScannerFilterClass}
                    onChange={(e) => setFaceScannerFilterClass(e.target.value)}
                    title="Dictionary Class Filter"
                  >
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
                </div>
              )}
            </div>
          )}
        </div>
        <TabButton
          active={activeTab === "absent-manager"}
          onClick={() => setActiveTab("absent-manager")}
          icon={UserX}
          label="Live Monitor"
        />
        <TabButton
          active={activeTab === "monthly-ledger"}
          onClick={() => setActiveTab("monthly-ledger")}
          icon={CalendarIcon}
          label="Monthly Register Ledger"
        />
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 hover:shadow-md transition-all duration-300">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-xs">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        Total Present
                      </p>
                      <h3 className="text-2xl font-black text-slate-800 mt-0.5">
                        {currentLevelStats.present}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                    On Duty
                  </span>
                </div>
              </div>

              <div 
                onClick={() => setShowAbsenteesOnly(!showAbsenteesOnly)}
                className={cn(
                  "bg-white rounded-[2rem] p-6 border shadow-xs relative overflow-hidden group hover:border-rose-300 hover:shadow-md transition-all duration-300 cursor-pointer",
                  showAbsenteesOnly ? "border-rose-400 bg-rose-50/70 shadow-inner" : "border-slate-200/80"
                )}
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full blur-2xl group-hover:bg-rose-100/50 transition-colors"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 shadow-xs",
                       showAbsenteesOnly ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Total Absent
                      </p>
                      <h3 className="text-2xl font-black text-slate-800 mt-0.5">
                        {currentLevelStats.absent}
                      </h3>
                    </div>
                  </div>
                  {showAbsenteesOnly ? (
                    <span className="text-[10px] font-black text-white bg-rose-600 px-2 py-1 rounded-full animate-pulse uppercase tracking-wide">
                      FILTER ON
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-full">
                      Absent
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 hover:shadow-md transition-all duration-300">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full blur-2xl group-hover:bg-amber-100 transition-colors"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100 shadow-xs">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        Late Arrivals
                      </p>
                      <h3 className="text-2xl font-black text-slate-800 mt-0.5">
                        {currentLevelStats.late}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">
                    Delayed
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all duration-300">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const presenceRatePercent = currentLevelStats.total > 0
                        ? Math.round((currentLevelStats.present / currentLevelStats.total) * 100)
                        : 100;
                      const r = 16;
                      const circ = 2 * Math.PI * r;
                      const offset = circ - (presenceRatePercent / 100) * circ;
                      return (
                        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="24"
                              cy="24"
                              r={r}
                              className="text-slate-100"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="transparent"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r={r}
                              className="text-indigo-600 transition-all duration-500 ease-out"
                              strokeWidth="3.5"
                              strokeDasharray={circ}
                              strokeDashoffset={offset}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                            />
                          </svg>
                          <span className="absolute text-[10px] font-black text-slate-700">{presenceRatePercent}%</span>
                        </div>
                      );
                    })()}
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        Presence Rate
                      </p>
                      <h3 className="text-2xl font-black text-indigo-950 mt-0.5">
                        {currentLevelStats.total > 0
                          ? Math.round(
                              (currentLevelStats.present /
                                currentLevelStats.total) *
                                100,
                            )
                          : 100}
                        %
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-full">
                    Overall
                  </span>
                </div>
              </div>
            </div>

            {/* Categorical Directory Hub */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h2 className="text-xs font-extrabold text-slate-700 tracking-wider uppercase">
                  Interactive Categorical Registry Division
                </h2>
              </div>

              {(() => {
                const canShowStudents = !user?.attendanceScope || user.attendanceScope === "All" || user.attendanceScope === "Only Students";
                const canShowTeachers = !user?.attendanceScope || user.attendanceScope === "All" || user.attendanceScope === "Teachers";
                const columnsCount = [canShowStudents, canShowTeachers].filter(Boolean).length;

                return (
                  <div className={cn(
                    "grid gap-5 w-full",
                    columnsCount === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                  )}>
                    {/* Academic Students Card */}
                    {canShowStudents && (
                      <button
                        type="button"
                        onClick={() => {
                          setMemberType("Student");
                          setViewMode("detailed");
                        }}
                        className={cn(
                          "flex flex-col text-left p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden cursor-pointer group",
                          memberType === "Student"
                            ? "bg-indigo-50/50 border-indigo-300 shadow-md ring-2 ring-indigo-500/10"
                            : "bg-white border-slate-200/85 hover:border-indigo-200 hover:bg-slate-50/50 hover:shadow-xs"
                        )}
                      >
                        <div className="flex justify-between items-start w-full gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center transition-colors",
                            memberType === "Student" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-55 group-hover:text-indigo-600"
                          )}>
                            <Users className="w-5 h-5" />
                          </div>
                          <span className={cn(
                            "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
                            memberType === "Student" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                          )}>
                            {students.length} Pupils
                          </span>
                        </div>
                        <div className="mt-5">
                          <h4 className="font-extrabold text-[15px] text-slate-800 tracking-tight flex items-center gap-1.5">
                            Academic Cohort <span className="text-xs text-slate-400 font-medium">(छात्र प्रभाग)</span>
                          </h4>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            Classrooms and rolling student rosters. Choose class tiers, register daily logs, and generate PDF register sheets.
                          </p>
                        </div>
                        {memberType === "Student" && (
                          <div className="absolute right-4 bottom-4 w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                        )}
                      </button>
                    )}

                    {/* Faculty & Teachers Card */}
                    {canShowTeachers && (
                      <button
                        type="button"
                        onClick={() => {
                          setMemberType("Teacher");
                          setViewMode("detailed");
                          setSelectedClass("");
                        }}
                        className={cn(
                          "flex flex-col text-left p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden cursor-pointer group",
                          memberType === "Teacher"
                            ? "bg-purple-50/50 border-purple-300 shadow-md ring-2 ring-purple-500/10"
                            : "bg-white border-slate-200/85 hover:border-purple-200 hover:bg-slate-50/50 hover:shadow-xs"
                        )}
                      >
                        <div className="flex justify-between items-start w-full gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center transition-colors",
                            memberType === "Teacher" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-purple-55 group-hover:text-purple-600"
                          )}>
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <span className={cn(
                            "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
                            memberType === "Teacher" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"
                          )}>
                            {teachers.length} Members
                          </span>
                        </div>
                        <div className="mt-5">
                          <h4 className="font-extrabold text-[15px] text-slate-800 tracking-tight flex items-center gap-1.5">
                            Teacher Faculty <span className="text-xs text-slate-400 font-medium">(शिक्षक प्रभाग)</span>
                          </h4>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            School educators and instructors. Check checking-in details, delays, and generate landscape ledger cards.
                          </p>
                        </div>
                        {memberType === "Teacher" && (
                          <div className="absolute right-4 bottom-4 w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Table Block */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xs overflow-hidden">
              {/* Context Header with Division Label */}
              <div className={cn(
                "p-6 border-b border-slate-200 flex flex-col gap-4",
                memberType === "Student" ? "bg-indigo-50/10" : "bg-purple-50/10"
              )}>
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                       <span className={cn(
                          "text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border",
                          memberType === "Student" ? "bg-indigo-50 text-indigo-700 border-indigo-150" : "bg-purple-50 text-purple-700 border-purple-150"
                       )}>
                          ACTIVE CATEGORY: {memberType === "Teacher" ? "TEACHERS ONLY" : "STUDENTS"}
                       </span>
                       <h3 className="text-base font-black text-slate-800 mt-1.5 tracking-tight">
                          {memberType === "Student" && "Academic Classroom Registers (कक्षावार छात्र रजिस्टर)"}
                          {memberType === "Teacher" && "Institutional Teacher Records (शिक्षक उपस्थिति विवरण)"}
                       </h3>
                    </div>
                    {memberType === "Teacher" && (
                       <div className="flex bg-slate-100 p-1 rounded-xl whitespace-nowrap self-start sm:self-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewMode("detailed")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                              viewMode === "detailed"
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800",
                            )}
                          >
                            👥 Teacher Register ({teachers.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode("class-overview")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                              viewMode === "class-overview"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800",
                            )}
                          >
                            🏫 Class-wise Overview (Students)
                          </button>
                       </div>
                    )}
                    {memberType === "Student" && !selectedClass && (
                       <div className="flex bg-slate-100 p-1 rounded-xl whitespace-nowrap self-start sm:self-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewMode("detailed")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                              viewMode === "detailed"
                                ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                                : "text-slate-500 hover:text-slate-800",
                            )}
                          >
                            👥 Student-wise ({filteredStudents.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode("class-overview")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                              viewMode === "class-overview"
                                ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                                : "text-slate-500 hover:text-slate-800",
                            )}
                          >
                            🏫 Class-wise Overview
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode("summary")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                              viewMode === "summary"
                                ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                                : "text-slate-500 hover:text-slate-800",
                            )}
                          >
                            📊 Summaries ({filteredAttendanceData.length})
                          </button>
                       </div>
                    )}
                 </div>

                 {/* Categorized Filter inputs */}
                 <div className="flex flex-wrap gap-3 items-center">
                    {memberType === "Student" && (
                      <div className="relative min-w-[180px]">
                        <select
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 cursor-pointer"
                          value={selectedClass}
                          onChange={(e) => {
                            setSelectedClass(e.target.value);
                            setSelectedSection("");
                            if (e.target.value) {
                              setViewMode("detailed");
                            }
                          }}
                        >
                          <option value="">All Tiers (Summary Overview)</option>
                          {classes.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {memberType === "Student" && selectedClass && availableSections.length > 0 && (
                      <div className="relative min-w-[124px]">
                        <select
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/10 cursor-pointer"
                          value={selectedSection}
                          onChange={(e) => setSelectedSection(e.target.value)}
                        >
                          <option value="">All Sections</option>
                          {availableSections.map((sec) => (
                            <option key={sec} value={sec}>
                              Sec {sec}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="relative min-w-[180px] w-full sm:w-auto">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-slate-55/10 cursor-pointer"
                      />
                    </div>

                    <div className="relative min-w-[200px] flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={
                          memberType === "Student"
                            ? "Search students or summaries..."
                            : "Search teachers register..."
                        }
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-55/10 focus:border-slate-400 transition-all font-medium placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <button className="flex items-center gap-1.5 p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-xs font-bold px-4 transition-colors">
                      <Filter className="w-3.5 h-3.5" /> <span>Filter</span>
                    </button>
                 </div>
              </div>

              {memberType === "Student" && viewMode === "class-overview" && !selectedClass ? (
                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredOverviewClasses.map((className) => {
                      const stats = classWiseStats[className] || { total: 0, present: 0, absent: 0, late: 0, sections: [] };
                      const presenceRate = stats.total > 0
                        ? Math.round(((stats.present + stats.late) / stats.total) * 100)
                        : 0;

                      return (
                        <div
                          key={className}
                          className="bg-white rounded-[2rem] p-6 border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-300 group flex flex-col justify-between relative overflow-hidden"
                        >
                          <div>
                            <div className="flex items-start justify-between">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-1">
                                  COHORT REGISTRY
                                </span>
                                <h4 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-indigo-650 transition-colors">
                                  {className}
                                </h4>
                              </div>
                              <span className={cn(
                                "text-[10px] font-black px-2.5 py-1 rounded-full border shadow-2xs transition-all",
                                presenceRate >= 85 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                presenceRate >= 65 ? "bg-amber-50 text-amber-700 border-amber-100" :
                                stats.total === 0 ? "bg-slate-50 text-slate-400 border-slate-100" :
                                "bg-rose-50 text-rose-700 border-rose-100"
                              )}>
                                {stats.total === 0 ? "No Students" : `${presenceRate}% Present`}
                              </span>
                            </div>

                            <div className="mt-5 space-y-4">
                              {/* Horizontal progress bar */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                  <span>Daily Ratio</span>
                                  <span>{stats.present + stats.late} / {stats.total} Pupils</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-550 ease-out",
                                      presenceRate >= 85 ? "bg-emerald-500 animate-pulse" :
                                      presenceRate >= 65 ? "bg-amber-500" :
                                      "bg-rose-500"
                                    )}
                                    style={{ width: `${presenceRate}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Stats breakdown badge */}
                              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="bg-emerald-50 text-emerald-850 p-2.5 rounded-2xl border border-emerald-100/50">
                                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wide font-mono">Present</p>
                                  <p className="font-extrabold text-sm mt-0.5 text-emerald-950">{stats.present}</p>
                                </div>
                                <div className="bg-rose-50 text-rose-850 p-2.5 rounded-2xl border border-rose-100/50">
                                  <p className="text-[9px] font-black text-rose-600 uppercase tracking-wide font-mono">Absent</p>
                                  <p className="font-extrabold text-sm mt-0.5 text-rose-955">{stats.absent}</p>
                                </div>
                                <div className="bg-amber-50 text-amber-850 p-2.5 rounded-2xl border border-amber-100/50">
                                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-wide font-mono">Late</p>
                                  <p className="font-extrabold text-sm mt-0.5 text-amber-955">{stats.late}</p>
                                </div>
                              </div>

                              {/* Sections tags */}
                              {stats.sections.length > 0 && (
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                  <span>Sections:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {stats.sections.map((sec, idx) => (
                                      <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-extrabold text-[10px]">
                                        {sec}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                            <button
                              onClick={() => {
                                setSelectedClass(className);
                                setViewMode("detailed");
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50/75 hover:bg-indigo-100 text-indigo-700 text-xs font-black py-2.5 px-3 rounded-xl transition-all shadow-2xs"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Student-wise ({stats.total})</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClass(className);
                                setViewMode("detailed");
                              }}
                              className="p-2.5 hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-800 rounded-xl transition-all shadow-2xs"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    {selectedClass || viewMode === "detailed" ? (
                      <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          {memberType === "Student" ? "Roll No" : "ID"}
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          {memberType === "Student" ? "Student Name" : "Teacher Name"}
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          {memberType === "Student" ? "Class / Section" : "Role / Subject"}
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          Status
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          In Time
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          Out Time
                        </th>

                      </tr>
                    ) : (
                      <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          Class / Section
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          Date
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          Present
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          Absent
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          Late
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">
                          Marked By
                        </th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">
                          Status / Action
                        </th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedClass || viewMode === "detailed" ? (
                      memberType === "Student" ? (
                        filteredStudents.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-10 text-center font-medium text-slate-400"
                            >
                              No students found matching your criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((student) => {
                            const record =
                              attendanceMap[`${date}:${student.id}`];
                            const status = getCalculatedStatus(record, date);
                            const remarks = record?.remarks || "";
                            return (
                              <tr
                                key={student.id}
                                className="hover:bg-slate-50 transition-colors group"
                              >
                                <td className="px-6 py-4 font-bold text-slate-900">
                                  {student.roll || "-"}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                                  <img
                                    src={
                                      student.avatar ||
                                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name)}`
                                    }
                                    alt="avatar"
                                    className="w-8 h-8 rounded-full border border-slate-200 bg-white"
                                    referrerPolicy="no-referrer"
                                  />
                                  {student.name}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-600">
                                  {student.class} - {student.section || "A"}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateAttendanceStatus(
                                          student.id,
                                          "Present",
                                        )
                                      }
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === "Present"
                                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100",
                                      )}
                                    >
                                      Present
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateAttendanceStatus(
                                          student.id,
                                          "Absent",
                                        )
                                      }
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === "Absent"
                                          ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600",
                                      )}
                                    >
                                      Absent
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateAttendanceStatus(
                                          student.id,
                                          "Late",
                                        )
                                      }
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === "Late"
                                          ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600",
                                      )}
                                    >
                                      Late
                                    </button>
                                    {status === "Not Recorded" && (
                                      <span className="ml-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                        Not Recorded
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="time"
                                    value={
                                      record?.inTime ||
                                      (status !== "Absent" &&
                                      status !== "Not Recorded"
                                        ? "09:00"
                                        : "")
                                    }
                                    disabled={
                                      status === "Absent" ||
                                      status === "Not Recorded"
                                    }
                                    onChange={(e) =>
                                      handleUpdateInTime(
                                        student.id,
                                        e.target.value,
                                      )
                                    }
                                    className="px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="time"
                                    value={
                                      record?.outTime ||
                                      (status !== "Absent" &&
                                      status !== "Not Recorded"
                                        ? "15:00"
                                        : "")
                                    }
                                    disabled={
                                      status === "Absent" ||
                                      status === "Not Recorded"
                                    }
                                    onChange={(e) =>
                                      handleUpdateOutTime(
                                        student.id,
                                        e.target.value,
                                      )
                                    }
                                    className="px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )
                      ) : memberType === "Teacher" ? (
                        filteredTeachers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-10 text-center font-medium text-slate-400"
                            >
                              No teachers found matching your criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredTeachers.map((teacher) => {
                            const record =
                              attendanceMap[`${date}:${teacher.id}`];
                            const status = getCalculatedStatus(record, date);
                            const remarks = record?.remarks || "";
                            return (
                              <tr
                                key={teacher.id}
                                className="hover:bg-slate-50 transition-colors group"
                              >
                                <td className="px-6 py-4 font-bold text-slate-900">
                                  {teacher.id || "-"}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-3">
                                  <img
                                    src={
                                      teacher.avatar || teacher.photoUrl ||
                                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(teacher.name)}`
                                    }
                                    alt="avatar"
                                    className="w-8 h-8 rounded-full border border-slate-200 bg-white"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span>
                                    {teacher.name}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-600">
                                  {teacher.subject || "Educator"}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateAttendanceStatus(
                                          teacher.id,
                                          "Present",
                                        )
                                      }
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === "Present"
                                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100",
                                      )}
                                    >
                                      Present
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateAttendanceStatus(
                                          teacher.id,
                                          "Absent",
                                        )
                                      }
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === "Absent"
                                          ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600",
                                      )}
                                    >
                                      Absent
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateAttendanceStatus(
                                          teacher.id,
                                          "Late",
                                        )
                                      }
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                                        status === "Late"
                                          ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600",
                                      )}
                                    >
                                      Late
                                    </button>
                                    {status === "Not Recorded" && (
                                      <span className="ml-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                        Not Recorded
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="time"
                                    value={
                                      record?.inTime ||
                                      (status !== "Absent" &&
                                      status !== "Not Recorded"
                                        ? "09:00"
                                        : "")
                                    }
                                    disabled={
                                      status === "Absent" ||
                                      status === "Not Recorded"
                                    }
                                    onChange={(e) =>
                                      handleUpdateInTime(
                                        teacher.id,
                                        e.target.value,
                                      )
                                    }
                                    className="px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="time"
                                    value={
                                      record?.outTime ||
                                      (status !== "Absent" &&
                                      status !== "Not Recorded"
                                        ? "15:00"
                                        : "")
                                    }
                                    disabled={
                                      status === "Absent" ||
                                      status === "Not Recorded"
                                    }
                                    onChange={(e) =>
                                      handleUpdateOutTime(
                                        teacher.id,
                                        e.target.value,
                                      )
                                    }
                                    className="px-2 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )
                      ) : null
                    ) : (
                      filteredAttendanceData.map((record) => (
                        <tr
                          key={record.id}
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {record.class}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {format(new Date(record.date), "MMM dd, yyyy")}
                          </td>
                          <td className="px-6 py-4 text-emerald-600 font-black text-base">
                            {record.present}
                          </td>
                          <td className="px-6 py-4 text-rose-600 font-black text-base">
                            {record.absent}
                          </td>
                          <td className="px-6 py-4 text-amber-600 font-black text-base">
                            {record.late}
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-medium flex items-center gap-2">
                            {record.markedBy === "Face ID System" ? (
                              <span className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md mt-1.5 font-bold text-xs">
                                <ScanFace className="w-3.5 h-3.5" /> AI Verified
                              </span>
                            ) : record.markedBy === "QR Scanner" ? (
                              <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md mt-1.5 font-bold text-xs">
                                <QrCode className="w-3.5 h-3.5" /> QR Scanned
                              </span>
                            ) : (
                              <span className="mt-1.5 block font-bold text-slate-700">
                                {record.markedBy}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold">
                                {record.status}
                              </span>
                              <button
                                onClick={() => openEditModal(record)}
                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "qr" && (
          settings.enableQrAttendance !== false ? (
            <Suspense
              fallback={
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  Loading Scanner...
                </div>
              }
            >
              <QRScanner onExit={() => setActiveTab("overview")} />
            </Suspense>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-6">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
                <QrCode className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800">QR Scanner Attendance is Disabled</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  The Super Admin has turned off QR-based attendance scanning for the school directory. You can manually check-in or enable this feature in Settings.
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setActiveTab("overview")}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm cursor-pointer"
                >
                  Back to Overview
                </button>
                <a
                  href="/admin/settings?category=other_pages"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all text-sm flex items-center gap-1 shadow-md shadow-indigo-600/10"
                >
                  Configure Channels
                </a>
              </div>
            </div>
          )
        )}
        {activeTab === "face" && (
          settings.enableFaceAttendance !== false ? (
            <FaceScanner 
              onExit={() => setActiveTab("overview")} 
              initialFilterType={faceScannerFilterType}
              initialFilterClass={faceScannerFilterClass}
            />
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 text-center max-w-2xl mx-auto my-12 shadow-sm space-y-6">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
                <ScanFace className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800">Face Recognition Attendance is Disabled</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  The Super Admin has turned off camera-based Face Recognition attendance tracking. Standard manual grid registers remain fully active.
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setActiveTab("overview")}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm cursor-pointer"
                >
                  Back to Overview
                </button>
                <a
                  href="/admin/settings?category=other_pages"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all text-sm flex items-center gap-1 shadow-md shadow-indigo-600/10"
                >
                  Configure Channels
                </a>
              </div>
            </div>
          )
        )}
        {activeTab === "absent-manager" && (
          <div className="space-y-6 animate-fade-in bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
             {/* Header */}
             <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 bg-white p-6 rounded-2xl border border-slate-200">
                <div className="space-y-4 flex-1">
                   <div>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                         <ScanFace className="w-6 h-6 text-indigo-500" />
                         Live Attendance Monitor (रीयल-टाइम मॉनिटर)
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                         View date-wise, class-wise, and teacher-wise attendance history and records. Watch results filter instantly.
                      </p>
                   </div>
                   
                   {/* Category & Class/Teacher Filters */}
                   <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                         {(["All", "Student", "Teacher"] as const).map((cat) => (
                            <button
                               key={cat}
                               onClick={() => {
                                  setMonitorCategoryFilter(cat);
                                  if (cat !== "Student" && cat !== "All") setMonitorClassFilter("");
                                  if (cat !== "Teacher" && cat !== "All") setMonitorTeacherFilter("");
                               }}
                               className={cn(
                                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
                                  monitorCategoryFilter === cat
                                     ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                                     : "text-slate-500 hover:text-slate-700"
                               )}
                            >
                               {cat}
                            </button>
                         ))}
                      </div>

                      {(monitorCategoryFilter === "All" || monitorCategoryFilter === "Student") && (
                         <select
                            value={monitorClassFilter}
                            onChange={(e) => setMonitorClassFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:border-indigo-300"
                         >
                            <option value="">All Classes</option>
                            {classes.map((cls) => (
                               <option key={cls} value={cls}>{cls}</option>
                            ))}
                         </select>
                      )}

                      {(monitorCategoryFilter === "All" || monitorCategoryFilter === "Teacher") && (
                         <select
                            value={monitorTeacherFilter}
                            onChange={(e) => setMonitorTeacherFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:border-indigo-300 max-w-[180px]"
                         >
                            <option value="">All Teachers</option>
                            {teachers.map((t) => (
                               <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                         </select>
                      )}
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:self-end flex-wrap">
                   {/* Status Filter */}
                   <div className="flex bg-slate-100 p-1 rounded-xl">
                      {(["All", "Present", "Absent", "Late"] as const).map((status) => (
                         <button
                            key={status}
                            onClick={() => setMonitorStatusFilter(status)}
                            className={cn(
                               "px-3 py-1 text-xs font-bold rounded-lg transition-colors",
                               monitorStatusFilter === status
                                  ? status === "Absent" ? "bg-rose-500 text-white shadow-sm"
                                  : status === "Present" ? "bg-emerald-500 text-white shadow-sm"
                                  : status === "Late" ? "bg-amber-500 text-white shadow-sm"
                                  : "bg-indigo-600 text-white shadow-sm"
                                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                            )}
                         >
                            {status}
                         </button>
                      ))}
                   </div>

                   {/* Date picker for history lookup */}
                   <div className="flex items-center gap-1.5 bg-indigo-50/70 p-1.5 px-3 rounded-xl border border-indigo-100 text-indigo-700 text-xs font-extrabold shadow-xs">
                      <CalendarIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Date:</span>
                      <input
                         type="date"
                         value={date}
                         onChange={(e) => setDate(e.target.value)}
                         className="bg-transparent border-none text-indigo-900 font-extrabold outline-none cursor-pointer focus:ring-0 p-0 text-xs w-28 font-mono"
                      />
                   </div>

                   <div className="flex gap-1.5">
                     <button
                       onClick={printMonitorList}
                       className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer"
                     >
                       <Printer className="w-3.5 h-3.5" />
                       Print List
                     </button>
                     <button
                       onClick={exportMonitorList}
                       className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer"
                     >
                       <FileSpreadsheet className="w-3.5 h-3.5" />
                       Download Excel
                     </button>
                   </div>
                </div>
             </div>

             {/* Monitor List (Grouped) */}
             {(() => {
                // Group the data by groupByKey
                const groupedData = currentMonitorData.reduce<Record<string, typeof currentMonitorData>>((acc, member) => {
                   const key = member.groupByKey || "Other";
                   if (!acc[key]) acc[key] = [];
                   acc[key].push(member);
                   return acc;
                }, {});

                const groupKeys = Object.keys(groupedData).sort();

                if (groupKeys.length === 0) {
                   return (
                      <div className="text-center py-16 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                         <div className="mx-auto w-16 h-16 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center border border-slate-200">
                            <UserX className="w-8 h-8" />
                         </div>
                         <h4 className="font-bold text-lg text-slate-800">No Members Match the Filter</h4>
                         <p className="text-sm text-slate-500 max-w-sm mx-auto">
                            No profiles found matching current filters. Try changing your class selection, search query, or status flag above.
                         </p>
                      </div>
                   );
                }

                return (
                   <div className="space-y-8">
                      {groupKeys.map((group) => (
                         <div key={group} className="space-y-4">
                            <div className="flex items-center gap-3">
                               <h4 className="text-lg font-black text-slate-800 bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                  {group}
                               </h4>
                               <div className="h-px bg-slate-200 flex-1"></div>
                               <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border">
                                  {groupedData[group].length} Members
                               </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                               {groupedData[group].map((member) => {
                                  const fallbackAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(member.name)}`;
                                  const avatar = member.photoUrl && !member.photoUrl.includes("dicebear") && !member.photoUrl.includes("unsplash") ? member.photoUrl : fallbackAvatar;
                                  
                                  const currentStatus = getCalculatedStatus(member.record, date);
                                  const statusColors = {
                                     "Present": "bg-emerald-50 text-emerald-700 border-emerald-200",
                                     "Late": "bg-amber-50 text-amber-700 border-amber-200",
                                     "Absent": "bg-rose-50 text-rose-700 border-rose-200",
                                     "Holiday": "bg-blue-50 text-blue-700 border-blue-200",
                                  } as any;

                                  const typeColors = {
                                     "Student": "bg-slate-100 text-slate-600 border-slate-200",
                                     "Teacher": "bg-indigo-50 text-indigo-700 border-indigo-100",
                                     "Other Staff": "bg-violet-50 text-violet-700 border-violet-100"
                                  } as any;

                                  return (
                                     <div key={member.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group">
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                           <div className="flex items-start gap-4 flex-1">
                                              <img 
                                                 src={avatar} 
                                                 referrerPolicy="no-referrer"
                                                 onError={(e) => { (e.target as HTMLImageElement).src = fallbackAvatar; }}
                                                 alt={member.name} 
                                                 className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 object-cover shrink-0"
                                              />
                                              <div className="min-w-0">
                                                 <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className={`text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md border ${typeColors[member.type]}`}>
                                                       {member.type}
                                                    </span>
                                                    {member.roll && (
                                                       <span className="text-[9px] font-mono text-slate-500 font-bold bg-slate-50 border px-1.5 py-0.5 rounded-md">
                                                          R: {member.roll}
                                                       </span>
                                                    )}
                                                 </div>
                                                 <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">
                                                    {member.name}
                                                 </h4>
                                                 <p className="text-[11px] text-slate-500 font-medium truncate">
                                                    {member.details}
                                                 </p>
                                              </div>
                                           </div>
                                           <div className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border shrink-0 ${statusColors[currentStatus] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                                              {currentStatus || "UNKNOWN"}
                                           </div>
                                        </div>

                                        {/* Status Details */}
                                        {(member.record?.inTime || member.record?.outTime || member.record?.remarks) && (
                                           <div className="mb-4 bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                              {member.record?.inTime && (
                                                 <span className="text-[10px] text-slate-600 flex items-center gap-1 font-mono">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> In: {member.record.inTime}
                                                 </span>
                                              )}
                                              {member.record?.outTime && (
                                                 <span className="text-[10px] text-slate-600 flex items-center gap-1 font-mono">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Out: {member.record.outTime}
                                                 </span>
                                              )}
                                           </div>
                                        )}
                                        {!member.record?.inTime && !member.record?.outTime && (
                                            <div className="mb-4 h-[1px]"></div>
                                        )}

                                        {/* Manual Adjustment Actions */}
                                        <div className="pt-3 border-t border-slate-100">
                                           <div className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider flex justify-between">
                                              Quick Shift
                                              <span className="text-[8px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded tracking-normal">Manual</span>
                                           </div>
                                           <div className="grid grid-cols-3 gap-2">
                                              <button
                                                 onClick={() => {
                                                    saveAttendanceRecord(member.id, date, {
                                                       status: "Present",
                                                       inTime: "09:00",
                                                       remarks: "Manually marked via Live Monitor"
                                                    }).catch(console.error);
                                                 }}
                                                 className="py-1.5 px-1 bg-emerald-50 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 rounded-lg border border-emerald-100 transition-colors flex flex-col items-center gap-1"
                                              >
                                                 <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                 Present
                                              </button>
                                              <button
                                                 onClick={() => {
                                                    saveAttendanceRecord(member.id, date, {
                                                       status: "Late",
                                                       inTime: "10:15",
                                                       remarks: "Manually marked via Live Monitor"
                                                    }).catch(console.error);
                                                 }}
                                                 className="py-1.5 px-1 bg-amber-50 text-[10px] font-bold text-amber-700 hover:bg-amber-100 hover:border-amber-300 rounded-lg border border-amber-100 transition-colors flex flex-col items-center gap-1"
                                              >
                                                 <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                 Late
                                              </button>
                                              <button
                                                 onClick={() => {
                                                    const record = attendanceMap[`${date}:${member.id}`];
                                                    openEditModal(record || {
                                                       id: `${date}:${member.id}`,
                                                       date,
                                                       memberId: member.id,
                                                       status: "Absent",
                                                       remarks: "",
                                                       class: member.type === "Student" ? (member as any).class : "",
                                                       section: member.type === "Student" ? (member as any).section : ""
                                                    });
                                                 }}
                                                 className="py-1.5 px-1 bg-slate-50 text-[10px] font-bold text-slate-700 hover:bg-slate-150 hover:border-slate-300 rounded-lg border border-slate-200/60 transition-colors flex flex-col items-center gap-1"
                                              >
                                                 <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                                 Detail
                                              </button>
                                           </div>
                                        </div>
                                     </div>
                                  );
                               })}
                            </div>
                         </div>
                      ))}
                   </div>
                );
             })()}
          </div>
        )}

        {activeTab === "monthly-ledger" && (() => {
          const totalDays = new Date(registerYear, registerMonth + 1, 0).getDate();
          const weekdayShorts = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
          
          const daysArray = [];
          for (let d = 1; d <= totalDays; d++) {
            const curDate = new Date(registerYear, registerMonth, d);
            daysArray.push({
              dayNum: d,
              dayName: weekdayShorts[curDate.getDay()],
              dateStr: `${registerYear}-${String(registerMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            });
          }

          let membersList: any[] = [];
          if (registerTargetType === "Student") {
            membersList = students.filter((s) => s.class === registerClass && (!registerSection || s.section === registerSection));
            membersList.sort((a, b) => {
              const rA = parseInt(a.roll) || 999;
              const rB = parseInt(b.roll) || 999;
              if (rA !== rB) return rA - rB;
              return a.name.localeCompare(b.name);
            });
          } else {
            membersList = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
          }

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Interactive Filters Panel */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-indigo-500" />
                      Monthly Register Ledger (मासिक उपस्थिति रजिस्टर)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      View, filter, edit custom class/staff lists, and export official printable ledgers.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        exportMonthlyRegisterCSV(
                          registerMonth,
                          registerYear,
                          registerTeacher,
                          registerClass,
                          registerSection,
                          registerTargetType
                        );
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Download CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        printMonthlyRegister(
                          registerMonth,
                          registerYear,
                          registerTeacher,
                          registerClass,
                          registerSection,
                          registerTargetType
                        );
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white transition-colors shadow-sm cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Landscape PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        exportMonthlyEarlyOutCSV(
                          registerMonth,
                          registerYear,
                          registerTeacher,
                          registerClass,
                          registerSection,
                          registerTargetType
                        );
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-teal-200 hover:bg-teal-50 rounded-xl text-xs font-bold text-teal-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-teal-600" />
                      <span>Early Out CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        printMonthlyEarlyOutRegister(
                          registerMonth,
                          registerYear,
                          registerTeacher,
                          registerClass,
                          registerSection,
                          registerTargetType
                        );
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-xl text-xs font-bold text-white transition-colors shadow-sm cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-white" />
                      <span>Early Out Report</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-2 border-t border-slate-100">
                  {/* Target Selector */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">
                      Type
                    </label>
                    <select
                      value={registerTargetType}
                      onChange={(e) => setRegisterTargetType(e.target.value as "Student" | "Teacher")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Student">Students</option>
                      <option value="Teacher">Teachers / Faculty</option>
                    </select>
                  </div>

                  {/* Month Selector */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">
                      Month
                    </label>
                    <select
                      value={registerMonth}
                      onChange={(e) => setRegisterMonth(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                      ].map((m, idx) => (
                        <option key={idx} value={idx}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year Selector */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">
                      Year
                    </label>
                    <select
                      value={registerYear}
                      onChange={(e) => setRegisterYear(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Class (Only if student) */}
                  {registerTargetType === "Student" ? (
                    <>
                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">
                          Class
                        </label>
                        <select
                          value={registerClass}
                          onChange={(e) => {
                            setRegisterClass(e.target.value);
                            setRegisterSection("");
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                        >
                          {classes.map((cls) => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">
                          Section
                        </label>
                        <select
                          value={registerSection}
                          onChange={(e) => setRegisterSection(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">All Sections</option>
                          {availableRegisterSections.map((sec) => (
                            <option key={sec} value={sec}>{sec}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 self-end text-center">
                      📊 Showing All Registered Faculty & Staff Members
                    </div>
                  )}

                  {/* Custom Teacher Name */}
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">
                      Teacher Name / Header
                    </label>
                    <input
                      type="text"
                      value={registerTeacher}
                      onChange={(e) => setRegisterTeacher(e.target.value)}
                      placeholder="Teacher Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Ledger Grid Card */}
              <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xs">
                {membersList.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 space-y-2">
                    <Users className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="font-bold text-sm">No members found for the selected criteria.</p>
                    <p className="text-xs text-slate-400">Please choose another class, section or category.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full table-auto border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[140px]">
                            {registerTargetType === "Student" ? "Student Name" : "Teacher Name"}
                          </th>
                          <th className="px-3 py-3 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider border-r border-slate-200 min-w-[60px]">
                            {registerTargetType === "Student" ? "Roll" : "ID"}
                          </th>
                          {daysArray.map((day) => (
                            <th
                              key={day.dayNum}
                              className={cn(
                                "px-2 py-3 text-center text-[10px] font-bold border-r border-slate-150 min-w-[34px]",
                                day.dayName === "Su" ? "bg-rose-50/70 text-rose-600" : "text-slate-600"
                              )}
                            >
                              <span className="block font-extrabold">{day.dayNum}</span>
                              <span className="block text-[8px] uppercase font-black text-slate-400 tracking-tight mt-0.5">{day.dayName}</span>
                            </th>
                          ))}
                          <th className="px-3 py-3 text-center text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50/50 border-l border-slate-200 min-w-[40px]">P</th>
                          <th className="px-3 py-3 text-center text-[10px] font-black text-rose-600 uppercase tracking-wider bg-rose-50/50 border-l border-slate-150 min-w-[40px]">A</th>
                          <th className="px-3 py-3 text-center text-[10px] font-black text-amber-600 uppercase tracking-wider bg-amber-50/50 border-l border-slate-150 min-w-[40px]">L</th>
                          <th className="px-3 py-3 text-center text-[10px] font-black text-teal-600 uppercase tracking-wider bg-teal-50/50 border-l border-slate-150 min-w-[40px]">EO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {membersList.map((member, index) => {
                          let presentCount = 0;
                          let absentCount = 0;
                          let lateCount = 0;
                          let earlyOutCount = 0;

                          return (
                            <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* Name Column */}
                              <td className="px-4 py-2.5 text-xs font-bold text-slate-800 bg-white sticky left-0 z-10 border-r border-slate-150 shadow-[1px_0_0_rgba(226,232,240,0.8)]">
                                <p className="line-clamp-1">{member.name}</p>
                                {registerTargetType === "Student" && member.section && (
                                  <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5">Sec {member.section}</p>
                                )}
                                {registerTargetType === "Teacher" && member.subject && (
                                  <p className="text-[9px] text-indigo-500 font-extrabold uppercase mt-0.5">{member.subject}</p>
                                )}
                              </td>
                              {/* Roll/ID Column */}
                              <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 border-r border-slate-150">
                                {registerTargetType === "Student" ? (member.roll || index + 1) : member.id}
                              </td>
                              {/* Days Columns */}
                              {daysArray.map((day) => {
                                const record = attendanceMap[`${day.dateStr}:${member.id}`];
                                let symbol = "";
                                let cellColorClass = "text-slate-300";

                                if (record && record.status) {
                                  const isEarlyOut = record.status === "EARLY LEAVE" || !!record.earlyOutReason || (record.outTime && record.outTime < "14:30");
                                  if (isEarlyOut) {
                                    symbol = "E";
                                    earlyOutCount++;
                                    presentCount++;
                                    cellColorClass = "bg-teal-50 text-teal-700 font-extrabold border border-teal-100 rounded-md";
                                  } else if (record.status === "Present" || record.status === "PRESENT" || record.status === "LEFT") {
                                    symbol = "P";
                                    presentCount++;
                                    cellColorClass = "bg-emerald-50 text-emerald-700 font-black border border-emerald-100 rounded-md";
                                  } else if (record.status === "Absent" || record.status === "ABSENT") {
                                    symbol = "A";
                                    absentCount++;
                                    cellColorClass = "bg-rose-50 text-rose-700 font-black border border-rose-100 rounded-md";
                                  } else if (record.status === "Late" || record.status === "LATE") {
                                    symbol = "L";
                                    lateCount++;
                                    cellColorClass = "bg-amber-50 text-amber-700 font-black border border-amber-100 rounded-md";
                                  }
                                } else if (day.dayName === "Su") {
                                  symbol = "Su";
                                  cellColorClass = "bg-slate-50 text-slate-400/70 border border-slate-100 rounded-md";
                                }

                                return (
                                  <td
                                    key={day.dayNum}
                                    className={cn(
                                      "p-1 text-center text-[10px] border-r border-slate-100",
                                      day.dayName === "Su" && !symbol ? "bg-rose-50/20" : ""
                                    )}
                                  >
                                    {symbol ? (
                                      <span className={cn("inline-flex w-7 h-7 items-center justify-center text-center text-[10px] leading-none transition-all", cellColorClass)}>
                                        {symbol}
                                      </span>
                                    ) : (
                                      <span className="inline-block w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                                    )}
                                  </td>
                                );
                              })}
                              {/* Present Total */}
                              <td className="px-3 py-2.5 text-center text-xs font-black text-emerald-700 bg-emerald-50/40 border-l border-slate-200">
                                {presentCount}
                              </td>
                              {/* Absent Total */}
                              <td className="px-3 py-2.5 text-center text-xs font-black text-rose-700 bg-rose-50/40 border-l border-slate-150">
                                {absentCount}
                              </td>
                              {/* Late Total */}
                              <td className="px-3 py-2.5 text-center text-xs font-black text-amber-700 bg-amber-50/40 border-l border-slate-150">
                                {lateCount}
                              </td>
                              {/* Early Out Total */}
                              <td className="px-3 py-2.5 text-center text-xs font-black text-teal-700 bg-teal-50/40 border-l border-slate-150 animate-fade-in">
                                {earlyOutCount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {isEditModalOpen && editRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-xl text-slate-800">
                Edit Attendance Record
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Class / Section
                </label>
                <input
                  type="text"
                  value={editRecord.class}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Present
                </label>
                <input
                  type="number"
                  value={editRecord.present}
                  onChange={(e) => handleModalChange("present", e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Absent
                </label>
                <input
                  type="number"
                  value={editRecord.absent}
                  onChange={(e) => handleModalChange("absent", e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Late
                </label>
                <input
                  type="number"
                  value={editRecord.late}
                  onChange={(e) => handleModalChange("late", e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEditModal}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {isMonthlyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-xl text-slate-800">
                  {registerTargetType === "Teacher" ? "Teacher Monthly Register (Payroll/Salary)" : "Generate Monthly Register"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {registerTargetType === "Teacher" ? "Custom landscape sheet to calculate present days & view teaching hours" : "Design & print school-standard landscape sheets"}
                </p>
              </div>
              <button
                onClick={() => setIsMonthlyModalOpen(false)}
                className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors shadow-sm cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Target Selector Dropdown */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Register For
                </label>
                <select
                  value={registerTargetType}
                  onChange={(e) => setRegisterTargetType(e.target.value as "Student" | "Teacher")}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Student">Students (Class-wise Register)</option>
                  <option value="Teacher">Teachers & Faculty (Staff Register)</option>
                </select>
              </div>

              {/* Category Picker Info */}
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-800 font-semibold leading-relaxed">
                <CheckCircle className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                <div>
                  Currently generating for:{" "}
                  <span className="underline decoration-indigo-300 decoration-2 underline-offset-2">
                    {registerTargetType === "Student"
                      ? `Students of ${registerClass}${registerSection ? " Section " + registerSection : " (All Sections)"}`
                      : "All School Faculty & Teachers"}
                  </span>
                </div>
              </div>

              {/* Month & Year selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Select Month
                  </label>
                  <select
                    value={registerMonth}
                    onChange={(e) => setRegisterMonth(parseInt(e.target.value, 10))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ].map((m, idx) => (
                      <option key={idx} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Select Year
                  </label>
                  <select
                    value={registerYear}
                    onChange={(e) => setRegisterYear(parseInt(e.target.value, 10))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class and Section selection (only if registerTargetType is Student) */}
              {registerTargetType === "Student" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Target Class
                    </label>
                    <select
                      value={registerClass}
                      onChange={(e) => {
                        setRegisterClass(e.target.value);
                        setRegisterSection("");
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Target Section
                    </label>
                    <select
                      value={registerSection}
                      onChange={(e) => setRegisterSection(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">All Sections</option>
                      {availableRegisterSections.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Teacher Name */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Class Teacher / T. Name
                </label>
                <div className="space-y-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setRegisterTeacher(e.target.value);
                      }
                    }}
                    value={teachers.some(t => t.name === registerTeacher) ? registerTeacher : ""}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Quick Select from Teacher List --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.id})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Enter Custom Teacher Name (T. Name)"
                    value={registerTeacher}
                    onChange={(e) => setRegisterTeacher(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsMonthlyModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-xs sm:text-sm text-center"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsMonthlyModalOpen(false);
                  setActiveTab("monthly-ledger");
                }}
                className="px-5 py-2.5 bg-white border border-orange-200 text-orange-700 font-bold rounded-xl hover:bg-orange-100 transition-colors shadow-sm cursor-pointer text-xs sm:text-sm text-center flex items-center justify-center gap-1.5"
              >
                <Users className="w-4 h-4 text-orange-600" />
                <span>View Interactive Ledger</span>
              </button>
              <button
                onClick={() => {
                  exportMonthlyRegisterCSV(
                    registerMonth,
                    registerYear,
                    registerTeacher,
                    registerClass,
                    registerSection,
                    registerTargetType
                  );
                }}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>CSV Download</span>
              </button>
              <button
                onClick={() => {
                  exportMonthlyEarlyOutCSV(
                    registerMonth,
                    registerYear,
                    registerTeacher,
                    registerClass,
                    registerSection,
                    registerTargetType
                  );
                }}
                className="px-5 py-2.5 bg-white border border-teal-200 text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm"
              >
                <Download className="w-4 h-4 text-teal-600" />
                <span>Early Out CSV</span>
              </button>
              <button
                onClick={() => {
                  printMonthlyEarlyOutRegister(
                    registerMonth,
                    registerYear,
                    registerTeacher,
                    registerClass,
                    registerSection,
                    registerTargetType
                  );
                }}
                className="px-5 py-2.5 bg-teal-50 border border-teal-400 text-teal-700 font-bold rounded-xl hover:bg-teal-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm text-center"
              >
                <Printer className="w-4 h-4 text-teal-600" />
                <span>Early Out Print</span>
              </button>
              <button
                onClick={() => {
                  printMonthlyRegister(
                    registerMonth,
                    registerYear,
                    registerTeacher,
                    registerClass,
                    registerSection,
                    registerTargetType
                  );
                }}
                className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm text-center"
              >
                <Printer className="w-4 h-4" />
                <span>Print Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 whitespace-nowrap",
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        disabled && "border border-amber-200/50"
      )}
    >
      <Icon
        className={cn("w-4 h-4", active ? "text-white" : "text-slate-400")}
      />
      <span>{label}</span>
      {disabled && (
        <span className="ml-1 px-1.5 py-0.5 text-[8px] font-extrabold tracking-wider bg-rose-50 text-rose-600 uppercase rounded-md border border-rose-100">
          OFF
        </span>
      )}
    </button>
  );
}
