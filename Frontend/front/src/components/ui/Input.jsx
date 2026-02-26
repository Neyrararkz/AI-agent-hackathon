import clsx from "clsx";

export function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 outline-none focus:border-indigo-400 focus:bg-white",
        className
      )}
      {...props}
    />
  );
}