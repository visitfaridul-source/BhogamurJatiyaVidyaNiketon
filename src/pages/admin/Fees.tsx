import { useState, useMemo } from 'react';
import { Search, Wallet, DollarSign, ArrowUpRight, ArrowDownRight, FileText, Download, Filter, Printer, X, CheckCircle, CreditCard, Landmark, Banknote, ScanFace, Edit2, Trash2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSchool } from '@/context/SchoolContext';
import { useWebsite } from '@/context/WebsiteContext';

const initialMockTransactions: any[] = [];

export default function Fees() {
  const { settings } = useWebsite();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const { students } = useSchool();
  
  const [transactions, setTransactions] = useState<any[]>(() => {
    const saved = localStorage.getItem('bhogamur_fees_transactions');
    try {
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      const mockIds = ['INV-2023-001', 'INV-2023-002', 'INV-2023-003', 'INV-2023-004', 'INV-2023-005'];
      const filtered = parsed.filter((tx: any) => !mockIds.includes(tx.id));
      if (filtered.length !== parsed.length) {
        localStorage.setItem('bhogamur_fees_transactions', JSON.stringify(filtered));
      }
      return filtered;
    } catch (e) {
      return [];
    }
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);

  const openEditModal = (tx: any) => {
    setEditTx({ ...tx });
    setIsEditModalOpen(true);
  };

  const handleEditModalChange = (field: string, value: any) => {
    setEditTx((prev: any) => ({ ...prev, [field]: value }));
  };

  const saveEditModal = () => {
    const updated = transactions.map((tx) => {
      if (tx.id === editTx.id) {
        return { 
          ...editTx, 
          amount: Number(editTx.amount) || 0 
        };
      }
      return tx;
    });
    setTransactions(updated);
    localStorage.setItem('bhogamur_fees_transactions', JSON.stringify(updated));
    setIsEditModalOpen(false);
    setEditTx(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction record?')) {
      const updated = transactions.filter((tx) => tx.id !== id);
      setTransactions(updated);
      localStorage.setItem('bhogamur_fees_transactions', JSON.stringify(updated));
    }
  };
  
  // Calculate dynamic metric totals on the fly
  const totalCollectedSum = useMemo(() => {
    return transactions.filter(tx => tx.status === 'Paid').reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [transactions]);

  const totalPendingSum = useMemo(() => {
    return transactions.filter(tx => tx.status === 'Pending' || tx.status === 'Overdue').reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [transactions]);

  const totalReceiptsCount = useMemo(() => {
    return transactions.length;
  }, [transactions]);

  const defaultersCount = useMemo(() => {
    return transactions.filter(tx => tx.status === 'Overdue' || tx.status === 'Pending').length;
  }, [transactions]);
  
  // Collect Payment Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [feeHeads, setFeeHeads] = useState({
    tuition: 4500,
    transport: 1500,
    development: 1000,
    library: 500,
    lateFine: 0
  });
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [receiptGenerated, setReceiptGenerated] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const totalFee: number = (Object.values(feeHeads) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleCollect = () => {
    if (selectedStudent) {
      const newTx = {
        id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        student: selectedStudent.name,
        class: selectedStudent.class,
        amount: totalFee,
        date: new Date().toISOString(),
        type: 'Term Fee Collection',
        status: 'Paid',
        mode: paymentMode
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem('bhogamur_fees_transactions', JSON.stringify(updated));
    }
    setReceiptGenerated(true);
  };

  const resetModal = () => {
    setIsCollectModalOpen(false);
    setReceiptGenerated(false);
    setSelectedStudentId('');
    setFeeHeads({ tuition: 4500, transport: 1500, development: 1000, library: 500, lateFine: 0 });
  };

  // Generate Challan Form State
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
  const [challanType, setChallanType] = useState<'individual' | 'bulk'>('individual');
  const [challanSelectedClass, setChallanSelectedClass] = useState('');
  const [challanSelectedStudentId, setChallanSelectedStudentId] = useState('');
  const [challansGenerated, setChallansGenerated] = useState(false);
  const [generatedChallans, setGeneratedChallans] = useState<any[]>([]);

  // Print Receipt Form State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<any>(null);

  const openReceiptModal = (tx: any) => {
    setSelectedReceiptTx(tx);
    setIsReceiptModalOpen(true);
  };
  
  const closeReceiptModal = () => {
    setIsReceiptModalOpen(false);
    setSelectedReceiptTx(null);
  };

  const uniqueClasses = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  const handleGenerateChallan = () => {
    let targetStudents = [];
    if (challanType === 'individual' && challanSelectedStudentId) {
      const s = students.find((s) => s.id === challanSelectedStudentId);
      if (s) targetStudents.push(s);
    } else if (challanType === 'bulk' && challanSelectedClass) {
      targetStudents = students.filter((s) => s.class === challanSelectedClass);
    }
    
    if (targetStudents.length > 0) {
      setGeneratedChallans(targetStudents);
      setChallansGenerated(true);
    } else {
      alert("No students found for the selection.");
    }
  };

  const handlePrintChallans = () => {
    window.print();
  };

  const resetChallanModal = () => {
    setIsChallanModalOpen(false);
    setChallansGenerated(false);
    setGeneratedChallans([]);
    setChallanSelectedStudentId('');
    setChallanSelectedClass('');
  };

  return (
    <div className="space-y-6 animate-fade-in print:bg-white print:m-0 print:p-0">
      
      {/* Target area for printing receipt only */}
      {receiptGenerated && selectedStudent && (
        <div id="receipt-print-zone" className="hidden print:block print:static w-full bg-white text-slate-900 p-8 z-[9999] min-h-screen">
          <style>{`
            @media print {
              @page { size: A4 auto; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; margin: 0; padding: 0; overflow: visible !important; }
              body * { visibility: hidden; }
              #receipt-print-zone, #receipt-print-zone * { visibility: visible; }
              #receipt-print-zone { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; }
            }
          `}</style>
            <div className="max-w-2xl mx-auto border-2 border-slate-800 p-8 rounded-xl">
               <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
                 {settings.logoUrl && (
                    <img src={settings.logoUrl} alt="Logo" className="h-16 mx-auto mb-4 object-contain grayscale" />
                 )}
                 <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">{settings.schoolName || "Bhogamur Jatiya Vidya Niketon"}</h1>
                 <p className="text-sm">{settings.address || "Sector 62, Gurugram, Haryana - 122018"}</p>
                 <p className="text-sm">Phone: {settings.phone} | Email: {settings.email}</p>
                 <h2 className="text-xl font-bold mt-4 uppercase underline decoration-2 underline-offset-4">Fee Receipt</h2>
               </div>

               <div className="flex justify-between mb-8 text-sm">
                 <div>
                   <p><span className="font-semibold">Receipt No:</span> REC-{Math.floor(Math.random() * 10000)}</p>
                   <p><span className="font-semibold">Date:</span> {format(new Date(), 'dd MMM yyyy')}</p>
                 </div>
                 <div className="text-right">
                   <p><span className="font-semibold">Payment Mode:</span> {paymentMode}</p>
                   {paymentMode !== 'Cash' && <p><span className="font-semibold">Ref No:</span> TXN{Math.floor(Math.random() * 999999)}</p>}
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-8 text-sm border p-4 rounded-lg bg-slate-50">
                 <p><span className="font-semibold">Student Name:</span> {selectedStudent.name}</p>
                 <p><span className="font-semibold">Admission No:</span> {selectedStudent.id}</p>
                 <p><span className="font-semibold">Class & Section:</span> {selectedStudent.class}</p>
                 <p><span className="font-semibold">Father's Name:</span> Mr. {selectedStudent.parentName || 'Guardian'}</p>
               </div>

               <table className="w-full mb-8 text-sm border-collapse">
                 <thead>
                   <tr className="border-b-2 border-slate-800">
                     <th className="text-left py-2">S.No.</th>
                     <th className="text-left py-2">Fee Head / Description</th>
                     <th className="text-right py-2">Amount (₹)</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr className="border-b border-slate-200">
                     <td className="py-2">1</td>
                     <td className="py-2">Tuition Fee</td>
                     <td className="text-right py-2">{feeHeads.tuition}</td>
                   </tr>
                   <tr className="border-b border-slate-200">
                     <td className="py-2">2</td>
                     <td className="py-2">Transport Fee</td>
                     <td className="text-right py-2">{feeHeads.transport}</td>
                   </tr>
                   <tr className="border-b border-slate-200">
                     <td className="py-2">3</td>
                     <td className="py-2">Annual Development Fund</td>
                     <td className="text-right py-2">{feeHeads.development}</td>
                   </tr>
                   <tr className="border-b border-slate-200">
                     <td className="py-2">4</td>
                     <td className="py-2">Library Fee</td>
                     <td className="text-right py-2">{feeHeads.library}</td>
                   </tr>
                   {feeHeads.lateFine > 0 && (
                     <tr className="border-b border-slate-200">
                       <td className="py-2">5</td>
                       <td className="py-2">Late Fine</td>
                       <td className="text-right py-2">{feeHeads.lateFine}</td>
                     </tr>
                   )}
                 </tbody>
                 <tfoot>
                   <tr className="font-bold text-lg border-t-2 border-slate-800">
                     <td colSpan={2} className="py-4 text-right pr-4">Total Amount Paid:</td>
                     <td className="text-right py-4">{formatCurrency(totalFee)}</td>
                   </tr>
                 </tfoot>
               </table>

               <div className="flex justify-between mt-16 pt-8 border-t border-slate-300">
                 <div className="text-center">
                   <p className="mb-8">_____________________</p>
                   <p className="text-xs font-semibold">Cashier / Accountant</p>
                 </div>
                 <div className="text-center">
                   <p className="mb-4">This is a system generated receipt.</p>
                   <p className="text-xs font-bold text-slate-500">School Seal / Stamp Not Required</p>
                 </div>
               </div>
            </div>
        </div>
      )}

      {/* Main UI (Hidden on Print) */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Fees & Billing</h1>
            <p className="text-slate-500 text-sm mt-1">Manage term fee collections, outstanding dues, and print receipts.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsChallanModalOpen(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
              <FileText className="w-4 h-4" />
              Generate Fee Challan
            </button>
            <button 
              onClick={() => setIsCollectModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
            >
              <DollarSign className="w-4 h-4" />
              Collect Payment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white border-none md:col-span-2 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             <div className="flex flex-col justify-between h-full relative z-10">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <p className="text-sm font-medium text-blue-100 flex items-center gap-2 mb-1"><Wallet className="w-4 h-4"/> Academic Year 2023-24 Collection</p>
                   <h3 className="text-4xl font-bold tracking-tight">{formatCurrency(totalCollectedSum)}</h3>
                 </div>
                 <div className="text-right">
                   <p className="text-sm text-blue-200 mb-1 font-medium">Target</p>
                   <p className="text-lg font-bold">{formatCurrency(5000000)}</p>
                 </div>
               </div>
               
               <div>
                  <div className="w-full bg-black/20 rounded-full h-2 mb-2 overflow-hidden">
                    <div className="bg-emerald-400 h-2 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `${Math.min(Math.round((totalCollectedSum / 5000000) * 100), 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-blue-100 font-bold">
                    <span>{Math.min(Math.round((totalCollectedSum / 5000000) * 100), 100)}% Collected</span>
                    <span>{Math.max(100 - Math.min(Math.round((totalCollectedSum / 5000000) * 100), 100), 0)}% Pending</span>
                  </div>
               </div>
             </div>
           </div>

           <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 hover:shadow-md transition-all">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full blur-2xl group-hover:bg-rose-100 transition-colors"></div>
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 border border-rose-100">
                   <ArrowDownRight className="w-5 h-5" />
                 </div>
                 <p className="font-bold text-slate-800">Pending Dues</p>
               </div>
               <h3 className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(totalPendingSum)}</h3>
               <div className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-md w-fit">
                 {defaultersCount} Students Defaulters
               </div>
             </div>
           </div>

           <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                   <FileText className="w-5 h-5" />
                 </div>
                 <p className="font-bold text-slate-800">Receipts</p>
               </div>
               <h3 className="text-3xl font-bold text-slate-900 mb-2">{totalReceiptsCount.toLocaleString()}</h3>
               <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md w-fit">
                 Generated this year
               </div>
             </div>
           </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4 bg-slate-50/50">
            <div className="relative w-full flex-1 max-w-md">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search by student name or receipt no..." 
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <select className="bg-white border border-slate-200 text-slate-700 font-medium text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm">
                <option value="">Status: All Types</option>
                <option value="Paid">Cleared / Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Defaulters / Overdue</option>
              </select>
              <button className="p-2 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 font-bold text-sm flex items-center gap-2 px-4 shadow-sm transition-colors">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Receipt No.</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Student Info</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Fee Head</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Date & Mode</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Amount</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Status</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-indigo-600">{tx.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{tx.student}</p>
                      <p className="text-sm font-medium text-slate-500">{tx.class}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {tx.type}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{format(new Date(tx.date), 'dd MMM, yyyy')}</p>
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {tx.mode === 'UPI' && <ScanFace className="w-3.5 h-3.5 text-emerald-500"/>}
                        {tx.mode === 'Cash' && <Banknote className="w-3.5 h-3.5 text-amber-500"/>}
                        {tx.mode === 'Bank Transfer' && <Landmark className="w-3.5 h-3.5 text-blue-500"/>}
                        {tx.mode !== '-' ? tx.mode : 'Unpaid'}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 text-base">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                        tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        tx.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {tx.status === 'Paid' ? (
                          <button onClick={() => openReceiptModal(tx)} className="p-2 text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold" title="Print Receipt">
                            <Printer className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              const matchedStudent = students.find(s => s.name === tx.student);
                              if (matchedStudent) {
                                setSelectedStudentId(matchedStudent.id);
                              }
                              setIsCollectModalOpen(true);
                            }} 
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors border border-indigo-200 shadow-sm"
                          >
                            Pay Now
                          </button>
                        )}
                        <button onClick={() => openEditModal(tx)} className="p-2 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(tx.id)} className="p-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Collect Payment Modal */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-xl text-slate-800">Collect Fee Payment</h3>
                <p className="text-xs text-slate-500 font-medium">Generate receipt for Academic Year 2023-24</p>
              </div>
              <button onClick={resetModal} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto w-full">
              {!receiptGenerated ? (
                <div className="space-y-6">
                  {/* Select Student */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Select Student</label>
                    <select 
                      value={selectedStudentId} 
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                    >
                      <option value="">Search by Name or Admission No...</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.id}) - {s.class}</option>
                      ))}
                    </select>
                  </div>

                  {selectedStudent && (
                    <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-100">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 text-indigo-600">Student Profile</p>
                        <p className="font-bold text-slate-800">{selectedStudent.name}</p>
                        <p className="text-sm text-slate-600">{selectedStudent.class}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 text-rose-500">Pending Arrears</p>
                        <p className="font-bold text-slate-800">{formatCurrency(0)}</p>
                        <p className="text-xs text-emerald-600 font-semibold mt-1">All clear up to last month</p>
                      </div>
                    </div>
                  )}

                  {selectedStudent && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-indigo-500"/> Fee Breakup
                      </h4>
                      <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-sm font-semibold text-slate-700">Tuition Fee</span>
                          <input type="number" value={feeHeads.tuition} onChange={(e) => setFeeHeads({...feeHeads, tuition: Number(e.target.value)})} className="w-24 text-right font-bold text-slate-900 border border-slate-200 rounded p-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                        </div>
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-sm font-semibold text-slate-700">Transport Fee</span>
                          <input type="number" value={feeHeads.transport} onChange={(e) => setFeeHeads({...feeHeads, transport: Number(e.target.value)})} className="w-24 text-right font-bold text-slate-900 border border-slate-200 rounded p-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                        </div>
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-sm font-semibold text-slate-700">Annual Development</span>
                          <input type="number" value={feeHeads.development} onChange={(e) => setFeeHeads({...feeHeads, development: Number(e.target.value)})} className="w-24 text-right font-bold text-slate-900 border border-slate-200 rounded p-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                        </div>
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-sm font-semibold text-slate-700">Library Fee</span>
                          <input type="number" value={feeHeads.library} onChange={(e) => setFeeHeads({...feeHeads, library: Number(e.target.value)})} className="w-24 text-right font-bold text-slate-900 border border-slate-200 rounded p-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                        </div>
                        <div className="flex justify-between items-center bg-rose-50/50 p-3 rounded-xl border border-rose-100 shadow-sm">
                          <span className="text-sm font-semibold text-rose-700">Late Fine</span>
                          <input type="number" value={feeHeads.lateFine} onChange={(e) => setFeeHeads({...feeHeads, lateFine: Number(e.target.value)})} className="w-24 text-right font-bold text-rose-700 border border-rose-200 rounded p-1 focus:ring-2 focus:ring-rose-500 bg-white focus:outline-none"/>
                        </div>
                      </div>

                      {/* Payment Mode */}
                      <div>
                        <h4 className="font-bold text-slate-800 mb-3 mt-6">Payment Mode</h4>
                        <div className="grid grid-cols-3 gap-3">
                          {['UPI', 'Cash', 'Bank Transfer', 'Cheque'].map(mode => (
                            <button
                              key={mode}
                              onClick={() => setPaymentMode(mode)}
                              className={cn(
                                "py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2",
                                paymentMode === mode 
                                  ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm ring-1 ring-indigo-600" 
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                              )}
                            >
                              {mode === 'UPI' && <ScanFace className="w-4 h-4" />}
                              {mode === 'Cash' && <Banknote className="w-4 h-4" />}
                              {(mode === 'Bank Transfer' || mode === 'Cheque') && <Landmark className="w-4 h-4" />}
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              ) : (
                <div className="py-12 flex flex-col items-center text-center space-y-4">
                   <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 animate-bounce">
                     <CheckCircle className="w-10 h-10" />
                   </div>
                   <h2 className="text-2xl font-bold text-slate-800">Payment Successful!</h2>
                   <p className="text-slate-500 max-w-sm">
                     Successfully collected {formatCurrency(totalFee)} from <strong className="text-slate-800">{selectedStudent?.name}</strong> via {paymentMode}.
                   </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto">
               {!receiptGenerated ? (
                 <>
                  <div>
                    <p className="text-sm text-slate-500 font-medium mb-0.5">Total Payable</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(totalFee)}</p>
                  </div>
                  <button 
                    disabled={!selectedStudentId || totalFee <= 0}
                    onClick={handleCollect}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
                  >
                    Confirm Payment
                  </button>
                 </>
               ) : (
                 <div className="w-full flex gap-4">
                   <button 
                     onClick={resetModal}
                     className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                   >
                     Done
                   </button>
                   <button 
                     onClick={handlePrintReceipt}
                     className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
                   >
                     <Printer className="w-5 h-5"/> Print Receipt
                   </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Transaction Modal */}
      {isEditModalOpen && editTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-xl text-slate-800">Edit Transaction</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Student Name</label>
                <input type="text" value={editTx.student} onChange={(e) => handleEditModalChange('student', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Class / Section</label>
                <input type="text" value={editTx.class} onChange={(e) => handleEditModalChange('class', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fee Head / Type</label>
                <input type="text" value={editTx.type} onChange={(e) => handleEditModalChange('type', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Amount</label>
                <input type="number" value={editTx.amount} onChange={(e) => handleEditModalChange('amount', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
                <input type="date" value={editTx.date ? new Date(editTx.date).toISOString().split('T')[0] : ''} onChange={(e) => {
                  if (e.target.value) handleEditModalChange('date', new Date(e.target.value).toISOString());
                }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Payment Mode</label>
                <select value={editTx.mode} onChange={(e) => handleEditModalChange('mode', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                  <option value="-">-</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
               <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                <select value={editTx.status} onChange={(e) => handleEditModalChange('status', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 mt-auto">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={saveEditModal} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Challan Modal */}
      {isChallanModalOpen && !challansGenerated && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col min-h-[400px]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-xl text-slate-800">Generate Fee Challan</h3>
              <button onClick={resetChallanModal} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 space-y-6">
              <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setChallanType('individual')}
                  className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all text-center", challanType === 'individual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                >
                  Individual Student
                </button>
                <button
                  onClick={() => setChallanType('bulk')}
                  className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-all text-center", challanType === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                >
                  Bulk (Class-wise)
                </button>
              </div>

              {challanType === 'individual' ? (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Student</label>
                  <select 
                    value={challanSelectedStudentId} 
                    onChange={(e) => setChallanSelectedStudentId(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.id}) - {s.class}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Class</label>
                  <select 
                    value={challanSelectedClass} 
                    onChange={(e) => setChallanSelectedClass(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- Choose Class --</option>
                    {uniqueClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 mt-auto">
              <button onClick={resetChallanModal} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleGenerateChallan} 
                disabled={(challanType === 'individual' && !challanSelectedStudentId) || (challanType === 'bulk' && !challanSelectedClass)}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate {challanType === 'bulk' ? 'Challans' : 'Challan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isChallanModalOpen && challansGenerated && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col min-h-[300px]">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-xl text-slate-800">Challans Generated</h3>
              <button onClick={resetChallanModal} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
                 <CheckCircle className="w-8 h-8" />
               </div>
               <h2 className="text-xl font-bold text-slate-800 mb-2">Success!</h2>
               <p className="text-slate-500">Successfully generated {generatedChallans.length} challan(s).</p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3 mt-auto">
               <button 
                 onClick={resetChallanModal}
                 className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
               >
                 Close
               </button>
               <button 
                 onClick={handlePrintChallans}
                 className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
               >
                 <Printer className="w-5 h-5"/> Print
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Target area for printing challans only */}
      {challansGenerated && (
         <div id="challan-print-zone" className="hidden print:block print:static w-full bg-white text-slate-900 z-[9999]">
           <style>{`
             @media print {
               @page { size: A4 portrait; margin: 0; }
               body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; margin: 0; padding: 0; overflow: visible !important; }
               body * { visibility: hidden; }
               #challan-print-zone, #challan-print-zone * { visibility: visible; }
               #challan-print-zone { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; }
               .page-break { page-break-after: always; break-after: page; }
             }
           `}</style>
           {generatedChallans.map((student, index) => (
             <div 
               key={student.id} 
               className="max-w-[210mm] mx-auto p-8"
               style={{ pageBreakAfter: index !== generatedChallans.length - 1 ? 'always' : 'auto' }}
             >
                <div className="border-2 border-slate-800 rounded-xl overflow-hidden flex flex-col h-[280mm]">
                  {/* We divide challan into 3 parts: Student Copy, School Copy, Bank Copy */}
                  {['Student Copy', 'School Copy', 'Bank Copy'].map((copyType, i) => (
                    <div key={copyType} className={cn("flex-1 p-6 relative", i !== 2 && "border-b-2 border-dashed border-slate-400")}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                           <h1 className="text-xl font-bold uppercase tracking-wider mb-1">{settings.schoolName || "Bhogamur Jatiya Vidya Niketon"}</h1>
                           <p className="text-xs">{settings.address || "Sector 62, Gurugram, Haryana - 122018"}</p>
                        </div>
                        <div className="text-right">
                           <h2 className="text-lg font-bold uppercase border-2 border-slate-800 px-3 py-1 inline-block">{copyType}</h2>
                        </div>
                      </div>
                      
                      <div className="text-center font-bold uppercase underline decoration-2 underline-offset-4 mb-4 text-sm">
                        Fee Challan - {format(new Date(), 'MMM yyyy')}
                      </div>

                      <div className="flex justify-between text-xs mb-4">
                         <div className="space-y-1">
                            <p><span className="font-semibold">Challan No:</span> CHL-{student.id}-{format(new Date(), 'MMMyy').toUpperCase()}</p>
                            <p><span className="font-semibold">Student Name:</span> {student.name}</p>
                            <p><span className="font-semibold">Admission No:</span> {student.id}</p>
                         </div>
                         <div className="space-y-1 text-right">
                            <p><span className="font-semibold">Date:</span> {format(new Date(), 'dd MMM yyyy')}</p>
                            <p><span className="font-semibold">Class & Sec:</span> {student.class}</p>
                            <p><span className="font-semibold">Due Date:</span> {format(new Date(Date.now() + 10 * 86400000), 'dd MMM yyyy')}</p>
                         </div>
                      </div>

                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-y-2 border-slate-800">
                            <th className="text-left py-1 w-3/4">Particulars</th>
                            <th className="text-right py-1">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-200">
                            <td className="py-1">Tuition Fee</td>
                            <td className="text-right py-1">4,500</td>
                          </tr>
                           <tr className="border-b border-slate-200">
                            <td className="py-1">Library & Transport</td>
                            <td className="text-right py-1">2,000</td>
                          </tr>
                        </tbody>
                        <tfoot>
                           <tr className="font-bold border-t-2 border-slate-800">
                             <td className="py-2 text-right pr-4">Total Amount:</td>
                             <td className="text-right py-2">6,500</td>
                           </tr>
                        </tfoot>
                      </table>

                      <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[10px] mt-auto">
                        <div className="text-center">
                          <p className="mb-4">_____________________</p>
                          <p>Depositor's Sign</p>
                        </div>
                        <div className="text-center">
                          <p className="mb-4">_____________________</p>
                          <p>Cashier's Sign & Seal</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
           ))}
         </div>
      )}

      {/* Receipt Modal */}
      {isReceiptModalOpen && selectedReceiptTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col min-h-[300px]">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-xl text-slate-800">Fee Receipt Preview</h3>
              <button onClick={closeReceiptModal} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                 <FileText className="w-8 h-8" />
               </div>
               <h2 className="text-xl font-bold text-slate-800 mb-2">Receipt #{selectedReceiptTx.id}</h2>
               <p className="text-slate-500">Ready to print two copies (Office & Student) on A4.</p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3 mt-auto">
               <button 
                 onClick={closeReceiptModal}
                 className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={() => window.print()}
                 className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"
               >
                 <Printer className="w-5 h-5"/> Print
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Target area for printing receipt only */}
      {selectedReceiptTx && isReceiptModalOpen && (
         <div id="receipt-print-zone" className="hidden print:block print:static w-full bg-white text-slate-900 z-[9999]">
           <style>{`
             @media print {
               @page { size: A4 portrait; margin: 0; }
               body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; margin: 0; padding: 0; overflow: visible !important; }
               body * { visibility: hidden; }
               #receipt-print-zone, #receipt-print-zone * { visibility: visible; }
               #receipt-print-zone { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; }
             }
           `}</style>
           <div className="max-w-[210mm] mx-auto pt-4 pb-0 px-8 h-[280mm] flex flex-col justify-between">
             {/* 2 copies per page */}
             {['Office Copy', 'Student Copy'].map((copyType, index) => (
                <div key={copyType} className={cn("flex-1 mb-8", index === 0 ? "border-b-2 border-dashed border-slate-400 pb-8" : "pt-2")}>
                  <div className="border border-slate-300 rounded-xl p-6 h-full flex flex-col relative shadow-sm">
                    <div className="absolute top-4 right-4 border border-slate-300 px-3 py-1 rounded bg-slate-50 text-xs font-bold uppercase text-slate-600 tracking-wider">
                      {copyType}
                    </div>
                    
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6 border-b border-slate-200 pb-4">
                       {settings.logoUrl ? (
                          <img src={settings.logoUrl} alt={settings.schoolName} className="h-16 object-contain" />
                       ) : (
                          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                            SS
                          </div>
                       )}
                       <div>
                         <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{settings.schoolName || "Bhogamur Jatiya Vidya Niketon"}</h1>
                         <p className="text-sm text-slate-500 font-medium">{settings.address}</p>
                         <p className="text-sm text-slate-500 font-medium">Phone: {settings.phone} | Email: {settings.email}</p>
                       </div>
                    </div>

                    <div className="text-center font-bold text-lg uppercase tracking-widest text-slate-700 mb-6 underline decoration-2 underline-offset-4">
                      Fee Receipt
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                      <div>
                         <div className="mb-2"><span className="text-slate-500 w-28 inline-block">Receipt No:</span> <span className="font-bold">{selectedReceiptTx.id}</span></div>
                         <div className="mb-2"><span className="text-slate-500 w-28 inline-block">Student Name:</span> <span className="font-bold">{selectedReceiptTx.student}</span></div>
                         <div className="mb-2"><span className="text-slate-500 w-28 inline-block">Class:</span> <span className="font-bold">{selectedReceiptTx.class}</span></div>
                      </div>
                      <div>
                         <div className="mb-2"><span className="text-slate-500 w-28 inline-block">Date:</span> <span className="font-bold">{format(new Date(selectedReceiptTx.date), 'dd MMM yyyy')}</span></div>
                         <div className="mb-2"><span className="text-slate-500 w-28 inline-block">Payment Mode:</span> <span className="font-bold">{selectedReceiptTx.mode}</span></div>
                         <div className="mb-2"><span className="text-slate-500 w-28 inline-block">Status:</span> <span className="font-bold text-emerald-600 uppercase">{selectedReceiptTx.status}</span></div>
                      </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-sm mb-6 border-collapse">
                      <thead>
                        <tr className="border-y-2 border-slate-300 bg-slate-50 text-slate-700">
                          <th className="text-left py-2 px-4 font-bold">Fee Particulars</th>
                          <th className="text-right py-2 px-4 font-bold">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-3 px-4 font-medium">{selectedReceiptTx.type}</td>
                          <td className="text-right py-3 px-4 font-bold">{selectedReceiptTx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                         <tr className="border-t-2 border-slate-800 bg-slate-100/50">
                           <td className="py-3 px-4 font-bold text-right uppercase text-slate-600">Total Paid:</td>
                           <td className="text-right py-3 px-4 font-black text-lg text-slate-800">₹{selectedReceiptTx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                         </tr>
                      </tfoot>
                    </table>

                    {/* Footer / Signatures */}
                    <div className="mt-auto flex justify-between items-end px-4">
                       <div className="text-xs text-slate-500 italic max-w-[50%]">
                         * This is a computer-generated receipt and does not require a physical signature. Returns subject to school fee policy.
                       </div>
                       <div className="text-center">
                         <div className="w-40 border-b border-slate-400 mb-2"></div>
                         <p className="text-xs font-bold text-slate-700 uppercase">Authorized Signatory</p>
                       </div>
                    </div>

                  </div>
                </div>
             ))}
           </div>
         </div>
      )}

    </div>
  );
}
