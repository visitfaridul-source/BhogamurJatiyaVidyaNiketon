import { useState, useRef, useMemo, ChangeEvent } from "react";
import {
  Users,
  FileDown,
  Printer,
  LayoutGrid,
  Palette,
  CheckCircle2,
  Search,
  Filter,
  PackageOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import IdCardTemplate, { CardTheme } from "@/components/id-card/IdCardTemplate";
import { useSchool } from "../../context/SchoolContext";
import { useWebsite } from "@/context/WebsiteContext";
import { useEffect } from "react";

export default function IdCardGenerator() {
  const { students: contextStudents, teachers: contextTeachers } = useSchool();
  const { settings } = useWebsite();

  const [targetGroup, setTargetGroup] = useState<
    "students" | "teachers" | "staff"
  >("students");
  const [theme, setTheme] = useState<CardTheme>("blue");
  const [activeTab, setActiveTab] = useState<"select" | "preview" | "batch">(
    "select",
  );
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("Nursery");

  const printGridRef = useRef<HTMLDivElement>(null);

  // Standard classes list
  const classes = useMemo(() => {
    return [
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
  }, []);

  const allFilteredMembers = useMemo(() => {
    let list: any[] = [];
    if (targetGroup === "students") {
      list = contextStudents.map((s) => ({
        ...s,
        type: "student",
      }));
    } else if (targetGroup === "teachers") {
      list = contextTeachers.map((t) => ({
        ...t,
        type: "teacher",
        photoUrl: t.avatar,
        dob: t.dob || "01-Jan-1980",
        phone: t.phone || "N/A",
      }));
    } else if (targetGroup === "staff") {
      list = (settings.staffMembers || []).map((st) => ({
        ...st,
        type: "staff",
        photoUrl: st.imageUrl,
        phone: st.phone || "N/A",
        dob: "01-Jan-1980", // Staff missing dob in context generally, use fallback
      }));
    }

    return list.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass =
        targetGroup === "students" && classFilter
          ? m.class === classFilter
          : true;
      return matchSearch && matchClass;
    });
  }, [
    contextStudents,
    contextTeachers,
    settings.staffMembers,
    targetGroup,
    searchTerm,
    classFilter,
  ]);

  const selectedStudents = allFilteredMembers.filter((m) =>
    selectedIds.has(m.id),
  );

  // Reset selected ids when target group changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSearchTerm("");
    setClassFilter("");
  }, [targetGroup]);

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedIds);
      allFilteredMembers.forEach((s) => newSelected.add(s.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      allFilteredMembers.forEach((s) => newSelected.delete(s.id));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const downloadSinglePDF = async (studentId: string) => {
    const cardElement = document.getElementById(`card-front-${studentId}`);
    if (!cardElement) return;

    setIsGenerating(true);
    try {
      const imgData = await htmlToImage.toPng(cardElement, {
        pixelRatio: 4,
        style: { transform: "none" },
      });
      // CR80 PVC card size is ~54mm x 86mm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [54, 86],
      });
      pdf.addImage(imgData, "PNG", 0, 0, 54, 86);
      pdf.save(`${studentId}_ID_Card.pdf`);
    } catch (err) {
      console.error(err);
    }
    setIsGenerating(false);
  };

  const downloadBulkA4PDF = async () => {
    setIsBulkDownloading(true);
    try {
      // Portrait A4
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageCount = Math.ceil(selectedStudents.length / 9);

      let isFirstPage = true;
      for (let i = 0; i < pageCount; i++) {
        // Front image capture
        const frontEl = document.getElementById(`a4-page-front-${i}`);
        if (frontEl) {
          const frontImg = await htmlToImage.toPng(frontEl, {
            pixelRatio: 2,
            style: { transform: "none" },
          });
          if (!isFirstPage) pdf.addPage();
          pdf.addImage(frontImg, "PNG", 0, 0, 210, 297);
          isFirstPage = false;
        }

        // Back image capture
        const backEl = document.getElementById(`a4-page-back-${i}`);
        if (backEl) {
          const backImg = await htmlToImage.toPng(backEl, {
            pixelRatio: 2,
            style: { transform: "none" },
          });
          pdf.addPage();
          pdf.addImage(backImg, "PNG", 0, 0, 210, 297);
        }
      }

      pdf.save("Bulk_A4_ID_Cards.pdf");
    } catch (err) {
      console.error("Failed to generate bulk A4 PDF", err);
    }
    setIsBulkDownloading(false);
  };

  const handlePrintBatch = () => {
    window.print();
  };

  const templates: { id: CardTheme; name: string; color: string }[] = [
    { id: "blue", name: "Ocean Blue", color: "bg-blue-600" },
    { id: "green", name: "Emerald", color: "bg-emerald-600" },
    { id: "dark", name: "Premium Dark", color: "bg-slate-900" },
    { id: "minimal", name: "Minimal White", color: "bg-slate-200" },
    { id: "kids", name: "Playful Kids", color: "bg-pink-500" },
    { id: "gold", name: "Prestige Gold", color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-6 animate-fade-in print:bg-white print:m-0 print:p-0">
      {/* --- Screen UI (Hidden during print) --- */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              ID Card Studio
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Design, generate and print premium student PVC cards.
            </p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex gap-3">
              <button
                onClick={handlePrintBatch}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
              >
                <Printer className="w-4 h-4" />
                Print Selected ({selectedIds.size})
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("select")}
            className={cn(
              "px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
              activeTab === "select"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            1. Select Members
          </button>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => setActiveTab("preview")}
            className={cn(
              "px-4 py-3 text-sm font-semibold border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              activeTab === "preview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            2. Design & Preview
          </button>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => setActiveTab("batch")}
            className={cn(
              "px-4 py-3 text-sm font-semibold border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              activeTab === "batch"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            3. Batch Output
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "select" && (
          <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex gap-2 mb-6 p-1 bg-slate-100/80 rounded-xl w-fit border border-slate-200/60">
              <button
                onClick={() => setTargetGroup("students")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                  targetGroup === "students"
                    ? "bg-white shadow-sm text-indigo-700"
                    : "text-slate-600 hover:text-slate-800",
                )}
              >
                Students
              </button>
              <button
                onClick={() => setTargetGroup("teachers")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                  targetGroup === "teachers"
                    ? "bg-white shadow-sm text-indigo-700"
                    : "text-slate-600 hover:text-slate-800",
                )}
              >
                Teachers
              </button>
              <button
                onClick={() => setTargetGroup("staff")}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
                  targetGroup === "staff"
                    ? "bg-white shadow-sm text-indigo-700"
                    : "text-slate-600 hover:text-slate-800",
                )}
              >
                Other Staff
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search members by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {targetGroup === "students" && (
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-400" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="py-3 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                        checked={
                          allFilteredMembers.length > 0 &&
                          allFilteredMembers.every((s) => selectedIds.has(s.id))
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      ID Number
                    </th>
                    {targetGroup === "students" && (
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Class/Sec
                      </th>
                    )}
                    {targetGroup === "teachers" && (
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Subject
                      </th>
                    )}
                    {targetGroup === "staff" && (
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Role
                      </th>
                    )}
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allFilteredMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500"
                      >
                        No members found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    allFilteredMembers.map((member) => (
                      <tr
                        key={member.id}
                        className={cn(
                          "hover:bg-slate-50/50 transition-colors",
                          selectedIds.has(member.id) ? "bg-indigo-50/30" : "",
                        )}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                            checked={selectedIds.has(member.id)}
                            onChange={() => handleSelectOne(member.id)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                member.photoUrl ||
                                member.photo ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`
                              }
                              alt={member.name}
                              className="w-8 h-8 rounded-full border border-slate-200"
                            />
                            <span className="font-semibold text-sm text-slate-700">
                              {member.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 font-mono">
                          {member.id}
                        </td>
                        {targetGroup === "students" && (
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {member.class} - {member.section}
                          </td>
                        )}
                        {targetGroup === "teachers" && (
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {member.subject}
                          </td>
                        )}
                        {targetGroup === "staff" && (
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {member.role}
                          </td>
                        )}

                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "px-2.5 py-1 text-xs font-semibold rounded-md",
                              member.status === "Active" || !member.status
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700",
                            )}
                          >
                            {member.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-between items-center text-sm text-slate-500">
              <p>Showing {allFilteredMembers.length} members</p>
              <p className="font-semibold text-indigo-600">
                {selectedIds.size} selected for printing
              </p>
            </div>
          </div>
        )}

        {activeTab === "preview" && selectedStudents.length > 0 && (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar Controls */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-600" /> Select Theme
                </h3>
                <div className="space-y-3">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold transition-all",
                        theme === t.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full shadow-inner",
                          t.color,
                        )}
                      ></div>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm overflow-hidden">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-indigo-600" /> Face
                  Preview
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewSide("front")}
                    className={cn(
                      "flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors",
                      previewSide === "front"
                        ? "bg-white shadow-sm text-slate-800"
                        : "text-slate-500",
                    )}
                  >
                    Front
                  </button>
                  <button
                    onClick={() => setPreviewSide("back")}
                    className={cn(
                      "flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors",
                      previewSide === "back"
                        ? "bg-white shadow-sm text-slate-800"
                        : "text-slate-500",
                    )}
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Area */}
            <div className="lg:col-span-3 bg-slate-50 rounded-[2rem] p-8 border border-slate-200 shadow-inner flex flex-col items-center justify-center min-h-[500px]">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-slate-800">
                  Live Card Layout
                </h2>
                <p className="text-sm text-slate-500">
                  Previewing 1 of {selectedStudents.length} selected cards
                </p>
              </div>

              <div className="shadow-2xl rounded-[10px] overflow-hidden transform hover:scale-105 transition-transform duration-300">
                <div id={`card-front-${selectedStudents[0].id}`}>
                  <IdCardTemplate
                    member={selectedStudents[0]}
                    theme={theme}
                    side={previewSide}
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => downloadSinglePDF(selectedStudents[0].id)}
                  disabled={isGenerating}
                  className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-6 py-2.5 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <FileDown className="w-4 h-4" />{" "}
                  {isGenerating ? "Generating..." : "Download This PDF"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "batch" && selectedStudents.length > 0 && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">
                Batch Processing Ready
              </h3>
              <p className="text-sm text-slate-600">
                {selectedStudents.length} records selected for printing.
              </p>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col items-center text-center hover:border-indigo-300 hover:shadow-sm transition-all group">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Printer className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 mb-2">
                  Print A4 Layouts
                </h4>
                <p className="text-sm text-slate-500 mb-6">
                  Generates an A4 portrait grid with 9 cards per page (3x3),
                  properly aligned for double sided printing.
                </p>
                <button
                  onClick={handlePrintBatch}
                  className="mt-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition w-full"
                >
                  Print Layout
                </button>
              </div>
              <div className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col items-center text-center hover:border-indigo-300 hover:shadow-sm transition-all group">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <PackageOpen className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 mb-2">
                  Download Bulk PDF
                </h4>
                <p className="text-sm text-slate-500 mb-6">
                  Generates an A4 portrait PDF file containing 9 cards per page
                  (front and back), ready for direct printing.
                </p>
                <button
                  onClick={downloadBulkA4PDF}
                  disabled={isBulkDownloading}
                  className="mt-auto px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkDownloading
                    ? "Generating PDF..."
                    : "Download Bulk PDF"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Print Environment UI (Visible only during print for window.print(), but also used by html-to-image for bulk download) --- */}
      <div
        id="preview-print-zone-container"
        className="fixed -top-[20000px] left-0 print:static preview-print-zone bg-white pointer-events-none print:pointer-events-auto print:flex flex-col gap-8 w-fit shrink-0 opacity-100"
      >
        <style>{`
           @media print {
             @page { size: A4 portrait; margin: 0; }
             body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; margin: 0; padding: 0; }
             /* Hide everything else */
             body > div:not(#root) { display: none !important; }
             .print\\:hidden { display: none !important; }
             #preview-print-zone-container { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; display: flex !important; margin: 0 !important; box-shadow: none !important;}
             .page-break { page-break-after: always; break-after: page; }
           }
           .card-grid { display: grid; grid-template-columns: repeat(3, 54mm); gap: 6mm 10mm; justify-content: center; align-content: start; margin: 0 auto; }
         `}</style>

        {/* Render Front and Back Pages */}
        <div className="print-content" ref={printGridRef}>
          {Array.from({ length: Math.ceil(selectedStudents.length / 9) }).map(
            (_, pageIndex) => {
              const pageStudents = selectedStudents.slice(
                pageIndex * 9,
                (pageIndex + 1) * 9,
              );
              return (
                <div key={`page-${pageIndex}`}>
                  {/* Print Fronts */}
                  <div
                    id={`a4-page-front-${pageIndex}`}
                    className="page-break bg-white flex flex-col items-center justify-start relative overflow-hidden"
                    style={{
                      width: "210mm",
                      height: "297mm",
                      padding: "10mm",
                      boxSizing: "border-box",
                    }}
                  >
                    <div className="card-grid">
                      {pageStudents.map((s) => (
                        <div
                          key={`front-${s.id}`}
                          id={`card-front-${s.id}-print`}
                          className="relative p-0 bg-white inline-block"
                        >
                          <div className="absolute -inset-[1mm] border-[0.5mm] border-dashed border-gray-300 pointer-events-none" />
                          <IdCardTemplate
                            member={s}
                            theme={theme}
                            side="front"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Print Backs (Mirrored mapping for double-sided alignment) */}
                  <div
                    id={`a4-page-back-${pageIndex}`}
                    className="page-break bg-white flex flex-col items-center justify-start relative overflow-hidden mt-4 print:mt-0"
                    style={{
                      width: "210mm",
                      height: "297mm",
                      padding: "10mm",
                      boxSizing: "border-box",
                    }}
                  >
                    <div className="card-grid">
                      {Array.from({ length: 9 }).map((_, i) => {
                        const rowIndex = Math.floor(i / 3);
                        const colIndex = i % 3;
                        const mirroredColIndex = 2 - colIndex;
                        const targetIndex = rowIndex * 3 + mirroredColIndex;
                        const targetStudent = pageStudents[targetIndex];

                        return (
                          <div
                            key={`back-${targetStudent?.id || i}`}
                            id={
                              targetStudent
                                ? `card-back-${targetStudent.id}-print`
                                : undefined
                            }
                            className="relative bg-white inline-block"
                          >
                            {targetStudent ? (
                              <>
                                <div className="absolute -inset-[1mm] border-[0.5mm] border-dashed border-gray-300 pointer-events-none" />
                                <IdCardTemplate
                                  member={targetStudent}
                                  theme={theme}
                                  side="back"
                                />
                              </>
                            ) : (
                              <div className="w-[54mm] h-[86mm]" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
