import { create } from "zustand";

export interface SystemEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: "UPLOAD" | "APPROVE" | "LOCK" | "ACCESS_CHANGE" | "REJECT" | "CREATE_FOLDER" | "RENAME" | "DELETE" | "DOWNLOAD";
  targetResource: string;
  ipAddress: string;
  status: "SUCCESS" | "FAILED" | "WARNING";
}

interface AuditState {
  logs: SystemEvent[];
  logEvent: (event: Omit<SystemEvent, "id" | "timestamp">) => void;
}

const INITIAL_LOGS: SystemEvent[] = [
  {
    id: "evt-101",
    timestamp: "2026-05-21 14:32:10",
    actor: "admin@unggul.axiom",
    action: "LOCK",
    targetResource: "Q3_Financial_Projections.xlsx",
    ipAddress: "10.145.2.89",
    status: "SUCCESS",
  },
  {
    id: "evt-102",
    timestamp: "2026-05-21 14:30:05",
    actor: "marcus.vance@unggulaxiom.com",
    action: "UPLOAD",
    targetResource: "Q3_Financial_Projections.xlsx",
    ipAddress: "10.145.2.110",
    status: "SUCCESS",
  },
  {
    id: "evt-103",
    timestamp: "2026-05-20 10:15:30",
    actor: "elena.rostova@unggulaxiom.com",
    action: "LOCK",
    targetResource: "Blueprint_Q3_System.pdf",
    ipAddress: "10.145.3.45",
    status: "SUCCESS",
  },
  {
    id: "evt-104",
    timestamp: "2026-05-20 09:15:00",
    actor: "elena.rostova@unggulaxiom.com",
    action: "CREATE_FOLDER",
    targetResource: "Architecture_Blueprints",
    ipAddress: "10.145.3.45",
    status: "SUCCESS",
  },
  {
    id: "evt-105",
    timestamp: "2026-05-19 16:45:12",
    actor: "admin@unggul.axiom",
    action: "ACCESS_CHANGE",
    targetResource: "Platform_Security_Framework_v2.pdf",
    ipAddress: "10.145.2.89",
    status: "SUCCESS",
  },
  {
    id: "evt-106",
    timestamp: "2026-05-18 11:20:00",
    actor: "david.chen@unggulaxiom.com",
    action: "UPLOAD",
    targetResource: "Operations_Handbook_2026",
    ipAddress: "10.145.4.12",
    status: "SUCCESS",
  },
  {
    id: "evt-107",
    timestamp: "2026-05-18 11:25:44",
    actor: "admin@unggul.axiom",
    action: "APPROVE",
    targetResource: "Q1 HR Operations Protocol Revision",
    ipAddress: "10.145.2.89",
    status: "SUCCESS",
  },
];

export const useAuditStore = create<AuditState>((set) => ({
  logs: INITIAL_LOGS,
  logEvent: (event) =>
    set((state) => {
      const newEvent: SystemEvent = {
        ...event,
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      };
      return { logs: [newEvent, ...state.logs] };
    }),
}));
