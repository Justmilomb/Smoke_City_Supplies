import React from "react";
import { Link, useLocation, useParams } from "wouter";
import { ImagePlus, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import SiteLayout from "@/components/site/SiteLayout";
import { useCategories } from "@/lib/store";
import { useProduct, useUpdateProduct } from "@/lib/products";
import { getProductImage } from "@/lib/mockData";
import type { PartCategory, VehicleType } from "@/lib/mockData";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(3, "Name is too short"),
  vehicle: z.enum(["bike", "scooter"]),
  category: z.string().min(1, "Pick a category"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  deliveryEta: z.string().min(2, "Add a delivery time"),
  stock: z.enum(["in-stock", "low", "out"]),
  compatibility: z.string().optional(),
  tags: z.string().optional(),
  description: z.string().min(10, "Add a short description"),
});

type FormValues = z.infer<typeof schema>;

export default function AdminEditPart() {
  const params = useParams();
  const id = params?.id;
  const [, setLoc] = useLocation();
  const { data: product, isLoading } = useProduct(id);
  const updateProduct = useUpdateProduct();
  const cats = useCategories();

  const [preview, setPreview] = React.useState<string>("");
  const [uploading, setUploading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      vehicle: "bike",
      category: cats[0] ?? "Brakes",
      price: 0,
      deliveryEta: "Next-day delivery",
      stock: "in-stock",
      compatibility: "",
      tags: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        vehicle: product.vehicle as "bike" | "scooter",
        category: product.category,
        price: product.price,
        deliveryEta: product.deliveryEta,
        stock: product.stock as "in-stock" | "low" | "out",
        compatibility: product.compatibility?.join(", ") ?? "",
        tags: product.tags?.join(", ") ?? "",
        description: product.description,
      });
      setPreview(product.image || "");
    }
  }, [product, form]);

  const onSubmit = (v: FormValues) => {
    if (!id) return;
    const vehicle = v.vehicle as VehicleType;
    const category = v.category as PartCategory;
    updateProduct.mutate(
      {
        id,
        patch: {
          name: v.name,
          vehicle,
          category,
          price: v.price,
          deliveryEta: v.deliveryEta,
          stock: v.stock,
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
        },
      },
      {
        onSuccess: () => {
          toast.success("Part updated");
          setLoc("/admin/parts");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Upload failed");
      }
      const { url } = await res.json();
      setPreview(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!id) {
    return (
      <SiteLayout>
        <div className="text-muted-foreground">Missing product ID</div>
      </SiteLayout>
    );
  }

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="text-muted-foreground">Loading part…</div>
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="text-muted-foreground">Part not found</div>
        <Link href="/admin/parts">
          <a className="text-primary hover:underline">Back to parts</a>
        </Link>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge className="rounded-full bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]">
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit part
            </Badge>
            <h1 className="mt-2 font-[var(--font-serif)] text-3xl font-semibold tracking-tight">
              Edit {product.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Update details and image. Changes are saved when you click Save.
            </p>
          </div>
          <Link href="/admin/parts">
            <a className="text-sm font-medium text-[hsl(var(--primary))] hover:underline">
              Back to parts
            </a>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="glass overflow-hidden rounded-3xl lg:col-span-5">
            <div className="border-b border-border/60 p-5">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-[hsl(var(--primary))]" />
                <div className="text-sm font-semibold">Image</div>
              </div>
            </div>
            <div className="p-5">
              <div className="aspect-square rounded-3xl bg-[hsl(var(--muted))]">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-full w-full object-contain p-4"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                    {uploading ? "Uploading…" : "Take a photo or choose an image"}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-[hsl(var(--primary))] file:px-4 file:py-3 file:text-sm file:font-semibold file:text-[hsl(var(--primary-foreground))] hover:file:opacity-90"
                  onChange={(e) => {
                    onFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                  disabled={uploading}
                />
              </div>
            </div>
          </Card>

          <Card className="glass rounded-3xl p-5 lg:col-span-7">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 10×2.5 tire" {...field} className="h-11 rounded-xl" />
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
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bike">Bike</SelectItem>
                            <SelectItem value="scooter">Scooter</SelectItem>
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
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cats.map((c) => (
                              <SelectItem key={c} value={c}>
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
                          <Input type="number" step="0.01" placeholder="19.99" {...field} className="h-11 rounded-xl" />
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
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Stock" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="in-stock">In stock</SelectItem>
                            <SelectItem value="low">Low stock</SelectItem>
                            <SelectItem value="out">Out of stock</SelectItem>
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
                        <Input placeholder="Next-day delivery" {...field} className="h-11 rounded-xl" />
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
                        <Input placeholder="e.g., Road, MTB" {...field} className="h-11 rounded-xl" />
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
                        <Input placeholder="e.g., Popular, Fast shipping" {...field} className="h-11 rounded-xl" />
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
                        <Textarea placeholder="Short, clear description…" {...field} className="min-h-[120px] rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="submit"
                    className="h-11 rounded-2xl"
                    disabled={updateProduct.isPending}
                  >
                    {updateProduct.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-2xl"
                    onClick={() => setLoc("/admin/parts")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}
