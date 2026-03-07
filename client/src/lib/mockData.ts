import productChain from "@/assets/images/product-chain.png";
import productRotor from "@/assets/images/product-rotor.png";
import productTire from "@/assets/images/product-tire.png";
import productPlaceholder from "@/assets/images/product-placeholder.svg";

export type StockStatus = "in-stock" | "low" | "out";

/** Vehicle type for filters (motorcycle-focused shop) */
export type VehicleType = "motorcycle" | "scooter";

export type PartCategory =
  | "Brakes"
  | "Engine"
  | "Suspension"
  | "Exhaust"
  | "Electrical"
  | "Body & Frame"
  | "Tires & Wheels"
  | "Accessories";

export type Part = {
  id: string;
  name: string;
  partNumber?: string;
  vehicle: string;
  category: PartCategory | string;
  subcategory?: string;
  brand?: string;
  price: number;
  rating: number;
  reviewCount: number;
  stock: StockStatus;
  quantity?: number;
  deliveryEta: string;
  compatibility: string[];
  tags: string[];
  image: string;
  images?: string[];
  imageFileId?: string;
  description: string;
  specs: { label: string; value: string }[];
  features?: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  shippingWeightGrams?: number;
  shippingLengthCm?: number;
  shippingWidthCm?: number;
  shippingHeightCm?: number;
  barcode?: string;
  barcodeFormat?: string;
  ebayListingId?: string;
  ebayOfferId?: string;
  ebaySyncedAt?: string;
  ebaySyncStatus?: string;
};

/** Motorcycle manufacturers for filter grouping */
export const MOTORCYCLE_MANUFACTURERS = [
  "Honda",
  "Yamaha",
  "Kawasaki",
  "Suzuki",
  "BMW",
  "Ducati",
  "Triumph",
  "KTM",
  "Harley-Davidson",
] as const;

/** Motorcycle models for filter (grouped by manufacturer) */
export const MOTORCYCLE_MODELS = [
  "Honda CB500X",
  "Honda CB650R",
  "Honda CBR650R",
  "Honda Africa Twin",
  "Honda NC750X",
  "Yamaha MT-07",
  "Yamaha MT-09",
  "Yamaha Tracer 9",
  "Yamaha Tenere 700",
  "Yamaha R1",
  "Kawasaki Ninja 650",
  "Kawasaki Z650",
  "Kawasaki Z900",
  "Kawasaki Versys 650",
  "Kawasaki Ninja 400",
  "Suzuki SV650",
  "Suzuki GSX-S750",
  "Suzuki V-Strom 650",
  "Suzuki GSX-R750",
  "BMW F900R",
  "BMW R1250GS",
  "BMW S1000RR",
  "BMW F850GS",
  "Triumph Street Triple",
  "Triumph Tiger 900",
  "Triumph Speed Twin",
  "Triumph Bonneville",
  "KTM Duke 390",
  "KTM 890 Adventure",
  "KTM Duke 890",
  "Ducati Monster",
  "Ducati Multistrada",
  "Ducati Panigale V2",
  "Harley-Davidson Street 750",
  "Harley-Davidson Sportster",
] as const;


export const productImageFallbacks: Record<string, string> = {
  p1: productChain,
  p2: productRotor,
  p3: productTire,
};

export function getProductImage(part: Part): string {
  return part.image || productImageFallbacks[part.id] || productPlaceholder;
}

export const categories: PartCategory[] = [
  "Brakes",
  "Engine",
  "Suspension",
  "Exhaust",
  "Electrical",
  "Body & Frame",
  "Tires & Wheels",
  "Accessories",
];

export const bikeDictionary = [
  {
    term: "Drivetrain",
    simple: "The parts that make the bike move (chain, cassette, crank).",
  },
  { term: "Cassette", simple: "The gears on the rear wheel." },
  { term: "Rotor", simple: "The disc that brake pads squeeze to stop you." },
  { term: "Tubeless", simple: "A tire setup without an inner tube." },
];

export const scooterDictionary = [
  { term: "Controller", simple: "The scooter’s brain that controls power." },
  { term: "Inner tube", simple: "The inflatable tube inside some tires." },
  {
    term: "Brake lever",
    simple: "The handlebar lever you pull to slow down/stop.",
  },
];

export const initialParts: Part[] = [
  {
    id: "p1",
    name: "12-Speed Chain — Quick-Link",
    partNumber: "ENG-CH-001",
    vehicle: "motorcycle",
    category: "Engine",
    subcategory: "Chain",
    brand: "Renthal",
    price: 29.99,
    rating: 4.7,
    reviewCount: 184,
    stock: "in-stock",
    deliveryEta: "Next-day delivery",
    compatibility: ["Honda CB500X", "Yamaha MT-07", "Kawasaki Ninja 650"],
    tags: ["Fast shipping", "Popular"],
    image: productChain,
    description:
      "Smooth shifting and durable plating for everyday riding and race days. Includes quick-link for easy installation.",
    specs: [
      { label: "Speeds", value: "12" },
      { label: "Connector", value: "Quick-link included" },
      { label: "Finish", value: "Nickel plated" },
    ],
    features: ["Durable plating", "Easy installation", "Quick-link included"],
  },
  {
    id: "p2",
    name: "160mm Disc Brake Rotor — Vent",
    partNumber: "BRK-RO-001",
    vehicle: "motorcycle",
    category: "Brakes",
    subcategory: "Discs",
    brand: "EBC",
    price: 24.5,
    rating: 4.6,
    reviewCount: 93,
    stock: "low",
    deliveryEta: "1–2 days",
    compatibility: ["Suzuki SV650", "Yamaha MT-07"],
    tags: ["Heat control"],
    image: productRotor,
    description:
      "Crisp braking with vented channels for better cooling. Designed for consistent performance in wet or dry conditions.",
    specs: [
      { label: "Size", value: "160mm" },
      { label: "Mount", value: "6-bolt" },
      { label: "Weight", value: "~120g" },
    ],
    features: ["Vented design", "Better cooling", "Consistent performance"],
  },
  {
    id: "p3",
    name: "Sport Touring Tyre — Front",
    partNumber: "TIR-F-001",
    vehicle: "motorcycle",
    category: "Tires & Wheels",
    subcategory: "Tires",
    brand: "Michelin",
    price: 89.0,
    rating: 4.4,
    reviewCount: 71,
    stock: "in-stock",
    deliveryEta: "Next-day delivery",
    compatibility: ["Honda CB500X", "Kawasaki Versys 650", "Suzuki V-Strom 650"],
    tags: ["Easy install"],
    image: productTire,
    description:
      "A reliable sport touring tyre with excellent grip and longevity. Ideal for commuting and weekend rides.",
    specs: [
      { label: "Size", value: "120/70ZR17" },
      { label: "Type", value: "Sport Touring" },
      { label: "Use", value: "Road" },
    ],
    features: ["Long mileage", "Wet grip", "Stable handling"],
  },
];
