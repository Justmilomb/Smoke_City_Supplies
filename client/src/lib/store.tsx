import { useCategoriesQuery } from "@/lib/categories";
import type { PartCategory } from "@/lib/mockData";

export function useCategories(): PartCategory[] {
  const { data } = useCategoriesQuery();
  return (data?.map((c) => c.name as PartCategory) ?? []) as PartCategory[];
}
