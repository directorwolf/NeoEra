import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Database,
  Download,
  Droplets,
  FileText,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Plus,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { supabase } from "./lib/supabase";

type UserRole = "Admin" | "RTO" | "MRTO" | "EFS" | "Supervisor" | "Team Lead" | "User";
type Page = "home" | "operations" | "intelligence" | "approvals" | "profile" | "create_task" | "action_task" | "upload_center" | "diesel_planning" | "recent_activity" | "map_view" | "summary" | "site_detail" | "task_detail" | "cluster_detail";
type SummaryKind = "sites" | "near_runout" | "risks" | "approvals" | "cpd" | "supply";
type TaskType = "Spot Check Request" | "Supply Request" | "Diesel Movement" | "Diesel Review" | "Intervention";

type AppUser = {
  id?: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role: UserRole;
  assigned_efs_clusters?: string[];
  assigned_msp_cluster?: string;
  supervised_msp_clusters?: string[];
  assigned_mrto_email?: string;
  assigned_mrto_clusters?: string[];
  reports_to?: string;
  is_active?: boolean;
};

type Site = {
  site_id: string;
  deprecated_address_name?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  msp_cluster?: string;
  efs_cluster?: string;
  mrto_cluster?: string;
  status?: string;
  team_lead_full_name?: string;
  team_lead_phone_number?: string;
  team_lead_phone_normalized?: string;
  efs_full_name?: string;
  efs_phone_number?: string;
  efs_phone_normalized?: string;
  mrto_full_name?: string;
  mrto_phone_number?: string;
  mrto_phone_normalized?: string;
  supervisor_full_name?: string;
  supervisor_phone_number?: string;
  supervisor_phone_normalized?: string;
  dg_capacity?: number;
  is_truckable?: boolean;
  tank_capacity_litres?: number;
  cutoff_level_litres?: number;
  monthly_allocation_litres?: number;
  preferred_supply_window?: string;
  delivery_risk_score?: number;
};

type SiteAction = {
  id: string;
  site_id: string;
  action_type: TaskType;
  request_type?: string;
  dg_capacity?: number;
  assigned_to?: string;
  assigned_to_role?: UserRole;
  created_by?: string;
  current_approval_level?: string;
  status?: string;
  engine_flag?: string;
  recommendation?: string;
  task_category?: string;
  cluster_name?: string;
  execution_status?: string;
  closure_comment?: string;
  evidence_url?: string;
  dispute_count?: number;
  dispute_comment?: string;
  corrective_comment?: string;
  created_at?: string;
  updated_at?: string;
};

type SpotCheck = {
  id: string;
  site_id: string;
  check_date?: string;
  diesel_level?: number;
  consumption_per_day?: number;
  revised_consumption_per_day?: number;
  run_out_date?: string;
  created_by_email?: string;
  created_by_phone?: string;
  dg_capacity?: number;
  check_shift?: string;
  created_at?: string;
};

type DieselTx = {
  id: string;
  site_id: string;
  qty_supplied?: number;
  initial_dip?: number;
  transaction_date?: string;
  transaction_type?: string;
  created_by_email?: string;
  created_by_phone?: string;
  status?: string;
  approval_status?: string;
  created_at?: string;
};

type RecentActivity = {
  id: string;
  actor_email?: string;
  actor_phone?: string;
  actor_name?: string;
  action_type: string;
  description: string;
  entity_type?: string;
  entity_id?: string;
  created_at?: string;
};
type DeliveryPlan = {
  id: string;
  route_name?: string;
  site_id: string;
  planned_qty_litres?: number;
  dispatch_date?: string;
  planned_by_phone?: string;
  planned_by_email?: string;
  planning_status?: string;
  truck_capacity_litres?: number;
  route_group?: string;
  recommendation?: string;
  created_at?: string;
};

type SiteDieselInsight = {
  site_id: string;
  cluster: string;
  qty_supplied_cycle: number;
  qty_used_cycle: number;
  current_diesel_level: number | string;
  estimated_current_diesel: number | string;
  field_vs_system_variance: number | string;
  confidence_level: "HIGH" | "MEDIUM" | "LOW";
  runout_days: number | string;
  runout_date: string;
  recommended_cpd: number;
  field_analyzed_cpd: number;
  cpd_last_10_days: number;
  latest_spot_check: string;
};

type SiteLifeStatus = "ASSIGNED" | "IN_CONFIRMATION" | "LIVE" | "CRITICAL" | "RUNOUT" | "INACTIVE";

type OperationalNotification = {
  id: string;
  site_id: string;
  cluster: string;
  status: SiteLifeStatus;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  smartRecommendation: string;
  movementEligible: boolean;
  supplyEligible: boolean;
  runoutDays: number | string;
  averageCpd: number;
};

type UserCapexRating = {
  email: string;
  name: string;
  role: UserRole;
  assignedTasks: number;
  closedTasks: number;
  missedTasks: number;
  disputes: number;
  evidenceClosures: number;
  dieselSavingsScore: number;
  approvalAccuracyScore: number;
  disputeAccuracyScore: number;
  score: number;
  level: number;
  backendLevel: number;
  frontendLevel: number;
  mythicRank: string;
  relicTitle: string;
  character: string;
  characterClass: string;
  characterSummary: string;
  fullTitle: string;
  badgeTheme: string;
  colorPalette: string[];
  prestigeClass?: string;
  prestigeIdentity?: string;
  grade: "A" | "B" | "C" | "D" | "E";
  interpretation: string;
};

type SiteConsumptionRating = {
  character: string;
  className: string;
  summary: string;
  tone: "green" | "blue" | "orange" | "red" | "purple";
};

type UiState = { loading: boolean; message: string; success: boolean };

const TASK_TYPES: TaskType[] = ["Spot Check Request", "Supply Request", "Diesel Movement", "Diesel Review", "Intervention"];

const HSE_HINTS = [
  "Confirm PPE before opening power cabinets or generator panels.",
  "Check for diesel leakage before and after supply activity.",
  "Do not work on exposed terminals without isolation confirmation.",
  "Confirm fire extinguisher availability before DG operation.",
  "Escalate unsafe access, community threat, or security exposure before proceeding.",
];

function normalizeTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function mapUser(row: any): AppUser {
  const fullName = row?.name || [row?.first_name, row?.last_name].filter(Boolean).join(" ") || row?.phone || row?.email || "User";
  return {
    id: row?.id,
    email: row?.email || "",
    phone: row?.phone || "",
    first_name: row?.first_name || "",
    last_name: row?.last_name || "",
    name: fullName,
    role: (row?.role || "User") as UserRole,
    assigned_efs_clusters: normalizeTextArray(row?.assigned_efs_clusters),
    assigned_msp_cluster: row?.assigned_msp_cluster || "",
    supervised_msp_clusters: normalizeTextArray(row?.supervised_msp_clusters),
    assigned_mrto_email: row?.assigned_mrto_email || "",
    assigned_mrto_clusters: normalizeTextArray(row?.assigned_mrto_clusters),
    reports_to: row?.reports_to || "",
    is_active: row?.is_active ?? true,
  };
}

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  const cleaned = String(phone).replace(/[^0-9]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("234")) return "+" + cleaned;
  if (cleaned.length === 11 && cleaned.startsWith("0")) return "+234" + cleaned.slice(1);
  if (cleaned.length === 10) return "+234" + cleaned;
  return "+" + cleaned;
}

function userPhoneMatchesSite(site: Site, phone: string) {
  return (
    site.team_lead_phone_normalized === phone ||
    site.efs_phone_normalized === phone ||
    site.supervisor_phone_normalized === phone ||
    site.mrto_phone_normalized === phone
  );
}

function roleFromPhone(site: Site, phone: string): UserRole {
  if (site.mrto_phone_normalized === phone) return "MRTO";
  if (site.efs_phone_normalized === phone) return "EFS";
  if (site.supervisor_phone_normalized === phone) return "Supervisor";
  if (site.team_lead_phone_normalized === phone) return "Team Lead";
  return "User";
}

function nameFromPhone(site: Site, phone: string) {
  if (site.mrto_phone_normalized === phone) return site.mrto_full_name || "MRTO";
  if (site.efs_phone_normalized === phone) return site.efs_full_name || "EFS";
  if (site.supervisor_phone_normalized === phone) return site.supervisor_full_name || "Supervisor";
  if (site.team_lead_phone_normalized === phone) return site.team_lead_full_name || "Team Lead";
  return "Operator";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function daysBetween(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function getCycleStartDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function userCanSeeSite(user: AppUser, site: Site) {
  if (["Admin", "RTO"].includes(user.role)) return true;
  const phone = normalizePhone(user.phone);
  if (!phone) return false;
  return userPhoneMatchesSite(site, phone);
}

function getVisibleSites(user: AppUser | null, sites: Site[]) {
  if (!user) return [];
  return sites.filter((site) => userCanSeeSite(user, site));
}

function toCsv(rows: any[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: any) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join(String.fromCharCode(10));
}

function downloadCsv(filename: string, rows: any[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function estimateCurrentDieselFromSupply(latestSpot: SpotCheck | undefined, lastSupply: DieselTx | undefined, cpd: number) {
  if (!lastSupply) return latestSpot?.diesel_level ?? "-";
  const supplyDate = new Date(lastSupply.transaction_date || lastSupply.created_at || 0);
  if (Number.isNaN(supplyDate.getTime())) return latestSpot?.diesel_level ?? "-";
  const baseline = Number(lastSupply.initial_dip || 0) + Number(lastSupply.qty_supplied || 0);
  const days = Math.max(daysBetween(supplyDate, new Date()), 0);
  return Number(Math.max(baseline - Number(cpd || 0) * days, 0).toFixed(2));
}

function getDieselConfidence(latestSpot: SpotCheck | undefined, lastSupply: DieselTx | undefined): "HIGH" | "MEDIUM" | "LOW" {
  if (!latestSpot) return "LOW";
  const checkDate = new Date(latestSpot.check_date || latestSpot.created_at || 0);
  const ageDays = daysBetween(checkDate, new Date());
  const hasRecentSupply = !!lastSupply && daysBetween(new Date(lastSupply.transaction_date || lastSupply.created_at || 0), new Date()) <= 7;
  if (ageDays <= 2 && hasRecentSupply) return "HIGH";
  if (ageDays <= 7) return "MEDIUM";
  return "LOW";
}

function getVarianceLabel(variance: number | string) {
  if (variance === "-" || variance === null || variance === undefined) return "Insufficient data";
  const value = Number(variance);
  if (Math.abs(value) <= 50) return "Variance stable";
  if (Math.abs(value) <= 150) return "Consumption anomaly detected";
  return "Critical diesel inconsistency";
}

function getVarianceTone(variance: number | string) {
  if (variance === "-" || variance === null || variance === undefined) return "text-slate-300";
  const value = Math.abs(Number(variance));
  if (value <= 50) return "text-emerald-400";
  if (value <= 150) return "text-orange-400";
  return "text-red-400";
}

function getOperationalRecommendation(insight?: SiteDieselInsight) {
  if (!insight) return "Open a fresh spot check to establish baseline diesel intelligence.";
  const variance = insight.field_vs_system_variance === "-" ? 0 : Number(insight.field_vs_system_variance);
  if (variance < -150) return "Immediate physical verification and supply reconciliation required.";
  if (Number(insight.runout_days) <= 2) return "Prioritize supply scheduling within next operational window.";
  if (Number(insight.cpd_last_10_days) > Number(insight.recommended_cpd) * 1.3) return "Investigate abnormal consumption trend and runtime pattern.";
  if (insight.confidence_level === "LOW") return "Request fresh field spot check before critical decision.";
  return "Diesel position is within expected operating range. Continue monitoring.";
}

function buildSiteDieselInsights(sites: Site[], spots: SpotCheck[], diesel: DieselTx[], cycleStartValue: string, cycleEndValue: string): SiteDieselInsight[] {
  const start = cycleStartValue ? new Date(cycleStartValue) : getCycleStartDate();
  const end = cycleEndValue ? new Date(cycleEndValue) : new Date();
  const tenDaysAgo = new Date(Date.now() - 10 * 86400000);

  return sites.map((site) => {
    const siteSpots = spots.filter((spot) => spot.site_id === site.site_id);
    const latestSpot = siteSpots[0];
    const cycleSupplies = diesel.filter((tx) => {
      const txDate = new Date(tx.transaction_date || tx.created_at || 0);
      return tx.site_id === site.site_id && txDate >= start && txDate <= end;
    });
    const qtySuppliedCycle = cycleSupplies.reduce((sum, tx) => sum + Number(tx.qty_supplied || 0), 0);
    const recommendedCpd = Number(latestSpot?.revised_consumption_per_day || latestSpot?.consumption_per_day || 0);
    const daysInCycle = Math.max(daysBetween(start, end), 1);
    const qtyUsedCycle = Number((recommendedCpd * daysInCycle).toFixed(2));
    const currentDieselLevel = latestSpot?.diesel_level ?? "-";
    const runoutDays = latestSpot?.run_out_date ? daysBetween(new Date(), new Date(latestSpot.run_out_date)) : "-";
    const lastSupply = cycleSupplies[0];
    const estimatedCurrentDiesel = estimateCurrentDieselFromSupply(latestSpot, lastSupply, recommendedCpd);
    const variance = estimatedCurrentDiesel !== "-" && currentDieselLevel !== "-" ? Number((Number(currentDieselLevel) - Number(estimatedCurrentDiesel)).toFixed(2)) : "-";
    const confidenceLevel = getDieselConfidence(latestSpot, lastSupply);
    const last10 = siteSpots.filter((spot) => new Date(spot.check_date || spot.created_at || 0) >= tenDaysAgo);
    const cpdLast10 = last10.length ? Number((last10.reduce((sum, spot) => sum + Number(spot.revised_consumption_per_day || spot.consumption_per_day || 0), 0) / last10.length).toFixed(2)) : recommendedCpd;
    const fieldAnalyzedCpd = siteSpots.length ? Number((siteSpots.slice(0, 3).reduce((sum, spot) => sum + Number(spot.revised_consumption_per_day || spot.consumption_per_day || 0), 0) / Math.min(siteSpots.length, 3)).toFixed(2)) : 0;

    return {
      site_id: site.site_id,
      cluster: site.msp_cluster || "-",
      qty_supplied_cycle: Number(qtySuppliedCycle.toFixed(2)),
      qty_used_cycle: qtyUsedCycle,
      current_diesel_level: currentDieselLevel,
      estimated_current_diesel: estimatedCurrentDiesel,
      field_vs_system_variance: variance,
      confidence_level: confidenceLevel,
      runout_days: runoutDays,
      runout_date: latestSpot?.run_out_date || "-",
      recommended_cpd: recommendedCpd,
      field_analyzed_cpd: fieldAnalyzedCpd,
      cpd_last_10_days: cpdLast10,
      latest_spot_check: latestSpot?.check_date || latestSpot?.created_at || "-",
    };
  });
}

const MYTHIC_RANKS = [
  { level: 1, mythicRank: "Aetherions", relicTitle: "Branch Aetherions Nest" },
  { level: 2, mythicRank: "Morbryns", relicTitle: "Morbryns Skull Totem" },
  { level: 3, mythicRank: "Oraculons", relicTitle: "Oraculons Pearl Eye" },
  { level: 4, mythicRank: "Genesiswings", relicTitle: "Genesiswing Creation Feather" },
  { level: 5, mythicRank: "Metamoryx", relicTitle: "Metamoryx Ember Cocoon" },
  { level: 6, mythicRank: "Dracoryths", relicTitle: "Dracoryths Scale Relic" },
  { level: 7, mythicRank: "Solaryns", relicTitle: "Solaryns Dawn Crest" },
  { level: 8, mythicRank: "Noctelyrs", relicTitle: "Noctelyrs Moon Lantern" },
  { level: 9, mythicRank: "Tempestrals", relicTitle: "Tempestrals Thunder Drum" },
  { level: 10, mythicRank: "Pyrovaels", relicTitle: "Pyrovaels Flame Core" },
  { level: 11, mythicRank: "Thalassorins", relicTitle: "Thalassorins Tide Conch" },
  { level: 12, mythicRank: "Celestguards", relicTitle: "Celestguards Sky Pillar" },
  { level: 13, mythicRank: "Heraldryphs", relicTitle: "Heraldryphs Royal Scroll" },
  { level: 14, mythicRank: "Ravagerons", relicTitle: "Ravagerons War Crown" },
];

const ROLE_CHARACTER_MAP: Record<string, string> = {
  User: "Sparrow",
  "Team Lead": "Falcon",
  EFS: "Hawk",
  Supervisor: "Ostrich",
  MRTO: "Eagle",
  Admin: "Eagle",
  RTO: "Eagle",
};

const ROLE_CLASS_MAP: Record<string, string> = {
  Sparrow: "Field Scout",
  Falcon: "Field Hunter",
  Hawk: "Cluster Coordinator",
  Ostrich: "Ground Sentinel",
  Eagle: "Aerial Commander",
};

const ROLE_SUMMARY_MAP: Record<string, string> = {
  Sparrow: "Sparrow class: developing site visibility and task discipline.",
  Falcon: "Falcon class: fast task execution and direct site visibility.",
  Hawk: "Hawk class: sharp cluster visibility and coordinated field control.",
  Ostrich: "Ostrich class: ground-level supervision with strong field accountability.",
  Eagle: "Eagle class: broad operational visibility with command-level governance.",
};

const PROGRESSION: Record<string, { badge: string; palette: string[] }[]> = {
  Sparrow: [
    { badge: "Cosmic Nest Relic", palette: ["#0B1020", "#2B3A67", "#D9E4F5", "#AAB7D1"] },
    { badge: "Obsidian Skull Feather", palette: ["#1A1A1A", "#5F5A58", "#37253A", "#D7D1CA"] },
    { badge: "Prophecy Pearl Eye", palette: ["#C8A44D", "#5D4A82", "#F4F1EA", "#7A5B3A"] },
    { badge: "Sacred Feather Crest", palette: ["#E6C878", "#F8F4E8", "#A8C8B8", "#D8C6A5"] },
    { badge: "Ember Cocoon Pendant", palette: ["#E96A2B", "#F7A8A4", "#F5C15A", "#5A4D4D"] },
    { badge: "Fossil Scale Token", palette: ["#3B7A6D", "#161616", "#8B5A3C", "#9EA7A6"] },
    { badge: "Dawn Wing Crest", palette: ["#FFC93C", "#FFF4D6", "#FF9B42", "#A56A2A"] },
    { badge: "Moon Feather Lantern", palette: ["#7DA6D9", "#DCE6F2", "#1C2745", "#B8D8E8"] },
    { badge: "Lightning Talon Sigil", palette: ["#3A6EA5", "#EAF3FF", "#7A5FFF", "#6C7684"] },
    { badge: "Molten Crystal Badge", palette: ["#D62828", "#F77F00", "#FCBF49", "#2B2B2B"] },
    { badge: "Ocean Conch Crest", palette: ["#38B6B0", "#E8FCF8", "#006D77", "#83C5BE"] },
    { badge: "Floating Shrine Seal", palette: ["#F5F7FA", "#E9C46A", "#8ECAE6", "#BFC8D6"] },
    { badge: "Royal Scroll Emblem", palette: ["#FFF8E7", "#D4A017", "#4A6FA5", "#F1E3C6"] },
    { badge: "Obsidian War Crown", palette: ["#8B0000", "#111111", "#D4AF37", "#E63946"] },
  ],
  Falcon: [
    { badge: "Wind Talon Crest", palette: ["#1A2340", "#4A6FA5", "#C9D6EA", "#8A9DB8"] },
    { badge: "Shadow Claw Seal", palette: ["#151515", "#463F3A", "#6A4C5A", "#D9D4CF"] },
    { badge: "Oracle Helm", palette: ["#D4AF37", "#5A3D7A", "#EEE7DA", "#8B6B3F"] },
    { badge: "Sacred Wing Blades", palette: ["#F2E8C9", "#B7D3C0", "#E3C27A", "#D4C4A8"] },
    { badge: "Burning Wing Relic", palette: ["#D95D39", "#F4A698", "#F6C85F", "#5B4747"] },
    { badge: "Scale Wingplate", palette: ["#2E6B5C", "#1A1A1A", "#9A6B44", "#A7B0AE"] },
    { badge: "Solar Halo Crest", palette: ["#FFD166", "#FFF3D1", "#FFAA4C", "#A66B2D"] },
    { badge: "Lunar Hunter Mask", palette: ["#89AEE6", "#E2EAF7", "#202C54", "#BFD7EA"] },
    { badge: "Thunder Talon", palette: ["#4A7EBB", "#F0F6FF", "#8268FF", "#737C89"] },
    { badge: "Volcanic Crown", palette: ["#B71C1C", "#F57C00", "#FBC02D", "#1E1E1E"] },
    { badge: "Tide Relic", palette: ["#2CB1A1", "#E5FAF6", "#005F73", "#7CC6BE"] },
    { badge: "Sky Pillar Crest", palette: ["#FAFBFD", "#E5C76B", "#9AD1F0", "#C8D0DC"] },
    { badge: "Royal Decree Seal", palette: ["#FFF5DD", "#C89B0E", "#5579B0", "#F4E2BF"] },
    { badge: "Warlord Throne Crest", palette: ["#7B0000", "#0E0E0E", "#CFAC32", "#D9343E"] },
  ],
  Hawk: [
    { badge: "Tactical Nest Marker", palette: ["#101827", "#36558F", "#D6E0F0", "#9FB3C8"] },
    { badge: "Shadow Hunter Seal", palette: ["#121212", "#58504D", "#442B38", "#D0CBC5"] },
    { badge: "Oracle Target Eye", palette: ["#C9A227", "#604A7B", "#F1ECE2", "#81603D"] },
    { badge: "Tactical Sacred Feather", palette: ["#EAD9A1", "#F7F5EB", "#A4C2B1", "#D7C2A2"] },
    { badge: "Ember Core Badge", palette: ["#E56B2F", "#F5B2A7", "#F2BE5C", "#604848"] },
    { badge: "Hybrid War Scale", palette: ["#3A7D6A", "#181818", "#8D5F3D", "#9CA9A7"] },
    { badge: "Dawnstrike Crest", palette: ["#FFCB45", "#FFF0C9", "#FF9E3D", "#9E662A"] },
    { badge: "Night Ops Seal", palette: ["#6F95D8", "#DBE6F5", "#18213E", "#B2D1E7"] },
    { badge: "Storm Assault Emblem", palette: ["#357ABD", "#EDF5FF", "#6F56F8", "#697482"] },
    { badge: "Molten Combat Core", palette: ["#C62828", "#EF6C00", "#FBC847", "#252525"] },
    { badge: "Tide Command Relic", palette: ["#31B6AE", "#E4FCF8", "#006B70", "#7FC9C0"] },
    { badge: "Skywarden Crest", palette: ["#F4F8FB", "#E3C25F", "#89C6E5", "#BCC8D4"] },
    { badge: "Messenger War Crest", palette: ["#FFF7E3", "#CFA21A", "#4D74A8", "#EEDAB5"] },
    { badge: "Apex Warhawk Crown", palette: ["#850000", "#101010", "#D2AE38", "#E03B45"] },
  ],
  Ostrich: [
    { badge: "Stone Nest Standard", palette: ["#162033", "#526D9E", "#DCE5F2", "#9EACC4"] },
    { badge: "Bone Fortress Seal", palette: ["#1C1C1C", "#5B5450", "#4A3941", "#D8D2CC"] },
    { badge: "Wisdom Pillar Crest", palette: ["#D6B14A", "#65448A", "#F3EDDF", "#916E42"] },
    { badge: "Sacred Earth Feather", palette: ["#F2E9D5", "#B9D2C0", "#E5C779", "#DCCDB0"] },
    { badge: "Ember Fortress Relic", palette: ["#DB6C3B", "#F6B5AA", "#F4C560", "#654D4D"] },
    { badge: "Dragon Bastion Crest", palette: ["#3B7C6B", "#171717", "#95633F", "#A4AFAC"] },
    { badge: "Solar Guardian Banner", palette: ["#FFD467", "#FFF5D7", "#FFB04D", "#AB6F2E"] },
    { badge: "Moonwarden Standard", palette: ["#8CB0E9", "#E5ECF8", "#243153", "#BED7EB"] },
    { badge: "Thunder Fortress Emblem", palette: ["#5184C4", "#F2F7FF", "#8570FF", "#798290"] },
    { badge: "Volcanic War Standard", palette: ["#B91F1F", "#F67F00", "#FBCB3A", "#202020"] },
    { badge: "Ocean Bastion Relic", palette: ["#2EB7AA", "#E8FBF8", "#006875", "#7ECBC3"] },
    { badge: "Celestial Fortress Crest", palette: ["#FCFCFD", "#E6C96D", "#98D0EE", "#CBD2DE"] },
    { badge: "Royal Command Seal", palette: ["#FFF6E2", "#D1A41A", "#587BB2", "#F5E3C0"] },
    { badge: "Supreme Warlord Insignia", palette: ["#850505", "#0D0D0D", "#D6B03B", "#E33D47"] },
  ],
  Eagle: [
    { badge: "Cosmic Command Sigil", palette: ["#101A30", "#5478B8", "#D7E2F2", "#94A8C6"] },
    { badge: "Deathwatch Crown", palette: ["#181818", "#514947", "#4F3747", "#D8D1CB"] },
    { badge: "Prophecy Throne Eye", palette: ["#D4B04C", "#61418A", "#F1EBDC", "#8F6A40"] },
    { badge: "Creation Halo Crest", palette: ["#F4ECD8", "#B8D0BE", "#E7C97C", "#DCCDB3"] },
    { badge: "Rebirth Imperial Seal", palette: ["#DA6A3A", "#F5B0A4", "#F4C661", "#624B4B"] },
    { badge: "Dragon Imperial Crest", palette: ["#357564", "#161616", "#96613E", "#A2ADAA"] },
    { badge: "Solar Emperor Crest", palette: ["#FFD56B", "#FFF5D8", "#FFB14F", "#A86E2E"] },
    { badge: "Lunar Sovereign Crown", palette: ["#90B2EA", "#E5ECF9", "#243055", "#C0D9EC"] },
    { badge: "Storm Emperor Seal", palette: ["#5184C4", "#F2F7FF", "#8570FF", "#798290"] },
    { badge: "Infernal Command Core", palette: ["#B91F1F", "#F67F00", "#FBCB3A", "#202020"] },
    { badge: "Ocean Throne Crest", palette: ["#2EB7AA", "#E8FBF8", "#006875", "#7ECBC3"] },
    { badge: "Celestial Sovereign Crest", palette: ["#FCFCFD", "#E6C96D", "#98D0EE", "#CBD2DE"] },
    { badge: "Divine Royal Seal", palette: ["#FFF6E2", "#D1A41A", "#587BB2", "#F5E3C0"] },
    { badge: "Apex Imperial Crown", palette: ["#850505", "#0D0D0D", "#D6B03B", "#E33D47"] },
  ],
};

const PRESTIGE_CLASSES = [
  { name: "Phoenix Class", baseRole: "Any", unlock: "95%+ recovery performance sustained", identity: "Master of restoration" },
  { name: "Dragonhawk", baseRole: "EFS / Team Lead", unlock: "Zero audit violations for 6 months", identity: "Tactical perfectionist" },
  { name: "Storm Eagle", baseRole: "MRTO/Admin/RTO", unlock: "Best regional PA performance", identity: "Supreme operational commander" },
  { name: "Sunforge Hawk", baseRole: "EFS", unlock: "Highest diesel optimization score", identity: "Fuel efficiency elite" },
  { name: "Titan Ostrich", baseRole: "Supervisor", unlock: "Highest cluster stability", identity: "Fortress guardian" },
  { name: "Oracle Falcon", baseRole: "Team Lead / EFS", unlock: "Best predictive diesel management", identity: "Strategic forecaster" },
];

function getRoleLevel(score: number) {
  const frontendLevel = Math.min(10, Math.max(1, Math.ceil((score / 100) * 10)));
  const mythicLevel = Math.min(14, Math.max(1, Math.ceil((score / 100) * 14)));
  const backendLevel = frontendLevel >= 10 ? 11 : frontendLevel;
  return { frontendLevel, mythicLevel, backendLevel };
}

function getUserRatingCharacter(role: UserRole, frontendLevel: number) {
  if (role === "Team Lead" && frontendLevel >= 10) return "Ostrich";
  return ROLE_CHARACTER_MAP[role] || "Sparrow";
}

function getProgressionProfile(role: UserRole, score: number) {
  const { frontendLevel, mythicLevel, backendLevel } = getRoleLevel(score);
  const character = getUserRatingCharacter(role, frontendLevel);
  const myth = MYTHIC_RANKS[mythicLevel - 1];
  const progression = PROGRESSION[character]?.[mythicLevel - 1] || PROGRESSION.Sparrow[mythicLevel - 1];
  const fullTitle = `${myth.mythicRank.replace(/s$/, "")} ${character}`;
  return {
    frontendLevel,
    backendLevel,
    mythicLevel,
    mythicRank: myth.mythicRank,
    relicTitle: myth.relicTitle,
    character,
    characterClass: ROLE_CLASS_MAP[character] || "Field Operator",
    characterSummary: `${fullTitle}: ${ROLE_SUMMARY_MAP[character] || "Role visibility rating active."}`,
    fullTitle,
    badgeTheme: progression.badge,
    colorPalette: progression.palette,
  };
}

function getSiteConsumptionRating(cpd: number): SiteConsumptionRating {
  if (cpd < 40) return { character: "Toy Poodle", className: "Tiny Pedigree Load", summary: "Very light diesel appetite; verify if low runtime or grid support is responsible.", tone: "green" };
  if (cpd <= 53) return { character: "Sheep", className: "Light Grazer", summary: "Light consumption profile; generally efficient and stable.", tone: "green" };
  if (cpd <= 80) return { character: "Beagle", className: "Moderate Pedigree Load", summary: "Moderate diesel appetite; monitor trend for upward drift.", tone: "blue" };
  if (cpd <= 150) return { character: "Buffalo", className: "Heavy Herd Load", summary: "Heavy but common consumption band; requires supply discipline.", tone: "orange" };
  if (cpd <= 200) return { character: "Hippo", className: "High Consumption Beast", summary: "High diesel appetite; validate runtime, load, and hybrid support.", tone: "red" };
  return { character: "Elephant", className: "Extreme Diesel Titan", summary: "Extreme consumption profile; requires urgent technical and supply review.", tone: "purple" };
}

function buildUserCapexRatings(users: AppUser[], tasks: SiteAction[], insights: SiteDieselInsight[] = []): UserCapexRating[] {
  return users
    .filter((user) => !["Admin", "RTO"].includes(user.role))
    .map((user) => {
      const userTasks = tasks.filter((task) => task.assigned_to === user.email || task.created_by === user.email);
      const assignedTasks = userTasks.length;
      const closedTasks = userTasks.filter((task) => task.execution_status === "Closed" || task.status?.toLowerCase().includes("approved")).length;
      const missedTasks = userTasks.filter((task) => task.execution_status === "Pending" && task.created_at && daysBetween(new Date(task.created_at), new Date()) > 2).length;
      const disputes = userTasks.reduce((sum, task) => sum + Number(task.dispute_count || 0), 0);
      const evidenceClosures = userTasks.filter((task) => task.closure_comment && task.closure_comment.length > 5).length;

      const relatedInsights = userTasks.map((task) => insights.find((row) => row.site_id === task.site_id)).filter(Boolean) as SiteDieselInsight[];
      const savingsWins = relatedInsights.filter((row) => Number(row.estimated_current_diesel || 0) < Number(row.current_diesel_level || 0)).length;
      const dieselSavingsScore = relatedInsights.length ? (savingsWins / relatedInsights.length) * 25 : 0;

      const approvalAccuracyScore = assignedTasks ? (closedTasks / assignedTasks) * 25 : 0;
      const evidenceScore = assignedTasks ? (evidenceClosures / assignedTasks) * 20 : 0;
      const disputeAccuracyScore = Math.max(0, 15 - disputes * 2);
      const disciplineScore = Math.max(0, 15 - missedTasks * 3);
      const score = Number(Math.max(0, Math.min(100, dieselSavingsScore + approvalAccuracyScore + evidenceScore + disputeAccuracyScore + disciplineScore)).toFixed(2));
      const profile = getProgressionProfile(user.role, score);
      const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "E";
      const interpretation = `Level ${profile.frontendLevel} ${profile.fullTitle}: ${profile.characterSummary}`;

      return {
        email: user.email,
        name: user.name || user.email,
        role: user.role,
        assignedTasks,
        closedTasks,
        missedTasks,
        disputes,
        evidenceClosures,
        dieselSavingsScore: Number(dieselSavingsScore.toFixed(2)),
        approvalAccuracyScore: Number(approvalAccuracyScore.toFixed(2)),
        disputeAccuracyScore: Number(disputeAccuracyScore.toFixed(2)),
        score,
        level: profile.mythicLevel,
        backendLevel: profile.backendLevel,
        frontendLevel: profile.frontendLevel,
        mythicRank: profile.mythicRank,
        relicTitle: profile.relicTitle,
        character: profile.character,
        characterClass: profile.characterClass,
        characterSummary: profile.characterSummary,
        fullTitle: profile.fullTitle,
        badgeTheme: profile.badgeTheme,
        colorPalette: profile.colorPalette,
        prestigeClass: score >= 95 ? "Phoenix Class" : undefined,
        prestigeIdentity: score >= 95 ? "Master of restoration" : undefined,
        grade,
        interpretation,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function getAverageCpdForSite(siteId: string, spots: SpotCheck[], diesel: DieselTx[]) {
  const siteSpots = spots
    .filter((spot) => spot.site_id === siteId)
    .sort((a, b) => new Date(b.check_date || b.created_at || 0).getTime() - new Date(a.check_date || a.created_at || 0).getTime());

  const spotCpdValues = siteSpots
    .slice(0, 5)
    .map((spot) => Number(spot.revised_consumption_per_day || spot.consumption_per_day || 0))
    .filter((value) => value > 0);

  if (spotCpdValues.length) {
    return Number((spotCpdValues.reduce((sum, value) => sum + value, 0) / spotCpdValues.length).toFixed(2));
  }

  const siteDiesel = diesel
    .filter((tx) => tx.site_id === siteId && tx.qty_supplied)
    .sort((a, b) => new Date(a.transaction_date || a.created_at || 0).getTime() - new Date(b.transaction_date || b.created_at || 0).getTime());

  if (siteDiesel.length >= 2) {
    const first = siteDiesel[0];
    const last = siteDiesel[siteDiesel.length - 1];
    const days = Math.max(daysBetween(new Date(first.transaction_date || first.created_at || 0), new Date(last.transaction_date || last.created_at || 0)), 1);
    const supplied = siteDiesel.reduce((sum, tx) => sum + Number(tx.qty_supplied || 0), 0);
    return Number((supplied / days).toFixed(2));
  }

  return 0;
}

function getSiteLifeStatus(site: Site, insight: SiteDieselInsight | undefined, spots: SpotCheck[], diesel: DieselTx[]): SiteLifeStatus {
  const siteSupplies = diesel.filter((tx) => tx.site_id === site.site_id && tx.transaction_type !== "Movement" && Number(tx.qty_supplied || 0) > 0);
  if (!siteSupplies.length) return "ASSIGNED";

  const firstSupplyDate = new Date(siteSupplies.sort((a, b) => new Date(a.transaction_date || a.created_at || 0).getTime() - new Date(b.transaction_date || b.created_at || 0).getTime())[0].transaction_date || siteSupplies[0].created_at || 0);
  const confirmingSpotChecks = spots.filter((spot) => spot.site_id === site.site_id && new Date(spot.check_date || spot.created_at || 0) >= firstSupplyDate);

  if (Number(insight?.runout_days) <= 0) return "RUNOUT";
  if (Number(insight?.runout_days) <= 2) return "CRITICAL";
  if (confirmingSpotChecks.length < 2) return "IN_CONFIRMATION";
  return "LIVE";
}

function buildOperationalNotifications(sites: Site[], insights: SiteDieselInsight[], spots: SpotCheck[], diesel: DieselTx[]) {
  return sites
    .map((site) => {
      const insight = insights.find((row) => row.site_id === site.site_id);
      const status = getSiteLifeStatus(site, insight, spots, diesel);
      const averageCpd = getAverageCpdForSite(site.site_id, spots, diesel) || Number(insight?.cpd_last_10_days || insight?.recommended_cpd || 0);
      const runoutDays = insight?.runout_days ?? "-";
      const cluster = site.msp_cluster || site.efs_cluster || site.mrto_cluster || "Unassigned";

      if (status === "LIVE") return null;

      const base = {
        id: `${site.site_id}-${status}`,
        site_id: site.site_id,
        cluster,
        status,
        runoutDays,
        averageCpd: Number(Number(averageCpd || 0).toFixed(2)),
      };

      if (status === "ASSIGNED") {
        return {
          ...base,
          severity: "info" as const,
          title: "Assigned site not yet live",
          message: `${site.site_id} is assigned but has no recorded cycle supply.` ,
          smartRecommendation: `Assign supply for ${site.site_id} this cycle and capture first dip before field validation.` ,
          movementEligible: false,
          supplyEligible: true,
        };
      }

      if (status === "IN_CONFIRMATION") {
        return {
          ...base,
          severity: "warning" as const,
          title: "Supply recorded but site not confirmed live",
          message: `${site.site_id} needs at least 2 post-supply spot checks to confirm diesel level and CPD.` ,
          smartRecommendation: `Schedule 2 verification spot checks within 48 hours to stabilize average CPD for ${site.site_id}.` ,
          movementEligible: false,
          supplyEligible: false,
        };
      }

      if (status === "CRITICAL") {
        return {
          ...base,
          severity: "critical" as const,
          title: "Critical runout risk",
          message: `${site.site_id} is projected to run out within ${runoutDays} day(s). Average CPD is ${Number(averageCpd || 0).toFixed(2)} L/day.` ,
          smartRecommendation: `Request movement or assign emergency supply before the next operational window to prevent outage.` ,
          movementEligible: true,
          supplyEligible: true,
        };
      }

      return {
        ...base,
        severity: "critical" as const,
        title: "Site inactive after diesel runout",
        message: `${site.site_id} is inactive because estimated diesel has reached runout.` ,
        smartRecommendation: `Assign cycle supply and require 2 follow-up spot checks to restore live status.` ,
        movementEligible: true,
        supplyEligible: true,
      };
    })
    .filter(Boolean) as OperationalNotification[];
}

function buildRiskRows(insights: SiteDieselInsight[]) {
  return insights
    .filter((row) => Number(row.runout_days) <= 3 || Number(row.cpd_last_10_days) > Number(row.recommended_cpd) * 1.25)
    .sort((a, b) => Number(a.runout_days || 999) - Number(b.runout_days || 999));
}

function getActivePlan(siteId: string, plans: DeliveryPlan[]) {
  return plans.find(
    (plan) =>
      plan.site_id === siteId &&
      ["Planned", "Dispatched", "In Progress"].includes(plan.planning_status || "")
  );
}

function calculateRecommendedTruckQty(site: Site, insight?: SiteDieselInsight) {
  const tankCapacity = Number(site.tank_capacity_litres || 0);
  const cutoff = Number(site.cutoff_level_litres || 100);
  const allocation = Number(site.monthly_allocation_litres || 0);
  const currentLevel = Number(insight?.estimated_current_diesel || insight?.current_diesel_level || 0);

  if (!tankCapacity || !allocation) return 0;

  const availableHeadroom = Math.max(tankCapacity - currentLevel - cutoff, 0);
  return Number(Math.max(0, Math.min(allocation, availableHeadroom)).toFixed(2));
}

function getPlanningPriority(row: SiteDieselInsight) {
  const runout = Number(row.runout_days);
  if (!Number.isFinite(runout)) return "Watch";
  if (runout <= 1.5) return "Emergency";
  if (runout <= 3) return "Plan within 72hrs";
  return "Normal";
}

function buildDieselPlanningRows(sites: Site[], insights: SiteDieselInsight[], plans: DeliveryPlan[]) {
  return insights
    .filter((row) => Number(row.runout_days) <= 3)
    .map((row) => {
      const site = sites.find((item) => item.site_id === row.site_id);
      const activePlan = getActivePlan(row.site_id, plans);
      const recommendedQty = site ? calculateRecommendedTruckQty(site, row) : 0;
      const truckCapacity = activePlan?.truck_capacity_litres || 14000;
      const truckFill = truckCapacity ? Number(((recommendedQty / truckCapacity) * 100).toFixed(1)) : 0;

      return {
        row,
        site,
        activePlan,
        routeGroup: site?.msp_cluster || row.cluster || "Unassigned Route",
        recommendedQty,
        truckFill,
        priority: getPlanningPriority(row),
      };
    })
    .filter((item) => item.site?.is_truckable === true)
    .sort((a, b) => Number(a.row.runout_days || 999) - Number(b.row.runout_days || 999));
}

function groupPlanningRowsByRoute(rows: ReturnType<typeof buildDieselPlanningRows>) {
  return rows.reduce((acc: Record<string, typeof rows>, item) => {
    const key = item.routeGroup || "Unassigned Route";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}
function PageFallback({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  return (
    <div className="min-h-screen bg-[#06111f] p-6 text-white">
      <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
        <p className="font-bold text-red-300">Page failed to render</p>
        <p className="mt-2 text-sm text-slate-300">Current page: {page}</p>
        <button
          className="mt-4 rounded-xl bg-blue-500 px-4 py-2 font-bold"
          onClick={() => setPage("home")}
        >
          Return Home
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [summaryKind, setSummaryKind] = useState<SummaryKind>("sites");
  const [selectedDetailSiteId, setSelectedDetailSiteId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedClusterName, setSelectedClusterName] = useState("");
  const [previousPage, setPreviousPage] = useState<Page>("home");
  const [completionState, setCompletionState] = useState<{ title: string; message: string; primaryPage: Page; secondaryPage?: Page } | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState("shef@neoera.com");
  const [adminPassword, setAdminPassword] = useState("");

  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [tasks, setTasks] = useState<SiteAction[]>([]);
  const [spotChecks, setSpotChecks] = useState<SpotCheck[]>([]);
  const [dieselTransactions, setDieselTransactions] = useState<DieselTx[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [activeTask, setActiveTask] = useState<SiteAction | null>(null);
  const [uiState, setUiState] = useState<UiState>({ loading: false, message: "", success: false });
  const [deliveryPlans, setDeliveryPlans] = useState<DeliveryPlan[]>([]);
  const [cycleStart, setCycleStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [cycleEnd, setCycleEnd] = useState(new Date().toISOString().slice(0, 10));

  const [createTaskType, setCreateTaskType] = useState<TaskType>("Spot Check Request");
  const [createTaskSite, setCreateTaskSite] = useState("");
  const [createTaskAssignee, setCreateTaskAssignee] = useState("");

  const [selectedSite, setSelectedSite] = useState("");
  const [supplyDate, setSupplyDate] = useState(new Date().toISOString().slice(0, 10));
  const [initialDip, setInitialDip] = useState("");
  const [qtySupplied, setQtySupplied] = useState("");
  const [spotCheckDate, setSpotCheckDate] = useState(new Date().toISOString().slice(0, 16));
  const [dieselLevel, setDieselLevel] = useState("");
  const [dgCapacity, setDgCapacity] = useState("");
  const [closureNote, setClosureNote] = useState("");
  const [unsafeCondition, setUnsafeCondition] = useState("No");
  const [recommendedAction, setRecommendedAction] = useState("");

  const visibleSites = useMemo(() => getVisibleSites(currentUser, sites), [currentUser, sites]);
  const visibleSiteIds = useMemo(() => new Set(visibleSites.map((site) => site.site_id)), [visibleSites]);
  const visibleTasks = useMemo(() => tasks.filter((task) => visibleSiteIds.has(task.site_id)), [tasks, visibleSiteIds]);
  const visibleSpotChecks = useMemo(() => spotChecks.filter((spot) => visibleSiteIds.has(spot.site_id)), [spotChecks, visibleSiteIds]);
  const visibleDieselTransactions = useMemo(() => dieselTransactions.filter((tx) => visibleSiteIds.has(tx.site_id)), [dieselTransactions, visibleSiteIds]);
  const siteDieselInsights = useMemo(() => buildSiteDieselInsights(visibleSites, visibleSpotChecks, visibleDieselTransactions, cycleStart, cycleEnd), [visibleSites, visibleSpotChecks, visibleDieselTransactions, cycleStart, cycleEnd]);
  const riskRows = useMemo(() => buildRiskRows(siteDieselInsights), [siteDieselInsights]);
  const capexRatings = useMemo(() => buildUserCapexRatings(users, visibleTasks, siteDieselInsights), [users, visibleTasks, siteDieselInsights]);
  const myNeoEraRating = useMemo(() => capexRatings.find((row) => row.email === currentUser?.email), [capexRatings, currentUser]);

  const pendingApprovals = visibleTasks.filter((task) => task.current_approval_level === currentUser?.role && task.execution_status !== "Closed");
  const openTasks = visibleTasks.filter((task) => task.execution_status !== "Closed");
  const completedTasks = visibleTasks.filter((task) => task.execution_status === "Closed" || task.status?.toLowerCase().includes("approved"));
  const disputes = visibleTasks.filter((task) => task.execution_status === "Disputed" || Number(task.dispute_count || 0) > 0);
  const nearRunout = siteDieselInsights.filter((row) => Number(row.runout_days) <= 3);
  const operationalNotifications = useMemo(
    () => buildOperationalNotifications(visibleSites, siteDieselInsights, visibleSpotChecks, visibleDieselTransactions),
    [visibleSites, siteDieselInsights, visibleSpotChecks, visibleDieselTransactions]
  );
  const dieselInHand = siteDieselInsights.reduce((sum, row) => sum + Number(row.estimated_current_diesel || row.current_diesel_level || 0), 0);
  const totalConsumption = siteDieselInsights.reduce((sum, row) => sum + Number(row.cpd_last_10_days || 0), 0);
  const totalSupply = siteDieselInsights.reduce((sum, row) => sum + Number(row.qty_supplied_cycle || 0), 0);

  const groupedTasks = useMemo(() => ({
    spotChecks: visibleTasks.filter((task) => task.action_type === "Spot Check Request"),
    supplies: visibleTasks.filter((task) => task.action_type === "Supply Request"),
    approvals: pendingApprovals,
    disputes,
  }), [visibleTasks, pendingApprovals, disputes]);

  async function runAction(action: () => Promise<void>, successMsg: string) {
    setUiState({ loading: true, message: "", success: false });
    try {
      await action();
      setUiState({ loading: false, message: successMsg, success: true });
    } catch (err: any) {
      setUiState({ loading: false, message: err.message || "Action failed", success: false });
    }
  }

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      runAction(async () => {
        await loadCoreData();
        await loadAssignedTasks();
        await loadOperationalData();
        await loadDeliveryPlans();
        await loadRecentActivities();
      }, "Data synced");
    }
  }, [currentUser]);

  async function restoreSession() {
    try {
      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;
      const authPhone = normalizePhone(authUser?.phone || (authUser?.user_metadata as any)?.phone);
      const authEmail = authUser?.email?.toLowerCase();

      if (authEmail) {
        const { data: profile, error } = await supabase.from("users").select("*").eq("email", authEmail).maybeSingle();
        if (error) throw error;
        if (profile && ["Admin", "RTO"].includes(profile.role)) {
          setCurrentUser(mapUser(profile));
          return;
        }
      }

      if (!authPhone) return;
      const matchedSites = await findSitesForPhone(authPhone);
      if (!matchedSites.length) {
        await supabase.auth.signOut();
        setCurrentUser(null);
        return;
      }
      const firstSite = matchedSites[0] as Site;
      setCurrentUser({
        phone: authPhone,
        name: nameFromPhone(firstSite, authPhone),
        role: roleFromPhone(firstSite, authPhone),
        is_active: true,
      });
    } catch {
      await supabase.auth.signOut();
      setCurrentUser(null);
    }
  }

  async function findSitesForPhone(phone: string) {
    const { data, error } = await supabase
      .from("site_registry")
      .select("*")
      .or(
        "team_lead_phone_normalized.eq." + phone + ",efs_phone_normalized.eq." + phone + ",supervisor_phone_normalized.eq." + phone + ",mrto_phone_normalized.eq." + phone
      )
      .limit(10);
    if (error) throw error;
    return data || [];
  }

  async function handleSendOtp() {
    await runAction(async () => {
      const phone = normalizePhone(phoneInput);
      if (!phone || phone.length < 14) throw new Error("Enter phone as 8133394660 or 08133394660.");
      const matchedSites = await findSitesForPhone(phone);
      if (!matchedSites.length) throw new Error("This number is not assigned to a NeoEra user. Contact Admin.");
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setOtpSent(true);
      setLoginMessage("OTP sent. Check WhatsApp/SMS and enter the code.");
    }, "OTP sent");
  }

  async function handleVerifyOtp() {
    await runAction(async () => {
      const phone = normalizePhone(phoneInput);
      const { error } = await supabase.auth.verifyOtp({ phone, token: otpInput.trim(), type: "sms" });
      if (error) throw error;
      const matchedSites = await findSitesForPhone(phone);
      if (!matchedSites.length) throw new Error("This number is not assigned to a NeoEra user. Contact Admin.");
      const firstSite = matchedSites[0] as Site;
      setCurrentUser({
        phone,
        name: nameFromPhone(firstSite, phone),
        role: roleFromPhone(firstSite, phone),
        is_active: true,
      });
      setLoginMessage("");
    }, "Login successful");
  }

  async function handleAdminLogin() {
    await runAction(async () => {
      const email = adminEmail.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({ email, password: adminPassword });
      if (error) throw error;
      const { data: profile, error: profileError } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
      if (profileError) throw profileError;
      if (!profile || !["Admin", "RTO"].includes(profile.role)) throw new Error("Admin access only.");
      setCurrentUser(mapUser(profile));
      setLoginMessage("");
    }, "Admin login successful");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setPage("home");
  }

  async function loadCoreData() {
    const [siteData, userData] = await Promise.all([
      fetchAllRows("site_registry", "site_id"),
      fetchAllRows("users", "name"),
    ]);
    setSites((siteData || []) as Site[]);
    setUsers((userData || []).map(mapUser));
  }

  async function loadAssignedTasks() {
    const { data, error } = await supabase.from("site_actions").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    setTasks((data || []) as SiteAction[]);
  }

  async function fetchAllRows(tableName: string, orderColumn = "created_at") {
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];

    while (true) {
      const query = supabase.from(tableName).select("*").range(from, from + pageSize - 1);
      const { data, error } = orderColumn ? await query.order(orderColumn, { ascending: false }) : await query;
      if (error) throw error;
      const rows = data || [];
      allRows = [...allRows, ...rows];
      if (rows.length < pageSize) break;
      from += pageSize;
    }

    return allRows;
  }

  async function loadOperationalData() {
    const [siteRows, spotRows, dieselRows, actionRows] = await Promise.all([
      fetchAllRows("site_registry", "site_id"),
      fetchAllRows("spot_checks", "check_date"),
      fetchAllRows("diesel_transactions", "transaction_date"),
      fetchAllRows("site_actions", "created_at"),
    ]);

    setSites(siteRows as Site[]);
    setSpotChecks(spotRows as SpotCheck[]);
    setDieselTransactions(dieselRows as DieselTx[]);
    setTasks(actionRows as SiteAction[]);
  }

  async function loadDeliveryPlans() {
    const { data, error } = await supabase
      .from("diesel_delivery_plans")
      .select("*")
      .order("dispatch_date", { ascending: true });

    if (error) throw error;
    setDeliveryPlans((data || []) as DeliveryPlan[]);
  }

  async function loadRecentActivities() {
    const { data, error } = await supabase.from("recent_activities").select("*").order("created_at", { ascending: false }).limit(100);
    if (!error) setActivities((data || []) as RecentActivity[]);
  }

  async function logActivity(actionType: string, description: string, entityType?: string, entityId?: string) {
    if (!currentUser) return;
    await supabase.from("recent_activities").insert({
      actor_email: currentUser.email || null,
      actor_phone: currentUser.phone || null,
      actor_name: currentUser.name || currentUser.phone || currentUser.email,
      action_type: actionType,
      description,
      entity_type: entityType || null,
      entity_id: entityId || null,
    });
    await loadRecentActivities();
  }

  async function createDeliveryPlan(site: Site, insight?: SiteDieselInsight) {
    if (!currentUser) throw new Error("No active user.");

    const recommendedQty = calculateRecommendedTruckQty(site, insight);
    if (recommendedQty <= 0) {
      throw new Error("No safe truck supply quantity available for this site. Check tank capacity, cutoff level, allocation, and current diesel.");
    }

    const routeGroup = site.msp_cluster || site.efs_cluster || site.mrto_cluster || "Unassigned Route";
    const dispatchDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

    const { error } = await supabase.from("diesel_delivery_plans").insert({
      site_id: site.site_id,
      route_name: `${routeGroup} Diesel Route`,
      route_group: routeGroup,
      planned_qty_litres: recommendedQty,
      dispatch_date: dispatchDate,
      planned_by_phone: currentUser.phone || null,
      planned_by_email: currentUser.email || null,
      planning_status: "Planned",
      truck_capacity_litres: 14000,
      recommendation: `Plan ${recommendedQty}L truck supply for ${site.site_id}. Dispatch proposed 3 days ahead for diesel team planning.`,
    });

    if (error) throw error;

    await logActivity(
      "Diesel Delivery Plan",
      `${currentUser.name || "User"} planned ${recommendedQty}L truck supply for ${site.site_id} under ${routeGroup}.`,
      "diesel_delivery_plans",
      site.site_id
    );

    await loadDeliveryPlans();
  }

  function smartAssignableUsers(siteId: string) {
    const site = sites.find((item) => item.site_id === siteId);
    if (!site) return [];
    return users.filter((user) => userCanSeeSite(user, site) || ["Admin", "RTO"].includes(user.role));
  }

  async function createAssignedTask() {
    if (!currentUser) throw new Error("No active user.");
    const site = visibleSites.find((item) => item.site_id === createTaskSite);
    const assignee = users.find((user) => user.email === createTaskAssignee);
    if (!site) throw new Error("Select a valid site in your bucket.");
    if (!assignee) throw new Error("Select assignee.");

    const { error } = await supabase.from("site_actions").insert({
      site_id: site.site_id,
      action_type: createTaskType,
      request_type: createTaskType,
      dg_capacity: site.dg_capacity || null,
      cluster_name: site.msp_cluster || null,
      created_by: currentUser.email,
      assigned_to: assignee.email,
      assigned_to_role: assignee.role,
      current_approval_level: assignee.role,
      status: `${createTaskType} pending action`,
      execution_status: "Pending",
      recommendation: "Task created and assigned for action.",
    });
    if (error) throw error;
    await logActivity("Create Task", `${createTaskType} assigned to ${assignee.email} for ${site.site_id}.`, "site_actions", site.site_id);
    setCreateTaskSite("");
    setCreateTaskAssignee("");
    await loadAssignedTasks();
    setPreviousPage("operations");
    setPage("operations");
  }

  function startTask(task: SiteAction) {
    setPreviousPage(page);
    setActiveTask(task);
    setSelectedSite(task.site_id);
    setPage("action_task");
  }

  function calculateConsumption() {
    const kva = Number(dgCapacity || 0);
    return Number(Math.max(kva * 0.16 * 24 * 0.55, 1).toFixed(2));
  }

  async function submitSpotCheckTask() {
    if (!activeTask || !currentUser) return;
    if (!selectedSite) throw new Error("Select site.");
    if (!dgCapacity) throw new Error("DG capacity is required.");
    if (!dieselLevel) throw new Error("Diesel level is required.");
    if (!closureNote) throw new Error("Closure note is required.");
    if (unsafeCondition === "Yes" && !recommendedAction) throw new Error("Recommended action is required for unsafe condition.");

    const cpd = calculateConsumption();
    const runoutDays = Number(dieselLevel) > 0 && cpd > 0 ? Math.ceil(Number(dieselLevel) / cpd) : null;
    const runOutDate = runoutDays ? new Date(Date.now() + runoutDays * 86400000).toISOString().slice(0, 10) : null;

    const { data, error } = await supabase.from("spot_checks").insert({
      site_id: selectedSite,
      check_date: new Date(spotCheckDate).toISOString(),
      diesel_level: Number(dieselLevel),
      consumption_per_day: cpd,
      revised_consumption_per_day: cpd,
      run_out_date: runOutDate,
      created_by_email: currentUser.email,
    }).select("*").single();
    if (error) throw error;

    const { error: updateError } = await supabase.from("site_actions").update({
      status: "Spot check submitted for Supervisor review",
      execution_status: "Submitted",
      current_approval_level: "Supervisor",
      dg_capacity: Number(dgCapacity),
      engine_flag: unsafeCondition === "Yes" ? "Unsafe Condition Observed" : "Normal",
      recommendation: unsafeCondition === "Yes" ? recommendedAction : "Spot check submitted with evidence-led closure.",
      closure_comment: closureNote,
      updated_at: new Date().toISOString(),
    }).eq("id", activeTask.id);
    if (updateError) throw updateError;

    await logActivity("Submit Spot Check", `Spot check submitted for ${selectedSite}.`, "spot_checks", data?.id);
    await loadAssignedTasks();
    await loadOperationalData();
    setActiveTask(null);
    completeWorkflow("Spot Check Submitted", `${selectedSite} was submitted for Supervisor review.`, "operations", "site_detail");
  }

  async function submitSupplyTask() {
    if (!activeTask || !currentUser) return;
    if (!selectedSite) throw new Error("Select site.");
    if (!initialDip) throw new Error("Initial dip is required.");
    if (!qtySupplied) throw new Error("Quantity supplied is required.");
    if (!closureNote) throw new Error("Closure note is required.");

    const { data, error } = await supabase.from("diesel_transactions").insert({
      site_id: selectedSite,
      qty_supplied: Number(qtySupplied),
      initial_dip: Number(initialDip),
      transaction_date: supplyDate,
      created_by_email: currentUser.email,
      status: "Pending",
      approval_status: "Pending",
    }).select("*").single();
    if (error) throw error;

    const { error: updateError } = await supabase.from("site_actions").update({
      status: "Supply submitted for Supervisor review",
      execution_status: "Submitted",
      current_approval_level: "Supervisor",
      engine_flag: unsafeCondition === "Yes" ? "Unsafe Condition Observed" : "Supply Submitted",
      recommendation: unsafeCondition === "Yes" ? recommendedAction : "Supply submitted with evidence-led closure.",
      closure_comment: closureNote,
      updated_at: new Date().toISOString(),
    }).eq("id", activeTask.id);
    if (updateError) throw updateError;

    await logActivity("Submit Supply", `Supply submitted for ${selectedSite}.`, "diesel_transactions", data?.id);
    await loadAssignedTasks();
    await loadOperationalData();
    setActiveTask(null);
    completeWorkflow("Supply Submitted", `${selectedSite} was submitted for Supervisor review.`, "operations", "site_detail");
  }

  async function approveTask(task: SiteAction, correctiveComment = "") {
    if (!currentUser) return;
    if ((task.execution_status === "Disputed" || Number(task.dispute_count || 0) > 0) && !correctiveComment) throw new Error("Corrective action or inaction comment is required.");

    let nextLevel = "Closed";
    let nextStatus = "Final approved and closed";
    let executionStatus = "Closed";
    if (currentUser.role === "Supervisor") {
      nextLevel = "EFS";
      nextStatus = "Supervisor approved - pending EFS review";
      executionStatus = "Supervisor Approved";
    }
    if (currentUser.role === "EFS") {
      nextLevel = "MRTO";
      nextStatus = "EFS approved - pending MRTO review";
      executionStatus = "EFS Approved";
    }

    const { error } = await supabase.from("site_actions").update({
      current_approval_level: nextLevel,
      status: nextStatus,
      execution_status: executionStatus,
      corrective_comment: correctiveComment || task.corrective_comment || null,
      updated_at: new Date().toISOString(),
    }).eq("id", task.id);
    if (error) throw error;
    await logActivity("Approve Task", `${task.action_type} approved for ${task.site_id}.`, "site_actions", task.id);
    await loadAssignedTasks();
    completeWorkflow(
      executionStatus === "Closed" ? "Task Closed" : "Approval Completed",
      executionStatus === "Closed" ? `${task.site_id} is fully approved and closed.` : `${task.site_id} moved to ${nextLevel} review.`,
      pendingApprovals.length > 1 ? "approvals" : "operations",
      "site_detail"
    );
  }

  async function disputeTask(task: SiteAction, disputeComment = "") {
    if (!currentUser) return;
    if (!disputeComment) throw new Error("Dispute comment is required.");

    const site = sites.find((item) => item.site_id === task.site_id);
    const supervisor = users.find((user) => user.role === "Supervisor" && user.supervised_msp_clusters?.includes(site?.msp_cluster || ""));
    const nextDisputeCount = Number(task.dispute_count || 0) + 1;
    let nextLevel = "Supervisor";
    let nextAssignee = supervisor?.email || task.assigned_to || null;
    let nextRole: UserRole | null = supervisor?.role || "Supervisor";
    let nextStatus = `${currentUser.role} disputed - reassigned to Supervisor`;
    let nextRecommendation = "Task disputed. Supervisor review and corrective action required.";

    if (currentUser.role === "EFS" && nextDisputeCount >= 2) {
      const mrto = users.find((user) => user.role === "MRTO" && (user.assigned_mrto_clusters?.includes(site?.mrto_cluster || "") || user.email === site?.mrto_email));
      nextLevel = "MRTO";
      nextAssignee = mrto?.email || null;
      nextRole = "MRTO";
      nextStatus = "Disputed twice by EFS - escalated to MRTO for decision";
      nextRecommendation = "Timeline requires MRTO decision due to repeated EFS dispute. Review evidence, diesel intelligence, dispute history, and corrective actions before final approval.";
    }

    const { error } = await supabase.from("site_actions").update({
      current_approval_level: nextLevel,
      assigned_to: nextAssignee,
      assigned_to_role: nextRole,
      status: nextStatus,
      execution_status: "Disputed",
      dispute_count: nextDisputeCount,
      dispute_comment: disputeComment,
      recommendation: nextRecommendation,
      updated_at: new Date().toISOString(),
    }).eq("id", task.id);
    if (error) throw error;
    await logActivity("Dispute Task", `${task.action_type} disputed for ${task.site_id}. Comment: ${disputeComment}`, "site_actions", task.id);
    await loadAssignedTasks();
    completeWorkflow(
      "Task Disputed",
      `${task.site_id} was routed to ${nextLevel} with your dispute comment.`,
      "approvals",
      "site_detail"
    );
  }

  function exportDashboardData() {
    downloadCsv("field_ops_sites.csv", visibleSites);
    downloadCsv("field_ops_tasks.csv", visibleTasks);
    downloadCsv("field_ops_diesel_intelligence.csv", siteDieselInsights);
    downloadCsv("field_ops_capex_ratings.csv", capexRatings);
    downloadCsv("field_ops_recent_activity.csv", activities);
  }

  function navigate(nextPage: Page) {
    setPreviousPage(page);
    setPage(nextPage);
  }

  function closeCompletion(targetPage?: Page) {
    const destination = targetPage || completionState?.primaryPage || previousPage || "home";
    setCompletionState(null);
    setPage(destination);
  }

  function openSummary(kind: SummaryKind) {
    setPreviousPage(page);
    setSummaryKind(kind);
    setPage("summary");
  }

  function openSiteDetail(siteId: string) {
    setPreviousPage(page);
    setSelectedDetailSiteId(siteId);
    setPage("site_detail");
  }

  function openTaskDetail(taskId: string) {
    setPreviousPage(page);
    setSelectedTaskId(taskId);
    setPage("task_detail");
  }

  function openClusterDetail(clusterName: string) {
    setPreviousPage(page);
    setSelectedClusterName(clusterName);
    setPage("cluster_detail");
  }

  function openNotificationAction(notification: OperationalNotification, action: "movement" | "supply") {
    setPreviousPage(page);
    setSelectedSite(notification.site_id);
    setCreateTaskSite(notification.site_id);
    setCreateTaskType(action === "movement" ? "Diesel Movement" : "Supply Request");
    setPage("create_task");
  }

  function completeWorkflow(title: string, message: string, primaryPage: Page, secondaryPage?: Page) {
    setCompletionState({ title, message, primaryPage, secondaryPage });
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#06111f] p-4 text-white">
        <div className="mx-auto flex min-h-screen max-w-md items-center">
          <div className="w-full rounded-[32px] border border-slate-700/70 bg-[#081827]/90 p-7 shadow-2xl shadow-black/60">
            <div className="mb-8 flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-sm font-bold text-emerald-400">NeoEra</p>
                <h1 className="text-xl font-black tracking-wide">Field Ops</h1>
              </div>
            </div>
            <p className="text-3xl font-black">{greeting()}, Operator</p>
            <p className="mt-2 text-sm text-slate-400">Enter your assigned phone number to access NeoEra.</p>
            <div className="mt-8 space-y-4">
              {!adminMode ? (
                <>
                  <input className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white outline-none" placeholder="Phone number e.g. 8133394660" value={phoneInput} onChange={(event) => setPhoneInput(event.target.value.replace(/[^0-9]/g, '').slice(0, 11))} />
                  <p className="text-xs text-slate-500">Use 10 digits without leading zero, or 11 digits with leading zero.</p>
                  {otpSent && <input className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white outline-none" placeholder="Enter OTP" value={otpInput} onChange={(event) => setOtpInput(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))} />}
                  <button className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-bold text-white" onClick={otpSent ? handleVerifyOtp : handleSendOtp}>{otpSent ? "Verify OTP" : "Send OTP"}</button>
                  <button className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300" onClick={() => setAdminMode(true)}>Log in as Admin</button>
                </>
              ) : (
                <>
                  <input className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white outline-none" placeholder="Admin Email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} />
                  <input className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white outline-none" placeholder="Admin Password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
                  <button className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-bold text-white" onClick={handleAdminLogin}>Access Admin Control Center</button>
                  <button className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300" onClick={() => setAdminMode(false)}>Back to Phone Login</button>
                </>
              )}
              {loginMessage && <p className="text-sm text-blue-300">{loginMessage}</p>}
            </div>
          </div>
        </div>
        <UiFeedback uiState={uiState} />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#06111f] text-white">
      <div className="mx-auto min-h-screen w-full max-w-[460px] pb-24 md:max-w-3xl lg:max-w-6xl xl:max-w-7xl">
        <AppHeader user={currentUser} openTasks={openTasks.length} />
        <main className="space-y-4 px-4 md:px-6 lg:grid lg:grid-cols-12 lg:gap-5 lg:space-y-0">
          {completionState && <CompletionSheet state={completionState} closeCompletion={closeCompletion} openSiteDetail={() => selectedSite ? openSiteDetail(selectedSite) : selectedDetailSiteId ? openSiteDetail(selectedDetailSiteId) : null} />}
          {page === "home" && <HomeScreen user={currentUser} sites={visibleSites} nearRunout={nearRunout} pendingApprovals={pendingApprovals} dieselInHand={dieselInHand} totalConsumption={totalConsumption} totalSupply={totalSupply} recentActivities={activities} goTo={navigate} openSummary={openSummary} tasks={visibleTasks} suppliedThisMonth={new Set(visibleDieselTransactions.filter((tx) => new Date(tx.transaction_date || tx.created_at || 0) >= getCycleStartDate()).map((tx) => tx.site_id)).size} neoRating={myNeoEraRating} notifications={operationalNotifications} openNotificationAction={openNotificationAction} />}
          {page === "operations" && <OperationsScreen groupedTasks={groupedTasks} currentUser={currentUser} startTask={startTask} openTaskDetail={openTaskDetail} setPage={navigate} />}
          {page === "diesel_planning" && <DieselPlanningScreen sites={visibleSites} insights={siteDieselInsights} deliveryPlans={deliveryPlans} runAction={runAction} createDeliveryPlan={createDeliveryPlan} openSiteDetail={openSiteDetail} goBack={() => navigate("operations")} />}
          {page === "intelligence" && <IntelligenceScreen insights={siteDieselInsights} riskRows={riskRows} capexRatings={capexRatings} cycleStart={cycleStart} cycleEnd={cycleEnd} setCycleStart={setCycleStart} setCycleEnd={setCycleEnd} exportDashboardData={exportDashboardData} openSiteDetail={openSiteDetail} openClusterDetail={openClusterDetail} currentUser={currentUser} sites={visibleSites} />}
          {page === "approvals" && <ApprovalsScreen approvals={pendingApprovals} currentUser={currentUser} insights={siteDieselInsights} dieselTransactions={visibleDieselTransactions} openTaskDetail={openTaskDetail} approveTask={(task, comment) => runAction(() => approveTask(task, comment), "Task approved")} disputeTask={(task, comment) => runAction(() => disputeTask(task, comment), "Task disputed")} />}
          {page === "summary" && <SummaryScreen kind={summaryKind} sites={visibleSites} insights={siteDieselInsights} tasks={visibleTasks} approvals={pendingApprovals} dieselTransactions={visibleDieselTransactions} deliveryPlans={deliveryPlans} runAction={runAction} createDeliveryPlan={createDeliveryPlan} goTo={navigate} openSiteDetail={openSiteDetail} openTaskDetail={openTaskDetail} openClusterDetail={openClusterDetail} currentUser={currentUser} />}
          {page === "site_detail" && <SiteDetailScreen site={visibleSites.find((site) => site.site_id === selectedDetailSiteId)} insight={siteDieselInsights.find((row) => row.site_id === selectedDetailSiteId)} tasks={visibleTasks.filter((task) => task.site_id === selectedDetailSiteId)} dieselTransactions={visibleDieselTransactions.filter((tx) => tx.site_id === selectedDetailSiteId)} spotChecks={visibleSpotChecks.filter((spot) => spot.site_id === selectedDetailSiteId)} openTaskDetail={openTaskDetail} goBack={() => setPage(previousPage === "site_detail" ? "summary" : previousPage || "summary")} />}
          {page === "task_detail" && <TaskDetailScreen task={visibleTasks.find((task) => task.id === selectedTaskId)} site={visibleSites.find((site) => site.site_id === visibleTasks.find((task) => task.id === selectedTaskId)?.site_id)} insight={siteDieselInsights.find((row) => row.site_id === visibleTasks.find((task) => task.id === selectedTaskId)?.site_id)} dieselTransactions={visibleDieselTransactions.filter((tx) => tx.site_id === visibleTasks.find((task) => task.id === selectedTaskId)?.site_id)} spotChecks={visibleSpotChecks.filter((spot) => spot.site_id === visibleTasks.find((task) => task.id === selectedTaskId)?.site_id)} startTask={startTask} approveTask={(task: SiteAction, comment: string) => runAction(() => approveTask(task, comment), "Task approved")} disputeTask={(task: SiteAction, comment: string) => runAction(() => disputeTask(task, comment), "Task disputed")} goBack={() => setPage(previousPage || "operations")} />}
          {page === "cluster_detail" && <ClusterDetailScreen cluster={selectedClusterName} sites={visibleSites.filter((site) => site.msp_cluster === selectedClusterName)} insights={siteDieselInsights.filter((row) => row.cluster === selectedClusterName)} dieselTransactions={visibleDieselTransactions} openSiteDetail={openSiteDetail} goBack={() => setPage(previousPage || "intelligence")} />}
          {page === "profile" && <ProfileScreen user={currentUser} users={users} sites={visibleSites} canCreateTasks={["Admin", "RTO", "MRTO", "EFS"].includes(currentUser.role)} canAssignUsers={["Admin", "RTO", "MRTO", "EFS"].includes(currentUser.role)} setPage={navigate} logout={handleLogout} />}
          {page === "recent_activity" && <RecentActivityScreen activities={activities} goBack={() => navigate("profile")} openTaskDetail={openTaskDetail} openSiteDetail={openSiteDetail} />}
          {page === "map_view" && <MapViewScreen sites={visibleSites} insights={siteDieselInsights} openSiteDetail={openSiteDetail} goBack={() => navigate("home")} />}
          
          {page === "upload_center" && <UploadCenterScreen currentUser={currentUser} runAction={runAction} refresh={loadOperationalData} goBack={() => navigate("operations")} />}
        {page === "create_task" && <CreateTaskScreen sites={visibleSites} users={smartAssignableUsers(createTaskSite)} taskType={createTaskType} setTaskType={setCreateTaskType} selectedSite={createTaskSite} setSelectedSite={(siteId) => { setCreateTaskSite(siteId); setCreateTaskAssignee(""); }} selectedAssignee={createTaskAssignee} setSelectedAssignee={setCreateTaskAssignee} createTask={() => runAction(createAssignedTask, "Task created")} />}
          {page === "action_task" && activeTask && <ActionTaskScreen task={activeTask} selectedSite={selectedSite} setSelectedSite={setSelectedSite} sites={visibleSites} supplyDate={supplyDate} setSupplyDate={setSupplyDate} initialDip={initialDip} setInitialDip={setInitialDip} qtySupplied={qtySupplied} setQtySupplied={setQtySupplied} spotCheckDate={spotCheckDate} setSpotCheckDate={setSpotCheckDate} dieselLevel={dieselLevel} setDieselLevel={setDieselLevel} dgCapacity={dgCapacity} setDgCapacity={setDgCapacity} closureNote={closureNote} setClosureNote={setClosureNote} unsafeCondition={unsafeCondition} setUnsafeCondition={setUnsafeCondition} recommendedAction={recommendedAction} setRecommendedAction={setRecommendedAction} submitSpotCheck={() => runAction(submitSpotCheckTask, "Spot check submitted")} submitSupply={() => runAction(submitSupplyTask, "Supply submitted")} />}
        </main>{![
  "home",
  "operations",
  "intelligence",
  "approvals",
  "profile",
  "create_task",
  "action_task",
  "upload_center",
  "diesel_planning",
  "recent_activity",
  "map_view",
  "summary",
  "site_detail",
  "task_detail",
  "cluster_detail"
].includes(page) && <PageFallback page={page} setPage={setPage} />}
        <BottomNav page={page} setPage={navigate} />
        <FloatingAction onClick={() => setPage("create_task")} />
        <UiFeedback uiState={uiState} />
      </div>
    </div>
  );
}

function AppHeader({ user, openTasks }: { user: AppUser; openTasks: number }) {
  return (
    <header className="px-4 pb-4 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <Menu className="h-6 w-6 text-slate-300" />
        <div className="flex items-center gap-2 text-sm font-bold"><span className="text-emerald-400">NeoEra</span><span>Field Ops</span></div>
        <div className="relative"><Bell className="h-6 w-6 text-slate-200" />{openTasks > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-blue-500 px-1.5 text-[10px] font-bold">{openTasks}</span>}</div>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-300">{greeting()},</p>
          <h1 className="mt-1 text-3xl font-black">{user.name?.split(" ")[0] || "Operator"}</h1>
          <p className="mt-1 text-sm text-slate-400">{user.role} • {user.phone || user.assigned_msp_cluster || user.assigned_efs_clusters?.[0] || user.assigned_mrto_clusters?.[0] || "Control Bucket"}</p>
        </div>
        <div className="text-right"><p className="text-2xl font-black">28°</p><p className="text-xs text-slate-400">Partly Cloudy</p></div>
      </div>
    </header>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,32,51,0.92),rgba(5,15,28,0.96))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_30%)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function StatCard({ icon, label, value, tone = "blue", onClick }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "blue" | "green" | "orange" | "purple" | "red"; onClick?: () => void }) {
  const toneMap = {
    blue: { ring: "bg-blue-500/15 text-blue-400 shadow-blue-500/10", bar: "from-blue-500 to-cyan-400", text: "text-blue-400" },
    green: { ring: "bg-emerald-500/15 text-emerald-400 shadow-emerald-500/10", bar: "from-emerald-500 to-green-300", text: "text-emerald-400" },
    orange: { ring: "bg-orange-500/15 text-orange-400 shadow-orange-500/10", bar: "from-orange-500 to-amber-300", text: "text-orange-400" },
    purple: { ring: "bg-purple-500/15 text-purple-400 shadow-purple-500/10", bar: "from-purple-500 to-violet-300", text: "text-purple-400" },
    red: { ring: "bg-red-500/15 text-red-400 shadow-red-500/10", bar: "from-red-500 to-orange-400", text: "text-red-400" },
  };
  const toneClass = toneMap[tone];
  return (
    <button type="button" onClick={onClick} className="group relative w-full overflow-hidden rounded-[22px] border border-white/10 bg-[#0b1d2d]/80 p-3 text-left shadow-xl transition duration-300 hover:-translate-y-1 hover:border-blue-400/40 active:scale-[0.98]">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg ${toneClass.ring}`}>{icon}</div>
        <div className="min-w-0">
          <p className={`text-2xl font-black leading-none ${toneClass.text}`}>{value}</p>
          <p className="mt-1 text-[11px] leading-tight text-slate-300">{label}</p>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
        <div className={`h-full w-2/3 rounded-full bg-gradient-to-r ${toneClass.bar}`} />
      </div>
    </button>
  );
}

function HomeScreen({ user, sites, nearRunout, pendingApprovals, dieselInHand, totalConsumption, totalSupply, recentActivities, goTo, openSummary, tasks, suppliedThisMonth, neoRating, notifications, openNotificationAction }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const tasksDueToday = tasks.filter((task: SiteAction) => (task.created_at || "").slice(0, 10) === today && task.execution_status !== "Closed").length;
  const clusterStability = sites.length ? Math.max(0, Math.min(100, ((sites.length - nearRunout.length) / sites.length) * 100)) : 0;
  const dieselAccuracy = neoRating ? Math.max(0, Math.min(100, neoRating.dieselSavingsScore * 4)) : 0;
  const visibilityRadius = sites.length;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 lg:col-span-12">
      <CommandIdentityPanel
        user={user}
        rating={neoRating}
        clusterStability={clusterStability}
        dieselAccuracy={dieselAccuracy}
        visibilityRadius={visibilityRadius}
        openIntelligence={() => goTo("intelligence")}
      />

      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">Operational Summary</h2>
          <span className="rounded-xl border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-400">Today</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <CommandMiniStat label="Sites Online" value={`${sites.length}`} sub={`${Math.round(clusterStability)}%`} tone="cyan" onClick={() => openSummary("sites")} />
          <CommandMiniStat label="Near Runout" value={nearRunout.length} sub={nearRunout.length ? "Critical" : "Clear"} tone="amber" onClick={() => openSummary("near_runout")} />
          <CommandMiniStat label="Open Risks" value={nearRunout.length + pendingApprovals.length} sub="High" tone="red" onClick={() => openSummary("risks")} />
          <CommandMiniStat label="Approvals" value={pendingApprovals.length} sub="Pending" tone="violet" onClick={() => openSummary("approvals")} />
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">Today’s Overview</h2>
          <span className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[10px] uppercase tracking-widest text-blue-300">Live</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TacticalMetric label="Runout ≤ 3 Days" value={nearRunout.length} detail="Sites requiring intervention" tone="amber" onClick={() => openSummary("near_runout")} />
          <TacticalMetric label="Tasks Due Today" value={tasksDueToday} detail="Open operational queue" tone="cyan" onClick={() => goTo("operations")} />
          <TacticalMetric label="Supplied This Month" value={`${suppliedThisMonth}/${sites.length}`} detail="Sites supplied / total sites" tone="green" onClick={() => openSummary("supply")} />
          <TacticalMetric label="NeoEra Rating" value={neoRating ? neoRating.score : "0"} detail={neoRating ? `Lv ${neoRating.frontendLevel} ${neoRating.fullTitle}` : "rating pending"} tone="violet" onClick={() => goTo("intelligence")} />
        </div>
      </GlassCard>

      <OperationalNotificationsPanel notifications={notifications || []} openNotificationAction={openNotificationAction} openSummary={openSummary} />

      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">Diesel Intelligence Pulse</h2>
          <button className="text-[10px] font-bold uppercase tracking-widest text-blue-400" onClick={() => goTo("intelligence")}>Open intel</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TacticalMetric label="Estimated Diesel" value={`${Math.round(dieselInHand)} L`} detail="System-calculated current level" tone="cyan" onClick={() => openSummary("near_runout")} />
          <TacticalMetric label="CPD Trend" value={`${Math.round(totalConsumption)} L/day`} detail="10-day consumption trend" tone="green" onClick={() => openSummary("cpd")} />
          <TacticalMetric label="Cycle Supply" value={`${Math.round(totalSupply)} L`} detail="Cycle-to-date supply" tone="blue" onClick={() => openSummary("supply")} />
          <TacticalMetric label="Supply Coverage" value={sites.length ? `${Math.round((suppliedThisMonth / sites.length) * 100)}%` : "0%"} detail="Monthly coverage" tone="amber" onClick={() => openSummary("supply")} />
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">Recent Activity</h2>
          <button className="text-[10px] font-bold uppercase tracking-widest text-blue-400" onClick={() => goTo("recent_activity")}>View all</button>
        </div>
        <button className="block w-full space-y-3 text-left" onClick={() => goTo("recent_activity")}>
          {recentActivities.slice(0, 4).length ? recentActivities.slice(0, 4).map((activity: RecentActivity) => <ActivityRow key={activity.id} activity={activity} />) : <p className="text-sm text-slate-400">No activity recorded yet.</p>}
        </button>
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">Performance Pulse</h2>
          <button className="text-[10px] font-bold uppercase tracking-widest text-blue-400" onClick={() => goTo("intelligence")}>View rating</button>
        </div>
        <div className="grid grid-cols-2 items-center gap-4">
          <MiniTrendChart />
          <ProgressRing value={Math.round(clusterStability)} label="Cluster Stable" />
        </div>
      </GlassCard>
    </div>
  );
}

function CommandIdentityPanel({ user, rating, clusterStability, dieselAccuracy, visibilityRadius, openIntelligence }: any) {
  const safeRating: UserCapexRating | undefined = rating;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_.85fr]">
      <div className="relative overflow-hidden rounded-[28px] border border-blue-400/20 bg-[radial-gradient(circle_at_25%_10%,rgba(59,130,246,0.18),transparent_36%),linear-gradient(145deg,rgba(6,17,31,0.98),rgba(5,15,28,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(56,189,248,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,.08) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400">{greeting()},</p>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.18em] text-white">{safeRating?.fullTitle || user.name || "Operator"}</h1>
              <p className="mt-1 text-xs text-slate-400">{user.role} • {user.assigned_msp_cluster || user.assigned_efs_clusters?.[0] || user.assigned_mrto_clusters?.[0] || "Control Bucket"}</p>
            </div>
            <button className="rounded-2xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-300" onClick={openIntelligence}>Rating</button>
          </div>

          <div className="grid grid-cols-[132px_1fr] gap-4">
            <PrestigeBadge rating={safeRating} />
            <div className="space-y-3">
              <TelemetryLine label="Cluster Stability" value={`${clusterStability.toFixed(2)}%`} />
              <TelemetryLine label="Diesel Accuracy" value={`${dieselAccuracy.toFixed(2)}%`} />
              <TelemetryLine label="Visibility Radius" value={`${visibilityRadius} Sites`} />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Prestige Class</p>
                <p className="mt-1 text-sm font-black uppercase tracking-widest text-blue-400">{safeRating?.prestigeClass || safeRating?.characterClass || "Active Operator"}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" /> Reactor Core Active
          </div>
          {safeRating && <p className="mt-3 text-xs leading-relaxed text-slate-400">{safeRating.characterSummary}</p>}
        </div>
      </div>
      <LiveWeatherCommandWidget user={user} />
    </div>
  );
}

function LiveWeatherCommandWidget({ user }: { user: AppUser }) {
  const [weather, setWeather] = useState({
    temp: 28,
    condition: "Loading Weather",
    risk: "Fetching live forecast",
    confidence: "SYNC",
    wind: 0,
    rain: 0,
    locationLabel: "Detecting location",
    source: "GPS",
  });

  const clusterName = user.assigned_msp_cluster || user.assigned_efs_clusters?.[0] || user.assigned_mrto_clusters?.[0] || "Port Harcourt";

  function weatherCodeToCondition(code: number) {
    if ([95, 96, 99].includes(code)) return "Storm Watch";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain Watch";
    if ([45, 48].includes(code)) return "Low Visibility";
    if ([1, 2, 3, 0].includes(code)) return "Clear Access";
    return "Operational Weather";
  }

  function getWeatherBackground(condition: string) {
    if (condition.includes("Storm")) return "/weather/storm.jpg";
    if (condition.includes("Rain")) return "/weather/rain.jpg";
    if (condition.includes("Lightning")) return "/weather/lightning.jpg";
    return "/weather/clear.jpg";
  }

  async function reverseLocationName(lat: number, lon: number) {
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`);
      const data = await response.json();
      const result = data?.results?.[0];
      return result?.name || result?.admin2 || result?.admin1 || "Current Location";
    } catch {
      return "Current Location";
    }
  }

  async function fetchWeather(lat: number, lon: number, source: string, fallbackLabel?: string) {
    const forecastResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`
    );
    if (!forecastResponse.ok) throw new Error("Weather request failed");
    const forecastData = await forecastResponse.json();
    const current = forecastData.current || {};
    const condition = weatherCodeToCondition(Number(current.weather_code || 0));
    const rain = Number(current.precipitation || 0);
    const wind = Number(current.wind_speed_10m || 0);
    const risk = condition.includes("Storm")
      ? "Lightning risk elevated"
      : condition.includes("Rain") || rain > 0
      ? "Access delay possible"
      : wind > 25
      ? "Wind exposure watch"
      : "Movement confidence stable";
    const locationLabel = fallbackLabel || (await reverseLocationName(lat, lon));

    setWeather({
      temp: Math.round(Number(current.temperature_2m || 28)),
      condition,
      risk,
      confidence: "LIVE",
      wind,
      rain,
      locationLabel,
      source,
    });
  }

  function getBrowserLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 }
      );
    });
  }

  useEffect(() => {
    let active = true;

    async function loadWeather() {
      try {
        const gps = await getBrowserLocation();
        if (!active) return;
        await fetchWeather(gps.lat, gps.lon, "GPS");
      } catch {
        try {
          if (!active) return;
          await fetchWeather(4.8156, 7.0498, "FALLBACK", clusterName || "Port Harcourt");
        } catch {
          if (active) {
            setWeather({
              temp: 28,
              condition: "Operational Weather",
              risk: "Live weather unavailable; using fallback",
              confidence: "FALLBACK",
              wind: 0,
              rain: 0,
              locationLabel: clusterName || "Port Harcourt",
              source: "FALLBACK",
            });
          }
        }
      }
    }

    loadWeather();
    const timer = window.setInterval(loadWeather, 15 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [clusterName]);

  const weatherBackground = getWeatherBackground(weather.condition);
  const movementStatus = weather.condition.includes("Storm") ? "LOW" : weather.condition.includes("Rain") ? "WATCH" : "OK";
  const lightningStatus = weather.condition.includes("Storm") ? "HIGH" : "Watch";
  const accessStatus = weather.condition.includes("Rain") || weather.condition.includes("Storm") ? "Risk" : "Open";

  return (
    <div
      className="relative min-h-[220px] overflow-hidden rounded-[28px] border border-cyan-400/20 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
      style={{
        backgroundImage: `linear-gradient(160deg,rgba(5,15,28,.35),rgba(5,15,28,.95)), url(${weatherBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(56,189,248,.20),transparent_34%),linear-gradient(rgba(56,189,248,.10)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,.08)_1px,transparent_1px)] bg-[length:auto,28px_28px,28px_28px]" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Weather Ops</p>
            <p className="mt-1 text-xs text-slate-300">{weather.locationLabel}</p>
            <p className="text-[10px] text-slate-500">Source: {weather.source}</p>
          </div>
          <span className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold text-cyan-300">{weather.confidence}</span>
        </div>
        <div className="py-5">
          <p className="text-5xl font-black tracking-tight text-white">{weather.temp}°</p>
          <p className="mt-1 text-lg font-black uppercase tracking-widest text-cyan-200">{weather.condition}</p>
          <p className="mt-2 text-xs text-slate-300">{weather.risk}</p>
          <p className="mt-1 text-[10px] text-slate-400">Rain {weather.rain}mm • Wind {weather.wind}km/h</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-white/10 bg-black/25 p-2"><p className="text-[10px] text-slate-400">Diesel Move</p><p className={`text-xs font-bold ${movementStatus === "LOW" ? "text-red-400" : movementStatus === "WATCH" ? "text-orange-400" : "text-emerald-400"}`}>{movementStatus}</p></div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-2"><p className="text-[10px] text-slate-400">Lightning</p><p className={`text-xs font-bold ${lightningStatus === "HIGH" ? "text-red-400" : "text-orange-400"}`}>{lightningStatus}</p></div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-2"><p className="text-[10px] text-slate-400">Access</p><p className={`text-xs font-bold ${accessStatus === "Risk" ? "text-orange-400" : "text-cyan-300"}`}>{accessStatus}</p></div>
        </div>
      </div>
    </div>
  );
}

function PrestigeBadge({ rating }: { rating?: UserCapexRating }) {
  const palette = rating?.colorPalette || ["#101827", "#36558F", "#D6E0F0", "#9FB3C8"];
  const character = rating?.character || "Sparrow";
  const symbol = character === "Eagle" ? "🦅" : character === "Hawk" ? "🪶" : character === "Ostrich" ? "◇" : character === "Falcon" ? "◆" : "✦";
  return (
    <div className="relative flex h-36 w-32 items-center justify-center">
      <div className="absolute inset-0 rounded-[28px] border" style={{ borderColor: palette[2], background: `linear-gradient(145deg, ${palette[0]}, ${palette[1]})`, boxShadow: `0 0 36px ${palette[1]}88` }} />
      <div className="absolute inset-3 rounded-full border border-white/20" />
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-300/30 bg-blue-500/10 shadow-[0_0_35px_rgba(59,130,246,0.55)]" />
      <div className="relative z-10 text-4xl" style={{ color: palette[2] }}>{symbol}</div>
      <div className="absolute top-4 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">Level</div>
      <div className="absolute bottom-7 text-center text-2xl font-black text-white">{rating?.frontendLevel || 1}</div>
      <div className="absolute bottom-2 rounded-lg border border-white/15 bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-200">{rating?.mythicRank || "Aetherion"}</div>
    </div>
  );
}

function TelemetryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-700/50 pb-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-lg font-black text-white">{value}</p>
        <MiniSpark />
      </div>
    </div>
  );
}

function MiniSpark() {
  return <svg viewBox="0 0 60 24" className="h-6 w-16"><path d="M1 19 L10 15 L16 18 L26 8 L34 13 L42 5 L58 2" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function CommandMiniStat({ label, value, sub, tone, onClick }: any) {
  const toneClass = tone === "cyan" ? "text-cyan-300" : tone === "amber" ? "text-orange-400" : tone === "red" ? "text-red-400" : "text-purple-400";
  return <button className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-3 text-left transition hover:border-blue-400/40" onClick={onClick}><p className="text-[10px] text-slate-400">{label}</p><p className={`mt-2 text-xl font-black ${toneClass}`}>{value}</p><p className="mt-1 text-[10px] text-slate-500">{sub}</p></button>;
}

function TacticalMetric({ label, value, detail, tone, onClick }: any) {
  const toneClass = tone === "cyan" ? "text-cyan-300" : tone === "green" ? "text-emerald-400" : tone === "amber" ? "text-orange-400" : tone === "violet" ? "text-purple-400" : "text-blue-400";
  return <button onClick={onClick} className="rounded-2xl border border-slate-700/60 bg-slate-950/35 p-3 text-left transition hover:bg-slate-900/70 active:scale-[0.98]"><p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className={`mt-2 text-xl font-black ${toneClass}`}>{value}</p><p className="mt-1 text-[10px] text-slate-400">{detail}</p></button>;
}

function OperationalNotificationsPanel({ notifications, openNotificationAction, openSummary }: { notifications: OperationalNotification[]; openNotificationAction: (notification: OperationalNotification, action: "movement" | "supply") => void; openSummary: (kind: SummaryKind) => void }) {
  const critical = notifications.filter((item) => item.severity === "critical");
  const visible = notifications.slice(0, 4);
  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">Operational Criticalities</h2>
          <p className="mt-1 text-[10px] text-slate-500">Live status depends on supply plus 2 post-supply spot checks.</p>
        </div>
        <button className="text-[10px] font-bold uppercase tracking-widest text-blue-400" onClick={() => openSummary("near_runout")}>Review</button>
      </div>

      <div className="space-y-3">
        {visible.map((item) => (
          <div key={item.id} className={`rounded-2xl border p-3 ${item.severity === "critical" ? "border-red-400/30 bg-red-500/10" : item.severity === "warning" ? "border-orange-400/30 bg-orange-500/10" : "border-blue-400/30 bg-blue-500/10"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">{item.site_id}</p>
                <p className="text-xs text-slate-400">{item.title} • {item.cluster}</p>
                <p className="mt-1 text-xs text-slate-300">{item.message}</p>
                <p className="mt-2 text-[11px] font-semibold text-blue-200">SMART: {item.smartRecommendation}</p>
              </div>
              <span className={`rounded-xl px-2 py-1 text-[10px] font-bold uppercase ${item.severity === "critical" ? "bg-red-500/20 text-red-300" : item.severity === "warning" ? "bg-orange-500/20 text-orange-300" : "bg-blue-500/20 text-blue-300"}`}>{item.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {item.movementEligible && <button className="rounded-xl border border-orange-400/40 px-3 py-2 text-xs font-bold text-orange-300" onClick={() => openNotificationAction(item, "movement")}>Request Movement</button>}
              {item.supplyEligible && <button className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-bold text-white" onClick={() => openNotificationAction(item, "supply")}>Assign Supply</button>}
              {!item.movementEligible && !item.supplyEligible && <button className="col-span-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300" onClick={() => openSummary("near_runout")}>View Site Status</button>}
            </div>
          </div>
        ))}
        {!visible.length && <p className="py-4 text-center text-sm text-slate-400">No active operational criticality.</p>}
      </div>
      {critical.length > 0 && <p className="mt-3 text-[10px] uppercase tracking-widest text-red-300">{critical.length} critical site(s) require immediate decision.</p>}
    </GlassCard>
  );
}

function NeoEraRatingBox({ rating, onClick }: { rating?: UserCapexRating; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full rounded-xl border border-slate-700/50 bg-slate-950/30 p-3 text-left transition hover:bg-slate-900/70 active:scale-[0.98]">
      <div className="flex items-center gap-3">
        {rating ? <RatingMedallion row={rating} size="sm" /> : <div className="h-11 w-11 rounded-2xl border border-slate-700 bg-slate-900" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400">NeoEra Rating</p>
          <p className="mt-1 text-lg font-black text-white">{rating ? rating.score : "0"}</p>
          <p className="truncate text-xs text-emerald-400">{rating ? `Lv ${rating.frontendLevel} ${rating.fullTitle}` : "rating pending"}</p>
        </div>
      </div>
    </button>
  );
}

function HomeTaskLine({ icon, title, subtitle, risk, onClick }: any) {
  const color = risk === "High" ? "text-red-400" : risk === "Medium" ? "text-orange-400" : "text-emerald-400";
  return (
    <button className="flex w-full items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3 text-left transition hover:bg-slate-900/70" onClick={onClick}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">{React.cloneElement(icon, { className: "h-5 w-5" })}</div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-white">{title}</p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-bold ${color}`}>{risk}</p>
        <ChevronRight className="mt-1 h-5 w-5 text-slate-500" />
      </div>
    </button>
  );
}

function LiveMapCard() {
  const pins = [
    "left-[28%] top-[24%] bg-emerald-400",
    "left-[78%] top-[33%] bg-orange-400",
    "left-[42%] top-[65%] bg-purple-400",
    "left-[70%] top-[72%] bg-green-400",
  ];
  return (
    <div className="relative h-56 overflow-hidden rounded-2xl border border-slate-700/70 bg-[#081422]">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(30deg, transparent 48%, rgba(148,163,184,.15) 49%, rgba(148,163,184,.15) 51%, transparent 52%), linear-gradient(120deg, transparent 48%, rgba(148,163,184,.1) 49%, rgba(148,163,184,.1) 51%, transparent 52%)", backgroundSize: "42px 42px" }} />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 shadow-[0_0_40px_rgba(59,130,246,.35)]" />
      <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-blue-500" />
      {pins.map((pin, index) => <span key={index} className={`absolute h-5 w-5 rounded-full ${pin} shadow-lg shadow-black/50`} />)}
      <div className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-950/80 text-slate-200"><MapPin className="h-5 w-5" /></div>
    </div>
  );
}

function MiniTrendChart() {
  return (
    <svg viewBox="0 0 180 90" className="h-28 w-full">
      <defs><linearGradient id="lineGlow" x1="0" x2="1"><stop offset="0" stopColor="#38bdf8"/><stop offset="1" stopColor="#2563eb"/></linearGradient></defs>
      <path d="M0 70 C20 48 28 62 42 42 C55 20 70 35 84 25 C100 12 116 48 132 30 C146 14 158 24 174 8" fill="none" stroke="url(#lineGlow)" strokeWidth="2.25" strokeLinecap="round" />
      <circle cx="174" cy="8" r="6" fill="#2563eb" stroke="#93c5fd" strokeWidth="3" />
      {[20,55,90,125,160].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="90" stroke="rgba(148,163,184,.08)" />)}
      {[20,45,70].map((y) => <line key={y} x1="0" x2="180" y1={y} y2={y} stroke="rgba(148,163,184,.08)" />)}
    </svg>
  );
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const dash = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="48" stroke="rgba(51,65,85,.8)" strokeWidth="12" fill="none" />
          <circle cx="60" cy="60" r="48" stroke="#2563eb" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={`${dash * 3.01} 301`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><p className="text-2xl font-black">{dash}%</p><p className="text-[10px] text-slate-400">{label}</p></div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, trend, danger, onClick }: any) {
  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper onClick={onClick} className="w-full rounded-xl border border-slate-700/50 bg-slate-950/30 p-3 text-left transition hover:bg-slate-900/70 active:scale-[0.98]">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
      <p className={`mt-1 text-xs ${danger ? "text-red-400" : "text-emerald-400"}`}>{trend}</p>
    </Wrapper>
  );
}

function ActivityRow({ activity }: { activity: RecentActivity }) {
  return <div className="flex items-center gap-3 rounded-xl bg-slate-950/30 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><Activity className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{activity.description}</p><p className="text-xs text-slate-400">{activity.actor_name || activity.actor_email}</p></div><p className="text-xs text-slate-400">{activity.created_at ? new Date(activity.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</p></div>;
}

function OperationsScreen({ groupedTasks, currentUser, startTask, openTaskDetail, setPage }: any) {
  const [tab, setTab] = useState("Supply");
  const rows = tab === "Spot Check" ? groupedTasks.spotChecks : tab === "Supply" ? groupedTasks.supplies : tab === "Approvals" ? groupedTasks.approvals : groupedTasks.disputes;
  return (
    <Screen title="Operations">
      <div className="grid gap-3 md:grid-cols-2">
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Upload Center</h3>
              <p className="text-xs text-slate-400">Post supply and spot-check data with approval routing.</p>
            </div>
            <button className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-bold text-white" onClick={() => setPage("upload_center")}>Open</button>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Diesel Planning</h3>
              <p className="text-xs text-slate-400">Plan truck supply for near-runout truckable sites within 72hrs.</p>
            </div>
            <button className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white" onClick={() => setPage("diesel_planning")}>Open</button>
          </div>
        </GlassCard>
      </div>
      <Segment tabs={["Spot Check", "Supply", "Approvals", "Disputes"]} active={tab} setActive={setTab} />
      <div className="grid grid-cols-4 gap-2">
        <StatMini label="Pending" value={rows.filter((x: SiteAction) => x.execution_status === "Pending").length} />
        <StatMini label="In Progress" value={rows.filter((x: SiteAction) => x.execution_status === "Submitted").length} />
        <StatMini label="Completed" value={rows.filter((x: SiteAction) => x.execution_status === "Closed").length} />
        <StatMini label="Disputes" value={rows.filter((x: SiteAction) => x.execution_status === "Disputed").length} danger />
      </div>
      <div className="space-y-3">
        {rows.length ? rows.map((task: SiteAction) => <TaskCard key={task.id} task={task} currentUser={currentUser} startTask={startTask} openTaskDetail={openTaskDetail} />) : <EmptyState title="No active item" text="Nothing is waiting in this workflow lane." />}
      </div>
      <button className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-xl shadow-blue-500/30" onClick={() => setPage("create_task")}><Plus className="h-7 w-7" /></button>
    </Screen>
  );
}


function DieselPlanningScreen({ sites, insights, deliveryPlans, runAction, createDeliveryPlan, openSiteDetail, goBack }: any) {
  const [query, setQuery] = useState("");
  const planningRows = buildDieselPlanningRows(sites, insights, deliveryPlans).filter((item) => getSearchableText(item.row, item.site).includes(query.toLowerCase()));
  const grouped = groupPlanningRowsByRoute(planningRows);
  const suggestions = planningRows.slice(0, 12).map((item) => item.row.site_id || item.routeGroup).filter(Boolean);
  const totalRecommended = planningRows.reduce((sum, item) => sum + Number(item.recommendedQty || 0), 0);
  const truckCapacity = 14000;
  const truckFill = truckCapacity ? Number(((totalRecommended / truckCapacity) * 100).toFixed(1)) : 0;

  return (
    <Screen title="Diesel Planning">
      <GlassCard>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">72-Hour Truck Planning Engine</h3>
            <p className="text-xs text-slate-400">Truckable near-runout sites are grouped by route/cluster to maximize truck utilization and reduce fragmented dispatches.</p>
          </div>
          <button className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-blue-400" onClick={goBack}>Back</button>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <SummaryMini label="Truckable Due Sites" value={planningRows.length} />
          <SummaryMini label="Recommended" value={`${totalRecommended.toFixed(0)}L`} />
          <SummaryMini label="Truck Fill" value={`${truckFill}%`} />
        </div>
        <SmartSearchBox query={query} setQuery={setQuery} placeholder="Search truckable site or route..." suggestions={suggestions} />
      </GlassCard>

      <div className="space-y-4">
        {Object.entries(grouped).map(([route, rows]) => {
          const routeQty = rows.reduce((sum, item) => sum + Number(item.recommendedQty || 0), 0);
          const routeFill = truckCapacity ? Number(((routeQty / truckCapacity) * 100).toFixed(1)) : 0;
          return (
            <GlassCard key={route}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">{route}</h3>
                  <p className="text-xs text-slate-400">{rows.length} site(s) • {routeQty.toFixed(0)}L • {routeFill}% truck fill</p>
                </div>
                <span className="rounded-xl border border-emerald-400/40 px-2 py-1 text-xs text-emerald-400">T+3 Plan</span>
              </div>

              <div className="space-y-3">
                {rows.map((item) => (
                  <div key={item.row.site_id} className="rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <button className="min-w-0 text-left" onClick={() => openSiteDetail(item.row.site_id)}>
                        <p className="font-bold text-white">{item.row.site_id}</p>
                        <p className="text-xs text-slate-400">Runout: {item.row.runout_days} day(s) • CPD: {item.row.cpd_last_10_days}L/day</p>
                        <p className="text-xs text-slate-500">Tank: {item.site?.tank_capacity_litres || "-"}L • Cutoff: {item.site?.cutoff_level_litres || 100}L • Allocation: {item.site?.monthly_allocation_litres || "-"}L</p>
                      </button>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-400">{item.recommendedQty}L</p>
                        <p className="text-[10px] text-slate-500">{item.priority}</p>
                      </div>
                    </div>

                    {item.activePlan ? (
                      <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2">
                        <p className="text-xs font-bold text-emerald-400">Already Planned</p>
                        <p className="text-xs text-slate-300">{item.activePlan.planned_qty_litres}L planned for {item.activePlan.dispatch_date}</p>
                      </div>
                    ) : (
                      <button
                        className="mt-3 w-full rounded-xl bg-blue-500 px-3 py-2 text-xs font-bold text-white"
                        onClick={() => item.site && runAction(() => createDeliveryPlan(item.site, item.row), "Truck supply planned")}
                      >
                        Plan Truck Supply
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          );
        })}
        {!planningRows.length && <EmptyState title="No truck planning pressure" text="No near-runout truckable sites require planning within the current 72-hour window." />}
      </div>
    </Screen>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <GlassCard><div className="py-6 text-center"><p className="font-bold text-slate-200">{title}</p><p className="mt-1 text-sm text-slate-400">{text}</p></div></GlassCard>;
}

function getSearchableText(item: any, linkedSite?: Site) {
  return [
    item?.site_id,
    item?.cluster,
    item?.msp_cluster,
    item?.efs_cluster,
    item?.mrto_cluster,
    item?.state,
    item?.status,
    item?.deprecated_address_name,
    item?.action_type,
    linkedSite?.site_id,
    linkedSite?.msp_cluster,
    linkedSite?.efs_cluster,
    linkedSite?.mrto_cluster,
    linkedSite?.state,
    linkedSite?.status,
    linkedSite?.deprecated_address_name,
  ].filter(Boolean).join(" ").toLowerCase();
}

function SmartSearchBox({ query, setQuery, placeholder = "Search site, cluster, state or status...", suggestions = [] }: any) {
  const cleanSuggestions = suggestions.filter(Boolean).slice(0, 8);
  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 px-3 py-2">
        <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder={placeholder} value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {!!query && !!cleanSuggestions.length && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cleanSuggestions.map((suggestion: string) => (
            <button key={suggestion} className="shrink-0 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[10px] font-bold text-blue-300" onClick={() => setQuery(suggestion)}>{suggestion}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ClusterHealthCards({ sites, insights, openClusterDetail }: { sites: Site[]; insights: SiteDieselInsight[]; openClusterDetail: (clusterName: string) => void }) {
  const clusters = Object.values(
    sites.reduce((acc: Record<string, any>, site) => {
      const cluster = site.msp_cluster || site.efs_cluster || site.mrto_cluster || "Unassigned";
      acc[cluster] = acc[cluster] || { name: cluster, sites: 0, runout: 0, truckable: 0, diesel: 0 };
      acc[cluster].sites += 1;
      if (site.is_truckable) acc[cluster].truckable += 1;
      const insight = insights.find((row) => row.site_id === site.site_id);
      if (Number(insight?.runout_days) <= 3) acc[cluster].runout += 1;
      acc[cluster].diesel += Number(insight?.estimated_current_diesel || insight?.current_diesel_level || 0);
      return acc;
    }, {})
  ).sort((a: any, b: any) => b.runout - a.runout || b.sites - a.sites).slice(0, 8);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {clusters.map((cluster: any) => (
        <button key={cluster.name} className="rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3 text-left transition hover:border-blue-400/40 hover:bg-slate-900/70" onClick={() => openClusterDetail(cluster.name)}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{cluster.name}</p>
              <p className="mt-1 text-xs text-slate-400">{cluster.sites} sites • {cluster.truckable} truckable</p>
            </div>
            <span className={`rounded-xl border px-2 py-1 text-[10px] font-bold ${cluster.runout ? "border-orange-400/40 text-orange-400" : "border-emerald-400/40 text-emerald-400"}`}>{cluster.runout} critical</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Estimated diesel: {Math.round(cluster.diesel)}L</p>
        </button>
      ))}
    </div>
  );
}

function IntelligenceScreen({ insights, riskRows, capexRatings, cycleStart, cycleEnd, setCycleStart, setCycleEnd, exportDashboardData, openSiteDetail, openClusterDetail, currentUser, sites = [] }: any) {
  const [tab, setTab] = useState("Diesel Intelligence");
  const [query, setQuery] = useState("");
  const filteredInsights = insights.filter((row: SiteDieselInsight) => {
    const linkedSite = sites.find((site: Site) => site.site_id === row.site_id);
    return getSearchableText(row, linkedSite).includes(query.toLowerCase());
  });
  const filteredRiskRows = riskRows.filter((row: SiteDieselInsight) => {
    const linkedSite = sites.find((site: Site) => site.site_id === row.site_id);
    return getSearchableText(row, linkedSite).includes(query.toLowerCase());
  });
  const suggestions = filteredInsights.slice(0, 12).map((row: SiteDieselInsight) => row.site_id || row.cluster).filter(Boolean);
  const avgCpd = filteredInsights.length ? Math.round(filteredInsights.reduce((sum: number, row: SiteDieselInsight) => sum + row.cpd_last_10_days, 0) / filteredInsights.length) : 0;
  const abnormalCount = filteredRiskRows.filter((r: SiteDieselInsight) => Number(r.cpd_last_10_days) > Number(r.recommended_cpd) * 1.25).length;
  return (
    <Screen title="Intelligence">
      <Segment tabs={["Diesel Intelligence", "Risk & PA", "Performance", "Safety"]} active={tab} setActive={setTab} />
      <GlassCard>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Smart Site Finder</h3>
            <p className="text-xs text-slate-400">Search across 1,900+ sites by site ID, cluster, state or status.</p>
          </div>
          <span className="rounded-xl border border-slate-700 px-2 py-1 text-[10px] text-slate-400">{filteredInsights.length}/{insights.length}</span>
        </div>
        <SmartSearchBox query={query} setQuery={setQuery} suggestions={suggestions} />
      </GlassCard>
      <ClusterHealthCards sites={sites} insights={insights} openClusterDetail={openClusterDetail} />
      <div className="grid grid-cols-4 gap-2">
        <StatMini label="CPD Avg" value={`${avgCpd}L`} />
        <StatMini label="Runout" value={riskRows.length} />
        <StatMini label="Near 48h" value={riskRows.filter((r: SiteDieselInsight) => Number(r.runout_days) <= 2).length} danger />
        <StatMini label="Abnormal" value={abnormalCount} danger />
      </div>

      {tab === "Diesel Intelligence" && (
        <>
          <GlassCard>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Consumption vs Supply Trend</h3><button className="rounded-xl border border-slate-700 px-3 py-2 text-xs" onClick={exportDashboardData}><Download className="h-4 w-4" /></button></div>
            <div className="mb-3 flex gap-2"><input className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs" type="date" value={cycleStart} onChange={(e) => setCycleStart(e.target.value)} /><input className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs" type="date" value={cycleEnd} onChange={(e) => setCycleEnd(e.target.value)} /></div>
            <TrendToggleChart insights={filteredInsights.slice(0, 80)} openClusterDetail={openClusterDetail} />
          </GlassCard>
          <GlassCard>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">High Consumption / Critical Sites</h3><span className="text-xs text-blue-400">Search to view all</span></div>
            {filteredRiskRows.slice(0, query ? 100 : 12).length ? filteredRiskRows.slice(0, query ? 100 : 12).map((row: SiteDieselInsight) => <InsightRow key={row.site_id} row={row} openSiteDetail={openSiteDetail} />) : <p className="text-sm text-slate-400">No abnormal consumption site in this bucket.</p>}
          </GlassCard>
        </>
      )}

      {tab === "Risk & PA" && <RunoutRiskPanel insights={filteredInsights} openSiteDetail={openSiteDetail} openClusterDetail={openClusterDetail} currentUser={currentUser} />}
      {tab === "Performance" && <GlassCard><h3 className="mb-3 font-bold">Automated CAPEX Rating</h3>{capexRatings.map((row: UserCapexRating) => <CapexRow key={row.email} row={row} />)}</GlassCard>}
      {tab === "Safety" && <GlassCard><h3 className="mb-3 font-bold">Safety Compliance Layer</h3><SafetyPulse /></GlassCard>}
    </Screen>
  );
}

function TrendToggleChart({ insights, openClusterDetail }: { insights: SiteDieselInsight[]; openClusterDetail?: (cluster: string) => void }) {
  const [trend, setTrend] = useState<"supply_consumption" | "qty_on_site" | "runout_days" | "histogram">("supply_consumption");
  const clusterRows = buildClusterTrendRows(insights);

  const labels = clusterRows.map((row) => row.cluster);
  const supply = clusterRows.map((row) => row.qty_supplied_cycle);
  const consumption = clusterRows.map((row) => row.qty_used_cycle);
  const qtyOnSite = clusterRows.map((row) => row.estimated_current_diesel);
  const runout = clusterRows.map((row) => row.avg_runout_days);
  const abnormal = clusterRows.map((row) => row.abnormal_sites);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <button className={`rounded-xl px-3 py-2 text-[10px] font-bold ${trend === "supply_consumption" ? "bg-blue-500 text-white" : "bg-slate-950/50 text-slate-400"}`} onClick={() => setTrend("supply_consumption")}>Supply vs Use</button>
        <button className={`rounded-xl px-3 py-2 text-[10px] font-bold ${trend === "qty_on_site" ? "bg-blue-500 text-white" : "bg-slate-950/50 text-slate-400"}`} onClick={() => setTrend("qty_on_site")}>Qty / Cluster</button>
        <button className={`rounded-xl px-3 py-2 text-[10px] font-bold ${trend === "runout_days" ? "bg-blue-500 text-white" : "bg-slate-950/50 text-slate-400"}`} onClick={() => setTrend("runout_days")}>Runout</button>
        <button className={`rounded-xl px-3 py-2 text-[10px] font-bold ${trend === "histogram" ? "bg-blue-500 text-white" : "bg-slate-950/50 text-slate-400"}`} onClick={() => setTrend("histogram")}>Histogram</button>
      </div>

      {trend === "supply_consumption" && <LineChart title="Cluster Supply vs Consumption" labels={labels} series={[{ name: "Supply", values: supply, color: "#2563eb" }, { name: "Used", values: consumption, color: "#10b981" }]} />}
      {trend === "qty_on_site" && <LineChart title="Estimated Diesel Qty by Cluster" labels={labels} series={[{ name: "Estimated Qty", values: qtyOnSite, color: "#38bdf8" }]} />}
      {trend === "runout_days" && <BarRiskChart title="Average Days to Runout by Cluster" labels={labels} values={runout} />}
      {trend === "histogram" && <ClusterHistogram title="Cluster Abnormal Site Histogram" labels={labels} values={abnormal} onClusterClick={openClusterDetail} />}
    </div>
  );
}

function buildClusterTrendRows(insights: SiteDieselInsight[]) {
  const groups = new Map<string, SiteDieselInsight[]>();
  for (const row of insights) {
    const key = row.cluster || "Unassigned";
    groups.set(key, [...(groups.get(key) || []), row]);
  }

  return [...groups.entries()].map(([cluster, rows]) => {
    const qtySupplied = rows.reduce((sum, row) => sum + Number(row.qty_supplied_cycle || 0), 0);
    const qtyUsed = rows.reduce((sum, row) => sum + Number(row.qty_used_cycle || 0), 0);
    const estimatedQty = rows.reduce((sum, row) => sum + Number(row.estimated_current_diesel || row.current_diesel_level || 0), 0);
    const validRunout = rows.map((row) => Number(row.runout_days)).filter((value) => Number.isFinite(value));
    const avgRunout = validRunout.length ? Number((validRunout.reduce((sum, value) => sum + value, 0) / validRunout.length).toFixed(1)) : 0;
    const abnormalSites = rows.filter((row) => Number(row.runout_days) <= 3 || Number(row.cpd_last_10_days) > Number(row.recommended_cpd) * 1.25 || Math.abs(Number(row.field_vs_system_variance || 0)) > 150).length;
    return {
      cluster,
      site_count: rows.length,
      qty_supplied_cycle: Math.round(qtySupplied),
      qty_used_cycle: Math.round(qtyUsed),
      estimated_current_diesel: Math.round(estimatedQty),
      avg_runout_days: avgRunout,
      abnormal_sites: abnormalSites,
    };
  }).sort((a, b) => a.cluster.localeCompare(b.cluster));
}

function LineChart({ title, labels, series }: { title: string; labels: string[]; series: { name: string; values: number[]; color: string }[] }) {
  const allValues = series.flatMap((item) => item.values);
  const max = Math.max(...allValues, 1);
  const width = 240;
  const height = 150;
  const pad = 18;
  const chartWidth = width - pad * 2;
  const chartHeight = height - pad * 2;

  function points(values: number[]) {
    if (values.length <= 1) return "";
    return values.map((value, index) => {
      const x = pad + (index / Math.max(values.length - 1, 1)) * chartWidth;
      const y = height - pad - (value / max) * chartHeight;
      return `${x},${y}`;
    }).join(" ");
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-white">{title}</p>
        <div className="flex gap-3 text-[10px] text-slate-400">
          {series.map((item) => <span key={item.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span>)}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full rounded-2xl border border-slate-700/60 bg-slate-950/30 p-2">
        {[0.25, 0.5, 0.75].map((line) => <line key={line} x1={pad} x2={width - pad} y1={pad + line * chartHeight} y2={pad + line * chartHeight} stroke="rgba(148,163,184,.12)" />)}
        {series.map((item) => <polyline key={item.name} points={points(item.values)} fill="none" stroke={item.color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />)}
        {series.map((item) => item.values.map((value, index) => {
          const x = pad + (index / Math.max(item.values.length - 1, 1)) * chartWidth;
          const y = height - pad - (value / max) * chartHeight;
          return <circle key={`${item.name}-${index}`} cx={x} cy={y} r="2.5" fill={item.color} />;
        }))}
      </svg>
      <div className="mt-2 flex justify-between gap-1 overflow-hidden text-[9px] text-slate-500">
        {labels.slice(0, 8).map((label) => <span key={label} className="truncate">{label}</span>)}
      </div>
    </div>
  );
}

function BarRiskChart({ title, labels, values }: { title: string; labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-white">{title}</p>
      <div className="space-y-2 rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3">
        {values.map((value, index) => {
          const danger = value <= 2;
          const watch = value > 2 && value <= 5;
          return (
            <div key={`${labels[index]}-${index}`} className="grid grid-cols-[92px_1fr_48px] items-center gap-2 text-xs">
              <span className="truncate text-slate-300">{labels[index]}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${danger ? "bg-red-500" : watch ? "bg-orange-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
              </div>
              <span className={`text-right font-bold ${danger ? "text-red-400" : watch ? "text-orange-400" : "text-emerald-400"}`}>{value}d</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClusterHistogram({ title, labels, values, onClusterClick }: { title: string; labels: string[]; values: number[]; onClusterClick?: (cluster: string) => void }) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-white">{title}</p>
      <div className="flex h-56 items-end gap-2 overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-950/30 p-4">
        {values.map((value, index) => {
          const height = Math.max(10, (value / max) * 170);
          const danger = value >= 3;
          return (
            <button key={`${labels[index]}-hist`} className="flex min-w-[38px] flex-col items-center justify-end gap-2" onClick={() => onClusterClick?.(labels[index])}>
              <span className={`text-xs font-black ${danger ? "text-red-400" : value > 0 ? "text-orange-400" : "text-emerald-400"}`}>{value}</span>
              <div className={`w-7 rounded-t-xl ${danger ? "bg-red-500" : value > 0 ? "bg-orange-500" : "bg-emerald-500"}`} style={{ height }} />
              <span className="max-w-[48px] truncate text-[9px] text-slate-400">{labels[index]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RunoutRiskPanel({ insights, openSiteDetail, openClusterDetail, currentUser }: any) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"days_asc" | "days_desc" | "name_asc">("days_asc");
  const higherLevel = ["EFS", "MRTO", "Admin", "RTO"].includes(currentUser?.role || "");
  const filtered = [...insights]
    .filter((row: SiteDieselInsight) => `${row.site_id} ${row.cluster}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a: SiteDieselInsight, b: SiteDieselInsight) => {
      if (sortMode === "name_asc") return a.site_id.localeCompare(b.site_id);
      const aDays = Number(a.runout_days || 999);
      const bDays = Number(b.runout_days || 999);
      return sortMode === "days_asc" ? aDays - bDays : bDays - aDays;
    });
  const clusterRows = buildClusterTrendRows(filtered);

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Runout Risk</h3><span className="text-xs text-slate-400">Filterable</span></div>
      <div className="mb-3 rounded-2xl border border-slate-700/60 bg-slate-950/40 px-3 py-2">
        <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" placeholder="Filter by site or cluster..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <button className={`rounded-xl px-3 py-2 text-[10px] font-bold ${sortMode === "days_asc" ? "bg-blue-500" : "bg-slate-950/50 text-slate-400"}`} onClick={() => setSortMode("days_asc")}>Lowest Days</button>
        <button className={`rounded-xl px-3 py-2 text-[10px] font-bold ${sortMode === "days_desc" ? "bg-blue-500" : "bg-slate-950/50 text-slate-400"}`} onClick={() => setSortMode("days_desc")}>Highest Days</button>
        <button className={`rounded-xl px-3 py-2 text-[10px] font-bold ${sortMode === "name_asc" ? "bg-blue-500" : "bg-slate-950/50 text-slate-400"}`} onClick={() => setSortMode("name_asc")}>A-Z</button>
      </div>
      {higherLevel && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-bold text-slate-400">Clusters</p>
          {clusterRows.map((row) => <button key={row.cluster} className="flex w-full items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3 text-left" onClick={() => openClusterDetail(row.cluster)}><div><p className="font-bold text-white">{row.cluster}</p><p className="text-xs text-slate-400">{row.site_count} sites • {row.abnormal_sites} abnormal</p></div><p className="text-sm font-bold text-orange-400">Avg {row.avg_runout_days}d</p></button>)}
        </div>
      )}
      <div className="space-y-2">
        {filtered.map((row: SiteDieselInsight) => <RiskPill key={row.site_id} row={row} openSiteDetail={openSiteDetail} />)}
        {!filtered.length && <p className="py-4 text-center text-sm text-slate-400">No matching runout record.</p>}
      </div>
    </GlassCard>
  );
}

function RiskPill({ row, openSiteDetail }: { row: SiteDieselInsight; openSiteDetail?: (siteId: string) => void }) {
  const critical = Number(row.runout_days) <= 2;
  const siteRating = getSiteConsumptionRating(Number(row.cpd_last_10_days || row.recommended_cpd || 0));
  return <button className="mb-2 flex w-full items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3 text-left transition hover:bg-slate-900/70" onClick={() => openSiteDetail?.(row.site_id)}><div><div className="flex items-center gap-2"><p className="font-bold">{row.site_id}</p><SiteRatingBadge rating={siteRating} /></div><p className="text-xs text-slate-400">{row.cluster} • CPD {row.cpd_last_10_days}L/day • Runout {row.runout_days}d</p><p className="mt-1 text-[10px] text-slate-500">{siteRating.summary}</p></div><span className={`rounded-xl px-3 py-1 text-xs font-bold ${critical ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"}`}>{critical ? "Critical" : "Watch"}</span></button>;
}

function SafetyPulse() {
  return <div className="grid grid-cols-2 gap-3"><MiniMetric label="Unsafe Flags" value="0" trend="no open blockers" /><MiniMetric label="Evidence Closure" value="Active" trend="required before approval" /></div>;
}

function ApprovalsScreen({ approvals, currentUser, insights, dieselTransactions, approveTask, disputeTask }: any) {
  return (
    <Screen title="Approvals">
      <ApprovalChain role={currentUser.role} />
      <GlassCard>
        <div className="mb-3 flex justify-between"><h2 className="font-bold">Pending Approvals</h2><span className="text-xs text-blue-400">View all</span></div>
        <div className="space-y-3">
          {approvals.length ? approvals.map((task: SiteAction) => <ApprovalCard key={task.id} task={task} insight={insights.find((row: SiteDieselInsight) => row.site_id === task.site_id)} dieselTransactions={dieselTransactions} approveTask={approveTask} disputeTask={disputeTask} />) : <p className="text-sm text-slate-400">No approval waiting at your level.</p>}
        </div>
      </GlassCard>
      <GlassCard>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Approval Summary</h2><span className="text-xs text-slate-400">Today</span></div>
        <div className="grid grid-cols-2 items-center gap-4"><ProgressRing value={approvals.length ? 66 : 100} label="Approval Health" /><div className="space-y-2 text-sm"><SummaryDot color="bg-emerald-400" label="Approved" value="Active" /><SummaryDot color="bg-orange-400" label="Pending" value={approvals.length} /><SummaryDot color="bg-red-400" label="Rejected" value="0" /></div></div>
      </GlassCard>
    </Screen>
  );
}

function SummaryDot({ color, label, value }: any) {
  return <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span className="text-slate-300">{label}</span></div><span className="font-bold">{value}</span></div>;
}

function SummaryScreen({ kind, sites, insights, tasks, approvals, dieselTransactions, deliveryPlans, runAction, createDeliveryPlan, goTo, openSiteDetail }: any) {
  const [query, setQuery] = useState("");
  const titleMap: Record<SummaryKind, string> = {
    sites: "Sites Summary",
    near_runout: "Near Runout Sites",
    risks: "Open Risk Summary",
    approvals: "Approval Summary",
    cpd: "CPD Summary",
    supply: "Supply Summary",
  };

  const baseRows =
    kind === "near_runout"
      ? insights.filter((row: SiteDieselInsight) => Number(row.runout_days) <= 3)
      : kind === "cpd"
      ? [...insights].sort((a: SiteDieselInsight, b: SiteDieselInsight) => Number(b.cpd_last_10_days) - Number(a.cpd_last_10_days))
      : kind === "supply"
      ? insights
      : kind === "approvals"
      ? approvals
      : kind === "risks"
      ? insights.filter((row: SiteDieselInsight) => Number(row.runout_days) <= 3 || Number(row.cpd_last_10_days) > Number(row.recommended_cpd) * 1.25)
      : sites;

  const rows = baseRows.filter((row: any) => {
    const linkedSite = sites.find((site: Site) => site.site_id === row.site_id);
    const text = getSearchableText(row, linkedSite);
    return text.includes(query.toLowerCase());
  });
  const displayedRows = query ? rows : rows.slice(0, 60);
  const suggestions = rows.slice(0, 12).map((row: any) => row.site_id || row.msp_cluster || row.cluster || row.action_type).filter(Boolean);

  return (
    <Screen title={titleMap[kind]}>
      <GlassCard>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">{titleMap[kind]}</h3>
            <p className="text-xs text-slate-400">Search, open a site, then review diesel, CPD, supply history, tasks, and map details.</p>
          </div>
          <button className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-blue-400" onClick={() => goTo("home")}>Back</button>
        </div>

        <div className="mb-3">
          <SmartSearchBox query={query} setQuery={setQuery} placeholder="Search site, cluster, state, status or task..." suggestions={suggestions} />
          {!query && rows.length > displayedRows.length && <p className="mt-2 text-[10px] text-slate-500">Showing first {displayedRows.length} of {rows.length}. Search to narrow results instantly.</p>}
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <SummaryMini label="Showing" value={displayedRows.length} />
          <SummaryMini label="Total" value={baseRows.length} />
          <SummaryMini label="Type" value={kind.replace("_", " ")} />
        </div>

        <div className="max-h-[62vh] space-y-3 overflow-auto pr-1">
          {kind === "approvals" ? displayedRows.map((task: SiteAction) => <SummaryTaskItem key={task.id} task={task} openSiteDetail={openSiteDetail} />) :
            kind === "sites" ? displayedRows.map((site: Site) => <SummarySiteItem key={site.site_id} site={site} insight={insights.find((row: SiteDieselInsight) => row.site_id === site.site_id)} openSiteDetail={openSiteDetail} />) :
            displayedRows.map((row: SiteDieselInsight) => <SummaryDieselItem key={row.site_id} row={row} site={sites.find((site: Site) => site.site_id === row.site_id)} activePlan={getActivePlan(row.site_id, deliveryPlans || [])} allowPlanning={kind === "near_runout"} runAction={runAction} createDeliveryPlan={createDeliveryPlan} lastSupply={getLastSupplyForSite(row.site_id, dieselTransactions || [])} openSiteDetail={openSiteDetail} />)}
          {!rows.length && <p className="py-6 text-center text-sm text-slate-400">No matching data available.</p>}
        </div>
      </GlassCard>
    </Screen>
  );
}

function SummaryMini({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-2 text-center"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-sm font-black capitalize text-white">{value}</p></div>;
}

function SummarySiteItem({ site, insight, openSiteDetail }: { site: Site; insight?: SiteDieselInsight; openSiteDetail: (siteId: string) => void }) {
  const siteRating = getSiteConsumptionRating(Number(insight?.cpd_last_10_days || insight?.recommended_cpd || 0));
  return (
    <button className="w-full rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3 text-left transition hover:bg-slate-900/70 active:scale-[0.99]" onClick={() => openSiteDetail(site.site_id)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><p className="font-bold text-white">{site.site_id}</p><SiteRatingBadge rating={siteRating} /></div>
          <p className="truncate text-xs text-slate-400">{site.deprecated_address_name || "No site alias"}</p>
          <p className="mt-1 text-xs text-slate-500">{site.msp_cluster || "-"} • {site.state || "-"}</p>
          <p className="mt-1 text-[10px] text-slate-500">{siteRating.className}: {siteRating.summary}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-emerald-400">{insight?.current_diesel_level ?? "-"} L</p>
          <p className="text-[10px] text-slate-500">estimated now</p>
          <p className="text-xs text-orange-400">{insight?.runout_days ?? "-"} days</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">{siteRating.summary}</p>
      <p className="mt-2 text-[11px] text-blue-400">Open site intelligence ›</p>
    </button>
  );
}

function SummaryDieselItem({ row, site, activePlan, allowPlanning, runAction, createDeliveryPlan, lastSupply, openSiteDetail }: { row: SiteDieselInsight; site?: Site; activePlan?: DeliveryPlan; allowPlanning?: boolean; runAction?: any; createDeliveryPlan?: any; lastSupply?: DieselTx; openSiteDetail: (siteId: string) => void }) {
  const estimated = getEstimatedDieselLevel(row, lastSupply);
  const siteRating = getSiteConsumptionRating(Number(row.cpd_last_10_days || row.recommended_cpd || 0));
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3 transition hover:bg-slate-900/70">
      <button className="w-full text-left" onClick={() => openSiteDetail(row.site_id)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><p className="font-bold text-white">{row.site_id}</p><SiteRatingBadge rating={siteRating} /></div>
            <p className="text-xs text-slate-400">{row.cluster} • {siteRating.className}</p>
            <p className="mt-1 text-xs text-slate-500">Last field reading: {row.current_diesel_level}L • Estimated: {estimated ?? row.estimated_current_diesel}L</p>
            <p className="mt-1 text-xs text-slate-500">Last supply: {lastSupply?.qty_supplied ? `${lastSupply.qty_supplied}L` : "No supply record"} {lastSupply?.transaction_date ? `on ${new Date(lastSupply.transaction_date).toLocaleDateString()}` : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-orange-400">{row.runout_days} day(s)</p>
            <p className="text-[10px] text-slate-500">runout risk</p>
            <p className="text-xs text-blue-400">CPD {row.cpd_last_10_days}L</p>
          </div>
        </div>
      </button>

      {allowPlanning && (
        activePlan ? (
          <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
            <p className="text-xs font-bold text-emerald-400">Already Planned</p>
            <p className="text-xs text-slate-300">{activePlan.planned_qty_litres || 0}L planned for {activePlan.dispatch_date || "-"}</p>
            <p className="text-[10px] text-slate-500">{activePlan.route_name || activePlan.route_group || "Diesel route"}</p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {site?.is_truckable === true ? (
              <button
                className="w-full rounded-xl bg-blue-500 px-2 py-2 text-[10px] font-bold text-white"
                onClick={() => site && runAction?.(() => createDeliveryPlan(site, row), "Truck supply planned")}
              >
                Plan Truck Supply
              </button>
            ) : (
              <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-2 text-[10px] text-orange-300">
                Non-truckable site. Use S2S, manual/keg supply, or access escalation.
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <button className="rounded-xl border border-orange-400/40 px-2 py-2 text-[10px] font-bold text-orange-400" onClick={() => openSiteDetail(row.site_id)}>S2S Review</button>
              <button className="rounded-xl border border-slate-600 px-2 py-2 text-[10px] font-bold text-slate-300" onClick={() => openSiteDetail(row.site_id)}>Spot Check</button>
              <button className="rounded-xl border border-red-400/40 px-2 py-2 text-[10px] font-bold text-red-400" onClick={() => openSiteDetail(row.site_id)}>{site?.is_truckable === true ? "Escalate Delay" : "Access / Keg"}</button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function CapexRow({ row }: { row: UserCapexRating }) {
  return (
    <div className="border-t border-slate-700/50 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RatingMedallion row={row} />
            <div>
              <p className="font-bold">{row.name}</p>
              <p className="text-xs text-slate-400">{row.role} • {row.characterClass}</p>
              <p className="text-[10px] text-slate-500">{row.badgeTheme} • {row.relicTitle}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">{row.characterSummary}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-blue-400">{row.score}</p>
          <p className="text-xs text-slate-400">Lv {row.frontendLevel} • Grade {row.grade}</p>
          <p className="text-[10px] text-slate-500">Backend {row.backendLevel}</p>
        </div>
      </div>
    </div>
  );
}

function RatingMedallion({ row, character, level, size = "md" }: { row?: UserCapexRating; character?: string; level?: number; size?: "sm" | "md" }) {
  const ratedCharacter = row?.character || character || "Sparrow";
  const ratedLevel = row?.frontendLevel || level || 1;
  const palette = row?.colorPalette || ["#101827", "#36558F", "#D6E0F0", "#9FB3C8"];
  const symbol = ratedCharacter === "Eagle" ? "🦅" : ratedCharacter === "Hawk" ? "🪶" : ratedCharacter === "Ostrich" ? "◇" : ratedCharacter === "Falcon" ? "◆" : "✦";
  const boxSize = size === "sm" ? "h-11 w-11" : "h-12 w-12";
  return (
    <div className={`relative flex ${boxSize} shrink-0 items-center justify-center rounded-2xl border shadow-lg`} style={{ borderColor: palette[2], background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`, boxShadow: `0 0 22px ${palette[1]}55` }}>
      <span className="text-lg" style={{ color: palette[2] }}>{symbol}</span>
      <span className="absolute -bottom-1 -right-1 rounded-full border px-1.5 py-0.5 text-[9px] font-black" style={{ background: palette[2], color: palette[0], borderColor: palette[3] }}>{ratedLevel}</span>
    </div>
  );
}

function SiteRatingBadge({ rating }: { rating: SiteConsumptionRating }) {
  const tone = rating.tone === "green" ? "text-emerald-400 border-emerald-400/30 bg-emerald-500/10" : rating.tone === "blue" ? "text-blue-400 border-blue-400/30 bg-blue-500/10" : rating.tone === "orange" ? "text-orange-400 border-orange-400/30 bg-orange-500/10" : rating.tone === "red" ? "text-red-400 border-red-400/30 bg-red-500/10" : "text-purple-400 border-purple-400/30 bg-purple-500/10";
  return <span className={`rounded-xl border px-2 py-1 text-[10px] font-bold ${tone}`}>{rating.character}</span>;
}

function ApprovalChain({ role }: { role: UserRole }) {
  const roles: UserRole[] = ["EFS", "Supervisor", "Team Lead", "MRTO", "Admin"];
  return <GlassCard><div className="flex items-center justify-between">{roles.map((item) => <div key={item} className="text-center"><div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${role === item ? "bg-purple-500 text-white" : "bg-blue-500/10 text-blue-400"}`}><ShieldCheck className="h-4 w-4" /></div><p className="mt-2 text-[10px] text-slate-300">{item}</p>{role === item && <p className="text-[9px] text-purple-400">You</p>}</div>)}</div></GlassCard>;
}

function ApprovalCard({ task, insight, dieselTransactions, approveTask, disputeTask }: any) {
  const [comment, setComment] = useState("");
  const lastSupply = getLastSupplyForSite(task.site_id, dieselTransactions || []);
  const estimated = getEstimatedDieselLevel(insight, lastSupply);
  const fieldLevel = Number(insight?.current_diesel_level || 0);
  const variance = estimated !== null && Number.isFinite(fieldLevel) ? Number((fieldLevel - estimated).toFixed(2)) : null;
  const siteRating = getSiteConsumptionRating(Number(insight?.cpd_last_10_days || insight?.recommended_cpd || 0));

  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"><FileText /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><p className="font-bold">{task.site_id}</p><SiteRatingBadge rating={siteRating} /></div>
              <p className="text-xs text-slate-400">{task.action_type} • Level: {task.current_approval_level || "-"}</p>
              <p className="text-[10px] text-slate-500">{siteRating.className}: {siteRating.summary}</p>
            </div>
            <span className="rounded-lg border border-orange-400/40 px-2 py-1 text-xs text-orange-400">{task.execution_status || "Pending"}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <PreviewMetric label="Qty Supplied" value={lastSupply ? `${Number(lastSupply.qty_supplied || 0)} L` : "No record"} />
            <PreviewMetric label="Date Supplied" value={lastSupply?.transaction_date ? new Date(lastSupply.transaction_date).toLocaleDateString() : "-"} />
            <PreviewMetric label="Last Field Diesel Reading" value={insight?.current_diesel_level !== undefined ? `${insight.current_diesel_level} L` : "-"} />
            <PreviewMetric label="Estimated Current Diesel" value={estimated !== null ? `${estimated} L` : "-"} />
            <PreviewMetric label="CPD Last 10 Days" value={insight?.cpd_last_10_days !== undefined ? `${insight.cpd_last_10_days} L/day` : "-"} />
            <PreviewMetric label="Runout" value={insight?.runout_days !== undefined ? `${insight.runout_days} day(s)` : "-"} />
          </div>

          <div className="mt-3 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
            <p className="text-xs text-slate-400">Field vs System Variance</p>
            <p className={`mt-1 text-lg font-black ${variance !== null && variance < -50 ? "text-red-400" : "text-emerald-400"}`}>
              {variance !== null ? `${variance} L field vs estimate` : "Insufficient supply/spot-check data"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Latest spot check: {insight?.latest_spot_check && insight.latest_spot_check !== "-" ? new Date(insight.latest_spot_check).toLocaleString() : "-"}</p>
          </div>

          <p className="mt-3 text-xs text-slate-400">{task.recommendation || "No recommendation captured."}</p>
          <input className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-white" placeholder="Approval / dispute comment" value={comment} onChange={(event) => setComment(event.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="flex-1 rounded-xl border border-red-400/40 py-2 text-xs font-bold text-red-400" onClick={() => disputeTask(task, comment)}>Dispute</button>
        <button className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold" onClick={() => approveTask(task, comment)}>Approve</button>
      </div>
    </GlassCard>
  );
}

function PreviewMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-2"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>;
}

function getLastSupplyForSite(siteId: string, dieselTransactions: DieselTx[]) {
  return dieselTransactions
    .filter((tx) => tx.site_id === siteId)
    .sort((a, b) => new Date(b.transaction_date || b.created_at || 0).getTime() - new Date(a.transaction_date || a.created_at || 0).getTime())[0];
}

function getEstimatedDieselLevel(insight: SiteDieselInsight | undefined, lastSupply: DieselTx | undefined) {
  if (!lastSupply) return null;
  const supplyDate = new Date(lastSupply.transaction_date || lastSupply.created_at || 0);
  if (Number.isNaN(supplyDate.getTime())) return null;
  const baseline = Number(lastSupply.initial_dip || 0) + Number(lastSupply.qty_supplied || 0);
  const cpd = Number(insight?.cpd_last_10_days || insight?.recommended_cpd || 0);
  const days = Math.max(daysBetween(supplyDate, new Date()), 0);
  return Number(Math.max(baseline - cpd * days, 0).toFixed(2));
}



function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 animate-in fade-in duration-500 lg:col-span-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">NeoEra Console</p>
          <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function TaskCard({ task, currentUser, startTask, openTaskDetail }: any) {
  const canAct = task.assigned_to_role === currentUser?.role || task.current_approval_level === currentUser?.role || ["Admin", "RTO"].includes(currentUser?.role);
  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3">
        <button className="min-w-0 text-left" onClick={() => openTaskDetail?.(task.id)}>
          <p className="font-bold text-white">{task.site_id}</p>
          <p className="text-xs text-slate-400">{task.action_type} • {task.execution_status || task.status || "Pending"}</p>
          <p className="mt-1 text-[11px] text-slate-500">{task.recommendation || task.status || "No recommendation yet."}</p>
        </button>
        <span className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-300">{task.current_approval_level || task.assigned_to_role || "-"}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300" onClick={() => openTaskDetail?.(task.id)}>View Details</button>
        <button className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-40" disabled={!canAct} onClick={() => startTask?.(task)}>Take Action</button>
      </div>
    </GlassCard>
  );
}

function InsightRow({ row, openSiteDetail }: { row: SiteDieselInsight; openSiteDetail?: (siteId: string) => void }) {
  const varianceTone = getVarianceTone(row.field_vs_system_variance);
  const rating = getSiteConsumptionRating(Number(row.cpd_last_10_days || row.recommended_cpd || 0));
  return (
    <button className="mb-2 w-full rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3 text-left transition hover:bg-slate-900/70" onClick={() => openSiteDetail?.(row.site_id)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><p className="font-bold text-white">{row.site_id}</p><SiteRatingBadge rating={rating} /></div>
          <p className="text-xs text-slate-400">{row.cluster} • CPD {row.cpd_last_10_days}L/day • Runout {row.runout_days}d</p>
          <p className={`mt-1 text-[11px] ${varianceTone}`}>{getVarianceLabel(row.field_vs_system_variance)} • Variance {row.field_vs_system_variance}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-500" />
      </div>
    </button>
  );
}

function SummaryTaskItem({ task, openSiteDetail }: { task: SiteAction; openSiteDetail: (siteId: string) => void }) {
  return (
    <button className="w-full rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3 text-left" onClick={() => openSiteDetail(task.site_id)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-white">{task.site_id}</p>
          <p className="text-xs text-slate-400">{task.action_type} • {task.execution_status || task.status || "Pending"}</p>
        </div>
        <span className="rounded-xl border border-slate-600 px-2 py-1 text-[10px] text-slate-300">{task.current_approval_level || "-"}</span>
      </div>
    </button>
  );
}

function ProfileScreen({ user, users, sites, canCreateTasks, canAssignUsers, setPage, logout }: any) {
  return (
    <Screen title="Profile">
      <GlassCard>
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400"><User className="h-7 w-7" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black">{user.name || user.phone || user.email}</p>
            <p className="text-sm text-slate-400">{user.role} • {user.phone || user.email}</p>
            <p className="mt-1 text-xs text-slate-500">{sites.length} visible site(s)</p>
          </div>
        </div>
      </GlassCard>
      <div className="grid gap-3 md:grid-cols-2">
        {canCreateTasks && <QuickAction icon={<Plus className="h-5 w-5" />} label="Create Task" onClick={() => setPage("create_task")} />}
        <QuickAction icon={<Activity className="h-5 w-5" />} label="Recent Activity" onClick={() => setPage("recent_activity")} />
        <QuickAction icon={<MapPin className="h-5 w-5" />} label="Map View" onClick={() => setPage("map_view")} />
        <QuickAction icon={<Database className="h-5 w-5" />} label="Upload Center" onClick={() => setPage("upload_center")} />
      </div>
      <GlassCard>
        <p className="text-sm text-slate-400">Users loaded: {users.length}. Assignment control is backend-driven by phone-number ownership.</p>
        {canAssignUsers && <p className="mt-2 text-xs text-blue-300">Admin/management controls active.</p>}
        <button className="mt-4 w-full rounded-2xl border border-red-400/40 px-4 py-3 text-sm font-bold text-red-300" onClick={logout}>Log out</button>
      </GlassCard>
    </Screen>
  );
}

function RecentActivityScreen({ activities, goBack, openTaskDetail, openSiteDetail }: any) {
  const [query, setQuery] = useState("");
  const filtered = activities.filter((activity: RecentActivity) => `${activity.description} ${activity.actor_name} ${activity.entity_id}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Screen title="Recent Activity">
      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold">Activity Stream</p>
          <button className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-blue-400" onClick={goBack}>Back</button>
        </div>
        <SmartSearchBox query={query} setQuery={setQuery} placeholder="Search activity, user, site..." suggestions={filtered.slice(0, 10).map((x: RecentActivity) => x.entity_id || x.action_type)} />
      </GlassCard>
      <div className="space-y-3">
        {filtered.map((activity: RecentActivity) => (
          <button key={activity.id} className="w-full text-left" onClick={() => activity.entity_type === "site_actions" ? openTaskDetail?.(activity.entity_id) : activity.entity_id ? openSiteDetail?.(activity.entity_id) : null}>
            <ActivityRow activity={activity} />
          </button>
        ))}
        {!filtered.length && <EmptyState title="No activity found" text="No matching activity record." />}
      </div>
    </Screen>
  );
}

function MapViewScreen({ sites, insights, openSiteDetail, goBack }: any) {
  const [query, setQuery] = useState("");
  const filtered = sites.filter((site: Site) => getSearchableText(site).includes(query.toLowerCase()));
  return (
    <Screen title="Map View">
      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold">Site Map Intelligence</p>
          <button className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-blue-400" onClick={goBack}>Back</button>
        </div>
        <SmartSearchBox query={query} setQuery={setQuery} suggestions={filtered.slice(0, 10).map((site: Site) => site.site_id)} />
        <div className="mt-4"><LiveMapCard /></div>
      </GlassCard>
      <div className="space-y-2">
        {filtered.slice(0, query ? 100 : 30).map((site: Site) => {
          const insight = insights.find((row: SiteDieselInsight) => row.site_id === site.site_id);
          return <SummarySiteItem key={site.site_id} site={site} insight={insight} openSiteDetail={openSiteDetail} />;
        })}
      </div>
    </Screen>
  );
}

function SiteDetailScreen({ site, insight, tasks, dieselTransactions, spotChecks, openTaskDetail, goBack }: any) {
  if (!site) return <Screen title="Site Detail"><EmptyState title="Site not found" text="The selected site is not in your visible bucket." /></Screen>;
  const lastSupply = getLastSupplyForSite(site.site_id, dieselTransactions || []);
  const siteRating = getSiteConsumptionRating(Number(insight?.cpd_last_10_days || insight?.recommended_cpd || 0));
  return (
    <Screen title={site.site_id}>
      <GlassCard>
        <button className="mb-3 rounded-xl border border-slate-700 px-3 py-2 text-xs text-blue-400" onClick={goBack}>Back</button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><h3 className="text-xl font-black">{site.site_id}</h3><SiteRatingBadge rating={siteRating} /></div>
            <p className="mt-1 text-sm text-slate-400">{site.msp_cluster || "-"} • {site.state || "-"}</p>
            <p className="mt-1 text-xs text-slate-500">{site.deprecated_address_name || "No alias captured"}</p>
          </div>
          <span className={`rounded-xl border px-2 py-1 text-xs ${site.is_truckable ? "border-emerald-400/40 text-emerald-400" : "border-orange-400/40 text-orange-400"}`}>{site.is_truckable ? "Truckable" : "Non-truckable"}</span>
        </div>
      </GlassCard>
      <div className="grid grid-cols-2 gap-3">
        <TacticalMetric label="Current Diesel" value={`${insight?.current_diesel_level ?? "-"}L`} detail="last field reading" tone="cyan" />
        <TacticalMetric label="Estimated Diesel" value={`${insight?.estimated_current_diesel ?? "-"}L`} detail="system calculated" tone="blue" />
        <TacticalMetric label="Runout Days" value={insight?.runout_days ?? "-"} detail={insight?.runout_date || "no runout date"} tone="amber" />
        <TacticalMetric label="CPD" value={`${insight?.cpd_last_10_days ?? "-"}L`} detail="10-day average" tone="green" />
      </div>
      <GlassCard>
        <h3 className="mb-3 font-bold">Supply Timeline</h3>
        <div className="space-y-2">
          {(dieselTransactions || []).slice(0, 20).map((tx: DieselTx) => <PreviewMetric key={tx.id} label={tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString() : "Supply"} value={`${tx.qty_supplied || 0}L supplied • Initial dip ${tx.initial_dip || 0}L`} />)}
          {!dieselTransactions?.length && <p className="text-sm text-slate-400">No supply record for this site.</p>}
        </div>
      </GlassCard>
      <GlassCard>
        <h3 className="mb-3 font-bold">Tasks & Spot Checks</h3>
        <div className="space-y-2">
          {(tasks || []).slice(0, 10).map((task: SiteAction) => <button key={task.id} className="w-full rounded-xl border border-slate-700 p-3 text-left text-sm" onClick={() => openTaskDetail(task.id)}>{task.action_type} • {task.execution_status || task.status}</button>)}
          {(spotChecks || []).slice(0, 5).map((spot: SpotCheck) => <PreviewMetric key={spot.id} label={spot.check_date ? new Date(spot.check_date).toLocaleString() : "Spot check"} value={`${spot.diesel_level || 0}L • CPD ${spot.revised_consumption_per_day || spot.consumption_per_day || 0}L/day`} />)}
        </div>
      </GlassCard>
    </Screen>
  );
}

function TaskDetailScreen({ task, site, insight, dieselTransactions, spotChecks, startTask, approveTask, disputeTask, goBack }: any) {
  const [comment, setComment] = useState("");
  if (!task) return <Screen title="Task Detail"><EmptyState title="Task not found" text="The selected task is not in your visible queue." /></Screen>;
  return (
    <Screen title="Task Detail">
      <GlassCard>
        <button className="mb-3 rounded-xl border border-slate-700 px-3 py-2 text-xs text-blue-400" onClick={goBack}>Back</button>
        <p className="text-xl font-black">{task.site_id}</p>
        <p className="text-sm text-slate-400">{task.action_type} • {task.execution_status || task.status}</p>
        <p className="mt-2 text-xs text-slate-500">{task.recommendation || "No recommendation captured."}</p>
      </GlassCard>
      <SiteDetailScreen site={site} insight={insight} tasks={[task]} dieselTransactions={dieselTransactions} spotChecks={spotChecks} openTaskDetail={() => null} goBack={goBack} />
      <GlassCard>
        <input className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-white" placeholder="Approval or dispute comment" value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-bold" onClick={() => startTask(task)}>Take Action</button>
          <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold" onClick={() => approveTask(task, comment)}>Approve</button>
          <button className="rounded-xl border border-red-400/40 px-3 py-2 text-xs font-bold text-red-400" onClick={() => disputeTask(task, comment)}>Dispute</button>
        </div>
      </GlassCard>
    </Screen>
  );
}

function ClusterDetailScreen({ cluster, sites, insights, dieselTransactions, openSiteDetail, goBack }: any) {
  const [query, setQuery] = useState("");
  const filtered = sites.filter((site: Site) => getSearchableText(site).includes(query.toLowerCase()));
  const runout = insights.filter((row: SiteDieselInsight) => Number(row.runout_days) <= 3).length;
  return (
    <Screen title={cluster || "Cluster Detail"}>
      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold">{cluster}</p>
          <button className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-blue-400" onClick={goBack}>Back</button>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <SummaryMini label="Sites" value={sites.length} />
          <SummaryMini label="Runout" value={runout} />
          <SummaryMini label="Supply Tx" value={dieselTransactions.length} />
        </div>
        <SmartSearchBox query={query} setQuery={setQuery} suggestions={filtered.slice(0, 10).map((site: Site) => site.site_id)} />
      </GlassCard>
      <div className="space-y-2">
        {filtered.map((site: Site) => <SummarySiteItem key={site.site_id} site={site} insight={insights.find((row: SiteDieselInsight) => row.site_id === site.site_id)} openSiteDetail={openSiteDetail} />)}
      </div>
    </Screen>
  );
}

function parseSimpleCsv(text: string) {
  const lines = text.trim().replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce((acc: any, header, index) => {
      acc[header] = (values[index] || "").trim();
      return acc;
    }, {});
  });
}

function downloadTemplateCsv(filename: string, headers: string[]) {
  const blob = new Blob([headers.join(",") + "\n"], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function UploadCenterScreen({ currentUser, runAction, refresh, goBack }: any) {
  const [uploadType, setUploadType] = useState<"spot_check" | "supply">("spot_check");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const spotHeaders = ["site_id","total_qty_supplied","date_of_first_supply","diesel_level_before_supply","cpd","date_of_last_visit","diesel_level_on_last_visit","dg_capacity"];
  const supplyHeaders = ["site_id","transaction_date","qty_supplied","initial_dip","supply_ref"];

  function handleFile(file?: File) {
    if (!file) return;
    file.text().then((value) => setPreviewRows(parseSimpleCsv(value)));
  }

  async function submitUpload() {
    const actorName = currentUser?.name || currentUser?.phone || currentUser?.email || "User";
    const actorPhone = currentUser?.phone || null;
    const actorEmail = currentUser?.email || null;
    const status = ["Admin", "RTO"].includes(currentUser?.role) ? "Approved" : "Pending MRTO Approval";

    if (!previewRows.length) throw new Error("Upload a CSV first.");

    if (uploadType === "spot_check") {
      const rows = previewRows.map((row) => {
        const diesel = Number(row.diesel_level_on_last_visit || 0);
        const cpd = Number(row.cpd || 0);
        const baseDate = row.date_of_last_visit ? new Date(row.date_of_last_visit) : new Date();
        const runOutDate = diesel > 0 && cpd > 0 && !Number.isNaN(baseDate.getTime()) ? new Date(baseDate.getTime() + Math.ceil(diesel / cpd) * 86400000).toISOString() : null;
        const dgCapacity = Number(row.dg_capacity || 0);
        return {
          site_id: row.site_id,
          check_date: row.date_of_last_visit || new Date().toISOString(),
          diesel_level: diesel,
          dg_capacity: dgCapacity,
          dg_type: dgCapacity === 12 || dgCapacity === 17 ? "DCDG" : "ACDG",
          consumption_per_day: cpd,
          revised_consumption_per_day: cpd,
          run_out_date: runOutDate,
          total_qty_supplied: Number(row.total_qty_supplied || 0),
          diesel_level_before_supply: Number(row.diesel_level_before_supply || 0),
          date_of_first_supply: row.date_of_first_supply || null,
          approval_status: status,
          upload_source: "Upload Center",
          created_by_phone: actorPhone,
          created_by_email: actorEmail,
          check_shift: "Bulk Upload",
        };
      });
      const { error } = await supabase.from("spot_checks").insert(rows);
      if (error) throw error;
    } else {
      const rows = previewRows.map((row) => ({
        site_id: row.site_id,
        transaction_date: row.transaction_date || new Date().toISOString(),
        qty_supplied: Number(row.qty_supplied || 0),
        initial_dip: Number(row.initial_dip || 0),
        supply_ref: row.supply_ref || null,
        transaction_type: "Supply",
        approval_status: status,
        status,
        created_by_phone: actorPhone,
        created_by_email: actorEmail,
      }));
      const { error } = await supabase.from("diesel_transactions").insert(rows);
      if (error) throw error;
    }

    await supabase.from("recent_activities").insert({
      actor_email: actorEmail,
      actor_phone: actorPhone,
      actor_name: actorName,
      action_type: "Bulk Upload",
      description: `${actorName} updated ${uploadType === "spot_check" ? "spot-check" : "supply"} records via Upload Center — ${previewRows.length} row(s). Status: ${status}.`,
      entity_type: uploadType,
      entity_id: "bulk_upload",
    });

    setPreviewRows([]);
    await refresh();
  }

  return (
    <Screen title="Upload Center">
      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-bold">Bulk Operational Upload</p>
            <p className="text-xs text-slate-400">Admin uploads auto-approve. EFS/MRTO uploads enter approval logic.</p>
          </div>
          <button className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-blue-400" onClick={goBack}>Back</button>
        </div>
        <Segment tabs={["spot_check", "supply"]} active={uploadType} setActive={setUploadType} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300" onClick={() => downloadTemplateCsv(uploadType === "spot_check" ? "neoera_spot_check_template.csv" : "neoera_supply_template.csv", uploadType === "spot_check" ? spotHeaders : supplyHeaders)}>Download Template</button>
          <label className="rounded-xl bg-blue-500 px-3 py-2 text-center text-xs font-bold text-white">
            Upload CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
          </label>
        </div>
      </GlassCard>
      <GlassCard>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold">Preview</p>
          <span className="text-xs text-slate-400">{previewRows.length} row(s)</span>
        </div>
        <div className="max-h-80 overflow-auto rounded-2xl border border-slate-700 bg-slate-950/30">
          <pre className="p-3 text-[10px] text-slate-300">{JSON.stringify(previewRows.slice(0, 10), null, 2)}</pre>
        </div>
        <button className="mt-3 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white" onClick={() => runAction(submitUpload, "Upload posted")}>Post Upload</button>
      </GlassCard>
    </Screen>
  );
}

function CreateTaskScreen({ sites, users, taskType, setTaskType, selectedSite, setSelectedSite, selectedAssignee, setSelectedAssignee, createTask }: any) {
  const [query, setQuery] = useState("");
  const filteredSites = sites.filter((site: Site) => getSearchableText(site).includes(query.toLowerCase()));
  return (
    <Screen title="Create Task">
      <GlassCard>
        <Field label="Task Type"><Select value={taskType} onChange={setTaskType} options={TASK_TYPES} /></Field>
        <Field label="Search Site"><SmartSearchBox query={query} setQuery={setQuery} suggestions={filteredSites.slice(0, 8).map((site: Site) => site.site_id)} /></Field>
        <Field label="Site"><Select value={selectedSite} onChange={setSelectedSite} options={["", ...filteredSites.slice(0, query ? 200 : 60).map((site: Site) => site.site_id)]} /></Field>
        <Field label="Assignee"><Select value={selectedAssignee} onChange={setSelectedAssignee} options={["", ...users.map((user: AppUser) => user.email).filter(Boolean)]} /></Field>
        <button className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-bold text-white" onClick={createTask}>Create Task</button>
      </GlassCard>
    </Screen>
  );
}

function ActionTaskScreen({ task, selectedSite, setSelectedSite, sites, supplyDate, setSupplyDate, initialDip, setInitialDip, qtySupplied, setQtySupplied, spotCheckDate, setSpotCheckDate, dieselLevel, setDieselLevel, dgCapacity, setDgCapacity, closureNote, setClosureNote, unsafeCondition, setUnsafeCondition, recommendedAction, setRecommendedAction, submitSpotCheck, submitSupply }: any) {
  const isSupply = task?.action_type === "Supply Request" || task?.action_type === "Diesel Movement";
  return (
    <Screen title="Action Task">
      <GlassCard>
        <p className="mb-3 text-sm text-slate-400">{task?.action_type} • {task?.site_id}</p>
        <Field label="Site"><Select value={selectedSite} onChange={setSelectedSite} options={["", ...sites.map((site: Site) => site.site_id)]} /></Field>
        {isSupply ? (
          <>
            <Field label="Supply Date"><DarkInput type="date" value={supplyDate} onChange={setSupplyDate} /></Field>
            <Field label="Initial Dip"><DarkInput value={initialDip} onChange={setInitialDip} /></Field>
            <Field label="Qty Supplied"><DarkInput value={qtySupplied} onChange={setQtySupplied} /></Field>
          </>
        ) : (
          <>
            <Field label="Spot Check Date"><DarkInput type="datetime-local" value={spotCheckDate} onChange={setSpotCheckDate} /></Field>
            <Field label="DG Capacity"><DarkInput value={dgCapacity} onChange={setDgCapacity} /></Field>
            <Field label="Diesel Level"><DarkInput value={dieselLevel} onChange={setDieselLevel} /></Field>
          </>
        )}
        <Field label="Closure Note"><DarkInput value={closureNote} onChange={setClosureNote} /></Field>
        <Field label="Unsafe Condition"><Select value={unsafeCondition} onChange={setUnsafeCondition} options={["No", "Yes"]} /></Field>
        {unsafeCondition === "Yes" && <Field label="Recommended Action"><DarkInput value={recommendedAction} onChange={setRecommendedAction} /></Field>}
        <button className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-white" onClick={isSupply ? submitSupply : submitSpotCheck}>{isSupply ? "Submit Supply" : "Submit Spot Check"}</button>
      </GlassCard>
    </Screen>
  );
}


function Segment({ tabs, active, setActive }: any) {
  return (
    <div className="flex gap-1 overflow-auto rounded-2xl border border-slate-700 bg-slate-950/40 p-1">
      {tabs.map((tab: string) => (
        <button
          key={tab}
          className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold ${active === tab ? "bg-blue-500 text-white" : "text-slate-400"}`}
          onClick={() => setActive(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function StatMini({ label, value, danger }: any) {
  return (
    <GlassCard className="p-3 text-center">
      <p className={`text-xl font-black ${danger ? "text-orange-400" : "text-emerald-400"}`}>{value}</p>
      <p className="mt-1 text-[10px] text-slate-400">{label}</p>
    </GlassCard>
  );
}

function QuickAction({ icon, label, onClick }: any) {
  return <button className="rounded-2xl border border-slate-700 bg-[#0b1d2d] p-4 text-center" onClick={onClick}><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">{icon}</div><p className="text-sm">{label}</p></button>;
}

function Field({ label, children }: any) {
  return <div className="mb-3"><label className="mb-1 block text-xs font-semibold text-slate-400">{label}</label>{children}</div>;
}

function Select({ value, onChange, options }: any) {
  return <select className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option: string) => <option key={option || "empty"} value={option}>{option || "Select"}</option>)}</select>;
}

function DarkInput({ value, onChange, type = "text" }: any) {
  return <input className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white" type={type} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function BottomNav({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const items = [
    { key: "home", label: "Home", icon: <Home /> },
    { key: "operations", label: "Operations", icon: <ClipboardList /> },
    { key: "intelligence", label: "Intelligence", icon: <BarChart3 /> },
    { key: "approvals", label: "Approvals", icon: <ShieldCheck /> },
    { key: "profile", label: "More", icon: <User /> },
  ] as const;
  return <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-[460px] rounded-t-[28px] md:max-w-3xl lg:max-w-6xl xl:max-w-7xl border border-slate-700 bg-[#071421]/95 px-4 py-3 shadow-2xl"><div className="flex justify-between">{items.map((item) => <button key={item.key} className={`flex flex-col items-center gap-1 text-[10px] ${page === item.key ? "text-blue-400" : "text-slate-400"}`} onClick={() => setPage(item.key as Page)}>{React.cloneElement(item.icon, { className: "h-5 w-5" })}<span>{item.label}</span></button>)}</div></nav>;
}

function FloatingAction({ onClick }: { onClick: () => void }) {
  return <button className="fixed bottom-14 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500 text-white shadow-2xl shadow-blue-500/30" onClick={onClick}><Plus className="h-8 w-8" /></button>;
}

function CompletionSheet({ state, closeCompletion, openSiteDetail }: any) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 px-4 pb-20">
      <div className="w-full max-w-md rounded-[28px] border border-emerald-400/30 bg-[#081827] p-5 shadow-2xl shadow-black/70">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-white">{state.title}</p>
            <p className="mt-1 text-sm text-slate-400">{state.message}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="rounded-2xl border border-slate-700 bg-slate-950/50 px-3 py-3 text-sm font-bold text-slate-200" onClick={() => closeCompletion(state.primaryPage)}>
            Continue Workflow
          </button>
          <button className="rounded-2xl bg-blue-500 px-3 py-3 text-sm font-bold text-white" onClick={openSiteDetail}>
            View Site Intel
          </button>
        </div>
        {state.secondaryPage && <button className="mt-2 w-full rounded-2xl border border-slate-700 px-3 py-3 text-sm font-bold text-blue-400" onClick={() => closeCompletion(state.secondaryPage)}>
          Go to related page
        </button>}
      </div>
    </div>
  );
}

function UiFeedback({ uiState }: { uiState: UiState }) {
  return <>{uiState.loading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="rounded-2xl bg-slate-900 p-6 text-white"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" /><p className="text-sm font-medium">Processing...</p></div></div>}{uiState.message && !uiState.loading && <div className={`fixed bottom-24 right-5 z-50 rounded-xl px-4 py-3 text-sm shadow-lg ${uiState.success ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>{uiState.message}</div>}</>;
}
