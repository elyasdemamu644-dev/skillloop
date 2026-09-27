// Curated photography used across the app. Unsplash hotlinks are stable and
// served from images.unsplash.com; PicSum is the fallback if a URL ever
// breaks, so the UI degrades gracefully instead of showing broken images.

const CATEGORY_IMAGES: Record<string, string> = {
  technology:
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=60",
  business:
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=60",
  languages:
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=60",
  music:
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=60",
  photography:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=60",
  cooking:
    "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=900&q=60",
  arts: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=900&q=60",
  fitness:
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=60",
  sports:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=60",
  automotive:
    "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=60",
  agriculture:
    "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=60",
  crafts:
    "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=60",
  education:
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=60",
  career:
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=60",
  "home improvement":
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=60",
};

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=70";
export const AUTH_IMAGE =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=70";
export const LOOP_IMAGE =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=70";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Deterministic, topic-appropriate photo for a category (or skill) name.
export function categoryImage(categoryName: string, seed = ""): string {
  const image = CATEGORY_IMAGES[categoryName?.toLowerCase()];
  if (image) return image;
  return `https://picsum.photos/seed/${encodeURIComponent(seed || categoryName || "skillloop")}/900/600`;
}

// Stable "real person" avatar, generated deterministically from any id.
export function avatarFor(seed: string): string {
  const n = (hashString(seed || "user") % 70) + 1;
  return `https://i.pravatar.cc/160?img=${n}`;
}

export function userInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}