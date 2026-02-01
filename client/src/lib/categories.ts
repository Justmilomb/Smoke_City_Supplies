import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = "/api";

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  vehicleType: string;
  createdAt: string;
};

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API}/categories`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function createCategory(data: {
  name: string;
  slug: string;
  icon?: string;
  vehicleType: "bike" | "scooter" | "all";
}): Promise<Category> {
  const res = await fetch(`${API}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create category");
  }
  return res.json();
}

async function updateCategory(
  id: string,
  data: Partial<{ name: string; slug: string; icon: string; vehicleType: string }>
): Promise<Category> {
  const res = await fetch(`${API}/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update category");
  }
  return res.json();
}

async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${API}/categories/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete category");
}

export const categoryKeys = { all: ["categories"] as const };

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: fetchCategories,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCategory>[1] }) =>
      updateCategory(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
