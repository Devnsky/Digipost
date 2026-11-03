import React from "react";
import { DocumentStatus, ReviewStage } from "../lib/types";

interface StatusBadgeProps {
  status: DocumentStatus;
  reviewStage?: ReviewStage;
  className?: string;
  hasRevision?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  reviewStage,
  className = "",
  hasRevision = false,
}) => {
  if (status === "draft") {
    if (reviewStage === "checker") {
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#f0effe] text-[#555ad5] border border-[#e0e7ff] ${className}`}
        >
          Menunggu pemeriksaan atasan
        </span>
      );
    }
    return (
      <div className="inline-flex flex-col items-start">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[#f3f4f6] text-[#4b5563] ${className}`}
        >
          Draft
        </span>
        {hasRevision && (
          <span className="text-[10px] text-rose-600 font-semibold mt-0.5">
            Revisi diminta
          </span>
        )}
      </div>
    );
  }

  if (status === "pending") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[#fef3c7] text-[#92400e] ${className}`}
      >
        Pending
      </span>
    );
  }

  if (status === "approved") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[#ecfdf5] text-[#065f46] ${className}`}
      >
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[#fef2f2] text-[#991b1b] ${className}`}
      >
        Rejected
      </span>
    );
  }

  if (status === "canceled") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[#f3f4f6] text-[#6b7280] ${className}`}
      >
        Canceled
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[#f3f4f6] text-[#4b5563] ${className}`}
    >
      {status}
    </span>
  );
};

export const DecisionBadge: React.FC<{
  decision: "approved" | "rejected" | null;
  className?: string;
}> = ({ decision, className = "" }) => {
  if (decision === "approved") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[#ecfdf5] text-[#065f46] ${className}`}
      >
        Approved
      </span>
    );
  }
  if (decision === "rejected") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[#fef2f2] text-[#991b1b] ${className}`}
      >
        Rejected
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#f3f4f6] text-[#717684] ${className}`}
    >
      Belum memutuskan
    </span>
  );
};
