import productChain from "@/assets/images/product-chain.png";
import productRotor from "@/assets/images/product-rotor.png";
import productTire from "@/assets/images/product-tire.png";

export type VehicleType = "bike" | "scooter";
export type StockStatus = "in-stock" | "low" | "out";

export type PartCategory =
  | "Brakes"
  | "Drivetrain"
  | "Wheels & Tires"
  | "Electrical"
  | "Frames & Steering"
  | "Accessories";

export type Part = {
  id: string;
  name: string;
  vehicle: VehicleType;
  category: PartCategory;
  price: number;
  rating: number;
  reviewCount: number;
  stock: StockStatus;
  quantity?: number;
  deliveryEta: string;
  compatibility: string[];
  tags: string[];
  image: string;
  description: string;
  specs: { label: string; value: string }[];
};

export const productImageFallbacks: Record<string, string> = {
  p1: productChain,
  p2: productRotor,
  p3: productTire,
};

export function getProductImage(part: Part): string {
  return part.image || productImageFallbacks[part.id] || "";
}

export const categories: PartCategory[] = [
  "Brakes",
  "Drivetrain",
  "Wheels & Tires",
  "Electrical",
  "Frames & Steering",
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
    vehicle: "bike",
    category: "Drivetrain",
    price: 29.99,
    rating: 4.7,
    reviewCount: 184,
    stock: "in-stock",
    deliveryEta: "Next-day delivery",
    compatibility: ["Road", "MTB"],
    tags: ["Fast shipping", "Popular"],
    image: productChain,
    description:
      "Smooth shifting and durable plating for everyday riding and race days. Includes quick-link for easy installation.",
    specs: [
      { label: "Speeds", value: "12" },
      { label: "Connector", value: "Quick-link included" },
      { label: "Finish", value: "Nickel plated" },
    ],
  },
  {
    id: "p2",
    name: "160mm Disc Brake Rotor — Vent",
    vehicle: "bike",
    category: "Brakes",
    price: 24.5,
    rating: 4.6,
    reviewCount: 93,
    stock: "low",
    deliveryEta: "1–2 days",
    compatibility: ["MTB", "Hybrid"],
    tags: ["Heat control"],
    image: productRotor,
    description:
      "Crisp braking with vented channels for better cooling. Designed for consistent performance in wet or dry conditions.",
    specs: [
      { label: "Size", value: "160mm" },
      { label: "Mount", value: "6-bolt" },
      { label: "Weight", value: "~120g" },
    ],
  },
  {
    id: "p3",
    name: "10×2.5 Scooter Tire — Street",
    vehicle: "scooter",
    category: "Wheels & Tires",
    price: 19.0,
    rating: 4.4,
    reviewCount: 71,
    stock: "in-stock",
    deliveryEta: "Next-day delivery",
    compatibility: ["10 inch"],
    tags: ["Easy install"],
    image: productTire,
    description:
      "A reliable street tire with a smooth center line for low rolling resistance and comfortable commuting.",
    specs: [
      { label: "Size", value: "10×2.5" },
      { label: "Type", value: "Street" },
      { label: "Use", value: "Commuting" },
    ],
  },
];
