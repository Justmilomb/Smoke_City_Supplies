import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart";
import { withAdminGuard } from "@/components/admin/AdminGuard";
import NotFound from "@/pages/not-found";
import StoreHome from "@/pages/store-home";
import CatalogPage from "@/pages/catalog";
import ProductPage from "@/pages/product";
import CartPage from "@/pages/cart";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin";
import AdminNewPart from "@/pages/admin-new-part";
import AdminParts from "@/pages/admin-parts";
import AdminOrders from "@/pages/admin-orders";
import AdminCategories from "@/pages/admin-categories";
import AdminEditPart from "@/pages/admin-edit-part";

function Router() {
  return (
    <Switch>
      <Route path="/" component={StoreHome} />
      <Route path="/catalog" component={CatalogPage} />
      <Route path="/product/:id" component={ProductPage} />
      <Route path="/cart" component={CartPage} />

      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={withAdminGuard(AdminDashboard)} />
      <Route path="/admin/parts" component={withAdminGuard(AdminParts)} />
      <Route path="/admin/orders" component={withAdminGuard(AdminOrders)} />
      <Route path="/admin/categories" component={withAdminGuard(AdminCategories)} />
      <Route path="/admin/new" component={withAdminGuard(AdminNewPart)} />
      <Route path="/admin/edit/:id" component={withAdminGuard(AdminEditPart)} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
