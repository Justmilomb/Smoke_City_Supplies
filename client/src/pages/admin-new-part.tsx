import React from "react";
import { Link, useLocation } from "wouter";
import { ImagePlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import AdminLayout from "@/components/admin/AdminLayout";
import BackButton from "@/components/site/BackButton";
import AdminImageUpload from "@/components/admin/AdminImageUpload";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useCategories } from "@/lib/store";
import { useCreateProduct } from "@/lib/products";
import type { PartCategory, VehicleType } from "@/lib/mockData";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(3, "Name is too short"),
  vehicle: z.enum(["motorcycle", "bike", "scooter"]),
  category: z.string().min(1, "Pick a category"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  deliveryEta: z.string().min(2, "Add a delivery time"),
  stock: z.enum(["in-stock", "low", "out"]),
  compatibility: z.string().optional(),
  tags: z.string().optional(),
  description: z.string().min(10, "Add a short description"),
});

type FormValues = z.infer<typeof schema>;

export default function AdminNewPart() {
  const cats = useCategories();
  const createProduct = useCreateProduct();
  const [, setLoc] = useLocation();

  const [preview, setPreview] = React.useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      vehicle: "motorcycle",
      category: cats[0] ?? "Brakes",
      price: 0,
      deliveryEta: "Next-day delivery",
      stock: "in-stock",
      compatibility: "",
      tags: "",
      description: "",
    },
  });

  const onSubmit = (v: FormValues) => {
    const vehicle = v.vehicle as VehicleType;
    const category = v.category as PartCategory;

    createProduct.mutate(
      {
        name: v.name,
        vehicle,
        category,
        price: v.price,
        rating: 4.6,
        reviewCount: 12,
        stock: v.stock,
        quantity: v.stock === "out" ? 0 : v.stock === "low" ? 3 : 10,
        deliveryEta: v.deliveryEta,
        compatibility: (v.compatibility ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tags: (v.tags ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        image: preview || "",
        description: v.description,
        specs: [
          { label: "Vehicle", value: vehicle },
          { label: "Category", value: category },
        ],
      },
      {
        onSuccess: () => {
          toast.success("Part added");
          setLoc("/admin/parts");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Add Product
            </h1>
            <p className="mt-2 text-muted-foreground">
              Upload an image and fill in product details
            </p>
          </div>
          <BackButton fallback="/admin" />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="border-border/50 overflow-hidden rounded-lg lg:col-span-5">
            <div className="border-b border-border/60 p-5">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-primary" />
                <div className="text-sm font-semibold">Image</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Take a photo on mobile or drag-and-drop on desktop. JPEG, PNG, GIF, WebP up to 10MB.
              </div>
            </div>
            <div className="p-5">
              <AdminImageUpload value={preview} onChange={setPreview} data-testid="admin-image-upload" />
            </div>
          </Card>

          <Card className="border-border/50 rounded-lg p-5 lg:col-span-7">
            <Form {...form}>
              <form data-testid="form-admin-new" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-part-name" placeholder="e.g., 10×2.5 tire, 160mm rotor" {...field} className="h-11 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="vehicle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-part-vehicle" className="h-11 rounded-lg">
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem data-testid="option-part-vehicle-motorcycle" value="motorcycle">Motorcycle</SelectItem>
                            <SelectItem data-testid="option-part-vehicle-bike" value="bike">Bike</SelectItem>
                            <SelectItem data-testid="option-part-vehicle-scooter" value="scooter">Scooter</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-part-category" className="h-11 rounded-lg">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cats.map((c) => (
                              <SelectItem data-testid={`option-part-category-${c}`} key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (GBP)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-part-price" type="number" step="0.01" placeholder="19.99" {...field} className="h-11 rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-part-stock" className="h-11 rounded-lg">
                              <SelectValue placeholder="Stock" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem data-testid="option-part-stock-in" value="in-stock">In stock</SelectItem>
                            <SelectItem data-testid="option-part-stock-low" value="low">Low stock</SelectItem>
                            <SelectItem data-testid="option-part-stock-out" value="out">Out of stock</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="deliveryEta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery promise</FormLabel>
                      <FormControl>
                        <Input data-testid="input-part-delivery" placeholder="Next-day delivery" {...field} className="h-11 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compatibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compatibility (comma separated)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-part-compat" placeholder="e.g., Road, MTB, 10 inch" {...field} className="h-11 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (comma separated)</FormLabel>
                      <FormControl>
                        <Input data-testid="input-part-tags" placeholder="e.g., Popular, Fast shipping" {...field} className="h-11 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea data-testid="textarea-part-description" placeholder="Short, clear description…" {...field} className="min-h-[120px] rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    data-testid="button-admin-save"
                    type="submit"
                    className="h-11 rounded-lg"
                    disabled={createProduct.isPending}
                  >
                    {createProduct.isPending ? "Saving…" : "Save part"}
                  </Button>
                  <Button
                    data-testid="button-admin-cancel"
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-lg"
                    onClick={() => setLoc("/admin")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
