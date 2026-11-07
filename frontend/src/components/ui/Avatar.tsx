import { useState } from "react";
import { avatarGradient, userInitials } from "@/utils/images";

interface AvatarProps {
  src?: string | null;
  seed?: string;
  firstName?: string | null;
  lastName?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-lg",
};

/**
 * Renders a user's image when one exists, and falls back to their initials on a
 * deterministic gradient otherwise. No third-party avatar service is contacted:
 * that would leak every visitor's IP to an external host and break offline.
 */
export default function Avatar({
  src,
  seed = "",
  firstName,
  lastName,
  size = "md",
  className = "",
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const gradient = avatarGradient(`${seed}-${firstName}-${lastName}`);
  const label = `${firstName ?? ""} ${lastName ?? ""}`.trim();

  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full bg-brand-100 ring-2 ring-white ${SIZES[size]} ${className}`}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={`grid h-full w-full place-items-center bg-gradient-to-br font-semibold text-white ${gradient}`}
          aria-label={label || "User avatar"}
          role="img"
        >
          {userInitials(firstName, lastName)}
        </span>
      )}
    </span>
  );
}
