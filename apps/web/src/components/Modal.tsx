import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "5xl";
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "md",
  showCloseButton = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep onClose reference up to date without triggering focus re-runs
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Handle open/close state & initial focus strictly when isOpen changes
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
        previouslyFocusedElement.current = null;
      }
      return;
    }

    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";

    // Focus initial element when modal is first opened:
    // Prioritize autoFocus element or first form field (input/textarea/select) over close button
    const timer = setTimeout(() => {
      if (!modalRef.current) return;

      const autoFocusEl = modalRef.current.querySelector<HTMLElement>(
        '[autofocus], [data-autofocus="true"]',
      );
      if (autoFocusEl) {
        autoFocusEl.focus();
        return;
      }

      const firstInput = modalRef.current.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])',
      );
      if (firstInput) {
        firstInput.focus();
        return;
      }

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length > 0) {
        focusable[0]?.focus();
      } else {
        modalRef.current.focus();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle keyboard events (Escape to close, Tab trap)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }

      // Keyboard Focus Trap (Tab & Shift+Tab)
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0f111a]/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-dialog-title" : undefined}
          aria-describedby={subtitle ? "modal-dialog-subtitle" : undefined}
          tabIndex={-1}
          className={`w-full ${maxWidthClass} transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-[#e9ebf0] p-6 sm:p-7 relative focus:outline-none`}
        >
          {showCloseButton && (
            <button
              onClick={onClose}
              aria-label="Tutup modal"
              className="absolute top-5 right-5 text-[#8a90a2] hover:text-[#212634] rounded-lg p-1 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {title && (
            <div className="mb-4 pr-6">
              <h3
                id="modal-dialog-title"
                className="text-lg font-bold text-[#212634]"
              >
                {title}
              </h3>
              {subtitle && (
                <p
                  id="modal-dialog-subtitle"
                  className="text-xs text-[#717684] mt-1 leading-relaxed"
                >
                  {subtitle}
                </p>
              )}
            </div>
          )}

          <div className="max-h-[78vh] overflow-y-auto">{children}</div>

          {footer && (
            <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-[#f0f2f5]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
