import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  /** "badge" = filled tile (favicon/app icon feel), "plain" = mark on transparent */
  variant?: "badge" | "plain";
  title?: string;
};

/**
 * CampusVerify brand mark.
 * A hexagonal campus node (research network) whose internal path traces a
 * verification check, with connected nodes at each vertex.
 */
export function BrandMark({ className, variant = "badge", title = "CampusVerify" }: BrandMarkProps) {
  const ink = variant === "badge" ? "#f7f3e8" : "#1f4d33";
  const node = "#d8a72e";
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {variant === "badge" && <rect width="64" height="64" rx="15" fill="#1f4d33" />}

      {/* campus hexagon */}
      <path
        d="M32 7.5 L53.2 19.75 V44.25 L32 56.5 L10.8 44.25 V19.75 Z"
        stroke={ink}
        strokeOpacity={variant === "badge" ? 0.42 : 0.3}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />

      {/* verification path */}
      <path
        d="M20.5 32.2 L28.8 40.4 L45 22.6"
        stroke={ink}
        strokeWidth="5.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* connected research nodes */}
      <circle cx="20.5" cy="32.2" r="4.1" fill={ink} />
      <circle cx="28.8" cy="40.4" r="4.1" fill={ink} />
      <circle cx="45" cy="22.6" r="4.6" fill={node} />
    </svg>
  );
}

export function BrandLockup({
  className,
  markClassName,
  wordClassName,
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <BrandMark className={cn("h-8 w-8", markClassName)} />
      <span className={cn("truncate font-serif leading-none text-primary", wordClassName)}>
        CampusVerify
      </span>
    </span>
  );
}
