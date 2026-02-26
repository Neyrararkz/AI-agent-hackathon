import clsx from "clsx";

export function Card({ className, ...props }) {
  return (
    <div
      className={clsx("rounded-2xl border border-gray-100 bg-white shadow-sm", className)}
      {...props}
    />
  );
}