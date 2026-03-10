// Stock Service - API calls for inventory/stock management

import { api } from './api';
import type {
  Product,
  ProductCreateInput,
  ProductUpdateInput,
  ProductFilters,
  ProductCategory,
  Supplier,
  SupplierCreateInput,
  StockMovement,
  StockMovementCreateInput,
  StockMovementFilters,
  Purchase,
  PurchaseCreateInput,
  PurchaseFilters,
  PurchaseStatus,
  StockAlert,
  StockStats,
  InventoryCount,
} from '@/types/salon';
import type { PaginatedResponse, PaginationParams, DateRange, ID } from '@/types/salon/common';

const BASE_PATH = '/salon/stock';

export const stockService = {
  // ===== PRODUCTS =====
  products: {
    list: (
      params: PaginationParams & ProductFilters
    ): Promise<PaginatedResponse<Product>> => {
      return api.get<PaginatedResponse<Product>>(`${BASE_PATH}/products`, params);
    },

    getById: (id: string): Promise<Product> => {
      return api.get<Product>(`${BASE_PATH}/products/${id}`);
    },

    getByBarcode: (barcode: string): Promise<Product> => {
      return api.get<Product>(`${BASE_PATH}/products/barcode/${barcode}`);
    },

    create: (data: ProductCreateInput): Promise<Product> => {
      return api.post<Product>(`${BASE_PATH}/products`, data);
    },

    update: (id: string, data: ProductUpdateInput): Promise<Product> => {
      return api.patch<Product>(`${BASE_PATH}/products/${id}`, data);
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/products/${id}`);
    },

    toggleStatus: (id: string): Promise<Product> => {
      return api.post<Product>(`${BASE_PATH}/products/${id}/toggle`);
    },

    // Adjust stock directly
    adjustStock: (
      id: string,
      quantity: number,
      reason: string,
      notes?: string
    ): Promise<StockMovement> => {
      return api.post<StockMovement>(`${BASE_PATH}/products/${id}/adjust`, {
        quantity,
        reason,
        notes,
      });
    },

    // Get products with low stock
    getLowStock: (unitId?: string): Promise<Product[]> => {
      return api.get<Product[]>(`${BASE_PATH}/products/low-stock`, { unitId });
    },

    // Get products out of stock
    getOutOfStock: (unitId?: string): Promise<Product[]> => {
      return api.get<Product[]>(`${BASE_PATH}/products/out-of-stock`, { unitId });
    },
  },

  // ===== CATEGORIES =====
  categories: {
    list: (): Promise<ProductCategory[]> => {
      return api.get<ProductCategory[]>(`${BASE_PATH}/categories`);
    },

    getById: (id: string): Promise<ProductCategory> => {
      return api.get<ProductCategory>(`${BASE_PATH}/categories/${id}`);
    },

    create: (data: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductCategory> => {
      return api.post<ProductCategory>(`${BASE_PATH}/categories`, data);
    },

    update: (id: string, data: Partial<ProductCategory>): Promise<ProductCategory> => {
      return api.patch<ProductCategory>(`${BASE_PATH}/categories/${id}`, data);
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/categories/${id}`);
    },

    reorder: (ids: string[]): Promise<void> => {
      return api.post(`${BASE_PATH}/categories/reorder`, { ids });
    },
  },

  // ===== SUPPLIERS =====
  suppliers: {
    list: (
      params: PaginationParams & { search?: string; status?: string }
    ): Promise<PaginatedResponse<Supplier>> => {
      return api.get<PaginatedResponse<Supplier>>(`${BASE_PATH}/suppliers`, params);
    },

    getById: (id: string): Promise<Supplier> => {
      return api.get<Supplier>(`${BASE_PATH}/suppliers/${id}`);
    },

    getByCnpj: (cnpj: string): Promise<Supplier> => {
      return api.get<Supplier>(`${BASE_PATH}/suppliers/cnpj/${cnpj}`);
    },

    create: (data: SupplierCreateInput): Promise<Supplier> => {
      return api.post<Supplier>(`${BASE_PATH}/suppliers`, data);
    },

    update: (id: string, data: Partial<SupplierCreateInput>): Promise<Supplier> => {
      return api.patch<Supplier>(`${BASE_PATH}/suppliers/${id}`, data);
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/suppliers/${id}`);
    },

    toggleStatus: (id: string): Promise<Supplier> => {
      return api.post<Supplier>(`${BASE_PATH}/suppliers/${id}/toggle`);
    },

    // Get supplier products
    getProducts: (supplierId: string): Promise<Product[]> => {
      return api.get<Product[]>(`${BASE_PATH}/suppliers/${supplierId}/products`);
    },

    // Get supplier purchase history
    getPurchaseHistory: (
      supplierId: string,
      params: PaginationParams
    ): Promise<PaginatedResponse<Purchase>> => {
      return api.get<PaginatedResponse<Purchase>>(
        `${BASE_PATH}/suppliers/${supplierId}/purchases`,
        params
      );
    },
  },

  // ===== STOCK MOVEMENTS =====
  movements: {
    list: (
      params: PaginationParams & StockMovementFilters
    ): Promise<PaginatedResponse<StockMovement>> => {
      return api.get<PaginatedResponse<StockMovement>>(`${BASE_PATH}/movements`, {
        ...params,
        dateFrom: params.dateFrom?.toISOString(),
        dateTo: params.dateTo?.toISOString(),
      });
    },

    getById: (id: string): Promise<StockMovement> => {
      return api.get<StockMovement>(`${BASE_PATH}/movements/${id}`);
    },

    create: (data: StockMovementCreateInput): Promise<StockMovement> => {
      return api.post<StockMovement>(`${BASE_PATH}/movements`, data);
    },

    // Get movements for a specific product
    getByProduct: (
      productId: string,
      params: PaginationParams & Omit<StockMovementFilters, 'productId'>
    ): Promise<PaginatedResponse<StockMovement>> => {
      return api.get<PaginatedResponse<StockMovement>>(
        `${BASE_PATH}/movements/product/${productId}`,
        {
          ...params,
          dateFrom: params.dateFrom?.toISOString(),
          dateTo: params.dateTo?.toISOString(),
        }
      );
    },

    // Register automatic deduction from service
    registerServiceUsage: (
      appointmentId: string,
      items: { productId: string; quantity: number }[]
    ): Promise<StockMovement[]> => {
      return api.post<StockMovement[]>(`${BASE_PATH}/movements/service-usage`, {
        appointmentId,
        items,
      });
    },

    // Reverse movement (for corrections)
    reverse: (movementId: string, reason: string): Promise<StockMovement> => {
      return api.post<StockMovement>(`${BASE_PATH}/movements/${movementId}/reverse`, {
        reason,
      });
    },
  },

  // ===== PURCHASES =====
  purchases: {
    list: (
      params: PaginationParams & PurchaseFilters
    ): Promise<PaginatedResponse<Purchase>> => {
      return api.get<PaginatedResponse<Purchase>>(`${BASE_PATH}/purchases`, {
        ...params,
        dateFrom: params.dateFrom?.toISOString(),
        dateTo: params.dateTo?.toISOString(),
      });
    },

    getById: (id: string): Promise<Purchase> => {
      return api.get<Purchase>(`${BASE_PATH}/purchases/${id}`);
    },

    create: (data: PurchaseCreateInput): Promise<Purchase> => {
      return api.post<Purchase>(`${BASE_PATH}/purchases`, {
        ...data,
        expectedDate: data.expectedDate?.toISOString(),
      });
    },

    update: (id: string, data: Partial<PurchaseCreateInput>): Promise<Purchase> => {
      return api.patch<Purchase>(`${BASE_PATH}/purchases/${id}`, {
        ...data,
        expectedDate: data.expectedDate?.toISOString(),
      });
    },

    delete: (id: string): Promise<void> => {
      return api.delete(`${BASE_PATH}/purchases/${id}`);
    },

    // Update purchase status
    updateStatus: (id: string, status: PurchaseStatus): Promise<Purchase> => {
      return api.post<Purchase>(`${BASE_PATH}/purchases/${id}/status`, { status });
    },

    // Receive purchase (updates stock)
    receive: (
      id: string,
      items: { productId: string; receivedQuantity: number }[]
    ): Promise<Purchase> => {
      return api.post<Purchase>(`${BASE_PATH}/purchases/${id}/receive`, { items });
    },

    // Mark purchase as paid
    markAsPaid: (id: string, paymentMethod: string): Promise<Purchase> => {
      return api.post<Purchase>(`${BASE_PATH}/purchases/${id}/pay`, { paymentMethod });
    },
  },

  // ===== ALERTS =====
  alerts: {
    list: (
      params: PaginationParams & {
        type?: 'low_stock' | 'out_of_stock' | 'expiring';
        severity?: 'warning' | 'critical';
        acknowledged?: boolean;
        unitId?: string;
      }
    ): Promise<PaginatedResponse<StockAlert>> => {
      return api.get<PaginatedResponse<StockAlert>>(`${BASE_PATH}/alerts`, params);
    },

    getById: (id: string): Promise<StockAlert> => {
      return api.get<StockAlert>(`${BASE_PATH}/alerts/${id}`);
    },

    // Acknowledge alert
    acknowledge: (id: string): Promise<StockAlert> => {
      return api.post<StockAlert>(`${BASE_PATH}/alerts/${id}/acknowledge`);
    },

    // Acknowledge multiple alerts
    acknowledgeMultiple: (ids: string[]): Promise<void> => {
      return api.post(`${BASE_PATH}/alerts/acknowledge-multiple`, { ids });
    },

    // Get unacknowledged count
    getUnacknowledgedCount: (unitId?: string): Promise<{ count: number }> => {
      return api.get(`${BASE_PATH}/alerts/unacknowledged-count`, { unitId });
    },

    // Get current stock status (generates alerts if needed)
    checkStock: (unitId?: string): Promise<{
      lowStock: Product[];
      outOfStock: Product[];
      newAlerts: number;
    }> => {
      return api.post(`${BASE_PATH}/alerts/check`, { unitId });
    },
  },

  // ===== INVENTORY COUNT =====
  inventory: {
    list: (
      params: PaginationParams & {
        status?: 'in_progress' | 'completed' | 'canceled';
        unitId?: string;
      }
    ): Promise<PaginatedResponse<InventoryCount>> => {
      return api.get<PaginatedResponse<InventoryCount>>(`${BASE_PATH}/inventory`, params);
    },

    getById: (id: string): Promise<InventoryCount> => {
      return api.get<InventoryCount>(`${BASE_PATH}/inventory/${id}`);
    },

    // Start new inventory count
    start: (
      name: string,
      unitId: string,
      productIds?: string[]
    ): Promise<InventoryCount> => {
      return api.post<InventoryCount>(`${BASE_PATH}/inventory/start`, {
        name,
        unitId,
        productIds,
      });
    },

    // Update counted values
    updateCount: (
      id: string,
      items: { productId: string; countedStock: number }[]
    ): Promise<InventoryCount> => {
      return api.patch<InventoryCount>(`${BASE_PATH}/inventory/${id}/count`, { items });
    },

    // Complete inventory count (applies adjustments)
    complete: (id: string, applyAdjustments: boolean): Promise<InventoryCount> => {
      return api.post<InventoryCount>(`${BASE_PATH}/inventory/${id}/complete`, {
        applyAdjustments,
      });
    },

    // Cancel inventory count
    cancel: (id: string): Promise<InventoryCount> => {
      return api.post<InventoryCount>(`${BASE_PATH}/inventory/${id}/cancel`);
    },
  },

  // ===== STATS =====
  getStats: (unitId?: string): Promise<StockStats> => {
    return api.get<StockStats>(`${BASE_PATH}/stats`, { unitId });
  },

  // ===== REPORTS =====
  reports: {
    // Stock value report
    stockValue: (
      unitId?: string,
      categoryId?: string
    ): Promise<{
      totalProducts: number;
      totalUnits: number;
      totalCostValue: number;
      totalSellingValue: number;
      byCategory: {
        categoryId: ID;
        categoryName: string;
        productCount: number;
        totalValue: number;
      }[];
    }> => {
      return api.get(`${BASE_PATH}/reports/value`, { unitId, categoryId });
    },

    // Movement report
    movementReport: (
      dateRange: DateRange,
      unitId?: string
    ): Promise<{
      totalIn: number;
      totalOut: number;
      totalAdjustments: number;
      byReason: {
        reason: string;
        count: number;
        quantity: number;
        value: number;
      }[];
      byProduct: {
        productId: ID;
        productName: string;
        inQuantity: number;
        outQuantity: number;
        netChange: number;
      }[];
    }> => {
      return api.get(`${BASE_PATH}/reports/movements`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        unitId,
      });
    },

    // Consumption report (service usage)
    consumptionReport: (
      dateRange: DateRange,
      unitId?: string
    ): Promise<{
      totalConsumption: number;
      totalValue: number;
      byProduct: {
        productId: ID;
        productName: string;
        quantity: number;
        value: number;
        servicesCount: number;
      }[];
      byService: {
        serviceId: ID;
        serviceName: string;
        productsUsed: number;
        totalValue: number;
      }[];
    }> => {
      return api.get(`${BASE_PATH}/reports/consumption`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        unitId,
      });
    },

    // Purchase report
    purchaseReport: (
      dateRange: DateRange,
      unitId?: string
    ): Promise<{
      totalPurchases: number;
      totalValue: number;
      bySupplier: {
        supplierId: ID;
        supplierName: string;
        purchaseCount: number;
        totalValue: number;
      }[];
      byStatus: {
        status: PurchaseStatus;
        count: number;
        value: number;
      }[];
    }> => {
      return api.get(`${BASE_PATH}/reports/purchases`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        unitId,
      });
    },

    // Export report
    export: (
      type: 'stock' | 'movements' | 'consumption' | 'purchases',
      dateRange: DateRange,
      format: 'pdf' | 'xlsx',
      unitId?: string
    ): Promise<Blob> => {
      return api.get<Blob>(`${BASE_PATH}/reports/export/${type}`, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        format,
        unitId,
      });
    },
  },

  // ===== SERVICE INTEGRATION =====
  // Get products used by a service
  getServiceProducts: (serviceId: string): Promise<{
    productId: ID;
    productName: string;
    quantityPerService: number;
    currentStock: number;
  }[]> => {
    return api.get(`${BASE_PATH}/service/${serviceId}/products`);
  },

  // Update products used by a service
  updateServiceProducts: (
    serviceId: string,
    products: { productId: string; quantityPerService: number }[]
  ): Promise<void> => {
    return api.post(`${BASE_PATH}/service/${serviceId}/products`, { products });
  },
};
