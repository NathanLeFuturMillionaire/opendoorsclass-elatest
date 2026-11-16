import { describe, expect, it } from "vitest";
import { rwAttachmentKind, rwCheckAttachment, rwReceipt, rwSafeFileName } from "./rw-chat";

describe("rw chat", () => {
  it("accepts allowed types and rejects others", () => {
    expect(rwAttachmentKind("image/jpeg")).toBe("image");
    expect(rwAttachmentKind("application/pdf")).toBe("file");
    expect(rwAttachmentKind("application/x-msdownload")).toBeNull();
  });
  it("rejects files over 50 MB", () => {
    expect(rwCheckAttachment({ type: "video/mp4", size: 51 * 1024 * 1024 })).not.toBeNull();
    expect(rwCheckAttachment({ type: "video/mp4", size: 10 })).toBeNull();
  });
  it("computes receipts", () => {
    const at = "2026-01-01T10:00:00Z";
    expect(rwReceipt(at, [{ last_read_at: "2026-01-01T09:00:00Z", last_seen_at: "2026-01-01T09:00:00Z" }])).toBe("sent");
    expect(rwReceipt(at, [{ last_read_at: "2026-01-01T09:00:00Z", last_seen_at: "2026-01-01T11:00:00Z" }])).toBe("delivered");
    expect(rwReceipt(at, [{ last_read_at: "2026-01-01T11:00:00Z", last_seen_at: "2026-01-01T11:00:00Z" }])).toBe("read");
  });
  it("sanitizes file names", () => {
    expect(rwSafeFileName("Leçon été 1.pdf")).toBe("Lecon_ete_1.pdf");
  });
});
