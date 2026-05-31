import React, { useState } from 'react';
import { useSchool, StudentResult, SubjectMark } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmationContext';
import { useWebsite } from '../../context/WebsiteContext';
import { Search, Plus, Edit2, Trash2, CheckCircle2, XCircle, FileSpreadsheet, ChevronDown, Download, Award, BookOpen, Printer, Sparkles, TrendingUp, ExternalLink, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import html2pdf from 'html2pdf.js';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const getGradeForPercentage = (pct: number) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

export default function ResultsManagement() {
  const { user } = useAuth();
  const isStudentOrParent = user?.role === 'Student' || user?.role === 'Parent';
  const { results, setResults, students } = useSchool();
  const { confirm } = useConfirm();
  const { settings, updateSettings } = useWebsite();
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [isUpdatingRestriction, setIsUpdatingRestriction] = useState(false);

  const toggleClassRestriction = async (className: string) => {
    setIsUpdatingRestriction(true);
    const currentlyRestricted = settings.restrictedResultClasses || [];
    let updated;
    if (currentlyRestricted.includes(className)) {
      updated = currentlyRestricted.filter(c => c !== className);
    } else {
      updated = [...currentlyRestricted, className];
    }
    try {
      await updateSettings({ restrictedResultClasses: updated });
    } catch (err) {
      console.error("Failed to update result restriction settings", err);
    } finally {
      setIsUpdatingRestriction(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [newSubjectColName, setNewSubjectColName] = useState('English');
  const [newSubjectColMax, setNewSubjectColMax] = useState(100);

  const [bulkImportClass, setBulkImportClass] = useState('Class 10');
  const [bulkImportExam, setBulkImportExam] = useState('Half Yearly Examination');

  // Consolidated 4-Exam Studio States
  const [showConsolidatedStudio, setShowConsolidatedStudio] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState<'dashboard' | 'entry' | 'reportcard'>('dashboard');
  const [consolidatedClass, setConsolidatedClass] = useState('Class 10');
  const [consolidatedSubject, setConsolidatedSubject] = useState('Mathematics');
  const [consolidatedWeights, setConsolidatedWeights] = useState({
    ut1: 10,
    ut2: 10,
    hy: 30,
    annual: 50
  });
  const [selectedConsolStudentId, setSelectedConsolStudentId] = useState<string>('');
  const [entryData, setEntryData] = useState<{
    studentId: string;
    studentName: string;
    roll: string;
    ut1: string;
    ut2: string;
    hy: string;
    annual: string;
  }[]>([]);

  const pullEntryData = () => {
    const classSts = (students || []).filter(s => 
      s.class.toLowerCase().trim() === consolidatedClass.toLowerCase().trim() &&
      s.status.toLowerCase() !== 'inactive'
    );

    const ut1Exam = 'Unit Test 1';
    const ut2Exam = 'Unit Test 2';
    const hyExam = 'Half Yearly Examination';
    const annualExam = 'Annual Examination';

    const data = classSts.map(st => {
      // Find UT1 mark
      const ut1Res = results.find(r => r.studentId === st.id && r.className === consolidatedClass && r.examName === ut1Exam);
      const ut1Mark = ut1Res?.subjects.find(s => s.subject.toLowerCase() === consolidatedSubject.toLowerCase())?.obtainedMarks;

      // Find UT2 mark
      const ut2Res = results.find(r => r.studentId === st.id && r.className === consolidatedClass && r.examName === ut2Exam);
      const ut2Mark = ut2Res?.subjects.find(s => s.subject.toLowerCase() === consolidatedSubject.toLowerCase())?.obtainedMarks;

      // Find HY mark
      const hyRes = results.find(r => r.studentId === st.id && r.className === consolidatedClass && r.examName === hyExam);
      const hyMark = hyRes?.subjects.find(s => s.subject.toLowerCase() === consolidatedSubject.toLowerCase())?.obtainedMarks;

      // Find Annual mark
      const annualRes = results.find(r => r.studentId === st.id && r.className === consolidatedClass && r.examName === annualExam);
      const annualMark = annualRes?.subjects.find(s => s.subject.toLowerCase() === consolidatedSubject.toLowerCase())?.obtainedMarks;

      return {
        studentId: st.id,
        studentName: st.name,
        roll: st.roll || '-',
        ut1: ut1Mark !== undefined ? String(ut1Mark) : '',
        ut2: ut2Mark !== undefined ? String(ut2Mark) : '',
        hy: hyMark !== undefined ? String(hyMark) : '',
        annual: annualMark !== undefined ? String(annualMark) : ''
      };
    });

    setEntryData(data);
  };

  React.useEffect(() => {
    if (showConsolidatedStudio) {
      pullEntryData();
    }
  }, [showConsolidatedStudio, consolidatedClass, consolidatedSubject, results, students]);

  const getExamResultForStudent = (studentId: string, type: 'ut1' | 'ut2' | 'hy' | 'annual') => {
    return results.find(r => {
      if (r.studentId !== studentId || r.className?.toLowerCase().trim() !== consolidatedClass.toLowerCase().trim()) return false;
      const name = r.examName?.toLowerCase().trim();
      if (!name) return false;
      if (type === 'ut1') {
        return name.includes('unit test 1') || name.includes('ut 1') || name.includes('ut-1') || name === 'ut1';
      }
      if (type === 'ut2') {
        return name.includes('unit test 2') || name.includes('ut 2') || name.includes('ut-2') || name === 'ut2';
      }
      if (type === 'hy') {
        return name.includes('half yearly') || name.includes('half') || name.includes('mid') || name.includes('term 1');
      }
      if (type === 'annual') {
        return name.includes('annual') || name.includes('final') || name.includes('term 2') || name.includes('board');
      }
      return false;
    });
  };

  const saveSubjectMarksForAll4Exams = (
    maxMarks: number,
    studentMarksList: {
      studentId: string;
      studentName: string;
      roll: string;
      ut1: string;
      ut2: string;
      hy: string;
      annual: string;
    }[]
  ) => {
    let updatedResults = [...results];

    const examNamesMap = {
      ut1: 'Unit Test 1',
      ut2: 'Unit Test 2',
      hy: 'Half Yearly Examination',
      annual: 'Annual Examination'
    };

    studentMarksList.forEach(item => {
      const { studentId, studentName, roll, ut1, ut2, hy, annual } = item;

      // For each exam, check if we need to update
      const examsToUpdate = [
        { key: 'ut1', value: ut1.trim() !== '' ? Number(ut1) : null, name: examNamesMap.ut1 },
        { key: 'ut2', value: ut2.trim() !== '' ? Number(ut2) : null, name: examNamesMap.ut2 },
        { key: 'hy', value: hy.trim() !== '' ? Number(hy) : null, name: examNamesMap.hy },
        { key: 'annual', value: annual.trim() !== '' ? Number(annual) : null, name: examNamesMap.annual }
      ];

      examsToUpdate.forEach(exam => {
        // Only record/create if value is not null, otherwise skip so we don't pollute the DB with blanks
        if (exam.value === null) return;

        // Find existing result for this student + class + exam
        const existingIdx = updatedResults.findIndex(r => 
          r.studentId === studentId && 
          r.className === consolidatedClass && 
          r.examName === exam.name
        );

        if (existingIdx !== -1) {
          // Result exists, clone and merge
          const existingResult = { ...updatedResults[existingIdx] };
          const subjectsCopy = [...existingResult.subjects];
          
          const subIdx = subjectsCopy.findIndex(s => s.subject.toLowerCase() === consolidatedSubject.toLowerCase());
          if (subIdx !== -1) {
            subjectsCopy[subIdx] = {
              subject: consolidatedSubject,
              maxMarks,
              obtainedMarks: exam.value
            };
          } else {
            subjectsCopy.push({
              subject: consolidatedSubject,
              maxMarks,
              obtainedMarks: exam.value
            });
          }

          const calculated = calculateResults(subjectsCopy);
          existingResult.subjects = subjectsCopy;
          existingResult.roll = roll;
          existingResult.totalMarks = calculated.totalObtained;
          existingResult.percentage = Number(calculated.percentage.toFixed(2));
          existingResult.grade = calculated.grade;
          existingResult.status = calculated.status as 'Pass' | 'Fail';
          
          if (existingResult.percentage >= 90) existingResult.remarks = 'Excellent performance! Outstanding achievement.';
          else if (existingResult.percentage >= 80) existingResult.remarks = 'Very Good! Consistent effort and high quality work.';
          else if (existingResult.percentage >= 70) existingResult.remarks = 'Good job! Active participation and steady progress.';
          else if (existingResult.percentage >= 60) existingResult.remarks = 'Satisfactory. Good progress, keep working hard.';
          else if (existingResult.percentage >= 50) existingResult.remarks = 'Average. Needs more focus and preparation.';
          else if (existingResult.percentage >= 40) existingResult.remarks = 'Pass. Improvement is needed in core subjects.';
          else existingResult.remarks = 'Needs regular guidance and vigorous improvement.';

          updatedResults[existingIdx] = existingResult;
        } else {
          // Create new result entry
          const subjects = [{
            subject: consolidatedSubject,
            maxMarks,
            obtainedMarks: exam.value
          }];
          const calculated = calculateResults(subjects);
          
          let remark = '';
          if (calculated.percentage >= 90) remark = 'Excellent performance! Outstanding achievement.';
          else if (calculated.percentage >= 80) remark = 'Very Good! Consistent effort and high quality work.';
          else if (calculated.percentage >= 70) remark = 'Good job! Active participation and steady progress.';
          else if (calculated.percentage >= 60) remark = 'Satisfactory. Good progress, keep working hard.';
          else if (calculated.percentage >= 50) remark = 'Average. Needs more focus and preparation.';
          else if (calculated.percentage >= 40) remark = 'Pass. Improvement is needed in core subjects.';
          else remark = 'Needs regular guidance and vigorous improvement.';

          const newRes: StudentResult = {
            id: `RES-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            studentId,
            studentName,
            roll,
            className: consolidatedClass,
            examName: exam.name,
            subjects,
            totalMarks: calculated.totalObtained,
            percentage: Number(calculated.percentage.toFixed(2)),
            grade: calculated.grade,
            status: calculated.status as 'Pass' | 'Fail',
            remarks: remark
          };
          updatedResults.push(newRes);
        }
      });
    });

    setResults(updatedResults);
    alert(`Successfully saved ${consolidatedSubject} marks of 4-exams for ${studentMarksList.length} students!`);
  };

  const initialGrid = () => {
    const arr = Array.from({ length: 15 }, () => Array(9).fill(''));
    arr[0] = ['Student Name', 'Admission No', 'Roll No', 'Class', 'Exam Name', 'Math [100]', 'Science [100]', 'English [100]', 'Remarks'];
    return arr;
  };
  const [gridData, setGridData] = useState<string[][]>(initialGrid);

  const handlePopulateClassStudents = () => {
    if (!bulkImportClass) {
      alert('Please select a class first.');
      return;
    }
    const classStudents = (students || []).filter(s => 
      s.class.toLowerCase().trim() === bulkImportClass.toLowerCase().trim() &&
      s.status.toLowerCase() !== 'inactive'
    );

    if (classStudents.length === 0) {
      alert(`No active students found in "${bulkImportClass}". Ensure they are added in Students management with exactly this class set.`);
      return;
    }

    // Keep the first row headers from the current grid (e.g. if the user added/removed columns, we keep them!)
    const headers = [...gridData[0]];
    const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
    const idIdx = headers.findIndex(h => h.toLowerCase().includes('admission') || h.toLowerCase().includes('id'));
    const rollIdx = headers.findIndex(h => h.toLowerCase().includes('roll'));
    const classIdx = headers.findIndex(h => h.toLowerCase().includes('class'));
    const examIdx = headers.findIndex(h => h.toLowerCase().includes('exam'));

    if (nameIdx === -1 || idIdx === -1) {
      alert('Grid headers must include "Student Name" and "Admission No" columns.');
      return;
    }

    const newGrid: string[][] = [headers];

    classStudents.forEach(st => {
      const row = Array(headers.length).fill('');
      row[nameIdx] = st.name;
      row[idIdx] = st.id;
      if (rollIdx !== -1) row[rollIdx] = st.roll || '-';
      if (classIdx !== -1) row[classIdx] = st.section ? `${st.class} - ${st.section}` : st.class;
      if (examIdx !== -1) row[examIdx] = bulkImportExam;
      newGrid.push(row);
    });

    // Make sure we have at least 15 rows
    while (newGrid.length < 16) {
      newGrid.push(Array(headers.length).fill(''));
    }

    setGridData(newGrid);
    alert(`Successfully loaded ${classStudents.length} students from ${bulkImportClass}! You can now easily fill standard marks and hit Import.`);
  };

  const addSubjectColumn = (subjectName: string, maxMarks: number = 100) => {
    const formattedHeader = `${subjectName} [${maxMarks}]`;
    const remarksIndex = gridData[0].length > 0
      ? gridData[0].findIndex(h => h.toLowerCase().includes('remark'))
      : -1;
    
    let insertIndex = remarksIndex !== -1 ? remarksIndex : gridData[0].length;
    
    const newGrid = gridData.map((row, ri) => {
      const newRow = [...row];
      if (ri === 0) {
        newRow.splice(insertIndex, 0, formattedHeader);
      } else {
        newRow.splice(insertIndex, 0, '');
      }
      return newRow;
    });
    setGridData(newGrid);
  };
  const [editingResult, setEditingResult] = useState<StudentResult | null>(null);

  const initialFormState = {
    studentId: '',
    studentName: '',
    roll: '',
    className: '',
    examName: '',
    subjects: [{ subject: '', maxMarks: 100, obtainedMarks: 0 }] as SubjectMark[],
    remarks: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const calculateResults = (subjects: SubjectMark[]) => {
    let totalMax = 0;
    let totalObtained = 0;
    subjects.forEach(sub => {
      totalMax += Number(sub.maxMarks) || 0;
      totalObtained += Number(sub.obtainedMarks) || 0;
    });

    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    const status = percentage >= 40 ? 'Pass' : 'Fail';

    return { totalObtained, percentage, grade, status };
  };

  const filteredResults = results.filter(r => 
    (selectedClassFilter === '' || (r.className || '').toLowerCase() === selectedClassFilter.toLowerCase()) &&
    (r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     r.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
     r.examName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const uniqueClasses = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  const handleOpenModal = (result?: StudentResult) => {
    if (result) {
      setEditingResult(result);
      setFormData({
        studentId: result.studentId,
        studentName: result.studentName,
        roll: result.roll || '',
        className: result.className,
        examName: result.examName,
        subjects: [...result.subjects],
        remarks: result.remarks
      });
    } else {
      setEditingResult(null);
      setFormData(initialFormState);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingResult(null);
    setFormData(initialFormState);
  };

  const handleSubjectChange = (index: number, field: keyof SubjectMark, value: string | number) => {
    const newSubjects = [...formData.subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setFormData({ ...formData, subjects: newSubjects });
  };

  const addSubject = () => {
    setFormData({ ...formData, subjects: [...formData.subjects, { subject: '', maxMarks: 100, obtainedMarks: 0 }] });
  };

  const removeSubject = (index: number) => {
    const newSubjects = [...formData.subjects];
    newSubjects.splice(index, 1);
    setFormData({ ...formData, subjects: newSubjects });
  };

  const handleSave = () => {
    const { totalObtained, percentage, grade, status } = calculateResults(formData.subjects);

    const newResult: StudentResult = {
      id: editingResult ? editingResult.id : `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...formData,
      totalMarks: totalObtained,
      percentage: Number(percentage.toFixed(2)),
      grade,
      status: status as 'Pass' | 'Fail'
    };

    if (editingResult) {
      setResults(results.map(r => r.id === newResult.id ? newResult : r));
    } else {
      setResults([...results, newResult]);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Student Result',
      message: 'Are you sure you want to delete this class results record? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    });
    if (isConfirmed) {
      setResults(results.filter(r => r.id !== id));
    }
  };

  const [parsedPreview, setParsedPreview] = useState<StudentResult[]>([]);
  const [parseError, setParseError] = useState('');

  // Update parsed preview whenever gridData changes
  React.useEffect(() => {
    const rows = gridData;
    const nonEmptyRows = rows.filter(r => r.some(c => c.trim() !== ''));

    if (nonEmptyRows.length < 2) {
      setParsedPreview([]);
      setParseError('');
      return;
    }

    try {
      const headers = nonEmptyRows[0].map(h => h.trim());
      const studentNameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
      const studentIdIdx = headers.findIndex(h => h.toLowerCase().includes('admission') || h.toLowerCase().includes('id'));
      const rollIdx = headers.findIndex(h => h.toLowerCase().includes('roll'));
      const classIdx = headers.findIndex(h => h.toLowerCase().includes('class'));
      const examIdx = headers.findIndex(h => h.toLowerCase().includes('exam'));
      const remarksIdx = headers.findIndex(h => h.toLowerCase().includes('remark'));

      if (studentNameIdx === -1 || studentIdIdx === -1 || classIdx === -1 || examIdx === -1) {
        setParseError('Missing required columns: Student Name, Admission No, Class, Exam Name');
        setParsedPreview([]);
        return;
      }

      const subjectColumns: { index: number; name: string; maxMarks: number }[] = [];
      headers.forEach((header, index) => {
        if (
          index === studentNameIdx || 
          index === studentIdIdx || 
          (rollIdx !== -1 && index === rollIdx) || 
          index === classIdx || 
          index === examIdx || 
          (remarksIdx !== -1 && index === remarksIdx)
        ) {
          return;
        }
        
        let name = header;
        let maxMarks = 100;
        const match = header.match(/(.*)\[(\d+)\]/);
        if (match) {
          name = match[1].trim();
          maxMarks = parseInt(match[2], 10);
        }
        
        if (name) {
          subjectColumns.push({ index, name, maxMarks });
        }
      });

      if (subjectColumns.length === 0) {
        setParseError('No subject columns found in headers.');
        setParsedPreview([]);
        return;
      }

      const newResults: StudentResult[] = [];
      for (let i = 1; i < nonEmptyRows.length; i++) {
        const row = nonEmptyRows[i];

        const subjects: SubjectMark[] = subjectColumns.map(col => ({
          subject: col.name,
          maxMarks: col.maxMarks,
          obtainedMarks: parseInt(row[col.index]) || 0,
        }));

        const { totalObtained, percentage, grade, status } = calculateResults(subjects);

        // Only add if we have required fields
        const stName = row[studentNameIdx]?.trim() || '';
        const stId = row[studentIdIdx]?.trim() || '';
        
        if (!stName || !stId) continue;

        // Auto-generate standard remark if left blank
        let autoRemark = (remarksIdx !== -1 ? row[remarksIdx]?.trim() : '') || '';
        if (!autoRemark) {
          if (percentage >= 90) autoRemark = 'Excellent performance! Outstanding achievement.';
          else if (percentage >= 80) autoRemark = 'Very Good! Consistent effort and high quality work.';
          else if (percentage >= 70) autoRemark = 'Good job! Active participation and steady progress.';
          else if (percentage >= 60) autoRemark = 'Satisfactory. Good progress, keep working hard.';
          else if (percentage >= 50) autoRemark = 'Average. Needs more focus and preparation.';
          else if (percentage >= 40) autoRemark = 'Pass. Improvement is needed in core subjects.';
          else autoRemark = 'Needs regular guidance and vigorous improvement.';
        }

        newResults.push({
          id: `PREVIEW-${i}`,
          studentId: stId,
          studentName: stName,
          roll: rollIdx !== -1 ? row[rollIdx]?.trim() || '' : '',
          className: row[classIdx]?.trim() || '',
          examName: row[examIdx]?.trim() || '',
          remarks: autoRemark,
          subjects,
          totalMarks: totalObtained,
          percentage: Number(percentage.toFixed(2)),
          grade,
          status: status as 'Pass' | 'Fail'
        });
      }

      setParseError('');
      setParsedPreview(newResults);
    } catch (err) {
      setParseError('Error parsing grid data.');
      setParsedPreview([]);
    }
  }, [gridData]);

  const handleBulkImport = () => {
    if (parsedPreview.length === 0) return;
    
    // Generate actual unique IDs before saving
    const resultsToSave = parsedPreview.map((res, i) => ({
      ...res,
      id: `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}-${i}`
    }));

    setResults([...results, ...resultsToSave]);
    setShowBulkModal(false);
    setGridData(initialGrid());
    alert(`Successfully imported ${resultsToSave.length} results!`);
  };

  const handleGridPaste = (e: React.ClipboardEvent, startRow: number, startCol: number) => {
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;
    
    if (clipboardData.includes('\t') || clipboardData.includes('\n')) {
      e.preventDefault();
      const pasteRows = clipboardData.split(/\r?\n/).map(r => r.split('\t'));
      
      let newGrid = [...gridData.map(r => [...r])];
      let maxRows = Math.max(newGrid.length, startRow + pasteRows.length);
      let maxCols = newGrid[0].length;
      
      pasteRows.forEach(r => { 
        maxCols = Math.max(maxCols, startCol + r.length);
      });
      
      while(newGrid.length < maxRows) {
        newGrid.push(Array(maxCols).fill(''));
      }
      newGrid.forEach(row => {
        while (row.length < maxCols) row.push('');
      });

      pasteRows.forEach((r, i) => {
        r.forEach((c, j) => {
          const ri = startRow + i;
          const ci = startCol + j;
          if (ri < newGrid.length && ci < newGrid[ri].length) {
            newGrid[ri][ci] = c;
          }
        });
      });
      setGridData(newGrid);
    }
  };

  const updateGridCell = (rIdx: number, cIdx: number, value: string) => {
    const newGrid = [...gridData];
    newGrid[rIdx] = [...newGrid[rIdx]];
    newGrid[rIdx][cIdx] = value;
    setGridData(newGrid);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Results Management</h1>
          <p className="text-slate-500">Manage student exam results</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.open('/#/result', '_blank')}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl transition-colors font-bold shadow-xs text-sm border border-slate-205"
          >
            <ExternalLink className="w-5 h-5" />
            <span className="hidden sm:inline">View Public Portal</span>
          </button>
          {user?.role === 'Super Admin' && (
            <button
              onClick={() => setShowRestrictionModal(true)}
              className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 px-4 py-2 rounded-xl transition-colors font-bold shadow-xs text-sm"
            >
              <Lock className="w-4 h-4" />
              <span>Lock/Publish Classes</span>
            </button>
          )}
          {!isStudentOrParent && (
            <>
              <button
                onClick={() => setShowConsolidatedStudio(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors font-bold shadow-xs text-sm"
              >
                <Award className="w-5 h-5" />
                <span>4-Exam Studio</span>
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors font-bold shadow-xs text-sm"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span className="hidden sm:inline">Bulk Import</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-900 transition-colors font-bold shadow-xs text-sm"
              >
                <Plus className="w-5 h-5" />
                New Result
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white z-20">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID or exam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="w-full sm:w-auto min-w-[200px]">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-slate-600 relative border-collapse">
            <thead className="bg-indigo-50/95 backdrop-blur text-indigo-800 font-semibold border-b border-indigo-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Exam</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4 text-center">Grade</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {filteredResults.map((result, idx) => (
                <tr key={result.id} className={cn(
                  "transition-colors hover:bg-indigo-50/50",
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                )}>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{result.studentName}</div>
                    <div className="text-xs text-slate-500">ID: {result.studentId}</div>
                  </td>
                  <td className="px-6 py-4">{result.className}</td>
                  <td className="px-6 py-4">{result.examName}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="font-bold text-slate-800">{result.percentage}%</div>
                    <div className="text-xs text-slate-500">{result.totalMarks} marks</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                      {result.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {result.status === 'Pass' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full text-xs font-bold">
                        <XCircle className="w-3.5 h-3.5" /> Fail
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Exam Result - ${result.studentName}</title>
                              </head>
                              <body>
                                <div style="padding: 40px; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
                                  <h1 style="text-align: center; color: #1e293b; margin-bottom: 5px;">Student Exam Result</h1>
                                  <h3 style="text-align: center; color: #475569; margin-top: 0; margin-bottom: 30px;">${result.examName}</h3>
                                  
                                  <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
                                    <tr>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Student Name</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1;">${result.studentName}</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Admission No</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1;">${result.studentId}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Class</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1;">${result.className}</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Roll No</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1;">${result.roll || '-'}</td>
                                    </tr>
                                  </table>

                                  <h4 style="margin-bottom: 10px; color: #1e293b;">Subject Marks</h4>
                                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                    <thead>
                                      <tr style="background: #f1f5f9;">
                                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Subject</th>
                                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">Max Marks</th>
                                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">Obtained Marks</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${result.subjects.map((s: any) => `
                                        <tr>
                                          <td style="padding: 10px; border: 1px solid #cbd5e1;">${s.subject}</td>
                                          <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${s.maxMarks}</td>
                                          <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${s.obtainedMarks}</td>
                                        </tr>
                                      `).join('')}
                                    </tbody>
                                  </table>

                                  <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Total Marks</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1;">${result.totalMarks}</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Percentage</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1;">${result.percentage}%</td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Grade</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1; color: ${result.status === 'Pass' ? '#16a34a' : '#dc2626'}">${result.grade}</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">Status</td>
                                      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: ${result.status === 'Pass' ? '#16a34a' : '#dc2626'}">${result.status}</td>
                                    </tr>
                                  </table>
                                  ${result.remarks ? `<p style="margin-top: 20px; padding: 15px; background: #f8fafc; border-left: 4px solid #94a3b8;"><strong>Remarks:</strong> ${result.remarks}</p>` : ''}
                                </div>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.focus();
                          printWindow.print();
                        }
                      }}
                      className="text-emerald-600 hover:text-emerald-800 p-2"
                      title="Download Result"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {!isStudentOrParent && (
                      <>
                        <button
                          onClick={() => handleOpenModal(result)}
                          className="text-indigo-600 hover:text-indigo-800 p-2"
                          title="Edit Result"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(result.id)}
                          className="text-rose-600 hover:text-rose-800 p-2"
                          title="Delete Result"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">
                {editingResult ? 'Edit Result' : 'Add New Result'}
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Student Name</label>
                  <input
                    type="text"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Admission Number</label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., ADM2023001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Class & Section</label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., Grade 10 - A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={formData.roll}
                    onChange={(e) => setFormData({ ...formData, roll: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., 21"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Exam Name</label>
                  <input
                    type="text"
                    value={formData.examName}
                    onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., Final Examination 2023"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Subjects & Marks</label>
                  <button onClick={addSubject} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold">
                    + Add Subject
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.subjects.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={sub.subject}
                          onChange={(e) => handleSubjectChange(idx, 'subject', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Subject Name"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          value={sub.maxMarks}
                          onChange={(e) => handleSubjectChange(idx, 'maxMarks', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Max"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          value={sub.obtainedMarks}
                          onChange={(e) => handleSubjectChange(idx, 'obtainedMarks', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                          placeholder="Obtained"
                        />
                      </div>
                      <button onClick={() => removeSubject(idx)} className="text-rose-500 hover:text-rose-700">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="e.g., Excellent performance"
                  rows={2}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Save Result
              </button>
            </div>

          </motion.div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-[95vw] overflow-hidden flex flex-col h-[90vh]"
          >
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Bulk Import from Excel</h2>
              <p className="text-sm text-slate-500 mt-1">Paste tabular data directly from Excel or type in the grid.</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col">
              {/* Auto Populate Class & Exam controls */}
              <div className="mb-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
                      Class & Exam Wise Auto-Population Panel
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select a class to automatically load all currently enrolled students (Names, Roll Nos, Admission IDs) directly into the spreadsheet below.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-[140px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Class</label>
                      <select
                        value={bulkImportClass}
                        onChange={(e) => setBulkImportClass(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-[180px]">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Exam</label>
                      <select
                        value={bulkImportExam}
                        onChange={(e) => setBulkImportExam(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {['Unit Test 1', 'Unit Test 2', 'Unit Test 3', 'Unit Test 4', 'Half Yearly Examination', 'Annual Examination', 'Pre-Board Examination', 'Board Examination'].map(ex => (
                          <option key={ex} value={ex}>{ex}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handlePopulateClassStudents}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 self-end"
                    >
                      <Plus className="w-4 h-4 text-indigo-200" />
                      Auto-Populate Students
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-4 bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-sm text-indigo-900">
                <strong>Guide:</strong> 
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs text-indigo-800">
                  <li>First Row of the sheet is the Header. Use format <code>Subject [Max]</code> (e.g. <code>Hindi [100]</code>) for subject columns.</li>
                  <li>Required fields: <strong>Student Name</strong>, <strong>Admission No</strong>, <strong>Class</strong> and <strong>Exam Name</strong> (Auto-populate fills these automatically).</li>
                  <li><strong>Remarks Column:</strong> If left empty, a professional school-standard remark (Excellent/Very Good/Satisfactory/Needs improvement) will auto-generate based on overall percentage marks!</li>
                </ul>
              </div>

              <div className="mb-4 border border-slate-300 overflow-auto resize-y min-h-[300px] h-[50vh] relative shadow-inner bg-slate-50 rounded-xl">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-30 shadow-md">
                    <tr>
                      <th className="bg-indigo-100/95 backdrop-blur text-indigo-400 text-xs w-10 text-center border-b border-r border-indigo-200 select-none">
                        #
                      </th>
                      {gridData[0].map((cell, ci) => (
                        <th key={`header-${ci}`} className="bg-indigo-100/95 backdrop-blur border-b border-r border-indigo-200 min-w-[150px] relative group p-0 text-left">
                          <input 
                            className="w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:relative focus:z-10 transition-shadow m-0 border-0 font-bold bg-transparent text-indigo-900 pr-14 placeholder-indigo-300 text-xs"
                            value={cell}
                            onChange={(e) => updateGridCell(0, ci, e.target.value)}
                            onPaste={(e) => handleGridPaste(e, 0, ci)}
                            placeholder="Header"
                          />
                          
                          {cell?.toLowerCase().trim() === 'class' && (
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-indigo-200/50 rounded hover:bg-indigo-300/50 transition-colors cursor-pointer text-indigo-700" title="Set Class for All Rows">
                              <select 
                                className="absolute inset-0 opacity-0 cursor-pointer text-xs"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    const newGrid = [...gridData];
                                    for(let i=1; i<newGrid.length; i++) {
                                      newGrid[i][ci] = val;
                                    }
                                    setGridData(newGrid);
                                  }
                                  e.target.value = '';
                                }}
                              >
                                <option value="">Fill Column...</option>
                                {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <ChevronDown className="w-4 h-4 pointer-events-none" />
                            </div>
                          )}
                          
                          {cell?.toLowerCase().trim() === 'exam name' && (
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-indigo-200/50 rounded hover:bg-indigo-300/50 transition-colors cursor-pointer text-indigo-700" title="Set Exam for All Rows">
                              <select 
                                className="absolute inset-0 opacity-0 cursor-pointer text-xs"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    const newGrid = [...gridData];
                                    for(let i=1; i<newGrid.length; i++) {
                                      newGrid[i][ci] = val;
                                    }
                                    setGridData(newGrid);
                                  }
                                  e.target.value = '';
                                }}
                              >
                                <option value="">Fill Column...</option>
                                {['Unit Test 1', 'Unit Test 2', 'Unit Test 3', 'Unit Test 4', 'Half Yearly Examination', 'Annual Examination', 'Pre-Board Examination', 'Board Examination'].map(ex => <option key={ex} value={ex}>{ex}</option>)}
                              </select>
                              <ChevronDown className="w-4 h-4 pointer-events-none" />
                            </div>
                          )}

                          {gridData[0].length > 1 && (
                            <button
                              onClick={async () => {
                                const isConfirmed = await confirm({
                                  title: 'Delete Column',
                                  message: `Are you sure you want to delete column "${cell || ci + 1}"? This will delete all marks entered in this column.`,
                                  variant: 'danger',
                                  confirmLabel: 'Delete Column',
                                  cancelLabel: 'Cancel'
                                });
                                if (isConfirmed) {
                                  const newGrid = gridData.map(r => {
                                    const newRow = [...r];
                                    newRow.splice(ci, 1);
                                    return newRow;
                                  });
                                  setGridData(newGrid);
                                }
                              }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center text-rose-500 bg-white shadow-sm rounded-md p-1 hover:bg-rose-50 z-20"
                              title="Delete Column"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gridData.slice(1).map((row, riOffset) => {
                      const ri = riOffset + 1;
                      return (
                      <tr key={ri}>
                        <td className={cn(
                          "text-xs w-10 text-center border-b border-r border-slate-300 select-none relative group h-full",
                          ri % 2 === 0 ? "bg-slate-100 text-slate-500" : "bg-slate-50 text-slate-400"
                        )}>
                          <span className="group-hover:opacity-0">{ri}</span>
                          {gridData.length > 2 && (
                            <button
                              onClick={() => {
                                const newGrid = [...gridData];
                                newGrid.splice(ri, 1);
                                setGridData(newGrid);
                              }}
                              className="absolute inset-x-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center text-rose-500 bg-rose-50 rounded p-1 hover:bg-rose-100 mx-auto"
                              title="Delete Row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                        {row.map((cell, ci) => {
                          const h = gridData[0][ci]?.toLowerCase().trim() || '';
                          const isStudentField = h.includes('name') || h.includes('admission') || h.includes('id') || h.includes('roll');
                          return (
                          <td key={`${ri}-${ci}`} className="border-b border-r border-slate-300 min-w-[150px] relative group p-0">
                            {h === 'class' ? (
                              <select
                                 className={cn(
                                   "w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:relative focus:z-10 transition-colors m-0 border-0 cursor-pointer appearance-none text-xs",
                                   ri % 2 === 0 ? "bg-slate-50/80 text-slate-705 font-bold" : "bg-white text-slate-705 font-bold"
                                 )}
                                 value={cell}
                                 onChange={(e) => updateGridCell(ri, ci, e.target.value)}
                                 onPaste={(e) => handleGridPaste(e, ri, ci)}
                               >
                                 <option value="" disabled>Select Class</option>
                                 {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => <option key={c} value={c}>{c}</option>)}
                                 {!['', 'Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].includes(cell) && cell && (
                                   <option value={cell}>{cell}</option>
                                 )}
                               </select>
                             ) : h === 'exam name' ? (
                              <select
                                className={cn(
                                  "w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:relative focus:z-10 transition-colors m-0 border-0 cursor-pointer appearance-none text-xs",
                                  ri % 2 === 0 ? "bg-slate-50/80 text-slate-705 font-medium" : "bg-white text-slate-705 font-medium"
                                )}
                                value={cell}
                                onChange={(e) => updateGridCell(ri, ci, e.target.value)}
                                onPaste={(e) => handleGridPaste(e, ri, ci)}
                              >
                                <option value="" disabled>Select Exam</option>
                                {['Unit Test 1', 'Unit Test 2', 'Unit Test 3', 'Unit Test 4', 'Half Yearly Examination', 'Annual Examination', 'Pre-Board Examination', 'Board Examination'].map(ex => <option key={ex} value={ex}>{ex}</option>)}
                                {!['', 'Unit Test 1', 'Unit Test 2', 'Unit Test 3', 'Unit Test 4', 'Half Yearly Examination', 'Annual Examination', 'Pre-Board Examination', 'Board Examination'].includes(cell) && cell && (
                                  <option value={cell}>{cell}</option>
                                )}
                              </select>
                             ) : (
                              <input 
                                className={cn(
                                  "w-full px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:relative focus:z-10 transition-colors m-0 border-0 text-xs",
                                  isStudentField 
                                    ? "bg-indigo-50/40 font-semibold text-indigo-950" 
                                    : ri % 2 === 0 ? "bg-slate-50/80 text-slate-700 font-medium" : "bg-white text-slate-700 font-medium"
                                )}
                                value={cell}
                                onChange={(e) => updateGridCell(ri, ci, e.target.value)}
                                onPaste={(e) => handleGridPaste(e, ri, ci)}
                                placeholder={isStudentField ? "Auto-Filled" : ""}
                              />
                            )}
                          </td>
                        );
                        })}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-150">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGridData([...gridData, Array(gridData[0].length).fill('')])}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 text-slate-750 rounded-xl bg-white hover:bg-slate-50 shadow-xs"
                  >
                    + Add Row
                  </button>
                  <button
                    onClick={() => setGridData(gridData.map(r => [...r, '']))}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 text-slate-750 rounded-xl bg-white hover:bg-slate-50 shadow-xs"
                  >
                    + Add Column
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-slate-300 hidden md:block font-bold"></div>

                <div className="flex flex-wrap items-center gap-1.5 bg-indigo-50/50 border border-indigo-100/80 rounded-xl p-1 shrink-0">
                  <span className="text-xs font-bold text-indigo-900 px-2">Quick Add Subject:</span>
                  <select
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-700"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setNewSubjectColName('');
                      } else if (val) {
                        setNewSubjectColName(val);
                      }
                    }}
                    value={['English', 'Mathematics', 'Science', 'Social Studies', 'Assamese', 'Hindi', 'Computer Sci', 'Sanskrit'].includes(newSubjectColName) ? newSubjectColName : 'custom'}
                  >
                    <option value="English">English</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Social Studies">Social Studies</option>
                    <option value="Assamese">Assamese</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Computer Sci">Computer</option>
                    <option value="Sanskrit">Sanskrit</option>
                    <option value="custom">-- Custom Name --</option>
                  </select>
                  
                  <input
                    type="text"
                    placeholder="Subject Name"
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 w-32"
                    value={newSubjectColName}
                    onChange={(e) => setNewSubjectColName(e.target.value)}
                  />

                  <div className="text-xs font-bold text-slate-400 select-none">[</div>
                  <input
                    type="number"
                    placeholder="100"
                    className="px-1 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 w-12 font-bold text-center"
                    value={newSubjectColMax || ''}
                    onChange={(e) => setNewSubjectColMax(Number(e.target.value) || 0)}
                  />
                  <div className="text-xs font-bold text-slate-400 select-none">]</div>

                  <button
                    onClick={() => {
                      const finalName = newSubjectColName.trim();
                      if (!finalName) {
                        alert('Please enter or select a subject name');
                        return;
                      }
                      addSubjectColumn(finalName, newSubjectColMax || 100);
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    + Add Subject Column
                  </button>
                </div>

                <div className="flex-1"></div>
                <button
                  onClick={async () => {
                    const isConfirmed = await confirm({
                      title: 'Clear Grid Data',
                      message: 'Are you sure you want to clear all rows and columns in the entry grid? You will lose any unsaved data.',
                      variant: 'danger',
                      confirmLabel: 'Clear All',
                      cancelLabel: 'Cancel'
                    });
                    if (isConfirmed) {
                      setGridData(initialGrid());
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors shrink-0"
                >
                  Clear Grid
                </button>
              </div>

              {parseError && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium border border-rose-200 mb-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5 flex-shrink-0" /> {parseError}
                </div>
              )}

              {parsedPreview.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Preview ({parsedPreview.length} valid records)
                  </h3>
                  <div className="overflow-auto border border-slate-200 rounded-xl max-h-[400px] relative">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap border-collapse">
                      <thead className="bg-slate-50/95 backdrop-blur text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-4 py-3">Student Name</th>
                          <th className="px-4 py-3">Adm No</th>
                          <th className="px-4 py-3">Class & Exam</th>
                          <th className="px-4 py-3">Subjects</th>
                          <th className="px-4 py-3 text-center">Score %</th>
                          <th className="px-4 py-3 text-center">Grade/Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPreview.map((preview, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-800">{preview.studentName}</td>
                            <td className="px-4 py-3 text-xs">{preview.studentId}</td>
                            <td className="px-4 py-3 text-xs">{preview.className}<br/><span className="text-slate-400">{preview.examName}</span></td>
                            <td className="px-4 py-3 text-xs max-w-xs truncate" title={preview.subjects.map(s => `${s.subject}: ${s.obtainedMarks}/${s.maxMarks}`).join(', ')}>
                              {preview.subjects.length} subjects
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-800">{preview.percentage}%</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${preview.status === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {preview.grade} • {preview.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => { setShowBulkModal(false); setGridData(initialGrid()); }}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={parsedPreview.length === 0}
                className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Data
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Public Results Restrictions Modal */}
      {showRestrictionModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  Public Portal Controls
                </h2>
                <p className="text-xs text-slate-500 mt-1">Restrict or enable public viewing of results class-wise.</p>
              </div>
              <button
                onClick={() => setShowRestrictionModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-2 rounded-full hover:bg-slate-100 transition-all outline-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 p-3 rounded-2xl leading-relaxed flex items-start gap-2.5">
                <span className="text-amber-500 text-sm">⚠️</span>
                <span>
                  <strong>Locked/restricted</strong> classes will be completely hidden from public queries on the public results portal. Use this when exam compilation is in progress or to secure marks.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {uniqueClasses.map((cl) => {
                  const isRestricted = (settings?.restrictedResultClasses || []).includes(cl);
                  return (
                    <button
                      key={cl}
                      disabled={isUpdatingRestriction}
                      onClick={() => toggleClassRestriction(cl)}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all relative group select-none cursor-pointer",
                        isRestricted
                          ? "border-rose-200 bg-rose-50/40 text-rose-850 shadow-xs hover:bg-rose-50 hover:border-rose-300"
                          : "border-emerald-200 bg-emerald-50/30 text-emerald-900 shadow-xs hover:bg-emerald-50/60 hover:border-emerald-300"
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-extrabold uppercase tracking-wide">
                          {cl}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold tracking-widest uppercase",
                          isRestricted ? "text-rose-600" : "text-emerald-705"
                        )}>
                          {isRestricted ? "LOCKED (PRIVATE)" : "PUBLISHED (PUBLIC)"}
                        </span>
                      </div>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-105",
                        isRestricted ? "bg-rose-100/80 text-rose-600" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {isRestricted ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              {isUpdatingRestriction ? (
                <span className="text-xs text-indigo-650 font-bold animate-pulse flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></span>
                  Updating settings...
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Changes auto-saved instantly
                </span>
              )}
              <button
                onClick={() => setShowRestrictionModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Close Controls
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* NEW: Integrated 4-Exam Consolidated Studio Modal */}
      {showConsolidatedStudio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-800/60 rounded-xl text-indigo-200">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Consolidated 4-Exam Studio</h2>
                  <p className="text-xs text-indigo-200 font-medium">Class progress compilation, bulk 4-exam entry & dynamic report card generator</p>
                </div>
              </div>
              <button
                onClick={() => setShowConsolidatedStudio(false)}
                className="p-1.5 hover:bg-white/15 rounded-full transition-colors font-bold text-white text-md outline-none"
              >
                ✕
              </button>
            </div>

            {/* Top Controls Bar */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Select Class */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class:</span>
                  <select
                    value={consolidatedClass}
                    onChange={(e) => {
                      setConsolidatedClass(e.target.value);
                      setSelectedConsolStudentId('');
                    }}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500/20"
                  >
                    {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Tab selectors */}
                <div className="h-5 w-[1px] bg-slate-300"></div>

                <div className="flex bg-slate-200/60 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveStudioTab('dashboard')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      activeStudioTab === 'dashboard' ? "bg-white text-indigo-900 shadow-xs animate-none" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    🏆 Progress Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setActiveStudioTab('entry');
                      pullEntryData();
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      activeStudioTab === 'entry' ? "bg-white text-indigo-900 shadow-xs animate-none" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    📝 4-Exam Quick Entry
                  </button>
                  <button
                    onClick={() => {
                      setActiveStudioTab('reportcard');
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      activeStudioTab === 'reportcard' ? "bg-white text-indigo-900 shadow-xs animate-none" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    🖨️ Consolidated Report Card
                  </button>
                </div>
              </div>

              {/* Configure Weightages */}
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-955 uppercase tracking-wider">Exam Weights:</span>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-indigo-500">UT1:</span>
                    <input
                      type="number"
                      className="w-8 py-0.5 bg-white border border-indigo-200 text-center rounded text-xs font-bold"
                      value={consolidatedWeights.ut1}
                      onChange={(e) => setConsolidatedWeights({ ...consolidatedWeights, ut1: Math.max(0, Number(e.target.value) || 0) })}
                    />%
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-indigo-500">UT2:</span>
                    <input
                      type="number"
                      className="w-8 py-0.5 bg-white border border-indigo-200 text-center rounded text-xs font-bold"
                      value={consolidatedWeights.ut2}
                      onChange={(e) => setConsolidatedWeights({ ...consolidatedWeights, ut2: Math.max(0, Number(e.target.value) || 0) })}
                    />%
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-indigo-500">Term-1(HY):</span>
                    <input
                      type="number"
                      className="w-9 py-0.5 bg-white border border-indigo-200 text-center rounded text-xs font-bold"
                      value={consolidatedWeights.hy}
                      onChange={(e) => setConsolidatedWeights({ ...consolidatedWeights, hy: Math.max(0, Number(e.target.value) || 0) })}
                    />%
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-indigo-500">Final(AE):</span>
                    <input
                      type="number"
                      className="w-9 py-0.5 bg-white border border-indigo-200 text-center rounded text-xs font-bold"
                      value={consolidatedWeights.annual}
                      onChange={(e) => setConsolidatedWeights({ ...consolidatedWeights, annual: Math.max(0, Number(e.target.value) || 0) })}
                    />%
                  </div>
                </div>
                {consolidatedWeights.ut1 + consolidatedWeights.ut2 + consolidatedWeights.hy + consolidatedWeights.annual !== 100 && (
                  <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded animate-pulse">
                    Sum ≠ 100%
                  </span>
                )}
              </div>
            </div>

            {/* Modal Body Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {/* Tab 1: PROGRESS DASHBOARD */}
              {activeStudioTab === 'dashboard' && (() => {
                const classStudents = (students || []).filter(s => 
                  s.class.toLowerCase().trim() === consolidatedClass.toLowerCase().trim() &&
                  s.status.toLowerCase() !== 'inactive'
                );

                // Compute student stats
                const processedStudents = classStudents.map(st => {
                  const ut1Res = getExamResultForStudent(st.id, 'ut1');
                  const ut2Res = getExamResultForStudent(st.id, 'ut2');
                  const hyRes = getExamResultForStudent(st.id, 'hy');
                  const annualRes = getExamResultForStudent(st.id, 'annual');

                  // Let's compute weighted average of their total percentages
                  let sumWeights = 0;
                  let sumMarks = 0;

                  if (ut1Res) {
                    sumMarks += ut1Res.percentage * consolidatedWeights.ut1;
                    sumWeights += consolidatedWeights.ut1;
                  }
                  if (ut2Res) {
                    sumMarks += ut2Res.percentage * consolidatedWeights.ut2;
                    sumWeights += consolidatedWeights.ut2;
                  }
                  if (hyRes) {
                    sumMarks += hyRes.percentage * consolidatedWeights.hy;
                    sumWeights += consolidatedWeights.hy;
                  }
                  if (annualRes) {
                    sumMarks += annualRes.percentage * consolidatedWeights.annual;
                    sumWeights += consolidatedWeights.annual;
                  }

                  const overallPercentage = sumWeights > 0 ? (sumMarks / sumWeights) : null;
                  const finalPct = overallPercentage !== null ? Number(overallPercentage.toFixed(2)) : 0;
                  
                  let finalGrade = 'F';
                  if (overallPercentage !== null) {
                    if (finalPct >= 90) finalGrade = 'A+';
                    else if (finalPct >= 80) finalGrade = 'A';
                    else if (finalPct >= 70) finalGrade = 'B+';
                    else if (finalPct >= 60) finalGrade = 'B';
                    else if (finalPct >= 50) finalGrade = 'C';
                    else if (finalPct >= 40) finalGrade = 'D';
                  }

                  return {
                    id: st.id,
                    name: st.name,
                    roll: st.roll || '-',
                    ut1: ut1Res ? `${ut1Res.percentage}%` : 'N/A',
                    ut2: ut2Res ? `${ut2Res.percentage}%` : 'N/A',
                    hy: hyRes ? `${hyRes.percentage}%` : 'N/A',
                    annual: annualRes ? `${annualRes.percentage}%` : 'N/A',
                    overallPct: overallPercentage !== null ? finalPct : null,
                    grade: overallPercentage !== null ? finalGrade : 'N/A',
                    status: overallPercentage !== null ? (finalPct >= 40 ? 'Pass' : 'Fail') : 'N/A'
                  };
                });

                // Overall average
                const validOverallPct = processedStudents.filter(s => s.overallPct !== null).map(s => s.overallPct as number);
                const classAverage = validOverallPct.length > 0 ? (validOverallPct.reduce((a, b) => a + b, 0) / validOverallPct.length).toFixed(1) : 'N/A';
                const passPercentage = validOverallPct.length > 0 ? ((validOverallPct.filter(p => p >= 40).length / validOverallPct.length) * 100).toFixed(0) : 'N/A';

                const sortedToppers = [...processedStudents]
                  .filter(s => s.overallPct !== null)
                  .sort((a, b) => (b.overallPct || 0) - (a.overallPct || 0));

                const classTopper = sortedToppers.length > 0 ? `${sortedToppers[0].name} (${sortedToppers[0].overallPct}%)` : 'N/A';

                return (
                  <div className="space-y-6">
                    {/* Bento Box Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Enrolled Students</p>
                          <h4 className="text-xl font-extrabold text-slate-800">{classStudents.length} Students</h4>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                          <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Class Avg Score</p>
                          <h4 className="text-xl font-extrabold text-slate-800">{classAverage}{classAverage !== 'N/A' ? '%' : ''}</h4>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Est. Pass Rate</p>
                          <h4 className="text-xl font-extrabold text-slate-800">{passPercentage}{passPercentage !== 'N/A' ? '%' : ''}</h4>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase">Class Topper</p>
                          <h4 className="text-sm font-black text-slate-800 truncate max-w-[160px]" title={classTopper}>{classTopper}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Main Class List Sheet */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-250 overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-white">
                        <h3 className="font-extrabold text-slate-800 text-sm">Class Consolidated Progress Index</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600 border-collapse">
                          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="px-6 py-3">Roll No</th>
                              <th className="px-6 py-3">Student Name</th>
                              <th className="px-6 py-3">UT-1 ({consolidatedWeights.ut1}%)</th>
                              <th className="px-6 py-3">UT-2 ({consolidatedWeights.ut2}%)</th>
                              <th className="px-6 py-3">Half Yearly ({consolidatedWeights.hy}%)</th>
                              <th className="px-6 py-3">Annual ({consolidatedWeights.annual}%)</th>
                              <th className="px-6 py-3 font-extrabold text-indigo-950">Grand Combined %</th>
                              <th className="px-6 py-3">Final Grade</th>
                              <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {processedStudents.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="px-6 py-10 text-center font-medium text-slate-400 text-xs">
                                  No active students found in "{consolidatedClass}". Add them in Students menu.
                                </td>
                              </tr>
                            ) : (
                              processedStudents.map((pst, idx) => (
                                <tr key={pst.id} className="hover:bg-indigo-50/10">
                                  <td className="px-6 py-3.5 font-bold text-slate-800">{pst.roll}</td>
                                  <td className="px-6 py-3.5 font-bold text-slate-850">
                                    <div>{pst.name}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">{pst.id}</div>
                                  </td>
                                  <td className="px-6 py-3.5 font-semibold text-slate-600">{pst.ut1}</td>
                                  <td className="px-6 py-3.5 font-semibold text-slate-600">{pst.ut2}</td>
                                  <td className="px-6 py-3.5 font-semibold text-slate-600">{pst.hy}</td>
                                  <td className="px-6 py-3.5 font-semibold text-slate-600">{pst.annual}</td>
                                  <td className="px-6 py-3.5">
                                    {pst.overallPct !== null ? (
                                      <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg text-xs">
                                        {pst.overallPct}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-medium animate-pulse">Draft (Incomplete)</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-3.5">
                                    {pst.overallPct !== null ? (
                                      <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-black tracking-wide uppercase",
                                        pst.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                      )}>
                                        {pst.grade} • {pst.status}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-3.5 text-right space-x-1 whitespace-nowrap">
                                    <button
                                      onClick={() => {
                                        setSelectedConsolStudentId(pst.id);
                                        setActiveStudioTab('reportcard');
                                      }}
                                      className="px-2.5 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-750 transition-colors rounded-lg"
                                    >
                                      Report Card
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tab 2: 4-EXAM QUICK ENTRY GRID */}
              {activeStudioTab === 'entry' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-205">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                          <span className="p-1 bg-indigo-100 text-indigo-600 rounded-md">✍️</span>
                          4-Exam Multi-Term Marks Matrix Editor
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Now, you can write or copy-paste subject scores for UT-1, UT-2, Half Yearly, and Annual exams together class-wide, side-by-side!
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-[130px]">
                          <label className="block text-[10px] font-black text-slate-500 tracking-wider mb-1 uppercase">Select Subject</label>
                          <select
                            value={consolidatedSubject}
                            onChange={(e) => setConsolidatedSubject(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                          >
                            {['Mathematics', 'Science', 'English', 'Social Studies', 'Assamese', 'Hindi', 'Computer Sci', 'Sanskrit'].map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-[80px]">
                          <label className="block text-[10px] font-black text-slate-500 tracking-wider mb-1 uppercase">Max Marks</label>
                          <input
                            type="number"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                            value={newSubjectColMax}
                            onChange={(e) => setNewSubjectColMax(Math.max(1, Number(e.target.value) || 100))}
                          />
                        </div>

                        <button
                          onClick={async () => {
                            const isConfirmed = await confirm({
                              title: 'Reset Modifications',
                              message: 'This will wipe all currently unsaved modifications on this screen and restore database records. Do you want to proceed?',
                              variant: 'warning',
                              confirmLabel: 'Reset Grid',
                              cancelLabel: 'Cancel'
                            });
                            if (isConfirmed) {
                              pullEntryData();
                            }
                          }}
                          className="px-3.5 py-2 bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 transition-colors rounded-xl text-xs font-bold flex items-center gap-1.5 self-end"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Excel quick paste assistant */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs">
                    <span className="font-bold text-indigo-950">💡 Pro Tip (Excel Integration):</span> You can easily copy and paste numbers directly! Standard spreadsheet headers format (Roll, Name, UT1, UT2, Half Yearly, Annual) can be typed directly into cells for instant grand scoring.
                  </div>

                  {/* Main spreadsheet entry table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="max-h-[50vh] overflow-y-auto">
                      <table className="w-full text-left font-sans text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-200 z-10">
                          <tr>
                            <th className="px-6 py-3 w-[80px]">Roll</th>
                            <th className="px-6 py-3 w-[250px]">Student Name</th>
                            <th className="px-6 py-3 w-[150px]">Admission ID</th>
                            <th className="px-6 py-3 text-center bg-indigo-50/30">Unit Test 1 (/{newSubjectColMax})</th>
                            <th className="px-6 py-3 text-center bg-indigo-50/50">Unit Test 2 (/{newSubjectColMax})</th>
                            <th className="px-6 py-3 text-center bg-emerald-50/30">Half Yearly (/{newSubjectColMax})</th>
                            <th className="px-6 py-3 text-center bg-amber-50/30">Annual (/{newSubjectColMax})</th>
                            <th className="px-6 py-3 text-center text-indigo-900 border-l border-slate-200 font-extrabold">Weighted Score %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-755 font-semibold">
                          {entryData.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                No active students found in "{consolidatedClass}". Please enroll students first!
                              </td>
                            </tr>
                          ) : (
                            entryData.map((rowData, idx) => {
                              // Compute temporary live weighted average
                              const u1 = rowData.ut1.trim() !== '' ? Number(rowData.ut1) : null;
                              const u2 = rowData.ut2.trim() !== '' ? Number(rowData.ut2) : null;
                              const hy = rowData.hy.trim() !== '' ? Number(rowData.hy) : null;
                              const an = rowData.annual.trim() !== '' ? Number(rowData.annual) : null;

                              let sumW = 0;
                              let valW = 0;
                              if (u1 !== null) {
                                valW += (u1 / newSubjectColMax) * 100 * consolidatedWeights.ut1;
                                sumW += consolidatedWeights.ut1;
                              }
                              if (u2 !== null) {
                                valW += (u2 / newSubjectColMax) * 100 * consolidatedWeights.ut2;
                                sumW += consolidatedWeights.ut2;
                              }
                              if (hy !== null) {
                                valW += (hy / newSubjectColMax) * 100 * consolidatedWeights.hy;
                                sumW += consolidatedWeights.hy;
                              }
                              if (an !== null) {
                                valW += (an / newSubjectColMax) * 100 * consolidatedWeights.annual;
                                sumW += consolidatedWeights.annual;
                              }

                              const livePct = sumW > 0 ? Number((valW / sumW).toFixed(2)) : null;

                              return (
                                <tr key={rowData.studentId} className="hover:bg-slate-50/50">
                                  <td className="px-6 py-3 font-bold text-slate-800">{rowData.roll}</td>
                                  <td className="px-6 py-3 text-slate-900">
                                    <div>{rowData.studentName}</div>
                                  </td>
                                  <td className="px-6 py-3 font-mono text-slate-500 text-[10px]">{rowData.studentId}</td>
                                  
                                  {/* UT1 input */}
                                  <td className="px-3 py-1 bg-indigo-50/10">
                                    <input
                                      type="number"
                                      placeholder="—"
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-center font-bold outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                      value={rowData.ut1}
                                      onChange={(e) => {
                                        const newVal = e.target.value;
                                        const arr = [...entryData];
                                        arr[idx] = { ...arr[idx], ut1: newVal };
                                        setEntryData(arr);
                                      }}
                                    />
                                  </td>

                                  {/* UT2 input */}
                                  <td className="px-3 py-1 bg-indigo-50/20">
                                    <input
                                      type="number"
                                      placeholder="—"
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-center font-bold outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                      value={rowData.ut2}
                                      onChange={(e) => {
                                        const newVal = e.target.value;
                                        const arr = [...entryData];
                                        arr[idx] = { ...arr[idx], ut2: newVal };
                                        setEntryData(arr);
                                      }}
                                    />
                                  </td>

                                  {/* HY input */}
                                  <td className="px-3 py-1 bg-emerald-50/10">
                                    <input
                                      type="number"
                                      placeholder="—"
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-center font-bold outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                      value={rowData.hy}
                                      onChange={(e) => {
                                        const newVal = e.target.value;
                                        const arr = [...entryData];
                                        arr[idx] = { ...arr[idx], hy: newVal };
                                        setEntryData(arr);
                                      }}
                                    />
                                  </td>

                                  {/* Annual input */}
                                  <td className="px-3 py-1 bg-amber-50/10">
                                    <input
                                      type="number"
                                      placeholder="—"
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-center font-bold outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                      value={rowData.annual}
                                      onChange={(e) => {
                                        const newVal = e.target.value;
                                        const arr = [...entryData];
                                        arr[idx] = { ...arr[idx], annual: newVal };
                                        setEntryData(arr);
                                      }}
                                    />
                                  </td>

                                  {/* Real-time calculated overall weighted % */}
                                  <td className="px-6 py-2 text-center text-indigo-900 border-l border-slate-205">
                                    {livePct !== null ? (
                                      <div className="flex flex-col items-center">
                                        <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">{livePct}%</span>
                                        <span className="text-[9px] font-bold text-slate-400 mt-0.5">Grade: {getGradeForPercentage(livePct)}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 font-medium italic">Empty</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center animate-none">
                      <div className="text-xs text-slate-550">
                        {entryData.length} total students enrolled. Always save changes before switching views or classes.
                      </div>
                      <button
                        onClick={() => saveSubjectMarksForAll4Exams(newSubjectColMax, entryData)}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg"
                      >
                        ✓ Save {consolidatedSubject} Marks for All 4 Exams
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: CONSOLIDATED REPORT CARD GENERATOR */}
              {activeStudioTab === 'reportcard' && (() => {
                const classStudents = (students || []).filter(s => 
                  s.class.toLowerCase().trim() === consolidatedClass.toLowerCase().trim() &&
                  s.status.toLowerCase() !== 'inactive'
                );

                // Initialize selection if blank
                if (!selectedConsolStudentId && classStudents.length > 0) {
                  setSelectedConsolStudentId(classStudents[0].id);
                }

                const currentStudent = classStudents.find(s => s.id === selectedConsolStudentId);

                // Compile subjects and stats for report card
                const ut1Res = currentStudent ? getExamResultForStudent(currentStudent.id, 'ut1') : null;
                const ut2Res = currentStudent ? getExamResultForStudent(currentStudent.id, 'ut2') : null;
                const hyRes = currentStudent ? getExamResultForStudent(currentStudent.id, 'hy') : null;
                const annualRes = currentStudent ? getExamResultForStudent(currentStudent.id, 'annual') : null;

                // Collect list of all unique subjects for this student
                const studentSubjectsSet = new Set<string>();
                [ut1Res, ut2Res, hyRes, annualRes].forEach(r => {
                  r?.subjects.forEach(s => {
                    if (s.subject.trim()) studentSubjectsSet.add(s.subject.trim());
                  });
                });
                const cardSubjectsList = Array.from(studentSubjectsSet);
                if (cardSubjectsList.length === 0) {
                  ['English', 'Mathematics', 'Science', 'Social Studies'].forEach(s => studentSubjectsSet.add(s));
                }
                const finalCardSubjects = Array.from(studentSubjectsSet);

                // Compile rows
                let combinedScoreSum = 0;
                let activeSubjectsCount = 0;

                const compiledRows = finalCardSubjects.map(subName => {
                  const sUt1 = ut1Res?.subjects.find(s => s.subject.toLowerCase() === subName.toLowerCase());
                  const sUt2 = ut2Res?.subjects.find(s => s.subject.toLowerCase() === subName.toLowerCase());
                  const sHy = hyRes?.subjects.find(s => s.subject.toLowerCase() === subName.toLowerCase());
                  const sAnnual = annualRes?.subjects.find(s => s.subject.toLowerCase() === subName.toLowerCase());

                  const maxMarks = sAnnual?.maxMarks || sHy?.maxMarks || sUt1?.maxMarks || sUt2?.maxMarks || 100;

                  // Percentages
                  const pctUt1 = sUt1 ? (sUt1.obtainedMarks / sUt1.maxMarks) * 100 : null;
                  const pctUt2 = sUt2 ? (sUt2.obtainedMarks / sUt2.maxMarks) * 100 : null;
                  const pctHy = sHy ? (sHy.obtainedMarks / sHy.maxMarks) * 100 : null;
                  const pctAnnual = sAnnual ? (sAnnual.obtainedMarks / sAnnual.maxMarks) * 100 : null;

                  // Weighted score for subject
                  let sumWeights = 0;
                  let valPct = 0;

                  if (pctUt1 !== null) {
                    valPct += pctUt1 * consolidatedWeights.ut1;
                    sumWeights += consolidatedWeights.ut1;
                  }
                  if (pctUt2 !== null) {
                    valPct += pctUt2 * consolidatedWeights.ut2;
                    sumWeights += consolidatedWeights.ut2;
                  }
                  if (pctHy !== null) {
                    valPct += pctHy * consolidatedWeights.hy;
                    sumWeights += consolidatedWeights.hy;
                  }
                  if (pctAnnual !== null) {
                    valPct += pctAnnual * consolidatedWeights.annual;
                    sumWeights += consolidatedWeights.annual;
                  }

                  const weightedSubjectPct = sumWeights > 0 ? (valPct / sumWeights) : null;
                  const scoreObtained = weightedSubjectPct !== null ? Number(((weightedSubjectPct / 100) * maxMarks).toFixed(1)) : null;

                  if (weightedSubjectPct !== null) {
                    combinedScoreSum += weightedSubjectPct;
                    activeSubjectsCount++;
                  }

                  return {
                    name: subName,
                    maxMarks,
                    ut1: sUt1 ? `${sUt1.obtainedMarks}/${sUt1.maxMarks}` : '—',
                    ut2: sUt2 ? `${sUt2.obtainedMarks}/${sUt2.maxMarks}` : '—',
                    hy: sHy ? `${sHy.obtainedMarks}/${sHy.maxMarks}` : '—',
                    annual: sAnnual ? `${sAnnual.obtainedMarks}/${sAnnual.maxMarks}` : '—',
                    overallPct: weightedSubjectPct !== null ? Number(weightedSubjectPct.toFixed(1)) : null,
                    scoreObtained: scoreObtained !== null ? `${scoreObtained}/${maxMarks}` : '—',
                    grade: weightedSubjectPct !== null ? getGradeForPercentage(weightedSubjectPct) : '—'
                  };
                });

                const cumulativePercentage = activeSubjectsCount > 0 ? Number((combinedScoreSum / activeSubjectsCount).toFixed(2)) : null;
                const summaryGrade = cumulativePercentage !== null ? getGradeForPercentage(cumulativePercentage) : 'N/A';
                const summaryStatus = cumulativePercentage !== null ? (cumulativePercentage >= 40 ? 'PASS' : 'FAIL') : 'DRAFT';

                // Chart data preparation
                const chartData = [
                  { name: 'UT-1', Accuracy: ut1Res ? ut1Res.percentage : null },
                  { name: 'UT-2', Accuracy: ut2Res ? ut2Res.percentage : null },
                  { name: 'Half Yearly', Accuracy: hyRes ? hyRes.percentage : null },
                  { name: 'Annual Exam', Accuracy: annualRes ? annualRes.percentage : null }
                ].filter(d => d.Accuracy !== null);

                // PDF trigger
                const handleDownloadReportPDF = () => {
                  const element = document.getElementById('report-card-printable-area');
                  if (!element) return;
                  const opt = {
                    margin:       0.3,
                    filename:    `${currentStudent?.name || 'student'}_consolidated_report.pdf`,
                    image:        { type: 'jpeg' as const, quality: 0.98 },
                    html2canvas:  { scale: 2 },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
                  };
                  html2pdf().from(element).set(opt).save();
                };

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Student List and Chart Menu Column */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 tracking-wider uppercase mb-1">Select Student</label>
                          <select
                            value={selectedConsolStudentId}
                            onChange={(e) => setSelectedConsolStudentId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                          >
                            {classStudents.map(st => (
                              <option key={st.id} value={st.id}>{st.roll} - {st.name}</option>
                            ))}
                          </select>
                        </div>

                        {currentStudent && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3">
                              <img
                                src={currentStudent.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentStudent.name}`}
                                className="w-10 h-10 rounded-full border border-slate-200 bg-white"
                                alt="avatar"
                              />
                              <div>
                                <h4 className="text-xs font-black text-slate-800 uppercase">{currentStudent.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold">ADM: {currentStudent.id}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <button
                            onClick={handleDownloadReportPDF}
                            disabled={!currentStudent}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-755 text-white transition-all rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Download className="w-4 h-4" />
                            Download Progress Report (PDF)
                          </button>
                          
                          <button
                            onClick={() => window.print()}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                          >
                            <Printer className="w-4 h-4" />
                            Print Report Card
                          </button>
                        </div>
                      </div>

                      {/* Chart Progress curves! */}
                      {chartData.length > 0 && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-205 shadow-xs space-y-2">
                          <h4 className="text-[11px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <span className="p-1 bg-amber-100 text-amber-600 rounded">📈</span>
                            Multi-Exam Academic Trend
                          </h4>
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
                                <Tooltip />
                                <Line type="monotone" dataKey="Accuracy" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Printable Report Card Layout (Official look-and-feel) */}
                    <div className="lg:col-span-8">
                      {!currentStudent ? (
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center font-medium text-slate-400 text-xs">
                          Please select a candidate first.
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-300 shadow-sm rounded-2xl p-6 lg:p-8" id="report-card-printable-area">
                          {/* School Crest Logo and Header details with elegant thin lining */}
                          <div className="text-center border-b border-indigo-200 pb-5 mb-5 shadow-none pb-4">
                            <h2 className="text-xl sm:text-2xl font-black text-indigo-950 tracking-wider uppercase">BHOGAMUR JATIYA VIDYA NIKETON</h2>
                            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mt-0.5 leading-none">ESTD. 2004 • GORESWAR, ASSAM</p>
                            <p className="text-[11px] text-slate-500 font-semibold mt-1">Under Shishu Shiksha Samiti, Assam (Affiliated to Vidya Bharati)</p>
                            <div className="inline-block bg-indigo-50 border border-indigo-150 text-indigo-900 font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-full mt-3.5 shadow-xs">
                              Consolidated Annual Report Card
                            </div>
                          </div>

                          {/* Student Info Details with Clean Thin Borders */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold py-3 border border-slate-200 rounded-xl bg-slate-50/50 p-4 mb-5 shadow-xs">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Student Name</p>
                              <p className="text-slate-800 font-black uppercase text-xs">{currentStudent.name}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Admission Number</p>
                              <p className="text-slate-800 font-mono text-xs">{currentStudent.id}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Class - Section</p>
                              <p className="text-slate-800 text-xs">{currentStudent.section ? `${currentStudent.class} - ${currentStudent.section}` : currentStudent.class}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Roll Number</p>
                              <p className="text-slate-800 text-xs font-black">{currentStudent.roll || '-'}</p>
                            </div>
                          </div>

                          {/* Marks Sheet Table with Thin Borders */}
                          <table className="w-full text-left text-xs font-semibold border border-slate-300 rounded overflow-hidden class-marks-card-print">
                            <thead>
                              <tr className="bg-indigo-900 text-white font-bold text-[11px]">
                                <th className="px-3 py-2.5 border border-indigo-800 w-[160px]">Subject Title</th>
                                <th className="px-3 py-2.5 border border-indigo-800 text-center">UT-1 ({consolidatedWeights.ut1}%)</th>
                                <th className="px-3 py-2.5 border border-indigo-800 text-center">UT-2 ({consolidatedWeights.ut2}%)</th>
                                <th className="px-3 py-2.5 border border-indigo-800 text-center">Term 1/HY ({consolidatedWeights.hy}%)</th>
                                <th className="px-3 py-2.5 border border-indigo-800 text-center">Term 2/AE ({consolidatedWeights.annual}%)</th>
                                <th className="px-3 py-2.5 border border-indigo-950 text-center bg-indigo-950 text-indigo-300">Weighted Score ({cumulativePercentage?.toFixed(0) || '100'})</th>
                                <th className="px-3 py-2.5 border border-indigo-800 text-center shadow-none">Grade</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 border-b border-slate-300">
                              {compiledRows.map((row, idx) => (
                                <tr key={idx} className={cn(idx % 2 === 0 ? "bg-white animate-none" : "bg-slate-50/50 animate-none")}>
                                  <td className="px-3 py-2 border border-slate-300 font-bold text-slate-820">{row.name}</td>
                                  <td className="px-3 py-2 border border-slate-300 text-center text-slate-600">{row.ut1}</td>
                                  <td className="px-3 py-2 border border-slate-300 text-center text-slate-600">{row.ut2}</td>
                                  <td className="px-3 py-2 border border-slate-300 text-center text-slate-600">{row.hy}</td>
                                  <td className="px-3 py-2 border border-slate-300 text-center text-slate-600">{row.annual}</td>
                                  <td className="px-3 py-2 border border-indigo-200 text-center font-extrabold text-indigo-955 bg-indigo-50/20">{row.scoreObtained}</td>
                                  <td className="px-3 py-2 border border-slate-300 text-center font-bold text-slate-800">{row.grade}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Summary & Analytics */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 pt-4 border-t border-slate-100">
                            {/* Analytics Summary */}
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between border-b border-slate-100 pb-1.5 font-bold">
                                <span className="text-slate-450 uppercase">Weighted Percentage Score</span>
                                <span className="text-slate-900 font-black">{cumulativePercentage !== null ? `${cumulativePercentage}%` : 'N/A'}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-100 pb-1.5 font-bold">
                                <span className="text-slate-450 uppercase">Aggregated Alpha Grade</span>
                                <span className="text-slate-900 font-black text-indigo-600">{summaryGrade}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-100 pb-1.5 font-bold">
                                <span className="text-slate-450 uppercase">Final Scholar Status</span>
                                <span className={cn("font-black text-xs px-2 py-0.5 rounded", summaryStatus === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                                  {summaryStatus}
                                </span>
                              </div>
                              <div className="flex justify-between font-bold">
                                <span className="text-slate-450 uppercase">Working Day Attendance</span>
                                <span className="text-slate-950">188 / 206 Days (91.2%)</span>
                              </div>
                            </div>

                            {/* Standard Remarks */}
                            <div className="bg-slate-50/80 p-4 border border-slate-200 rounded-2xl flex flex-col justify-between">
                              <div>
                                <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Class Teacher Remarks</h4>
                                <p className="text-xs text-slate-700 italic leading-relaxed">
                                  {cumulativePercentage !== null ? (
                                    cumulativePercentage >= 90 ? "Excellent academic year! Showing extreme brilliance and leading the cohort inside core assemblies." :
                                    cumulativePercentage >= 80 ? "Outstanding achievement. Very attentive, consistent with homework submissions and respectful." :
                                    cumulativePercentage >= 70 ? "Satisfactory work with steady academic improvements. Extremely creative mind." :
                                    cumulativePercentage >= 55 ? "Progress has been steady. Needs supplementary guidance on advanced critical problem solving." :
                                    "Candidate needs rigorous, systematic improvement plan and parental engagement meetings."
                                  ) : (
                                    "Academic results compilation is currently raw/draft. Re-verify entered standard subject items."
                                  )}
                                </p>
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold text-right mt-3">Date: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                          </div>

                          {/* Bottom Secure QR Code & Signatures Area with Clean Thin borders */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center text-[10px] font-bold text-slate-500 mt-12 pt-6 border-t border-slate-200">
                            <div className="flex flex-col justify-end">
                              <div className="h-6 whitespace-nowrap"></div>
                              <p className="border-t border-slate-300 inline-block px-3 pt-1 text-slate-600 uppercase tracking-wide">Class Teacher Signature</p>
                            </div>
                            <div className="flex flex-col justify-end">
                              <div className="h-6 whitespace-nowrap"></div>
                              <p className="border-t border-slate-300 inline-block px-3 pt-1 text-slate-600 uppercase tracking-wide">Parent / Guardian Signature</p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 border border-dashed border-slate-250 bg-slate-50/40 rounded-xl">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&color=1e293b&data=ID:${encodeURIComponent(currentStudent.id)}|NAME:${encodeURIComponent(currentStudent.name)}|CLASS:${encodeURIComponent(currentStudent.class)}|PERCENT:${cumulativePercentage?.toFixed(1) || 'N/A'}`}
                                alt="Verification Token"
                                className="w-14 h-14 bg-white p-1 rounded border border-slate-200 shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Verify Digitally</span>
                            </div>
                            <div className="flex flex-col justify-end">
                              <div className="h-6 whitespace-nowrap"></div>
                              <p className="border-t border-slate-300 inline-block px-3 pt-1 text-slate-600 uppercase tracking-wide">Principal / Authorized Seal</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowConsolidatedStudio(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                ✓ Dismiss Studio Workspace
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
