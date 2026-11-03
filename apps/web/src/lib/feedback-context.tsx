import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
  Trash2,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger" | "success" | "warning";
}

interface FeedbackContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(
  undefined,
);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Confirm modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // TOAST METHODS
  // ---------------------------------------------------------------------------
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  const toast = {
    success: (message: string, title?: string) =>
      addToast("success", message, title),
    error: (message: string, title?: string) =>
      addToast("error", message, title),
    warning: (message: string, title?: string) =>
      addToast("warning", message, title),
    info: (message: string, title?: string) => addToast("info", message, title),
  };

  // ---------------------------------------------------------------------------
  // CONFIRM MODAL METHOD (Promise-based)
  // ---------------------------------------------------------------------------
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve: (result: boolean) => {
          setConfirmState(null);
          resolve(result);
        },
      });
    });
  }, []);

  const handleConfirmAction = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
    }
  };

  // Handle ESC key for Confirm Modal
  useEffect(() => {
    if (!confirmState?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleConfirmAction(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmState]);

  // Focus trap for Confirm Modal
  const confirmCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (confirmState?.isOpen && confirmCardRef.current) {
      const focusable = confirmCardRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length > 0) {
        focusable[focusable.length - 1]?.focus(); // Default focus confirm button
      }
    }
  }, [confirmState]);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {/* =====================================================================
          TOAST CONTAINER (Floating at top-right)
         ===================================================================== */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((item) => {
          const typeConfig = {
            success: {
              borderClass: "border-emerald-200 bg-white",
              iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
              Icon: CheckCircle2,
            },
            error: {
              borderClass: "border-rose-200 bg-white",
              iconBg: "bg-rose-50 text-rose-600 border border-rose-100",
              Icon: AlertCircle,
            },
            warning: {
              borderClass: "border-amber-200 bg-white",
              iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
              Icon: AlertTriangle,
            },
            info: {
              borderClass: "border-[#dadafa] bg-white",
              iconBg: "bg-[#f0effe] text-[#555ad5] border border-[#dadafa]",
              Icon: Info,
            },
          }[item.type];

          const IconComponent = typeConfig.Icon;

          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto rounded-2xl border p-4 shadow-xl flex items-start gap-3 transition-all duration-300 transform translate-y-0 opacity-100 ${typeConfig.borderClass}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${typeConfig.iconBg}`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {item.title && (
                  <h4 className="text-xs font-bold text-[#212634] leading-tight mb-0.5">
                    {item.title}
                  </h4>
                )}
                <p className="text-xs text-[#717684] leading-relaxed break-words">
                  {item.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(item.id)}
                title="Tutup pemberitahuan"
                className="text-[#8a90a2] hover:text-[#212634] p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          CUSTOM CONFIRM MODAL (Design System Compliant, No SweetAlert, No Native Prompt)
         ===================================================================== */}
      {confirmState?.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9998] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleConfirmAction(false);
            }
          }}
        >
          <div
            ref={confirmCardRef}
            className="bg-white rounded-3xl border border-[#e9ebf0] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmState.options.variant === "danger"
                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                    : confirmState.options.variant === "success"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : confirmState.options.variant === "warning"
                        ? "bg-amber-50 text-amber-600 border border-amber-100"
                        : "bg-[#f0effe] text-[#555ad5] border border-[#dadafa]"
                }`}
              >
                {confirmState.options.variant === "danger" ? (
                  <Trash2 className="w-6 h-6" />
                ) : confirmState.options.variant === "success" ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : confirmState.options.variant === "warning" ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[#212634] leading-tight">
                  {confirmState.options.title}
                </h3>
                <p className="text-xs text-[#717684] leading-relaxed mt-1.5">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#f0f2f5]">
              <button
                type="button"
                onClick={() => handleConfirmAction(false)}
                className="px-4 py-2.5 rounded-xl border border-[#e9ebf0] bg-white text-xs font-semibold text-[#4b5563] hover:bg-slate-50 transition cursor-pointer"
              >
                {confirmState.options.cancelText || "Batal"}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAction(true)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer ${
                  confirmState.options.variant === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : confirmState.options.variant === "success"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : confirmState.options.variant === "warning"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-[#555ad5] hover:bg-[#484ec7] text-white"
                }`}
              >
                {confirmState.options.confirmText || "Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return context;
}

export function useToast() {
  return useFeedback().toast;
}

export function useConfirm() {
  return useFeedback().confirm;
}

