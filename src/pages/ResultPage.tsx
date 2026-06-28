import React, { useState } from 'react';
import { StudentResult } from '../context/SchoolContext';
import { useWebsite } from '../context/WebsiteContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, CheckCircle2, XCircle, Award, Printer, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ResultPage() {
  const { settings } = useWebsite();
  const [admNo, setAdmNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [searchedResult, setSearchedResult] = useState<StudentResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    setError('');
    setSearchedResult(null);

    if (!admNo.trim() || !fullName.trim()) {
      setError('Please enter both Admission Number and Full Name.');
      return;
    }

    try {
      setIsLoading(true);

      // Perform a direct, secure query looking up the specific admission number
      const resultsRef = collection(db, 'results');
      const q = query(resultsRef, where('studentId', '==', admNo.trim()));
      const querySnapshot = await getDocs(q);

      const matchedResults: StudentResult[] = [];
      querySnapshot.forEach((doc) => {
        matchedResults.push({ id: doc.id, ...doc.data() } as StudentResult);
      });

      // Find by student name in-memory with case-insensitive matching
      const result = matchedResults.find(
        r => r.studentName.trim().toLowerCase() === fullName.trim().toLowerCase()
      );

      if (result) {
        // Check if restricted by admin
        const isRestricted = settings.restrictedResultClasses?.some(
          c => result.className.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(result.className.toLowerCase())
        );
        if (isRestricted) {
          setError(`The results for ${result.className} are currently restricted/locked by the school management. Please contact the administration.`);
          setIsLoading(false);
          return;
        }

        // To calculate rank safely, query peer results for the same exam and class only
        const peerQuery = query(
          resultsRef,
          where('className', '==', result.className),
          where('examName', '==', result.examName)
        );
        const peerSnapshot = await getDocs(peerQuery);
        const peerResults: StudentResult[] = [];
        peerSnapshot.forEach((doc) => {
          peerResults.push({ id: doc.id, ...doc.data() } as StudentResult);
        });

        // Sort peer results by percentage
        peerResults.sort((a, b) => b.percentage - a.percentage);

        let rank = 1;
        for (let i = 0; i < peerResults.length; i++) {
          if (peerResults[i].id === result.id) {
            rank = i + 1;
            break;
          }
        }

        const resultWithRank = { ...result, rank };
        setSearchedResult(resultWithRank as StudentResult & { rank: number });
      } else {
        setError('No matching result found. Please check your credentials.');
      }
    } catch (err) {
      console.error("Failed to query result: ", err);
      setError('An error occurred while fetching the result. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async () => {
    const marksheetElement = document.getElementById('marksheet-content');
    if (!marksheetElement) return;

    try {
      setIsPrinting(true);
      // Hide the print button temporarily during capture
      const printBtn = document.getElementById('print-action-btn');
      if (printBtn) printBtn.style.display = 'none';

      // Dynamically import libraries to prevent any bundle/react conflict
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf')
      ]);

      // Capture the element
      const dataUrl = await toPng(marksheetElement, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      if (printBtn) printBtn.style.display = 'flex';

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate total image height based on standard A4 width
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages if content overflows
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${searchedResult?.studentName?.replace(/\s+/g, '_')}_Marksheet.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate marksheet PDF. Please try again.');
      const printBtn = document.getElementById('print-action-btn');
      if (printBtn) printBtn.style.display = 'flex';
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-500/30 flex flex-col print:bg-white">
      <style>
        {`
          @media print {
            @page { margin: 1cm; }
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background-color: white !important;
            }
          }
        `}
      </style>
      {/* Navigation (Hidden when printing) */}
      <nav className="fixed top-2 inset-x-0 z-50 pointer-events-none px-4 sm:px-6 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4 w-full">
          <div className="pointer-events-auto bg-slate-900/60 backdrop-blur-xl shadow-lg border border-slate-700/50 rounded-full px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 w-full max-w-full">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white drop-shadow-md hover:text-blue-200 transition-colors px-2 py-1">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
            <div className="text-white text-sm font-bold tracking-tight">{settings.schoolName}</div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-4 sm:p-6 relative pt-24 pb-12 w-full print:p-0 print:m-0 print:block">
        {/* Decorative Gradients (Hidden when printing) */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-200/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none print:hidden" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none print:hidden" />

        <div className="w-full max-w-4xl mx-auto z-10">
          {/* Search Card (Hidden when a result is successfully found to show full screen marksheet, or keep it but minimal. Actually let's keep it visible so they can search another, but hidden on print) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] shadow-xl p-6 sm:p-8 mb-8 border border-slate-100 print:hidden"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{settings.resultPageTitle}</h1>
              <p className="text-slate-500 mt-2">{settings.resultPageSubtitle}</p>
            </div>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Admission Number (e.g. ADM2023001)"
                  value={admNo}
                  onChange={(e) => setAdmNo(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-medium disabled:opacity-60"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Full Name (e.g. AARAV SHARMA)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-medium disabled:opacity-60"
                />
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                {isLoading ? 'Searching...' : 'Find'}
              </button>
            </form>

            <AnimatePresence>
              {hasSearched && error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="max-w-2xl mx-auto mt-4"
                >
                  <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-center text-sm font-medium border border-rose-100 flex items-center justify-center gap-2">
                    <XCircle className="w-5 h-5" /> {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Marksheet Design */}
          <AnimatePresence>
            {searchedResult && (
              <motion.div
                id="marksheet-content"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 sm:p-10 shadow-lg rounded-xl border border-slate-300 relative overflow-hidden print:shadow-none print:border-none print:p-0"
              >
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Watermark" className="w-96 h-96 object-contain grayscale" />
                  ) : (
                    <Award className="w-96 h-96 text-slate-900" />
                  )}
                </div>

                {/* Print CTA */}
                <div className="absolute top-4 right-4 print:hidden flex gap-2 z-10" id="print-action-btn">
                  <button onClick={handlePrint} disabled={isPrinting} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-70">
                     {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                     {isPrinting ? 'Generating PDF...' : 'Download PDF / Print'}
                  </button>
                </div>

                {/* Header with BHOGAMUR JATIYA VIDYA NIKETON */}
                <div className="text-center border-b border-indigo-250 pb-6 mb-6 relative z-10 pt-8 sm:pt-4">
                  <div className="flex flex-col items-center justify-center gap-1">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="h-20 sm:h-24 mx-auto mb-2 object-contain" />
                    ) : (
                      <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 mb-2">
                        <Award className="w-8 h-8" />
                      </div>
                    )}
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-wider">BHOGAMUR JATIYA VIDYA NIKETON</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">ESTD. 2004 • GORESWAR, ASSAM</p>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Under Shishu Shiksha Samiti, Assam (Affiliated to Vidya Bharati)</p>
                  </div>
                  <div className="mt-4 flex flex-col items-center gap-1">
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-4 py-1 rounded-full uppercase tracking-widest">
                      {searchedResult.examName}
                    </span>
                    <h2 className="text-base font-bold text-slate-800 tracking-tight uppercase">Statement of Academic Marks</h2>
                  </div>
                </div>

                {/* Student Details Grid with Thin Borders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm relative z-10 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="font-semibold text-slate-500 w-32 text-xs uppercase tracking-wider">Student Name:</span>
                      <span className="font-black text-slate-900 uppercase">{searchedResult.studentName}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-semibold text-slate-500 w-32 text-xs uppercase tracking-wider">Admission No:</span>
                      <span className="font-bold text-slate-900 font-mono">{searchedResult.studentId}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="font-semibold text-slate-500 w-32 text-xs uppercase tracking-wider">Class & Sec:</span>
                      <span className="font-bold text-slate-900">{searchedResult.className}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-semibold text-slate-500 w-32 text-xs uppercase tracking-wider">Date of Issue:</span>
                      <span className="font-bold text-slate-900">{new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                </div>

                {/* Marks Table with Clean Borders */}
                <div className="mb-6 relative z-10">
                  <table className="w-full text-left border-collapse border border-slate-300 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 uppercase text-xs font-bold tracking-wider">
                        <th className="border border-slate-300 px-4 py-2.5">Subject Name</th>
                        <th className="border border-slate-300 px-4 py-2.5 text-center w-24">Max Marks</th>
                        <th className="border border-slate-300 px-4 py-2.5 text-center w-32">Marks Obtained</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-800 text-sm font-medium">
                      {searchedResult.subjects.map((sub, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                          <td className="border border-slate-300 px-4 py-2.5 font-bold text-slate-700">{sub.subject}</td>
                          <td className="border border-slate-300 px-4 py-2.5 text-center text-slate-500">{sub.maxMarks}</td>
                          <td className="border border-slate-300 px-4 py-2.5 text-center font-bold tracking-wider text-slate-900">{sub.obtainedMarks}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-indigo-50/30 text-indigo-900 font-black text-sm tracking-wide">
                      <tr>
                        <td className="border border-slate-300 px-4 py-3 text-right pr-6 uppercase tracking-widest">Total</td>
                        <td className="border border-slate-300 px-4 py-3 text-center text-slate-700">{searchedResult.subjects.reduce((acc, curr) => acc + curr.maxMarks, 0)}</td>
                        <td className="border border-slate-300 px-4 py-3 text-center text-indigo-950 font-black">{searchedResult.totalMarks}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Final Result Summary with Thin Borders */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8 relative z-10">
                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-xl text-center">
                    <div className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">Percentage</div>
                    <div className="text-xl font-black text-slate-800">{searchedResult.percentage}%</div>
                  </div>
                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-xl text-center">
                    <div className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">Grade</div>
                    <div className="text-xl font-black text-slate-800">{searchedResult.grade}</div>
                  </div>
                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-xl text-center">
                    <div className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1">Class Rank</div>
                    <div className="text-xl font-black text-slate-800">#{(searchedResult as any).rank}</div>
                  </div>
                  <div className={cn("border p-3 rounded-xl text-center col-span-2 sm:col-span-2", searchedResult.status === 'Pass' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200')}>
                    <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", searchedResult.status === 'Pass' ? 'text-emerald-650' : 'text-rose-655')}>Final Status</div>
                    <div className={cn("text-xl font-black flex items-center justify-center gap-1.5", searchedResult.status === 'Pass' ? 'text-emerald-750' : 'text-rose-750')}>
                       {searchedResult.status === 'Pass' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
                       {searchedResult.status.toUpperCase()}
                     </div>
                  </div>
                </div>

                {/* Remarks, QR Code & Signatures with Beautiful Layout & Elegant Thin Borders */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-8 pt-6 border-t border-slate-200 relative z-10">
                  {/* Left Column: Remarks */}
                  <div className="md:col-span-5 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Class Teacher Remarks</p>
                      <p className="text-xs font-semibold text-slate-700 italic bg-slate-50/80 p-3 border border-slate-200 rounded-xl leading-relaxed">
                        "{searchedResult.remarks || (searchedResult.status === 'Pass' ? 'Promoted to the next class with high merits.' : 'Needs continuous support and regular revisions.')}"
                      </p>
                    </div>
                  </div>

                  {/* Middle Column: Digital QR Code verification */}
                  <div className="md:col-span-3 flex flex-col items-center justify-center p-3 border border-dashed border-slate-250 bg-slate-50/30 rounded-xl text-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=1e293b&data=STUDENT:${searchedResult.studentId}|NAME:${encodeURIComponent(searchedResult.studentName)}|SCORE:${searchedResult.percentage}%|STATUS:${searchedResult.status}`}
                      alt="Verification Token"
                      className="w-18 h-18 bg-white p-1 rounded border border-slate-200 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">Digital Verification</span>
                    <span className="text-[7px] font-mono text-slate-400 leading-none">{searchedResult.studentId}</span>
                  </div>

                  {/* Right Column: Signatures */}
                  <div className="md:col-span-4 flex flex-row justify-between sm:justify-end items-end gap-6 pt-4 md:pt-0">
                    <div className="text-center pt-8 border-t border-slate-250 w-24 relative">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</span>
                    </div>
                    <div className="text-center pt-8 border-t border-slate-250 w-24 relative">
                      {settings.principalSignatureUrl && (
                        <img 
                          src={settings.principalSignatureUrl} 
                          alt="Principal Signature" 
                          className="absolute bottom-5 left-1/2 -translate-x-1/2 h-10 object-contain mix-blend-multiply" 
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Principal</span>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
