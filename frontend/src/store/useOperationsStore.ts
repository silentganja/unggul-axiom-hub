import { create } from "zustand";
import { useFileStore } from "./useFileStore";

export interface ApprovalTask {
  id: string;
  title: string;
  type: "FINANCE" | "BLUEPRINT" | "HR_OPS";
  requestedBy: string;
  amountValue: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  relatedFileId: string;
  timestamp: string;
}

interface OperationsState {
  tasks: ApprovalTask[];
  approveTask: (id: string) => void;
  rejectTask: (id: string) => void;
}

const INITIAL_TASKS: ApprovalTask[] = [
  {
    id: "task-1",
    title: "Q3 APAC Budget Sign-off",
    type: "FINANCE",
    requestedBy: "Marcus Vance",
    amountValue: "$1,200,000",
    status: "PENDING",
    relatedFileId: "f-1",
    timestamp: "2026-05-21 14:32",
  },
  {
    id: "task-2",
    title: "System Architecture Blueprint V3 Approval",
    type: "BLUEPRINT",
    requestedBy: "Elena Rostova",
    amountValue: "v3.0-RC1",
    status: "PENDING",
    relatedFileId: "sub-1-1",
    timestamp: "2026-05-20 10:15",
  },
  {
    id: "task-3",
    title: "Q1 HR Operations Protocol Revision",
    type: "HR_OPS",
    requestedBy: "David Chen",
    amountValue: "Authorized Rev 2",
    status: "APPROVED",
    relatedFileId: "f-4",
    timestamp: "2026-05-18 11:20",
  },
];

export const useOperationsStore = create<OperationsState>((set) => ({
  tasks: INITIAL_TASKS,

  approveTask: (id) =>
    set((state) => {
      const updatedTasks = state.tasks.map((task) => {
        if (task.id === id) {
          // Unlock the associated file in the file store
          useFileStore.getState().unlockFile(task.relatedFileId);
          return { ...task, status: "APPROVED" as const };
        }
        return task;
      });
      return { tasks: updatedTasks };
    }),

  rejectTask: (id) =>
    set((state) => {
      const updatedTasks = state.tasks.map((task) => {
        if (task.id === id) {
          // Unlock the associated file in the file store
          useFileStore.getState().unlockFile(task.relatedFileId);
          return { ...task, status: "REJECTED" as const };
        }
        return task;
      });
      return { tasks: updatedTasks };
    }),
}));
