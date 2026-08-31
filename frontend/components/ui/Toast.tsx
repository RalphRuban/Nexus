"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLE: Record<ToastKind, { icon: React.ReactNode; ring: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    ring: "border-emerald-500/30",
  },
  error: {
    icon: <CircleAlert className="h-4 w-4 text-red-400" />,
    ring: "border-red-500/30",
  },
  info: {
    icon: <Info className="h-4 w-4 text-blue-400" />,
    ring: "border-blue-500/30",
  },
};

let nextToastId = 1;

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextToastId++;

      setToasts((current) => [...current, { id, kind, message }]);

      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[2000] flex w-80 flex-col gap-2">
        {toasts.map((item) => {
          const style = KIND_STYLE[item.kind];

          return (
            <div
              key={item.id}
              className={`animate-slide-up flex items-start gap-2 rounded-lg border bg-slate-950/95 px-3 py-2.5 shadow-xl backdrop-blur ${style.ring}`}
            >
              <span className="mt-0.5 shrink-0">{style.icon}</span>

              <p className="flex-1 text-[11px] leading-4 text-slate-300">
                {item.message}
              </p>

              <button
                onClick={() => dismiss(item.id)}
                className="shrink-0 text-slate-600 transition hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
