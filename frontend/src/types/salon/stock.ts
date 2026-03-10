// Stock/Inventory types for the salon system

import { ID, Timestamps, Status, SoftDelete } from './common';

// Product Categories
export interface ProductCategory extends Timestamps {
  id: ID;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  isActive: boolean;
}

// Products
export type UnitOfMeasure = 'unit' | 'ml' | 'g' | 'kg' | 'l' | 'oz' | 'pack';

export type StockStatus = 'normal' | 'low' | 'critical' | 'out_of_stock';

export interface Product extends Timestamps, SoftDelete {
  id: ID;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  image?: string;

  // Category
  categoryId: ID;
  category?: ProductCategory;

  // Stock
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  unitOfMeasure: UnitOfMeasure;

  // Pricing
  costPrice: number;
  sellingPrice?: number; // If sold directly
  isSellable: boolean;

  // Supplier
  supplierId?: ID;
  supplier?: Supplier;

  // Service usage
  usedInServiceIds: ID[];

  // Status
  status: Status;
  stockStatus: StockStatus;

  // Multi-unit
  unitId?: ID;
  stockByUnit?: Record<ID, number>;

  // Analytics
  lastPurchaseDate?: Date;
  lastMovementDate?: Date;
  averageMonthlyUsage?: number;
}

export interface ProductCreateInput {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  image?: string;
  categoryId: ID;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  unitOfMeasure: UnitOfMeasure;
  costPrice: number;
  sellingPrice?: number;
  isSellable?: boolean;
  supplierId?: ID;
  usedInServiceIds?: ID[];
  unitId?: ID;
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {
  status?: Status;
}

export interface ProductFilters {
  search?: string;
  categoryId?: ID;
  supplierId?: ID;
  status?: Status;
  stockStatus?: StockStatus;
  isSellable?: boolean;
  unitId?: ID;
}

// Suppliers
export interface Supplier extends Timestamps, SoftDelete {
  id: ID;
  name: string;
  tradeName?: string;
  cnpj?: string;

  // Contact
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;

  // Address
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  };

  // Payment
  paymentTerms?: string;
  defaultPaymentMethod?: string;

  // Analytics
  totalPurchases: number;
  lastPurchaseDate?: Date;

  notes?: string;
  status: Status;
}

export interface SupplierCreateInput {
  name: string;
  tradeName?: string;
  cnpj?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: Supplier['address'];
  paymentTerms?: string;
  defaultPaymentMethod?: string;
  notes?: string;
}

// Stock Movements
export type MovementType = 'in' | 'out' | 'adjustment';

export type MovementReason =
  | 'purchase' // Compra de fornecedor
  | 'service_usage' // Uso em serviço
  | 'manual_adjustment' // Ajuste manual
  | 'loss' // Perda/quebra
  | 'return' // Devolução
  | 'transfer' // Transferência entre unidades
  | 'sale' // Venda direta
  | 'inventory_count'; // Contagem de inventário

export interface StockMovement extends Timestamps {
  id: ID;
  productId: ID;
  product?: Product;

  type: MovementType;
  reason: MovementReason;
  quantity: number;
  previousStock: number;
  newStock: number;

  // Reference
  appointmentId?: ID;
  purchaseId?: ID;
  transferId?: ID;

  // Cost
  unitCost?: number;
  totalCost?: number;

  // Who/Where
  createdById: ID;
  createdByName: string;
  unitId: ID;
  toUnitId?: ID; // For transfers

  notes?: string;
}

export interface StockMovementCreateInput {
  productId: ID;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  unitCost?: number;
  notes?: string;
  unitId: ID;
  toUnitId?: ID;
}

export interface StockMovementFilters {
  productId?: ID;
  type?: MovementType;
  reason?: MovementReason;
  dateFrom?: Date;
  dateTo?: Date;
  createdById?: ID;
  unitId?: ID;
}

// Purchase Orders
export type PurchaseStatus = 'draft' | 'pending' | 'received' | 'partial' | 'canceled';

export interface Purchase extends Timestamps {
  id: ID;
  supplierId: ID;
  supplier?: Supplier;

  // Items
  items: {
    productId: ID;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    receivedQuantity?: number;
  }[];

  // Totals
  subtotal: number;
  discount?: number;
  shipping?: number;
  total: number;

  // Status
  status: PurchaseStatus;
  orderDate: Date;
  expectedDate?: Date;
  receivedDate?: Date;

  // Payment
  isPaid: boolean;
  paidAt?: Date;
  paymentMethod?: string;
  invoiceNumber?: string;

  // Who/Where
  createdById: ID;
  createdByName: string;
  receivedById?: ID;
  receivedByName?: string;
  unitId: ID;

  notes?: string;
  attachments?: string[];
}

export interface PurchaseCreateInput {
  supplierId: ID;
  items: {
    productId: ID;
    quantity: number;
    unitCost: number;
  }[];
  discount?: number;
  shipping?: number;
  expectedDate?: Date;
  invoiceNumber?: string;
  notes?: string;
  unitId: ID;
}

export interface PurchaseFilters {
  supplierId?: ID;
  status?: PurchaseStatus;
  dateFrom?: Date;
  dateTo?: Date;
  isPaid?: boolean;
  unitId?: ID;
}

// Stock Alerts
export interface StockAlert {
  id: ID;
  productId: ID;
  product?: Product;
  type: 'low_stock' | 'out_of_stock' | 'expiring';
  severity: 'warning' | 'critical';
  currentStock: number;
  minimumStock: number;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedById?: ID;
  unitId: ID;
}

// Stock Stats
export interface StockStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  recentMovements: StockMovement[];
  topUsedProducts: {
    productId: ID;
    productName: string;
    usageCount: number;
  }[];
  pendingPurchases: number;
}

// Inventory Count
export interface InventoryCount extends Timestamps {
  id: ID;
  name: string;
  status: 'in_progress' | 'completed' | 'canceled';
  startedAt: Date;
  completedAt?: Date;

  items: {
    productId: ID;
    productName: string;
    systemStock: number;
    countedStock: number;
    difference: number;
    adjusted: boolean;
  }[];

  totalDifference: number;
  differenceValue: number;

  createdById: ID;
  createdByName: string;
  completedById?: ID;
  completedByName?: string;

  unitId: ID;
  notes?: string;
}
