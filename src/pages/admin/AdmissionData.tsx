import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Download, Check, X, Search, Filter, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdmissionData() {
  const { onlineAdmissions, setOnlineAdmissions, setStudents } = useSchool();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredAdmissions = onlineAdmissions.filter((admission) => {
    const matchesSearch = admission.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          admission.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || admission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportExcel = () => {
    const formattedData = filteredAdmissions.map(a => ({
      'Request ID': a.id,
      'Submit Date': new Date(a.submitDate).toLocaleString(),
      'Name': a.name,
      'Class Applied': a.class,
      'DOB': a.dob,
      'Mobile No': a.phone,
      "Father's Name": a.parentName,
      "Mother's Name": a.motherName,
      'Address': a.address,
      'Aadhaar No': a.aadhaar,
      'PEN No': a.pen,
      'APAAR ID': a.apaar,
      'Status': a.status
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Online_Admissions");
    XLSX.writeFile(wb, "Online_Admissions_Data.xlsx");
  };

  const handleUpdateStatus = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setOnlineAdmissions(prev => prev.map(a => 
      a.id === id ? { ...a, status: newStatus } : a
    ));

    if (newStatus === 'Approved') {
      const admission = onlineAdmissions.find(a => a.id === id);
      if (admission) {
        // Enrol automatically
        const newStudent = {
          id: `ADM${new Date().getFullYear()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          name: admission.name,
          class: admission.class,
          section: 'A', // Default to section A
          roll: '-',
          parentName: admission.parentName,
          phone: admission.phone,
          status: 'Active',
          admissionDate: new Date().toISOString().split('T')[0],
          dob: admission.dob,
          motherName: admission.motherName,
          address: admission.address,
          aadhaar: admission.aadhaar,
          pen: admission.pen,
          apaar: admission.apaar,
          photoUrl: admission.photoUrl
        };
        setStudents(prev => [newStudent, ...prev]);
        alert(`Student approved and enrolled! Assigned ID: ${newStudent.id}`);
      }
    }
  };

  const handleDeleteAdmission = (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this admission request?')) {
      setOnlineAdmissions(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleClearAll = () => {
    if (window.confirm('⚠️ WARNING: This will permanently delete ALL online admission request records! This action cannot be undone. Are you sure you want to proceed?')) {
      setOnlineAdmissions([]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Online Admissions Data</h1>
          <p className="text-slate-500 text-sm mt-1">Review, approve, and export online admission requests.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {onlineAdmissions.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </button>
          )}
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 font-semibold whitespace-nowrap">Request ID</th>
                <th className="px-4 py-4 font-semibold whitespace-nowrap">Submitted On</th>
                <th className="px-4 py-4 font-semibold whitespace-nowrap">Name</th>
                <th className="px-4 py-4 font-semibold whitespace-nowrap">Class (Applied)</th>
                <th className="px-4 py-4 font-semibold whitespace-nowrap">DOB</th>
                <th className="px-4 py-4 font-semibold whitespace-nowrap">Mobile No</th>
                <th className="px-4 py-4 font-semibold whitespace-nowrap">Father's Name</th>
                <th className="px-4 py-4 font-semibold whitespace-nowrap">Status</th>
                <th className="px-4 py-4 font-semibold whitespace-nowrap text-right rounded-none">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No admission requests found.
                  </td>
                </tr>
              ) : (
                filteredAdmissions.map((admission) => (
                  <tr key={admission.id} className="hover:bg-slate-50/50 transition-colors uppercase">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{admission.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{new Date(admission.submitDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">{admission.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{admission.class}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{admission.dob}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{admission.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{admission.parentName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        admission.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                        admission.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {admission.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {admission.status === 'Pending' ? (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(admission.id, 'Approved')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200" title="Approve & Enroll"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(admission.id, 'Rejected')}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200" title="Reject">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 mr-1.5">Processed</span>
                        )}
                        <button 
                          onClick={() => handleDeleteAdmission(admission.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 hover:border-rose-200"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
}
