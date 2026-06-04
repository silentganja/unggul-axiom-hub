// ─────────────────────────────────────────────────────────────────────────────
// Toast store - Zustand store unit tests (no DOM required)
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from "vitest";
import { useToastStore } from "../Toast";

beforeEach(() => {
  // Reset store to initial state between tests
  useToastStore.setState({ toasts: [] });
});

describe("useToastStore", () => {
  describe("addToast", () => {
    it("adds a toast with default type and duration", () => {
      const id = useToastStore.getState().addToast("File uploaded");
      const toasts = useToastStore.getState().toasts;

      expect(toasts).toHaveLength(1);
      expect(toasts[0].message).toBe("File uploaded");
      expect(toasts[0].type).toBe("info");
      expect(toasts[0].duration).toBe(5000);
    });

    it("generates unique IDs for each toast", () => {
      const id1 = useToastStore.getState().addToast("First");
      const id2 = useToastStore.getState().addToast("Second");
      const id3 = useToastStore.getState().addToast("Third");

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);

      expect(useToastStore.getState().toasts).toHaveLength(3);
    });

    it("sets custom type and duration", () => {
      useToastStore.getState().addToast("Something went wrong", "error", 10000);
      const toast = useToastStore.getState().toasts[0];

      expect(toast.type).toBe("error");
      expect(toast.duration).toBe(10000);
    });
  });

  describe("removeToast", () => {
    it("removes a toast by id", () => {
      const id1 = useToastStore.getState().addToast("Keep me");
      const id2 = useToastStore.getState().addToast("Remove me");

      useToastStore.getState().removeToast(id2);

      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].id).toBe(id1);
    });

    it("is a no-op when removing a non-existent id", () => {
      useToastStore.getState().addToast("Only toast");
      useToastStore.getState().removeToast("non-existent-id");

      expect(useToastStore.getState().toasts).toHaveLength(1);
    });

    it("handles removing from empty toast list", () => {
      expect(() => useToastStore.getState().removeToast("any-id")).not.toThrow();
    });
  });

  describe("convenience methods", () => {
    it("success() creates a success toast with default 5s duration", () => {
      useToastStore.getState().success("Operation complete");
      const toast = useToastStore.getState().toasts[0];
      expect(toast.type).toBe("success");
      expect(toast.duration).toBe(5000);
    });

    it("error() creates an error toast with 8s duration", () => {
      useToastStore.getState().error("Upload failed");
      const toast = useToastStore.getState().toasts[0];
      expect(toast.type).toBe("error");
      expect(toast.duration).toBe(8000);
    });

    it("info() creates an info toast", () => {
      useToastStore.getState().info("3 files synced");
      const toast = useToastStore.getState().toasts[0];
      expect(toast.type).toBe("info");
    });

    it("loading() creates a persistent toast (duration 0)", () => {
      const id = useToastStore.getState().loading("Processing upload...");
      const toast = useToastStore.getState().toasts[0];
      expect(toast.type).toBe("loading");
      expect(toast.duration).toBe(0);
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe("ordering", () => {
    it("preserves insertion order in the toasts array", () => {
      useToastStore.getState().info("First");
      useToastStore.getState().success("Second");
      useToastStore.getState().error("Third");

      const messages = useToastStore.getState().toasts.map((t) => t.message);
      expect(messages).toEqual(["First", "Second", "Third"]);
    });

    it("removes a toast without affecting order of others", () => {
      useToastStore.getState().info("A");
      const idB = useToastStore.getState().addToast("B");
      useToastStore.getState().info("C");

      useToastStore.getState().removeToast(idB);

      const messages = useToastStore.getState().toasts.map((t) => t.message);
      expect(messages).toEqual(["A", "C"]);
    });
  });

  describe("edge cases", () => {
    it("handles very long messages", () => {
      const longMsg = "x".repeat(5000);
      useToastStore.getState().error(longMsg);
      expect(useToastStore.getState().toasts[0].message.length).toBe(5000);
    });

    it("handles empty message", () => {
      useToastStore.getState().info("");
      expect(useToastStore.getState().toasts[0].message).toBe("");
    });

    it("handles rapid add/remove cycles", () => {
      for (let i = 0; i < 50; i++) {
        const id = useToastStore.getState().addToast(`Toast ${i}`);
        useToastStore.getState().removeToast(id);
      }
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });
});
