import { useMutation } from "@tanstack/react-query";

export type BikeFinderCategory = {
  name: string;
  products: import("@/lib/mockData").Part[];
};

export type BikeFinderResult = {
  normalizedBike: string;
  displayName: string;
  fromCache: boolean;
  categories: BikeFinderCategory[];
  totalCompatible: number;
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
