import React from "react";

interface DigiPostLogoProps {
  className?: string;
  iconOnly?: boolean;
}

export const DigiPostLogo: React.FC<DigiPostLogoProps> = ({
  className = "",
  iconOnly = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-[#555ad5] flex items-center justify-center text-white shrink-0 shadow-xs">
        {/* Envelope icon matching screenshots */}
        <svg
          className="w-4.5 h-4.5 text-white stroke-[2.2]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      {!iconOnly && (
        <span className="text-xl font-extrabold tracking-tight text-[#212634]">
          DigiPost
        </span>
      )}
    </div>
  );
};
