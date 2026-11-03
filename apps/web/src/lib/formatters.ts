export function formatNumber(num: string | number | undefined): string {
  const val = Number(num) || 0;
  return val.toLocaleString("id-ID");
}

export function formatAuditAction(action: string): string {
  const actionMap: Record<string, string> = {
    create: "Dokumen Dibuat",
    submit: "Diajukan ke Pemeriksa",
    checker_approve: "Disetujui Pemeriksa (Checker)",
    request_revision: "Permintaan Revisi",
    dept_approve: "Persetujuan Departemen Diberikan",
    dept_reject: "Pengajuan Ditolak Departemen",
    cancel: "Pengajuan Dibatalkan Pemohon",
    aggregate: "Keputusan Final Agregasi Sistem",
    upload_version: "Revisi Berkas Diunggah",
    edit_metadata: "Informasi Dokumen Diperbarui",
  };
  return actionMap[action] || action;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "-";
  return (
    new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    ", " +
    new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) +
    " WIB"
  );
}

export function getFirstName(fullName?: string): string {
  if (!fullName) return "";
  return fullName.trim().split(" ")[0];
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
