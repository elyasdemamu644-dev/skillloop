import { api } from "./api";
import { displayFileName } from "@/types/material";
import type { LibraryItem, Material, MaterialListResponse, MyMaterial } from "@/types/material";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
}

type Pagination = MaterialListResponse["pagination"];

export async function fetchMaterials(params: { page?: number; limit?: number } = {}): Promise<MaterialListResponse> {
  const { data } = await api.get<ApiEnvelope<{ items: Material[]; pagination: Pagination }>>("/materials", { params });
  return data.data;
}

export async function fetchMyMaterials(): Promise<MyMaterial[]> {
  const { data } = await api.get<ApiEnvelope<MyMaterial[]>>("/materials/mine");
  return data.data;
}

export async function fetchLibrary(): Promise<LibraryItem[]> {
  const { data } = await api.get<ApiEnvelope<LibraryItem[]>>("/materials/library");
  return data.data;
}

export async function createMaterial(form: FormData): Promise<Material> {
  const { data } = await api.post<ApiEnvelope<Material>>("/materials", form);
  return data.data;
}

export async function updateMaterial(id: string, form: FormData): Promise<Material> {
  const { data } = await api.patch<ApiEnvelope<Material>>(`/materials/${id}`, form);
  return data.data;
}

export async function toggleMaterial(id: string, isActive: boolean): Promise<Material> {
  const { data } = await api.patch<ApiEnvelope<Material>>(`/materials/${id}`, { isActive });
  return data.data;
}

export async function deleteMaterial(id: string): Promise<void> {
  await api.delete(`/materials/${id}`);
}

export async function purchaseMaterial(id: string): Promise<LibraryItem> {
  const { data } = await api.post<ApiEnvelope<LibraryItem>>(`/materials/${id}/purchase`);
  return data.data;
}

export async function downloadMaterialFile(id: string, fileName: string): Promise<void> {
  const { data } = await api.get<Blob>(`/materials/${id}/file/${encodeURIComponent(fileName)}`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = displayFileName(fileName);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}