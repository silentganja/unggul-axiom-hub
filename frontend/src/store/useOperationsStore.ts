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

const INITIAL_TASKS: ApprovalTask[] = [];

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
