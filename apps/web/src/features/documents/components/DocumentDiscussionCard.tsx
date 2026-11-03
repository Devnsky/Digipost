import React from "react";
import { MessageSquare, Send } from "lucide-react";
import { ResponseItem, AllowedActions } from "../../../lib/types";

interface DocumentDiscussionCardProps {
  responses: ResponseItem[];
  allowedActions: AllowedActions;
  responseBody: string;
  setResponseBody: (val: string) => void;
  onSendResponse: (e: React.FormEvent) => void;
  actionLoading: boolean;
  formatDateTime: (dateStr?: string) => string;
}

export const DocumentDiscussionCard: React.FC<DocumentDiscussionCardProps> = ({
  responses,
  allowedActions,
  responseBody,
  setResponseBody,
  onSendResponse,
  actionLoading,
  formatDateTime,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#e9ebf0] p-6 shadow-xs space-y-4">
      <div>
        <h2 className="text-sm font-bold text-[#212634]">
          Thread komentar &amp; tanggapan
        </h2>
        <p className="text-xs text-[#717684] mt-0.5">
          Diskusi resmi, catatan revisi, dan tanggapan departemen terkait
        </p>
      </div>

      <div className="space-y-3 pt-1">
        {responses.length === 0 ? (
          <div className="p-8 text-center text-[#717684] bg-[#fbfbfc] rounded-xl border border-[#e9ebf0]">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#8a90a2] stroke-1" />
            <p className="text-xs font-semibold text-[#212634]">
              Belum ada tanggapan atau catatan
            </p>
            <p className="text-[11px] text-[#717684] mt-0.5">
              Komentar Checker dan respon manajer departemen akan muncul di
              sini.
            </p>
          </div>
        ) : (
          responses.map((resp) => {
            const isRevision = resp.type === "revision_request";
            const isComment = resp.type === "comment";

            return (
              <div
                key={resp.id}
                className={`p-4 rounded-xl border transition ${
                  isRevision
                    ? "bg-amber-50/50 border-amber-200"
                    : isComment
                      ? "bg-[#f0effe]/40 border-[#555ad5]/20"
                      : "bg-[#fbfbfc] border-[#e9ebf0]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#f0effe] text-[#555ad5] font-bold text-[10px] flex items-center justify-center">
                      {resp.author_name
                        ? resp.author_name[0].toUpperCase()
                        : "U"}
                    </div>
                    <span className="text-xs font-bold text-[#212634]">
                      {resp.author_name}
                    </span>
                    {resp.department_name && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                        {resp.department_name}
                      </span>
                    )}
                    {isRevision && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Permintaan Revisi
                      </span>
                    )}
                    {isComment && (
                      <span className="px-1.5 py-0.5 rounded bg-[#f0effe] text-[#555ad5] text-[10px] font-semibold">
                        Catatan Checker
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#8a90a2]">
                    {formatDateTime(resp.created_at)}
                  </span>
                </div>
                <p className="text-xs text-[#212634] leading-relaxed pl-8 whitespace-pre-wrap">
                  {resp.body}
                </p>
              </div>
            );
          })
        )}
      </div>

      {allowedActions.can_respond && (
        <form
          onSubmit={onSendResponse}
          className="pt-2 border-t border-[#e9ebf0] space-y-3"
        >
          <label className="block text-xs font-semibold text-[#212634]">
            Tulis Tanggapan Resmi
          </label>
          <textarea
            rows={3}
            value={responseBody}
            onChange={(e) => setResponseBody(e.target.value)}
            placeholder="Ketik tanggapan atau catatan departemen Anda mengenai dokumen ini..."
            className="w-full px-3.5 py-2.5 bg-[#fbfbfc] border border-[#e9ebf0] rounded-xl text-xs text-[#212634] placeholder-[#8a90a2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#555ad5]/20 focus:border-[#555ad5] transition resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={actionLoading || !responseBody.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#555ad5] hover:bg-[#484ec7] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim tanggapan</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
