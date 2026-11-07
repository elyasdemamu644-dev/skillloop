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

// Self-contained placeholders used when a category has no curated photo: a
// gradient SVG. Keeping them local means the UI never depends on a random-image
// service (which would also leak every visitor's IP to a third party).
const FALLBACK_GRADIENTS = [
  ["#4338ca", "#0ea5e9"],
  ["#be123c", "#f59e0b"],
  ["#047857", "#14b8a6"],
  ["#7c3aed", "#ec4899"],
] as const;

function fallbackImage(seed: string): string {
  const [from, to] = FALLBACK_GRADIENTS[hashString(seed || "skillloop") % FALLBACK_GRADIENTS.length];
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">' +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>` +
    '</linearGradient></defs><rect width="900" height="600" fill="url(#g)"/></svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Deterministic, topic-appropriate photo for a category (or skill) name.
export function categoryImage(categoryName: string, seed = ""): string {
  const image = CATEGORY_IMAGES[categoryName?.toLowerCase()];
  return image ?? fallbackImage(seed || categoryName);
}

// Deterministic gradient for initials-based avatars. Tailwind only emits
// classes it can see as literal strings, so the palette lives here verbatim.
const AVATAR_GRADIENTS = [
  "from-rose-500 to-orange-400",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-400",
  "from-violet-500 to-fuchsia-500",
  "from-amber-500 to-pink-500",
  "from-cyan-500 to-blue-500",
] as const;

export function avatarGradient(seed: string): string {
  return AVATAR_GRADIENTS[hashString(seed || "user") % AVATAR_GRADIENTS.length];
}

export function userInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}