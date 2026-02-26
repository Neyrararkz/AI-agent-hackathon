import clsx from "clsx";

export function Skeleton({ className }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-xl bg-gray-100",
        className
      )}
    />
  );
}