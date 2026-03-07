import { useMutation } from "@tanstack/react-query";

export type BikeFinderCategory = {
  name: string;
  products: import("@/lib/mockData").Part[];
};

export type BikeFinderResult = {
  normalizedBike: string;
  displayName: string;
  fromCache: boolean;
  matchLevel: "exact" | "family" | "universal" | "none";
  categories: BikeFinderCategory[];
  totalCompatible: number;
  universalCategories?: BikeFinderCategory[];
  totalUniversal?: number;
  suggestedBikes?: string[];
};

export type BikeFinderInput = {
  make?: string;
  model?: string;
  cc?: string;
  year?: string;
  freeText?: string;
};

async function findPartsForBike(input: BikeFinderInput): Promise<BikeFinderResult> {
  const res = await fetch("/api/bike-finder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Bike finder failed");
  }
  return res.json();
}

export function useBikeFinder() {
  return useMutation({
    mutationFn: findPartsForBike,
  });
}
