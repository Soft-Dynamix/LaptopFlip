"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetchLaptops } from "@/lib/api";
import { useAppStore } from "./store";

/** TanStack Query hook for fetching laptops with caching */
export function useLaptopsQuery() {
  const setLaptops = useAppStore((s) => s.setLaptops);

  return useQuery({
    queryKey: ["laptops"],
    queryFn: async () => {
      const data = await apiFetchLaptops();
      setLaptops(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}
