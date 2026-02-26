import { useEffect } from "react";
import clsx from "clsx";

export function Modal({ open, title, children, onClose, className }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={clsx(
            "w-full max-w-xl rounded-3xl bg-white shadow-xl border border-gray-100",
            className
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="text-lg font-black text-gray-900">{title}</div>
            <button
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-sm font-semibold border border-gray-200 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}