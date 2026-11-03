import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../lib/feedback-context";
import { Department } from "../../lib/types";
import {
  Upload,
  AlertCircle,
  ArrowLeft,
  Check,
  FileCheck,
  UserCheck,
  Info,
} from "lucide-react";

interface CreateDocumentPageProps {
  onNavigate: (path: string) => void;
  onSelectDocument: (id: number) => void;
}

export const CreateDocumentPage: React.FC<CreateDocumentPageProps> = ({
  onNavigate,
  onSelectDocument,
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.departments
      .list()
      .then((data) => setDepartments(data))
      .catch((err) =>
        setError(err.message || "Gagal memuat daftar departemen"),
      );
  }, []);

  const toggleDept = (deptId: number) => {
    if (selectedDepts.includes(deptId)) {
      setSelectedDepts(selectedDepts.filter((id) => id !== deptId));
    } else {
      setSelectedDepts([...selectedDepts, deptId]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];
      const validExts = [".pdf", ".docx", ".doc"];
      const ext = selected.name
        .substring(selected.name.lastIndexOf("."))
        .toLowerCase();

      if (!validTypes.includes(selected.type) && !validExts.includes(ext)) {
        setError("Hanya format PDF dan Word (.docx) yang diperbolehkan.");
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setError("Ukuran berkas melebihi batas maksimal 10 MB.");
        return;
      }
      setError("");
      setFile(selected);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Judul dokumen wajib diisi.");
      return;
    }
    if (!description.trim()) {
      setError("Deskripsi dokumen wajib diisi.");
      return;
    }
    if (!file) {
      setError("Berkas lampiran dokumen wajib diunggah.");
      return;
    }
    if (selectedDepts.length === 0) {
      setError("Pilih minimal satu departemen tujuan.");
      return;
    }

    // Role conflict guard (SRS BR-01)
    const conflictingDept = departments.find(
      (d) => selectedDepts.includes(d.id) && Number(d.manager_id) === user?.id,
    );
    if (conflictingDept) {
      setError(
        `Konflik peran: Anda adalah Manajer dari ${conflictingDept.name}. Sistem melarang persetujuan oleh pemohon sendiri.`,
      );
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("department_ids", JSON.stringify(selectedDepts));
      formData.append("file", file);

      const res = await api.documents.create(formData);
      toast.success("Draft dokumen berhasil dibuat.");
      const newDocId = res.document.id;
      onSelectDocument(newDocId);
    } catch (err: any) {
      setError(err.message || "Gagal membuat dokumen");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Navigation & Header matching Screenshot 13 */}
      <div>
        <button
          onClick={() => onNavigate("/documents")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e9ebf0] bg-white text-xs font-semibold text-[#212634] hover:bg-slate-50 transition cursor-pointer mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a90a2] block">
              Applicant / Penyusunan
            </span>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#212634] tracking-tight">
              Buat dokumen
            </h1>
          </div>
          <div className="self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f1f2fb] text-[#555ad5] text-xs font-semibold border border-[#e0e2fa]">
              Draft &middot; Applicant
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSaveDraft} className="space-y-6">
        {/* Top Two Cards: 01 Informasi Dokumen & 02 Departemen Tujuan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Card 01: Informasi Dokumen */}
          <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#212634]">
                01 Informasi dokumen
              </h2>
              <p className="text-xs text-[#717684] mt-0.5">
                Data pokok untuk identifikasi dokumen
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#212634] mb-1.5">
                  Judul dokumen <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Pengadaan Server Database 2026"
                  className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#212634] mb-1.5">
                  Deskripsi atau latar belakang{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tuliskan ringkasan tujuan dokumen dan urgensi pengajuan..."
                  className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#212634] mb-1.5">
                  Checker (Pemeriksa) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#f7f8fc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634]">
                  <UserCheck className="w-4 h-4 text-[#555ad5] shrink-0" />
                  <div className="flex-1 truncate">
                    <span className="font-semibold">
                      {user?.manager_name || "Atasan Langsung"}
                    </span>
                    <span className="text-[#8a90a2] ml-1.5">
                      (Ditentukan otomatis sesuai hierarki organisasi)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#8a90a2] mt-1.5">
                  Checker ditentukan otomatis oleh atasan langsung Anda sesuai
                  struktur organisasi.
                </p>
              </div>
            </div>
          </div>

          {/* Card 02: Departemen Tujuan */}
          <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#212634]">
                02 Departemen tujuan
              </h2>
              <p className="text-xs text-[#717684] mt-0.5">
                Pilih minimal 1 departemen yang wajib menyetujui
              </p>
            </div>

            <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
              {departments.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8a90a2]">
                  Memuat daftar departemen...
                </div>
              ) : (
                departments.map((dept) => {
                  const isSelected = selectedDepts.includes(dept.id);
                  const isConflict = Number(dept.manager_id) === user?.id;

                  return (
                    <div
                      key={dept.id}
                      onClick={() => !isConflict && toggleDept(dept.id)}
                      className={`p-3.5 rounded-xl border transition flex items-start gap-3 select-none ${
                        isConflict
                          ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                          : isSelected
                            ? "bg-[#f0effe]/50 border-[#555ad5] cursor-pointer"
                            : "bg-white border-[#e9ebf0] hover:border-[#cbd0dd] cursor-pointer"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? "bg-[#555ad5] text-white"
                            : "border border-[#cbd0dd] bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#212634]">
                            {dept.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {dept.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#717684] mt-0.5">
                          {isConflict ? (
                            <span className="text-rose-600 font-medium">
                              Konflik peran: Anda adalah manajer departemen ini
                            </span>
                          ) : (
                            <span>
                              Manajer:{" "}
                              {dept.manager_name || "Pejabat Departemen"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Card 03: Lampiran Dokumen */}
        <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#212634]">
              03 Lampiran dokumen
            </h2>
            <p className="text-xs text-[#717684] mt-0.5">
              Unggah berkas yang akan diperiksa dan disetujui
            </p>
          </div>

          {/* Upload Dropzone */}
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center gap-2 ${
                file
                  ? "border-emerald-300 bg-emerald-50/20"
                  : "border-[#e9ebf0] hover:border-[#555ad5] bg-[#fbfbfc] hover:bg-[#f0effe]/20"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  file
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-[#f0effe] text-[#555ad5]"
                }`}
              >
                {file ? (
                  <FileCheck className="w-6 h-6" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>

              {file ? (
                <div>
                  <p className="text-xs font-bold text-[#212634]">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-[#717684] mt-0.5">
                    {formatFileSize(file.size)} &middot; Berkas terpilih
                    &middot; Klik untuk mengganti
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-[#212634]">
                    Klik atau seret file ke area ini
                  </p>
                  <p className="text-[11px] text-[#717684] mt-0.5">
                    Pilih satu file dokumen (PDF atau DOCX, maksimal 10 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Notice Strip matching Screenshot 13 */}
          <div className="bg-[#f3f4fd] border border-[#e0e2fa] p-4 rounded-xl flex items-start gap-3">
            <Info className="w-4 h-4 text-[#555ad5] shrink-0 mt-0.5" />
            <p className="text-xs text-[#3a3e84] leading-relaxed">
              Setelah disimpan sebagai draft, Anda dapat memeriksa kembali
              detail sebelum mengajukan ke Checker untuk persetujuan tingkat
              pertama.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Menyimpan draft..." : "Simpan draft"}
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/documents")}
              className="px-4 py-2.5 rounded-xl border border-[#e9ebf0] bg-white text-[#212634] text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Kembali tanpa menyimpan
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
