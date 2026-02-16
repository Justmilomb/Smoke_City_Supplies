/**
 * Seed script for 150+ motorcycle parts. Run with: npx tsx server/seedParts.ts
 * Requires DATABASE_URL. Uses storage.createProduct for each part.
 */
import type { InsertProduct } from "@shared/schema";
import { storage } from "./storage";

const MOTORCYCLE_MODELS = [
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

const BRANDS = ["EBC", "Brembo", "Ohlins", "Akrapovic", "K&N", "Motul", "Michelin", "Pirelli", "Renthal", "R&G"] as const;

function pick<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let partIdCounter = 1000;
function nextPartNumber(prefix: string): string {
  return `${prefix}-${String(partIdCounter++).padStart(3, "0")}`;
}

function makePart(overrides: Partial<InsertProduct> & { name: string; category: string; subcategory: string }): InsertProduct {
  const compat = overrides.compatibility ?? pick([...MOTORCYCLE_MODELS], randomInt(3, 8));
  const price = overrides.price ?? randomBetween(15, 499);
  const rating = overrides.rating ?? randomBetween(4.0, 5.0);
  const reviewCount = overrides.reviewCount ?? randomInt(10, 500);
  const qty = overrides.quantity ?? randomInt(0, 80);
  const stock = overrides.stock ?? (qty === 0 ? "out" : qty <= 5 ? "low" : "in-stock");
  const base: InsertProduct = {
    name: overrides.name,
    partNumber: overrides.partNumber ?? nextPartNumber("MCP"),
    vehicle: "motorcycle",
    category: overrides.category,
    subcategory: overrides.subcategory,
    brand: overrides.brand ?? pick([...BRANDS], 1)[0],
    price,
    rating,
    reviewCount,
    stock,
    quantity: qty,
    deliveryEta: overrides.deliveryEta ?? (qty > 0 ? (randomInt(1, 3) === 1 ? "Next-day delivery" : "1–2 days") : "Out of stock"),
    compatibility: compat,
    tags: overrides.tags ?? [],
    image: overrides.image ?? "",
    description: overrides.description ?? "Quality motorcycle part. Genuine specification.",
    specs: overrides.specs ?? [],
    features: overrides.features ?? [],
  };
  return { ...base, ...overrides };
}

const PARTS_DATA: (Partial<InsertProduct> & { name: string; category: string; subcategory: string })[] = [
  // Brakes ~25
  { name: "Front Brake Pads — Organic", category: "Brakes", subcategory: "Brake Pads", brand: "EBC", price: 45.99, description: "High-performance organic brake pads. Excellent stopping power and low noise.", features: ["Organic compound", "Low dust", "Smooth braking"], specs: [{ label: "Material", value: "Organic" }, { label: "Thickness", value: "8.5mm" }], tags: ["Popular"] },
  { name: "Front Brake Pads — Sintered", category: "Brakes", subcategory: "Brake Pads", brand: "EBC", price: 52.99, features: ["Sintered metal", "High temperature", "Long life"], specs: [{ label: "Material", value: "Sintered" }], tags: ["Popular"] },
  { name: "Rear Brake Pads — Organic", category: "Brakes", subcategory: "Brake Pads", brand: "EBC", price: 38.99, tags: ["Popular"] },
  { name: "Brake Disc — Front 320mm", category: "Brakes", subcategory: "Discs", brand: "Brembo", price: 189.99, features: ["Floating disc", "Stainless steel", "OEM quality"], specs: [{ label: "Diameter", value: "320mm" }, { label: "Mount", value: "Bolt-on" }], tags: ["Popular"] },
  { name: "Brake Disc — Rear 240mm", category: "Brakes", subcategory: "Discs", brand: "Brembo", price: 129.99, specs: [{ label: "Diameter", value: "240mm" }], tags: ["Popular"] },
  { name: "Brake Fluid DOT 4 — 1L", category: "Brakes", subcategory: "Fluid", brand: "Motul", price: 14.99, features: ["DOT 4", "High boiling point", "1 litre"], tags: ["Popular"] },
  { name: "Brake Fluid DOT 5.1 — 500ml", category: "Brakes", subcategory: "Fluid", brand: "Motul", price: 11.99 },
  { name: "Stainless Brake Line — Front", category: "Brakes", subcategory: "Lines", brand: "R&G", price: 49.99, features: ["Stainless braided", "Front pair", "Kit"], tags: ["Popular"] },
  { name: "Stainless Brake Line — Rear", category: "Brakes", subcategory: "Lines", brand: "R&G", price: 34.99, tags: ["Popular"] },
  { name: "Brake Caliper Seal Kit", category: "Brakes", subcategory: "Calipers", brand: "EBC", price: 28.99, tags: ["Popular"] },
  { name: "Wave Brake Disc — Front", category: "Brakes", subcategory: "Discs", brand: "EBC", price: 119.99, tags: ["Popular"] },
  { name: "Ceramic Brake Pads — Front", category: "Brakes", subcategory: "Brake Pads", brand: "Brembo", price: 89.99, tags: ["Popular"] },
  { name: "Brake Pad Wear Sensor", category: "Brakes", subcategory: "Brake Pads", brand: "EBC", price: 18.99 },
  { name: "Brake Disc Carrier — Front", category: "Brakes", subcategory: "Discs", brand: "Brembo", price: 79.99 },
  { name: "Brake Bleed Kit", category: "Brakes", subcategory: "Fluid", brand: "Motul", price: 24.99 },
  { name: "Rear Brake Pads — Sintered", category: "Brakes", subcategory: "Brake Pads", brand: "EBC", price: 42.99 },
  { name: "Brake Disc Bolt Set", category: "Brakes", subcategory: "Discs", brand: "R&G", price: 12.99 },
  { name: "Brake Pad Shim Kit", category: "Brakes", subcategory: "Brake Pads", brand: "EBC", price: 8.99 },
  { name: "DOT 4 LV Brake Fluid — 1L", category: "Brakes", subcategory: "Fluid", brand: "Motul", price: 16.99 },
  { name: "Brake Line Banjo Bolt", category: "Brakes", subcategory: "Lines", brand: "R&G", price: 6.99 },
  { name: "Front Brake Master Cylinder Kit", category: "Brakes", subcategory: "Calipers", brand: "Brembo", price: 149.99 },
  { name: "Brake Pad Spring Clip", category: "Brakes", subcategory: "Brake Pads", brand: "EBC", price: 4.99 },
  { name: "Brake Disc — Front 300mm", category: "Brakes", subcategory: "Discs", brand: "EBC", price: 99.99 },
  { name: "Organic Rear Pads — Touring", category: "Brakes", subcategory: "Brake Pads", brand: "EBC", price: 41.99 },
  { name: "Brake Fluid Funnel", category: "Brakes", subcategory: "Fluid", brand: "Motul", price: 9.99 },
  { name: "Stainless Brake Line Full Set", category: "Brakes", subcategory: "Lines", brand: "R&G", price: 89.99 },
  // Engine ~30
  { name: "Oil Filter — Spin-on", category: "Engine", subcategory: "Oil Filters", brand: "K&N", price: 12.99, features: ["High flow", "17mm nut", "Reusable box"], tags: ["Popular"] },
  { name: "Oil Filter — Cartridge", category: "Engine", subcategory: "Oil Filters", brand: "K&N", price: 14.99, tags: ["Popular"] },
  { name: "Air Filter — Panel", category: "Engine", subcategory: "Air Filters", brand: "K&N", price: 44.99, description: "Washable high-flow air filter. Improves airflow and is reusable.", features: ["Washable", "High flow", "Million mile warranty"], tags: ["Popular"] },
  { name: "Air Filter — Oiled Foam", category: "Engine", subcategory: "Air Filters", brand: "K&N", price: 38.99, tags: ["Popular"] },
  { name: "Spark Plug — Iridium (single)", category: "Engine", subcategory: "Spark Plugs", brand: "NGK", price: 9.99, tags: ["Popular"] },
  { name: "Spark Plug Set — 4 Pack", category: "Engine", subcategory: "Spark Plugs", brand: "NGK", price: 34.99, tags: ["Popular"] },
  { name: "Engine Oil 10W-40 — 4L", category: "Engine", subcategory: "Oil", brand: "Motul", price: 42.99, features: ["Semi-synthetic", "4 litre", "JASO MA2"], tags: ["Popular"] },
  { name: "Engine Oil 5W-40 — 4L", category: "Engine", subcategory: "Oil", brand: "Motul", price: 48.99, tags: ["Popular"] },
  { name: "Engine Oil 10W-50 — 4L", category: "Engine", subcategory: "Oil", brand: "Motul", price: 52.99 },
  { name: "Head Gasket Set", category: "Engine", subcategory: "Gaskets", brand: "Cometic", price: 89.99 },
  { name: "Exhaust Gasket — Header", category: "Engine", subcategory: "Gaskets", brand: "R&G", price: 12.99 },
  { name: "Clutch Friction Plates Set", category: "Engine", subcategory: "Clutch", brand: "EBC", price: 124.99 },
  { name: "Clutch Steel Plates Set", category: "Engine", subcategory: "Clutch", brand: "EBC", price: 68.99 },
  { name: "Clutch Cable", category: "Engine", subcategory: "Clutch", brand: "Venhill", price: 28.99 },
  { name: "Clutch Lever — Adjustable", category: "Engine", subcategory: "Clutch", brand: "Renthal", price: 34.99 },
  { name: "Oil Drain Plug Washer", category: "Engine", subcategory: "Oil", brand: "R&G", price: 2.99 },
  { name: "Oil Filter Wrench", category: "Engine", subcategory: "Oil Filters", brand: "K&N", price: 14.99 },
  { name: "Coolant — 1L", category: "Engine", subcategory: "Coolant", brand: "Motul", price: 18.99 },
  { name: "Coolant — 5L", category: "Engine", subcategory: "Coolant", brand: "Motul", price: 42.99 },
  { name: "Thermostat", category: "Engine", subcategory: "Coolant", brand: "Gates", price: 32.99 },
  { name: "Radiator Cap", category: "Engine", subcategory: "Coolant", brand: "R&G", price: 14.99 },
  { name: "Cam Chain Tensioner", category: "Engine", subcategory: "Gaskets", brand: "OEM", price: 54.99 },
  { name: "Valve Cover Gasket", category: "Engine", subcategory: "Gaskets", brand: "Cometic", price: 24.99 },
  { name: "Oil Pressure Sensor", category: "Engine", subcategory: "Oil", brand: "R&G", price: 22.99 },
  { name: "Air Filter Cleaner Kit", category: "Engine", subcategory: "Air Filters", brand: "K&N", price: 16.99 },
  { name: "Spark Plug Cap", category: "Engine", subcategory: "Spark Plugs", brand: "NGK", price: 8.99 },
  { name: "Clutch Spring Set", category: "Engine", subcategory: "Clutch", brand: "EBC", price: 42.99 },
  { name: "Oil Cooler Kit", category: "Engine", subcategory: "Oil", brand: "R&G", price: 189.99 },
  { name: "Fuel Filter — Inline", category: "Engine", subcategory: "Air Filters", brand: "K&N", price: 18.99 },
  { name: "Engine Mount — Front", category: "Engine", subcategory: "Gaskets", brand: "R&G", price: 34.99 },
  { name: "Clutch Slave Cylinder Seal", category: "Engine", subcategory: "Clutch", brand: "EBC", price: 28.99 },
  { name: "Oil Sight Glass", category: "Engine", subcategory: "Oil", brand: "R&G", price: 6.99 },
  { name: "Air Filter Pre-Filter", category: "Engine", subcategory: "Air Filters", brand: "K&N", price: 22.99 },
  // Suspension ~15
  { name: "Fork Seal Kit — Pair", category: "Suspension", subcategory: "Fork Seals", brand: "Ohlins", price: 34.99 },
  { name: "Fork Oil — 1L", category: "Suspension", subcategory: "Fork Oil", brand: "Ohlins", price: 24.99 },
  { name: "Fork Oil — 5W 1L", category: "Suspension", subcategory: "Fork Oil", brand: "Motul", price: 18.99 },
  { name: "Rear Shock — OEM Replacement", category: "Suspension", subcategory: "Rear Shocks", brand: "Ohlins", price: 349.99 },
  { name: "Fork Spring Set — Stiffer", category: "Suspension", subcategory: "Springs", brand: "Ohlins", price: 89.99 },
  { name: "Rear Shock Linkage Bearing Kit", category: "Suspension", subcategory: "Rear Shocks", brand: "R&G", price: 44.99 },
  { name: "Fork Dust Seal — Pair", category: "Suspension", subcategory: "Fork Seals", brand: "Ohlins", price: 18.99 },
  { name: "Steering Head Bearing Set", category: "Suspension", subcategory: "Springs", brand: "All Balls", price: 42.99 },
  { name: "Fork Bleed Screw", category: "Suspension", subcategory: "Fork Oil", brand: "R&G", price: 6.99 },
  { name: "Rear Shock Reservoir Seal", category: "Suspension", subcategory: "Rear Shocks", brand: "Ohlins", price: 28.99 },
  { name: "Fork Cap — Adjustable", category: "Suspension", subcategory: "Fork Seals", brand: "Ohlins", price: 79.99 },
  { name: "Swingarm Pivot Bearing Kit", category: "Suspension", subcategory: "Rear Shocks", brand: "All Balls", price: 38.99 },
  { name: "Fork Spring Preload Spacer", category: "Suspension", subcategory: "Springs", brand: "Ohlins", price: 24.99 },
  { name: "Rear Shock Preload Adjuster", category: "Suspension", subcategory: "Rear Shocks", brand: "Ohlins", price: 44.99 },
  { name: "Fork Seal Driver Tool", category: "Suspension", subcategory: "Fork Seals", brand: "Motion Pro", price: 32.99 },
  // Exhaust ~15
  { name: "Slip-On Exhaust — Carbon", category: "Exhaust", subcategory: "Slip-Ons", brand: "Akrapovic", price: 449.99, description: "Lightweight carbon slip-on. Improved sound and performance.", features: ["Carbon sleeve", "DB killer included", "Street legal"] },
  { name: "Slip-On Exhaust — Titanium", category: "Exhaust", subcategory: "Slip-Ons", brand: "Akrapovic", price: 529.99 },
  { name: "Full System — Stainless", category: "Exhaust", subcategory: "Full Systems", brand: "Akrapovic", price: 899.99 },
  { name: "Header Wrap — 2\" x 50ft", category: "Exhaust", subcategory: "Heat Wrap", brand: "DEI", price: 34.99 },
  { name: "Exhaust Gasket — Crush", category: "Exhaust", subcategory: "Headers", brand: "R&G", price: 8.99 },
  { name: "Exhaust Mount Rubber", category: "Exhaust", subcategory: "Slip-Ons", brand: "R&G", price: 12.99 },
  { name: "DB Killer Insert", category: "Exhaust", subcategory: "Slip-Ons", brand: "Akrapovic", price: 49.99 },
  { name: "Lambda Sensor Spacer", category: "Exhaust", subcategory: "Headers", brand: "R&G", price: 18.99 },
  { name: "Exhaust Clamp — 50mm", category: "Exhaust", subcategory: "Slip-Ons", brand: "R&G", price: 14.99 },
  { name: "Header Collector Gasket", category: "Exhaust", subcategory: "Headers", brand: "R&G", price: 11.99 },
  { name: "Heat Shield — Adhesive", category: "Exhaust", subcategory: "Heat Wrap", brand: "DEI", price: 22.99 },
  { name: "Slip-On — Stainless", category: "Exhaust", subcategory: "Slip-Ons", brand: "Akrapovic", price: 379.99 },
  { name: "Exhaust Paste — High Temp", category: "Exhaust", subcategory: "Headers", brand: "Loctite", price: 9.99 },
  { name: "Full System — Titanium", category: "Exhaust", subcategory: "Full Systems", brand: "Akrapovic", price: 1299.99 },
  { name: "Baffle Removal Tool", category: "Exhaust", subcategory: "Slip-Ons", brand: "R&G", price: 19.99 },
  // Electrical ~20
  { name: "Motorcycle Battery — 12V 8Ah", category: "Electrical", subcategory: "Batteries", brand: "Yuasa", price: 64.99 },
  { name: "Motorcycle Battery — 12V 10Ah", category: "Electrical", subcategory: "Batteries", brand: "Yuasa", price: 79.99 },
  { name: "LED Headlight Bulb — H7", category: "Electrical", subcategory: "LED Lights", brand: "Philips", price: 44.99 },
  { name: "LED Indicator — Front Pair", category: "Electrical", subcategory: "Indicators", brand: "R&G", price: 34.99 },
  { name: "Voltage Regulator Rectifier", category: "Electrical", subcategory: "Voltage Regulators", brand: "Electrosport", price: 89.99 },
  { name: "Stator — OEM Replacement", category: "Electrical", subcategory: "Voltage Regulators", brand: "Electrosport", price: 149.99 },
  { name: "Fuse Kit — Assorted", category: "Electrical", subcategory: "Batteries", brand: "R&G", price: 12.99 },
  { name: "Battery Tender Lead", category: "Electrical", subcategory: "Batteries", brand: "Yuasa", price: 14.99 },
  { name: "LED Tail Light — Integrated", category: "Electrical", subcategory: "LED Lights", brand: "R&G", price: 79.99 },
  { name: "Horn — Dual Tone", category: "Electrical", subcategory: "Indicators", brand: "Stebel", price: 28.99 },
  { name: "Relay — 4-Pin 30A", category: "Electrical", subcategory: "Voltage Regulators", brand: "R&G", price: 8.99 },
  { name: "USB Charger — 12V", category: "Electrical", subcategory: "USB Chargers", brand: "R&G", price: 24.99 },
  { name: "LED Brake Light Bulb", category: "Electrical", subcategory: "LED Lights", brand: "Philips", price: 18.99 },
  { name: "Wiring Loom Tape", category: "Electrical", subcategory: "Indicators", brand: "3M", price: 9.99 },
  { name: "Spark Plug Lead Set", category: "Electrical", subcategory: "Voltage Regulators", brand: "NGK", price: 42.99 },
  { name: "Battery Acid Refill", category: "Electrical", subcategory: "Batteries", brand: "Yuasa", price: 6.99 },
  { name: "LED DRL Strip", category: "Electrical", subcategory: "LED Lights", brand: "R&G", price: 34.99 },
  { name: "Indicator Relay — LED", category: "Electrical", subcategory: "Indicators", brand: "R&G", price: 16.99 },
  { name: "Starter Solenoid", category: "Electrical", subcategory: "Voltage Regulators", brand: "Electrosport", price: 38.99 },
  { name: "USB-C Dual Port Charger", category: "Electrical", subcategory: "USB Chargers", brand: "R&G", price: 32.99 },
  // Body & Frame ~20
  { name: "Bar End Mirror — Left", category: "Body & Frame", subcategory: "Mirrors", brand: "R&G", price: 28.99 },
  { name: "Bar End Mirror — Pair", category: "Body & Frame", subcategory: "Mirrors", brand: "R&G", price: 49.99 },
  { name: "Clutch Lever — Shorty", category: "Body & Frame", subcategory: "Levers", brand: "Renthal", price: 42.99 },
  { name: "Brake Lever — Adjustable", category: "Body & Frame", subcategory: "Levers", brand: "Renthal", price: 44.99 },
  { name: "Handlebar Grips — Dual Compound", category: "Body & Frame", subcategory: "Grips", brand: "Renthal", price: 24.99 },
  { name: "Bar End Weights — Pair", category: "Body & Frame", subcategory: "Bar Ends", brand: "R&G", price: 34.99 },
  { name: "Frame Slider — Left", category: "Body & Frame", subcategory: "Sliders", brand: "R&G", price: 44.99 },
  { name: "Frame Slider — Pair", category: "Body & Frame", subcategory: "Sliders", brand: "R&G", price: 79.99 },
  { name: "Fork Slider — Pair", category: "Body & Frame", subcategory: "Sliders", brand: "R&G", price: 54.99 },
  { name: "Rear Axle Slider", category: "Body & Frame", subcategory: "Sliders", brand: "R&G", price: 28.99 },
  { name: "Tank Pad — Clear", category: "Body & Frame", subcategory: "Grips", brand: "R&G", price: 18.99 },
  { name: "Knee Grip — Tank", category: "Body & Frame", subcategory: "Grips", brand: "R&G", price: 22.99 },
  { name: "Lever Guard — Brake", category: "Body & Frame", subcategory: "Levers", brand: "R&G", price: 32.99 },
  { name: "Stainless Bar — 22mm", category: "Body & Frame", subcategory: "Bar Ends", brand: "Renthal", price: 89.99 },
  { name: "Mirror Extender", category: "Body & Frame", subcategory: "Mirrors", brand: "R&G", price: 14.99 },
  { name: "Grip Glue", category: "Body & Frame", subcategory: "Grips", brand: "Renthal", price: 6.99 },
  { name: "Swingarm Spool — Pair", category: "Body & Frame", subcategory: "Sliders", brand: "R&G", price: 24.99 },
  { name: "Radiator Guard", category: "Body & Frame", subcategory: "Sliders", brand: "R&G", price: 69.99 },
  { name: "Chain Guard", category: "Body & Frame", subcategory: "Sliders", brand: "R&G", price: 34.99 },
  { name: "Engine Case Cover", category: "Body & Frame", subcategory: "Sliders", brand: "R&G", price: 89.99 },
  // Tires & Wheels ~15
  { name: "Sport Touring Tyre — Front 120/70ZR17", category: "Tires & Wheels", subcategory: "Tires", brand: "Michelin", price: 89.99 },
  { name: "Sport Touring Tyre — Rear 180/55ZR17", category: "Tires & Wheels", subcategory: "Tires", brand: "Michelin", price: 119.99 },
  { name: "Sport Tyre — Front", category: "Tires & Wheels", subcategory: "Tires", brand: "Pirelli", price: 94.99 },
  { name: "Sport Tyre — Rear", category: "Tires & Wheels", subcategory: "Tires", brand: "Pirelli", price: 124.99 },
  { name: "Inner Tube — 17\"", category: "Tires & Wheels", subcategory: "Tubes", brand: "Michelin", price: 14.99 },
  { name: "Rim Tape — 17\"", category: "Tires & Wheels", subcategory: "Rim Tape", brand: "R&G", price: 8.99 },
  { name: "Valve Stem — Metal", category: "Tires & Wheels", subcategory: "Valve Stems", brand: "R&G", price: 6.99 },
  { name: "Valve Cap — Metal", category: "Tires & Wheels", subcategory: "Valve Stems", brand: "R&G", price: 4.99 },
  { name: "Adventure Tyre — Front", category: "Tires & Wheels", subcategory: "Tires", brand: "Michelin", price: 99.99 },
  { name: "Adventure Tyre — Rear", category: "Tires & Wheels", subcategory: "Tires", brand: "Michelin", price: 129.99 },
  { name: "Wheel Balance Weights", category: "Tires & Wheels", subcategory: "Tires", brand: "R&G", price: 12.99 },
  { name: "Tyre Repair Kit", category: "Tires & Wheels", subcategory: "Tubes", brand: "Michelin", price: 24.99 },
  { name: "Tyre Lever — Set of 3", category: "Tires & Wheels", subcategory: "Tires", brand: "Motion Pro", price: 18.99 },
  { name: "Cruiser Tyre — Rear", category: "Tires & Wheels", subcategory: "Tires", brand: "Pirelli", price: 139.99 },
  { name: "Rim Strip — 18\"", category: "Tires & Wheels", subcategory: "Rim Tape", brand: "R&G", price: 6.99 },
  // Accessories ~20
  { name: "Tank Bag — Magnetic 20L", category: "Accessories", subcategory: "Luggage", brand: "R&G", price: 69.99 },
  { name: "Tail Pack — 30L", category: "Accessories", subcategory: "Luggage", brand: "R&G", price: 79.99 },
  { name: "Phone Mount — Handlebar", category: "Accessories", subcategory: "Phone Mounts", brand: "R&G", price: 34.99 },
  { name: "USB Charger — Quad Lock", category: "Accessories", subcategory: "USB Chargers", brand: "R&G", price: 28.99 },
  { name: "Chain Lube — 400ml", category: "Accessories", subcategory: "Chain Maintenance", brand: "Motul", price: 14.99 },
  { name: "Chain Cleaner — 400ml", category: "Accessories", subcategory: "Chain Maintenance", brand: "Motul", price: 12.99 },
  { name: "Chain Brush", category: "Accessories", subcategory: "Chain Maintenance", brand: "R&G", price: 9.99 },
  { name: "Paddock Stand — Rear", category: "Accessories", subcategory: "Luggage", brand: "R&G", price: 59.99 },
  { name: "Front Paddock Stand", category: "Accessories", subcategory: "Luggage", brand: "R&G", price: 49.99 },
  { name: "Disc Lock — 14mm", category: "Accessories", subcategory: "Luggage", brand: "Oxford", price: 34.99 },
  { name: "Cover — Outdoor", category: "Accessories", subcategory: "Luggage", brand: "Oxford", price: 44.99 },
  { name: "Helmet Lock", category: "Accessories", subcategory: "Luggage", brand: "R&G", price: 18.99 },
  { name: "Tank Pad — Logo", category: "Accessories", subcategory: "Luggage", brand: "R&G", price: 22.99 },
  { name: "Key Ring — Aluminium", category: "Accessories", subcategory: "Luggage", brand: "R&G", price: 8.99 },
  { name: "Chain Wax — 500ml", category: "Accessories", subcategory: "Chain Maintenance", brand: "Motul", price: 16.99 },
  { name: "O-Ring Chain Lube", category: "Accessories", subcategory: "Chain Maintenance", brand: "Motul", price: 18.99 },
  { name: "Phone Case — Waterproof", category: "Accessories", subcategory: "Phone Mounts", brand: "R&G", price: 24.99 },
  { name: "USB Cable — 1m", category: "Accessories", subcategory: "USB Chargers", brand: "R&G", price: 12.99 },
  { name: "Tool Kit — Mini", category: "Accessories", subcategory: "Luggage", brand: "Motion Pro", price: 42.99 },
  { name: "First Aid Kit — Bike", category: "Accessories", subcategory: "Luggage", brand: "R&G", price: 28.99 },
];

export async function runSeedParts(): Promise<number> {
  const existing = await storage.listProducts();
  if (existing.length >= 140) {
    console.log("[seedParts] Already have 140+ parts, skipping seed.");
    return 0;
  }
  partIdCounter = 1000;
  let created = 0;
  for (const data of PARTS_DATA) {
    const part = makePart(data);
    try {
      await storage.createProduct(part);
      created++;
      if (created % 25 === 0) console.log(`[seedParts] Created ${created} parts...`);
    } catch (err) {
      console.warn("[seedParts] Skip duplicate or error:", (err as Error).message);
    }
  }
  console.log(`[seedParts] Done. Created ${created} parts.`);
  return created;
}

const isDirectRun = /(^|[\\/])seedParts\.(ts|js)$/.test(process.argv[1] ?? "");

if (isDirectRun) {
  runSeedParts()
    .then((n) => process.exit(n >= 0 ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
