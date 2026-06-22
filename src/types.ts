export interface MenuItem {
  id: string;
  name: string;
  priceReg: number; // in thousand IDR, e.g., 15 for 15K
  priceLarge?: number; // large size, optional for hot drinks
  isHot: boolean;
  menuCategory?: "hot" | "cold" | "snack"; // Sifat penyajian: Panas, Dingin, Snack
  isAvailable: boolean;
  image: string;
  description: string;
}

export interface CoffeePackage {
  id: string;
  name: string;
  price: number; // in thousand IDR
  items: string[];
  description: string;
  badge?: string;
  image?: string;
}

export interface OrderItem {
  menuId: string;
  name: string;
  quantity: number;
  size: "R" | "L" | "Regular" | "Default";
  price: number;
  isPackage?: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size: "R" | "L" | "Regular" | "Default";
  isPackage: boolean;
  image?: string;
}

export interface Order {
  id: string;
  customerName: string;
  whatsapp: string;
  email: string;
  address: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "preparing" | "delivering" | "completed";
  createdAt: string;
  deliveryMethod?: "delivery" | "pickup";
  subtotal?: number;
  shippingCost?: number;
  shippingDiscount?: number;
  notes?: string;
  paymentProofUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "admin" | "customer";
  isMember?: boolean;
  membershipStatus?: "none" | "pending" | "approved";
  ordersCount?: number;
  lastActive?: string;
  avatarUrl?: string;
  whatsapp?: string;
  address?: string;
  isBlocked?: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface FinancialSummary {
  period: "Harian" | "Mingguan" | "Bulanan" | "6 Bulan" | "1 Tahun" | "Semua";
  labels: string[];
  revenue: number[];
  costs: number[];
  netProfit: number;
  transactionsCount: number;
}

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  status: "Delivered" | "Sent" | "Failed" | "Pending" | "Skipped (No API Key)" | "Skipped (No Email)";
  timestamp: string;
  body: string;
}

export interface BlogNews {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  date: string;
  coverImage: string;
  category: "Petani" | "Biji Kopi" | "Tips Seduh" | "Kabar Kedai";
}

// Costing & Recipe Lab interfaces
export interface Ingredient {
  id: string;
  name: string;
  category: 'Coffee Beans' | 'Milk' | 'Syrup' | 'Sugar' | 'Packaging' | 'Bread' | 'Food' | 'Other' | string;
  purchase_quantity: number;
  purchase_unit: string;
  purchase_price: number;
  cost_per_unit?: number;
  supplier?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  description?: string;
  selling_price: number;
  status: boolean;
  created_at?: string;
  updated_at?: string;
  // Dynamic UI properties
  recipe_items?: RecipeItem[];
  totalHpp?: number;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity_used: number;
  unit: string;
  created_at?: string;
  ingredient?: Ingredient; // joined relations
}

export interface PackageRecipe {
  id: string;
  package_name: string;
  selling_price: number;
  status: boolean;
  created_at?: string;
  // Dynamic UI properties
  package_items?: PackageItem[];
  totalHpp?: number;
}

export interface PackageItem {
  id: string;
  package_id: string;
  recipe_id: string;
  quantity: number;
  recipe?: Recipe; // joined relations
}

export interface OverheadCost {
  id: string;
  name: string;
  monthly_cost: number;
  created_at?: string;
}

export interface OrderProfit {
  id: string;
  order_id: string;
  revenue: number;
  hpp: number;
  gross_profit: number;
  margin_percentage: number;
  item_breakdown: Array<{
    name: string;
    quantity: number;
    unit_revenue: number;
    unit_hpp: number;
    total_revenue: number;
    total_hpp: number;
    gross_profit: number;
    matched_recipe: string | null;
  }>;
  calculated_at: string;
  created_at: string;
}

export interface ProfitDashboardPeriod {
  revenue: number;
  hpp: number;
  gross_profit: number;
  margin: number;
  orders_count: number;
}

export interface ProfitDashboard {
  today: ProfitDashboardPeriod;
  last_7d: ProfitDashboardPeriod;
  last_30d: ProfitDashboardPeriod;
  all_time: ProfitDashboardPeriod;
  top_profitable: Array<{
    name: string;
    total_profit: number;
    avg_margin: number;
    total_qty: number;
  }>;
  lowest_margin: Array<{
    name: string;
    avg_margin: number;
    total_qty: number;
  }>;
}

