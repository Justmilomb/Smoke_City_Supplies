import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Part } from "@/lib/mockData";

const API = "/api";

async function fetchProducts(): Promise<Part[]> {
  const res = await fetch(`${API}/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

async function fetchProduct(id: string): Promise<Part | null> {
  const res = await fetch(`${API}/products/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}

export const productKeys = {
  all: ["products"] as const,
  list: () => [...productKeys.all, "list"] as const,
  detail: (id: string) => [...productKeys.all, "detail", id] as const,
};

export function useProducts() {
  return useQuery({
    queryKey: productKeys.list(),
    queryFn: fetchProducts,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ""),
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });
}

type CreateProductInput = Omit<Part, "id"> & { id?: string };

async function createProduct(input: CreateProductInput): Promise<Part> {
  const res = await fetch(`${API}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      partNumber: input.partNumber,
      vehicle: input.vehicle,
      category: input.category,
      subcategory: input.subcategory,
      brand: input.brand,
      price: input.price,
      rating: input.rating,
      reviewCount: input.reviewCount,
      stock: input.stock,
      quantity: input.quantity ?? 0,
      deliveryEta: input.deliveryEta,
      compatibility: input.compatibility,
      tags: input.tags,
      image: input.image,
      description: input.description,
      specs: input.specs,
      features: input.features,
      shippingWeightGrams: input.shippingWeightGrams,
      shippingLengthCm: input.shippingLengthCm,
      shippingWidthCm: input.shippingWidthCm,
      shippingHeightCm: input.shippingHeightCm,
      barcode: input.barcode,
      barcodeFormat: input.barcodeFormat,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to create product");
  }
  return res.json();
}

async function updateProduct(id: string, patch: Partial<Part>): Promise<Part> {
  const res = await fetch(`${API}/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to update product");
  }
  return res.json();
}

async function updateProductQuantity(id: string, quantity: number): Promise<Part> {
  const res = await fetch(`${API}/products/${id}/quantity`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to update quantity");
  }
  return res.json();
}

async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${API}/products/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to delete product");
  }
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Part> }) =>
      updateProduct(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export function useUpdateProductQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      updateProductQuantity(id, quantity),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}
