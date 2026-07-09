import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { useWebsite } from "@/context/WebsiteContext";

export interface CardMemberData {
  name: string;
  id: string;
  type: "student" | "teacher" | "staff";
  roll?: string;
  class?: string;
  section?: string;
  dob?: string;
  parentName?: string;
  motherName?: string;
  phone?: string;
  address?: string;
  photoUrl?: string; // Standardized to photoUrl
  photo?: string;
  emergencyContact?: string;
  // Teacher/Staff specific
  subject?: string;
  qualification?: string;
  role?: string;
  email?: string;
}

export type CardTheme = "blue" | "green" | "dark" | "minimal" | "kids" | "gold";

interface IdCardTemplateProps {
  member: CardMemberData;
  theme?: CardTheme;
  side?: "front" | "back";
}

const THEME_STYLES = {
  blue: {
    bg: "bg-white",
    primary: "#2563eb", // blue-600
    secondary: "#3b82f6", // blue-500
    accent: "#60a5fa", // blue-400
    text: "text-blue-900",
  },
  green: {
    bg: "bg-white",
    primary: "#059669", // emerald-600
    secondary: "#10b981", // emerald-500
    accent: "#34d399", // emerald-400
    text: "text-emerald-900",
  },
  dark: {
    bg: "bg-slate-900",
    primary: "#1e293b", // slate-800
    secondary: "#334155", // slate-700
    accent: "#f59e0b", // amber-500
    text: "text-white",
  },
  minimal: {
    bg: "bg-white",
    primary: "#334155", // slate-700
    secondary: "#64748b", // slate-500
    accent: "#cbd5e1", // slate-300
    text: "text-slate-800",
  },
  kids: {
    bg: "bg-amber-50",
    primary: "#ec4899", // pink-500
    secondary: "#f59e0b", // amber-500
    accent: "#a855f7", // purple-500
    text: "text-slate-900",
  },
  gold: {
    bg: "bg-white",
    primary: "#d97706", // amber-600
    secondary: "#eab308", // yellow-500
    accent: "#fde047", // yellow-300
    text: "text-amber-950",
  },
};

function BarcodeSVG({ value }: { value: string }) {
  // Clean deterministic ID to Code39 horizontal barcode style rendering
  const normalized = (value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const chars = normalized.length ? normalized : "ID-000";

  const barPatterns: Record<string, string> = {
    "0": "101001101101", "1": "110100101011", "2": "101100101011", "3": "110110010101",
    "4": "101001101011", "5": "110100110101", "6": "101100110101", "7": "101001011011",
    "8": "110100101101", "9": "101100101101", "A": "110101001011", "B": "101101001011",
    "C": "110110100101", "D": "101011001011", "E": "110101100101", "F": "101101100101",
    "G": "101010011011", "H": "110101001101", "I": "101101001101", "J": "101011001101",
    "K": "110101010011", "L": "101101010011", "M": "110110101001", "N": "101011010011",
    "O": "110101101001", "P": "101101101001", "Q": "101010110011", "R": "110101011001",
    "S": "101101011001", "T": "101011011001", "U": "110010101011", "V": "100110101011",
    "W": "110011010101", "X": "100101101011", "Y": "110010110101", "Z": "100110110101",
    "-": "100101011011",
  };

  let binary = "100101101101"; // start code 39 guard *
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const pattern = barPatterns[char] || barPatterns["-"];
    binary += pattern + "0";
  }
  binary += "100101101101"; // end code 39 guard *

  const totalSegments = binary.length;

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <svg
        width="100%"
        height="12"
        viewBox={`0 0 ${totalSegments} 20`}
        preserveAspectRatio="none"
        className="block"
      >
        {binary.split("").map((bit, idx) => {
          if (bit === "1") {
            return (
              <rect
                key={idx}
                x={idx}
                y={0}
                width={1.2}
                height={20}
                fill="#000000"
              />
            );
          }
          return null;
        })}
      </svg>
      <span className="text-[5px] font-mono tracking-[1px] font-bold text-slate-800 mt-[2px] block text-center uppercase">
        {chars}
      </span>
    </div>
  );
}

export default function IdCardTemplate({
  member,
  theme = "blue",
  side = "front",
}: IdCardTemplateProps) {
  const styles = THEME_STYLES[theme];
  const { settings } = useWebsite();

  const qrData = JSON.stringify({
    id: member.id,
    name: member.name,
    type: member.type,
  });

  const photoUrl =
    member.photoUrl ||
    member.photo ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`;
  const dob = member.dob || "01-Jan-2010";
  const parentName = member.parentName || "N/A";
  const motherName = member.motherName || "N/A";
  const phone = member.phone || "N/A";
  const addr = member.address ? member.address.replace(/(,\s*)?\b\d{6}\b/g, '') : "N/A";

  // Back side
  if (side === "back") {
    return (
      <div
        className={cn(
          "w-[54mm] h-[86mm] relative overflow-hidden flex flex-col p-0",
          styles.bg,
          "border border-slate-200 shadow-sm",
        )}
        style={{ boxSizing: "border-box" }}
      >
        {/* Custom Back Background Photo */}
        {settings.idCardBackBackgroundUrl && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <img 
              src={settings.idCardBackBackgroundUrl}
              className="w-full h-full object-cover"
              alt="Back Background"
            />
          </div>
        )}

        {/* Top Header Overlay with School Name */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-center px-1 pt-[2mm]">
          <p
            className={cn(
              "font-bold font-fjalla uppercase leading-none text-white text-center w-full",
              (settings.idCardSchoolName || settings.schoolName || "Bhogamur Jatiya Vidya Niketon").length > 22
                ? "text-[11px] tracking-wide scale-x-110"
                : "text-[14px] tracking-wide scale-x-105"
            )}
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}
          >
            {settings.idCardSchoolName ||
              settings.schoolName ||
              "Bhogamur Jatiya Vidya Niketon"}
          </p>
        </div>

        {/* Abstract Background SVG (Top) */}
        <div className="absolute top-0 left-0 right-0 h-[12.7mm] pointer-events-none opacity-100 z-0 rotate-180">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <path
              d="M0,0 Q50,50 100,0 L100,100 L0,100 Z"
              fill="#2563eb"
              opacity="1"
            />
            <circle
              cx="20"
              cy="80"
              r="30"
              fill="#1d4ed8"
              opacity="1"
            />
          </svg>
        </div>

        {/* Abstract Background SVG (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 h-[25.4mm] pointer-events-none opacity-100 z-0">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <path
              d="M0,0 Q50,50 100,0 L100,100 L0,100 Z"
              fill={styles.accent}
              opacity="1"
            />
            <circle
              cx="20"
              cy="80"
              r="30"
              fill={styles.secondary}
              opacity="1"
            />
          </svg>
        </div>

        {/* Web Setting Watermark */}
        {settings.watermarkUrl && (
          <div className="absolute inset-0 m-auto w-[35mm] h-[35mm] opacity-[0.08] z-0 pointer-events-none flex items-center justify-center">
            <img
              src={settings.watermarkUrl}
              className="w-full h-full object-contain"
              alt="Watermark"
            />
          </div>
        )}

        <div className="flex-1 w-full pt-4 pb-[20mm] flex flex-col justify-end relative z-10">
          {/* QR Code Container - Centered */}
          <div className="flex flex-col items-center justify-center mt-auto mb-0 shrink-0 relative z-20">
            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-black/5 flex flex-col items-center gap-1">
              <QRCodeSVG
                value={JSON.stringify({
                  id: member.id,
                  name: member.name,
                  type: member.type,
                  class: member.class || "",
                  section: member.section || ""
                })}
                size={80}
                level="M"
                includeMargin={false}
              />
              <span className="text-[7.5px] font-mono font-bold text-slate-900 tracking-wide bg-slate-50 px-2 py-0.5 rounded border border-black/5">
                ID No: {member.id}
              </span>
            </div>
          </div>

        </div>

        {/* Bottom Overlay Info */}
        <div className="absolute bottom-0 left-0 right-0 z-20 space-y-1 bg-black/40 backdrop-blur-sm pt-2 pb-1.5 px-4 w-full border-t border-black/20 text-center" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
          <p className="text-[7px] font-bold text-white uppercase tracking-wider">
            If found, return to:
          </p>
          <p className="text-[8px] font-bold text-white leading-tight">
            {settings.address || "BHOGAMUR, NAGAON, ASSAM, 782140"}
          </p>
          <p className="text-[7px] font-bold text-white leading-tight">
            Ph: {settings.phone || "8638803208"}
          </p>
        </div>
      </div>
    );
  }

  // Front Side
  return (
    <div
      className={cn(
        "w-[54mm] h-[86mm] relative overflow-hidden flex flex-col",
        styles.bg,
        "border border-slate-200 shadow-sm",
      )}
      style={{ boxSizing: "border-box" }}
    >
      {/* Abstract Background Beautiful Curve */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Top dynamic waves */}
          <path
            d="M0,0 L100,0 L100,28 C70,45 30,10 0,32 Z"
            fill="#1e3a8a"
            opacity="1"
          />
          <path
            d="M0,0 L100,0 L100,24 C60,40 40,5 0,22 Z"
            fill="#2563eb"
            opacity="1"
          />
          <path
            d="M0,0 L100,0 L100,18 C50,30 50,-5 0,15 Z"
            fill="#3b82f6"
            opacity="0.9"
          />

          {/* Bottom subtle waves */}
          <path
            d="M100,100 L0,100 L0,88 C30,75 70,105 100,82 Z"
            fill="#2563eb"
            opacity="0.6"
          />
          <path
            d="M100,100 L0,100 L0,92 C40,85 60,100 100,90 Z"
            fill="#1e3a8a"
            opacity="0.9"
          />

          {/* Decorative circles */}
          <circle cx="85" cy="12" r="18" fill="white" opacity="0.1" />
          <circle cx="92" cy="8" r="8" fill="white" opacity="0.2" />
          <circle cx="15" cy="85" r="25" fill={styles.accent} opacity="0.05" />
        </svg>
      </div>

      {/* Web Setting Watermark */}
      {settings.watermarkUrl && (
        <div className="absolute inset-0 m-auto w-[35mm] h-[35mm] opacity-[0.08] z-10 pointer-events-none flex items-center justify-center">
          <img
            src={settings.watermarkUrl}
            className="w-full h-full object-contain"
            alt="Watermark"
          />
        </div>
      )}

      {/* Header */}
      <div className="w-full pt-1.5 pb-1 px-0.5 relative z-10 text-center drop-shadow-[0_2.5px_2.5px_rgba(0,0,0,0.85)] flex flex-col items-center">
        <h2
          className={cn(
            "font-black uppercase text-white leading-[1.1] font-fjalla w-full tracking-normal transform scale-x-[1.18] origin-center",
            (settings.idCardSchoolName || settings.schoolName || "").length > 25
              ? "text-[12px]"
              : "text-[14.5px]",
          )}
        >
          {settings.idCardSchoolName ||
            settings.schoolName ||
            "Bhogamur Jatiya Vidya Niketon"}
        </h2>
        <p className="text-[10.5px] text-center font-semibold text-white/95 tracking-wide mt-1 leading-tight w-full mx-auto">
          Bhogamur, Nagaon, Assam, 782140
        </p>

        {settings.logoUrl && (
          <div className="absolute top-[46px] right-2 shrink-0 w-[10mm] h-[10mm] flex items-center justify-center z-30">
            <img
              src={settings.logoUrl}
              alt="School Logo"
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
        )}
      </div>

      {/* Profile Photo */}
      <div className="relative w-full flex justify-center mt-1 z-20">
        <div
          className="w-[18mm] h-[22mm] rounded-[6px] overflow-hidden border-[2.5px] bg-white shadow-md relative"
          style={{ borderColor: "white" }}
        >
          <img
            src={photoUrl}
            alt={member.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 shadow-inner rounded-[4px] pointer-events-none"></div>
        </div>
      </div>

      <div className="text-center mt-1.5 px-2 relative z-20">
        <h3
          className={cn(
            "text-[11px] font-black uppercase tracking-tight leading-none text-slate-800",
          )}
        >
          {member.name}
        </h3>
      </div>

      {/* Details Area */}
      <div className="px-3 mt-1.5 space-y-0.5 relative z-20 flex-1">
        <div className="flex items-center text-[8.5px] leading-snug border-b border-slate-100 pb-0.5">
          <span className="font-bold w-[21mm] uppercase text-black shrink-0">
            Id No.
          </span>
          <span className="font-black text-black">: {member.id}</span>
        </div>

        {member.type === "student" && (
          <div className="flex items-center text-[8.5px] leading-snug border-b border-slate-100 pb-0.5">
            <span className="font-bold w-[21mm] uppercase text-black shrink-0">
              Class
            </span>
            <span className="font-bold text-black">
              : {member.class}{" "}
              {member.section &&
                member.section !== "N/A" &&
                `(${member.section})`}
            </span>
          </div>
        )}

        {member.type === "teacher" && (
          <div className="flex items-center text-[8.5px] leading-snug border-b border-slate-100 pb-0.5">
            <span className="font-bold w-[21mm] uppercase text-black shrink-0">
              Subject
            </span>
            <span className="font-bold text-black">
              : {member.subject || "N/A"}
            </span>
          </div>
        )}

        {member.type === "staff" && (
          <div className="flex items-center text-[8.5px] leading-snug border-b border-slate-100 pb-0.5">
            <span className="font-bold w-[21mm] uppercase text-black shrink-0">
              Role
            </span>
            <span className="font-bold text-black">
              : {member.role || "N/A"}
            </span>
          </div>
        )}

        <div className="flex items-center text-[8.5px] leading-snug border-b border-slate-100 pb-0.5">
          <span className="font-bold w-[21mm] uppercase text-black shrink-0">
            D.O.B
          </span>
          <span className="font-bold text-black">: {dob}</span>
        </div>

        {member.type === "student" && (
          <>
            <div className="flex items-center text-[8.5px] leading-snug border-b border-slate-100 pb-0.5">
              <span className="font-bold w-[21mm] uppercase text-black shrink-0 mt-[1px]">
                Father's Name
              </span>
              <span className="font-bold text-black leading-tight block w-full line-clamp-1">
                : {parentName}
              </span>
            </div>
            {motherName !== "N/A" && (
              <div className="flex items-center text-[8.5px] leading-snug border-b border-slate-100 pb-0.5">
                <span className="font-bold w-[21mm] uppercase text-black shrink-0 mt-[1px]">
                  Mother's Name
                </span>
                <span className="font-bold text-black leading-tight block w-full line-clamp-1">
                  : {motherName}
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex items-center text-[8.5px] leading-snug border-b border-slate-100 pb-0.5">
          <span className="font-bold w-[21mm] uppercase text-black shrink-0">
            Mobile No
          </span>
          <span className="font-bold text-black">: {phone}</span>
        </div>

        <div className="flex items-start text-[8px] leading-[1.1] pt-0.5">
          <span className="font-bold uppercase text-black shrink-0">
            Address
          </span>
          <span className="font-semibold text-black flex-1 break-words ml-1">
            : {addr}
          </span>
        </div>
      </div>

      {/* Footer Details */}
      <div className="mb-2 w-full px-3 flex justify-between items-end relative z-20 shrink-0 mt-auto">
        <div className="text-left flex flex-col justify-end pb-[6px]">
           <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight font-fjalla">
              {member.type === "student" ? "Student ID Card" : "Teacher ID Card"}
           </span>
        </div>
        <div className="text-right flex flex-col items-end pt-1 pb-[2px]">
          {settings.principalSignatureUrl ? (
            <img
              src={settings.principalSignatureUrl}
              className="w-[18mm] h-[6mm] mb-[2px] object-contain"
              alt="Signature"
            />
          ) : (
            <img
              src="https://api.dicebear.com/7.x/initials/svg?seed=Principal&backgroundColor=transparent&textColor=000000"
              className="w-[12mm] h-[4mm] opacity-60 mb-[2px] object-cover mix-blend-multiply"
              alt="Signature"
            />
          )}
          <div className="w-[16mm] h-[1px] bg-slate-400 mb-[2px]"></div>
          <p className="text-[5px] uppercase font-bold text-slate-600 tracking-wider">
            Principal
          </p>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="h-[2.5mm] w-full mt-auto relative overflow-hidden shrink-0"
        style={{ backgroundColor: styles.accent }}
      >
        <div className="absolute inset-0 bg-white/20 w-1/2 skew-x-12 translate-x-1/2"></div>
      </div>
    </div>
  );
}
