import bcrypt from "bcrypt";
import { storage } from "./storage";

const DEFAULT_ADMIN_PASSWORD = "admin";

const DEFAULT_CATEGORIES = [
  { name: "Brakes", slug: "brakes", vehicleType: "bike" as const },
  { name: "Drivetrain", slug: "drivetrain", vehicleType: "bike" as const },
  { name: "Wheels & Tires", slug: "wheels-tires", vehicleType: "all" as const },
  { name: "Electrical", slug: "electrical", vehicleType: "all" as const },
  { name: "Frames & Steering", slug: "frames-steering", vehicleType: "bike" as const },
  { name: "Accessories", slug: "accessories", vehicleType: "all" as const },
];

export async function seedAdminIfNeeded(): Promise<void> {
  const existing = await storage.getUserByUsername("admin");
  if (existing) return;

  const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const hashed = await bcrypt.hash(password, 10);
  await storage.createUser({ username: "admin", password: hashed });
  console.log("[seedAdmin] Created default admin user (password: " + (process.env.ADMIN_PASSWORD ? "from env" : DEFAULT_ADMIN_PASSWORD) + ")");
}

export async function seedCategoriesIfNeeded(): Promise<void> {
  const list = await storage.listCategories();
  if (list.length > 0) return;

  for (const c of DEFAULT_CATEGORIES) {
    await storage.createCategory(c);
  }
  console.log("[seedAdmin] Created default categories");
}
