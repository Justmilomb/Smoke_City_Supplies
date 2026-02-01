import { Link } from "wouter";
import { Edit3, Minus, Plus, Trash2 } from "lucide-react";
import SiteLayout from "@/components/site/SiteLayout";
import { useProducts, useDeleteProduct, useUpdateProductQuantity } from "@/lib/products";
import { getProductImage } from "@/lib/mockData";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

function stockTone(stock: string) {
  if (stock === "in-stock") return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  if (stock === "low") return "bg-amber-500/12 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/12 text-rose-700 dark:text-rose-300";
}

export default function AdminParts() {
  const { data: parts = [], isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const updateQuantity = useUpdateProductQuantity();
  const isMobile = useIsMobile();

  const handleQuantityChange = (id: string, value: number) => {
    if (value < 0) return;
    updateQuantity.mutate(
      { id, quantity: value },
      {
        onSuccess: () => toast.success("Quantity updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    deleteProduct.mutate(id, {
      onSuccess: () => toast.success("Part removed"),
      onError: (err) => toast.error(err.message),
    });
  };

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="text-muted-foreground">Loading parts…</div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 data-testid="text-admin-parts-title" className="font-[var(--font-serif)] text-3xl font-semibold tracking-tight">
              Parts
            </h1>
            <p data-testid="text-admin-parts-subtitle" className="mt-1 text-sm text-muted-foreground">
              Manage your catalog and track inventory. Changes are saved.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/new">
              <a data-testid="link-admin-add">
                <Button data-testid="button-admin-add" className="h-11 rounded-2xl">
                  <Plus className="mr-2 h-4 w-4" /> Add part
                </Button>
              </a>
            </Link>
          </div>
        </div>

        <Card className="glass rounded-3xl overflow-hidden">
          {isMobile ? (
            <div className="divide-y divide-border/60">
              {parts.map((p) => (
                <div
                  key={p.id}
                  data-testid={`row-admin-part-${p.id}`}
                  className="flex flex-col gap-4 p-5"
                >
                  <div className="flex items-start gap-4">
                    <img
                      data-testid={`img-admin-part-${p.id}`}
                      src={getProductImage(p)}
                      alt={p.name}
                      className="h-14 w-14 shrink-0 rounded-xl bg-[hsl(var(--muted))] object-contain p-2"
                    />
                    <div className="min-w-0 flex-1">
                      <div data-testid={`text-admin-part-name-${p.id}`} className="font-semibold">
                        {p.name}
                      </div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{p.deliveryEta}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-full text-xs">
                          {p.vehicle}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full text-xs">
                          {p.category}
                        </Badge>
                        <Badge data-testid={`badge-admin-stock-${p.id}`} className={`rounded-full border-0 text-xs ${stockTone(p.stock)}`}>
                          {p.stock}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm font-medium tabular-nums">£{p.price.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl"
                        onClick={() => handleQuantityChange(p.id, Math.max(0, (p.quantity ?? 0) - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[2rem] text-center text-sm tabular-nums">
                        {p.quantity ?? 0}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl"
                        onClick={() => handleQuantityChange(p.id, (p.quantity ?? 0) + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/edit/${p.id}`}>
                        <a>
                          <Button
                            data-testid={`button-admin-edit-${p.id}`}
                            variant="secondary"
                            size="sm"
                            className="h-10 rounded-xl"
                          >
                            <Edit3 className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Edit</span>
                          </Button>
                        </a>
                      </Link>
                      <Button
                        data-testid={`button-admin-delete-${p.id}`}
                        variant="destructive"
                        size="sm"
                        className="h-10 rounded-xl"
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={deleteProduct.isPending}
                      >
                        <Trash2 className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((p) => (
                  <TableRow key={p.id} data-testid={`row-admin-part-${p.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          data-testid={`img-admin-part-${p.id}`}
                          src={getProductImage(p)}
                          alt={p.name}
                          className="h-10 w-10 rounded-xl bg-[hsl(var(--muted))] object-contain p-2"
                        />
                        <div>
                          <div data-testid={`text-admin-part-name-${p.id}`} className="text-sm font-semibold">
                            {p.name}
                          </div>
                          <div className="text-xs text-muted-foreground">{p.deliveryEta}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.vehicle}</TableCell>
                    <TableCell className="text-sm">{p.category}</TableCell>
                    <TableCell className="text-sm tabular-nums">£{p.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge data-testid={`badge-admin-stock-${p.id}`} className={`rounded-full border-0 ${stockTone(p.stock)}`}>
                        {p.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleQuantityChange(p.id, Math.max(0, (p.quantity ?? 0) - 1))}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm tabular-nums">
                          {p.quantity ?? 0}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleQuantityChange(p.id, (p.quantity ?? 0) + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/edit/${p.id}`}>
                          <a>
                            <Button
                              data-testid={`button-admin-edit-${p.id}`}
                              variant="secondary"
                              className="h-9 rounded-xl"
                            >
                              <Edit3 className="mr-2 h-4 w-4" /> Edit
                            </Button>
                          </a>
                        </Link>
                        <Button
                          data-testid={`button-admin-delete-${p.id}`}
                          variant="destructive"
                          className="h-9 rounded-xl"
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={deleteProduct.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </SiteLayout>
  );
}
