export interface MenuItem {
  id: string;
  name: string;
  priceReg: number; // in thousand IDR, e.g., 15 for 15K
  priceLarge?: number; // large size, optional for hot drinks
  isHot: boolean;
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
  ordersCount: number;
  lastActive: string;
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
