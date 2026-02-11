import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((t) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const toast = {
      id,
      type: t?.type || "success", // success | error | info
      title: t?.title || "",
      message: t?.message || "",
      timeout: typeof t?.timeout === "number" ? t.timeout : 2200,
    };

    setToasts((prev) => [...prev, toast]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, toast.timeout);

    return id;
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div className="toastDot" />
            <div className="toastBody">
              {t.title ? <div className="toastTitle">{t.title}</div> : null}
              <div className="toastMsg">{t.message}</div>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast() must be used inside <ToastProvider>");
  return ctx;
}