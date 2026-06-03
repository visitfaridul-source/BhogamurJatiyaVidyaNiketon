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
  const addr = member.address || "N/A";

  const memberRoleLabel =
    member.type === "student"
      ? "Student Identity Card"
      : member.type === "teacher"
        ? "Teacher Identity Card"
        : "Staff Identity Card";

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
        {/* Abstract Background SVG */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <path
              d="M0,0 Q50,50 100,0 L100,100 L0,100 Z"
              fill={styles.accent}
              opacity="0.3"
            />
            <circle
              cx="20"
              cy="80"
              r="30"
              fill={styles.secondary}
              opacity="0.4"
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

        <div
          className="w-full py-2.5 text-center shadow-sm relative z-10"
          style={{ backgroundColor: styles.primary }}
        >
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">
            Terms & Conditions
          </h3>
        </div>

        <div className="flex-1 w-full p-4 flex flex-col justify-between relative z-10">
          <div
            className="text-[7.5px] leading-[1.6] text-justify space-y-2"
            style={{ color: theme === "dark" ? "#cbd5e1" : "#475569" }}
          >
            <p>
              1. This identity card is for school use only and is
              non-transferable.
            </p>
            <p>
              2. If found by a stranger, please drop it in the nearest post box
              or return it to the administrative office of the school.
            </p>
          </div>

          {/* QR Code Container - Made prominent ("thora boda rakho") */}
          <div className="flex flex-col items-center justify-center my-2 shrink-0">
            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-black/5">
              <QRCodeSVG
                value={JSON.stringify({
                  id: member.id,
                  name: member.name,
                  type: member.type,
                  class: member.class || "",
                  section: member.section || ""
                })}
                size={82}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          <div className="mt-auto space-y-1 bg-white/60 backdrop-blur-[2px] p-2 rounded-lg border border-black/5">
            <p className="text-[7px] font-bold text-slate-800">
              If found, return to:
            </p>
            <p
              className="text-[9px] font-bold font-tiro leading-tight"
              style={{ color: styles.primary }}
            >
              {settings.idCardSchoolName ||
                settings.schoolName ||
                "Bhogamur Jatiya Vidya Niketon"}
            </p>
            <p className="text-[7px] text-slate-700 leading-tight">
              {settings.address || "123 Education Lane, Tech City"}
            </p>
            <p className="text-[7px] text-slate-700 leading-tight">
              Ph: {settings.phone || "+1 (555) 123-4567"}
            </p>
          </div>
        </div>

        <div
          className="h-[2mm] w-full mt-auto"
          style={{ backgroundColor: styles.secondary }}
        />
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
            fill={styles.primary}
            opacity="0.9"
          />
          <path
            d="M0,0 L100,0 L100,24 C60,40 40,5 0,22 Z"
            fill={styles.secondary}
            opacity="0.7"
          />
          <path
            d="M0,0 L100,0 L100,18 C50,30 50,-5 0,15 Z"
            fill={styles.accent}
            opacity="0.5"
          />

          {/* Bottom subtle waves */}
          <path
            d="M100,100 L0,100 L0,88 C30,75 70,105 100,82 Z"
            fill={styles.primary}
            opacity="0.05"
          />
          <path
            d="M100,100 L0,100 L0,92 C40,85 60,100 100,90 Z"
            fill={styles.secondary}
            opacity="0.08"
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
      <div className="w-full pt-3 pb-1 relative z-10 flex flex-col items-center">
        <h2
          className={cn(
            "text-[10px] font-bold tracking-wider uppercase text-white drop-shadow-md px-2 text-center leading-tight font-tiro",
            (settings.idCardSchoolName || settings.schoolName || "").length > 25
              ? "text-[8px]"
              : "",
          )}
        >
          {settings.idCardSchoolName ||
            settings.schoolName ||
            "Bhogamur Jatiya Vidya Niketon"}
        </h2>
        <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full mt-0.5 shadow-sm border border-white/10">
          <p className="text-[5.5px] uppercase font-bold text-white tracking-widest">
            {memberRoleLabel}
          </p>
        </div>
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
        <div className="flex items-center text-[7px] leading-snug border-b border-slate-100 pb-0.5">
          <span className="font-bold w-[16mm] uppercase text-slate-500 shrink-0">
            Id No.
          </span>
          <span className="font-black text-slate-800">: {member.id}</span>
        </div>

        {member.type === "student" && (
          <div className="flex items-center text-[7px] leading-snug border-b border-slate-100 pb-0.5">
            <span className="font-bold w-[16mm] uppercase text-slate-500 shrink-0">
              Class
            </span>
            <span className="font-bold text-slate-800">
              : {member.class}{" "}
              {member.section &&
                member.section !== "N/A" &&
                `(${member.section})`}
            </span>
          </div>
        )}

        {member.type === "teacher" && (
          <div className="flex items-center text-[7px] leading-snug border-b border-slate-100 pb-0.5">
            <span className="font-bold w-[16mm] uppercase text-slate-500 shrink-0">
              Subject
            </span>
            <span className="font-bold text-slate-800">
              : {member.subject || "N/A"}
            </span>
          </div>
        )}

        {member.type === "staff" && (
          <div className="flex items-center text-[7px] leading-snug border-b border-slate-100 pb-0.5">
            <span className="font-bold w-[16mm] uppercase text-slate-500 shrink-0">
              Role
            </span>
            <span className="font-bold text-slate-800">
              : {member.role || "N/A"}
            </span>
          </div>
        )}

        <div className="flex items-center text-[7px] leading-snug border-b border-slate-100 pb-0.5">
          <span className="font-bold w-[16mm] uppercase text-slate-500 shrink-0">
            D.O.B
          </span>
          <span className="font-bold text-slate-800">: {dob}</span>
        </div>

        {member.type === "student" && (
          <>
            <div className="flex items-center text-[7px] leading-snug border-b border-slate-100 pb-0.5">
              <span className="font-bold w-[16mm] uppercase text-slate-500 shrink-0 mt-[1px]">
                Father's Name
              </span>
              <span className="font-bold text-slate-800 leading-tight block w-full line-clamp-1">
                : {parentName}
              </span>
            </div>
            {motherName !== "N/A" && (
              <div className="flex items-center text-[7px] leading-snug border-b border-slate-100 pb-0.5">
                <span className="font-bold w-[16mm] uppercase text-slate-500 shrink-0 mt-[1px]">
                  Mother's Name
                </span>
                <span className="font-bold text-slate-800 leading-tight block w-full line-clamp-1">
                  : {motherName}
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex items-center text-[7px] leading-snug border-b border-slate-100 pb-0.5">
          <span className="font-bold w-[16mm] uppercase text-slate-500 shrink-0">
            Mobile No
          </span>
          <span className="font-bold text-slate-800">: {phone}</span>
        </div>

        <div className="flex items-start text-[7px] leading-snug pt-0.5">
          <span className="font-bold w-[16mm] uppercase text-slate-500 shrink-0 mt-[1px]">
            Address
          </span>
          <span className="font-semibold text-slate-800 leading-[1.2] shrink">
            : {addr}
          </span>
        </div>
      </div>

      {/* Footer Details */}
      <div className="mb-2 w-full px-3 flex justify-between items-end relative z-20 shrink-0 mt-auto">
        <div className="p-[2px] bg-white rounded-md flex-shrink-0 shadow-sm border border-slate-200">
          <QRCodeSVG value={qrData} size={26} level="M" includeMargin={false} />
        </div>
        <div className="text-right flex flex-col items-end pt-1 pb-[2px]">
          {settings.principalSignatureUrl ? (
            <img
              src={settings.principalSignatureUrl}
              className="w-[18mm] h-[6mm] mb-[2px] object-contain mix-blend-multiply opacity-80"
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
