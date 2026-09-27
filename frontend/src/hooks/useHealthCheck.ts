import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

interface HealthResponse {
  success: boolean;
  data: { status: string; timestamp: string };
  message: string;
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data } = await api.get<HealthResponse>("/health");
      return data;
    },
    retry: 1,
  });
}
