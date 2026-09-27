import { avatarFor } from "@/utils/images";

interface AvatarProps {
  src?: string | null;
  seed?: string;
  firstName?: string | null;
  lastName?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

export default function Avatar({ src, seed = "", firstName, lastName, size = "md", className = "" }: AvatarProps) {
  const image = src || avatarFor(`${seed}-${firstName}-${lastName}`);
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-full bg-brand-100 ring-2 ring-white ${SIZES[size]} ${className}`}>
      <img src={image} alt={`${firstName ?? ""} ${lastName ?? ""}`.trim()} className="h-full w-full object-cover" loading="lazy" />
    </span>
  );
}