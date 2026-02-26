import clsx from "clsx";

export function Button({ className, variant="primary", ...props }) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition";
  const styles = {
    primary: "text-white bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:opacity-95",
    ghost: "bg-white border border-gray-200 hover:bg-gray-50",
    soft: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    danger: "bg-red-600 text-white hover:opacity-95",
  };
  return <button className={clsx(base, styles[variant], className)} {...props} />;
}