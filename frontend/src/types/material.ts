export interface MaterialUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

export interface MaterialSkill {
  id: string;
  name: string;
  slug: string;
  category: { id: string; name: string; slug: string };
}

export interface Material {
  id: string;
  title: string;
  description: string;
  price: number;
  fileNames: string[];
  links: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  teacher: MaterialUser;
  skill: MaterialSkill | null;
  purchaseCount: number;
  purchased?: boolean;
  own?: boolean;
}

export interface MaterialSale {
  id: string;
  pricePaid: number;
  createdAt: string;
  buyer: MaterialUser;
}

export interface MyMaterial extends Material {
  purchaseCount: number;
  revenue: number;
  buyers: MaterialSale[];
}

export interface LibraryItem {
  id: string;
  materialId: string;
  buyerId: string;
  pricePaid: number;
  createdAt: string;
  payment: { id: string; status: string };
  material: Material;
}

export interface MaterialListResponse {
  items: Material[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// Stored names are "<timestamp>_<rand>_<original>" — show the readable part.
export function displayFileName(storedName: string): string {
  const parts = storedName.split("_");
  return parts.length > 2 ? parts.slice(2).join("_") : storedName;
}