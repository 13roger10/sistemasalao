"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package,
  Truck,
  ArrowUpDown,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Box,
  Barcode,
  DollarSign,
  Tag,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Bell,
  BellOff,
  FileText,
  ShoppingCart,
  Minus,
  MoreVertical,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { DataTable, Column, ActionMenuItem } from "@/components/ui/DataTable";
import { stockService } from "@/services/salon";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import type {
  Product,
  ProductCreateInput,
  ProductCategory,
  Supplier,
  SupplierCreateInput,
  StockMovement,
  StockMovementCreateInput,
  MovementType,
  MovementReason,
  StockAlert,
  StockStats,
  StockStatus,
  UnitOfMeasure,
} from "@/types/salon";
import type { Status } from "@/types/salon/common";

// ===== COMPONENTES AUXILIARES =====

// Badge de Status
const StatusBadge = ({ status }: { status: Status }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      status === "active"
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
    }`}
  >
    {status === "active" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {status === "active" ? "Ativo" : "Inativo"}
  </span>
);

// Badge de Status de Estoque
const StockStatusBadge = ({ status, currentStock, minimumStock }: { status: StockStatus; currentStock: number; minimumStock: number }) => {
  const config = {
    normal: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Normal" },
    low: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Baixo" },
    critical: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", label: "Crítico" },
    out_of_stock: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Sem Estoque" },
  };
  const { bg, text, label } = config[status];
  return (
    <div className="flex flex-col">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
        {status === "out_of_stock" ? <AlertTriangle className="h-3 w-3" /> : status === "low" || status === "critical" ? <TrendingDown className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
        {label}
      </span>
      <span className="mt-1 text-xs text-gray-500">{currentStock} / mín: {minimumStock}</span>
    </div>
  );
};

// Badge de Tipo de Movimentação
const MovementTypeBadge = ({ type }: { type: MovementType }) => {
  const config = {
    in: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", icon: ArrowUp, label: "Entrada" },
    out: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: ArrowDown, label: "Saída" },
    adjustment: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: RefreshCw, label: "Ajuste" },
  };
  const { bg, text, icon: Icon, label } = config[type];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

// Badge de Motivo
const ReasonBadge = ({ reason }: { reason: MovementReason }) => {
  const labels: Record<MovementReason, string> = {
    purchase: "Compra",
    service_usage: "Uso em Serviço",
    manual_adjustment: "Ajuste Manual",
    loss: "Perda",
    return: "Devolução",
    transfer: "Transferência",
    sale: "Venda",
    inventory_count: "Inventário",
  };
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      {labels[reason]}
    </span>
  );
};

// Badge de Severidade de Alerta
const AlertSeverityBadge = ({ severity }: { severity: "warning" | "critical" }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      severity === "critical"
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    }`}
  >
    <AlertTriangle className="h-3 w-3" />
    {severity === "critical" ? "Crítico" : "Atenção"}
  </span>
);

// Card de Estatística
const StatsCard = ({
  title,
  value,
  icon: Icon,
  color = "primary",
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "primary" | "success" | "warning" | "danger";
  subtitle?: string;
}) => {
  const colorClasses = {
    primary: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
};

// ===== DADOS MOCK =====
const mockCategories: ProductCategory[] = [
  { id: "1", name: "Cabelo", description: "Produtos para cabelo", order: 1, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "2", name: "Barba", description: "Produtos para barba", order: 2, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "3", name: "Coloração", description: "Tintas e colorações", order: 3, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "4", name: "Tratamento", description: "Tratamentos capilares", order: 4, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "5", name: "Descartáveis", description: "Materiais descartáveis", order: 5, isActive: true, createdAt: new Date(), updatedAt: new Date() },
];

const mockSuppliers: Supplier[] = [
  {
    id: "1",
    name: "Distribuidora Belle Hair",
    tradeName: "Belle Hair",
    cnpj: "12.345.678/0001-90",
    contactName: "Maria Silva",
    phone: "(11) 98765-4321",
    email: "contato@bellehair.com.br",
    totalPurchases: 45,
    lastPurchaseDate: new Date("2024-01-10"),
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Profissional Cosméticos Ltda",
    tradeName: "Pro Cosméticos",
    cnpj: "98.765.432/0001-10",
    contactName: "João Santos",
    phone: "(11) 91234-5678",
    email: "vendas@procosmeticos.com.br",
    totalPurchases: 32,
    lastPurchaseDate: new Date("2024-01-05"),
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    name: "Barba & Bigode Distribuição",
    cnpj: "11.222.333/0001-44",
    contactName: "Pedro Lima",
    phone: "(11) 94567-8901",
    email: "pedidos@barbabigode.com",
    totalPurchases: 18,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Shampoo Profissional 1L",
    description: "Shampoo para uso profissional",
    sku: "SHP-001",
    barcode: "7891234567890",
    categoryId: "1",
    category: mockCategories[0],
    currentStock: 25,
    minimumStock: 10,
    maximumStock: 50,
    unitOfMeasure: "unit",
    costPrice: 35.00,
    sellingPrice: 55.00,
    isSellable: true,
    supplierId: "1",
    supplier: mockSuppliers[0],
    usedInServiceIds: ["1", "2", "3"],
    status: "active",
    stockStatus: "normal",
    lastPurchaseDate: new Date("2024-01-10"),
    lastMovementDate: new Date("2024-01-15"),
    averageMonthlyUsage: 12,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Condicionador Profissional 1L",
    description: "Condicionador para uso profissional",
    sku: "CND-001",
    barcode: "7891234567891",
    categoryId: "1",
    category: mockCategories[0],
    currentStock: 8,
    minimumStock: 10,
    unitOfMeasure: "unit",
    costPrice: 38.00,
    sellingPrice: 60.00,
    isSellable: true,
    supplierId: "1",
    supplier: mockSuppliers[0],
    usedInServiceIds: ["1", "2"],
    status: "active",
    stockStatus: "low",
    averageMonthlyUsage: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    name: "Óleo para Barba 30ml",
    description: "Óleo hidratante para barba",
    sku: "OLB-001",
    categoryId: "2",
    category: mockCategories[1],
    currentStock: 3,
    minimumStock: 5,
    unitOfMeasure: "unit",
    costPrice: 25.00,
    sellingPrice: 45.00,
    isSellable: true,
    supplierId: "3",
    supplier: mockSuppliers[2],
    usedInServiceIds: ["5"],
    status: "active",
    stockStatus: "critical",
    averageMonthlyUsage: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    name: "Tinta Coloração 60ml",
    description: "Tinta para coloração profissional",
    sku: "TIN-001",
    categoryId: "3",
    category: mockCategories[2],
    currentStock: 0,
    minimumStock: 5,
    unitOfMeasure: "unit",
    costPrice: 18.00,
    isSellable: false,
    supplierId: "2",
    supplier: mockSuppliers[1],
    usedInServiceIds: ["4"],
    status: "active",
    stockStatus: "out_of_stock",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "5",
    name: "Luvas Descartáveis (cx 100un)",
    description: "Luvas de procedimento",
    sku: "LUV-001",
    categoryId: "5",
    category: mockCategories[4],
    currentStock: 45,
    minimumStock: 10,
    unitOfMeasure: "pack",
    costPrice: 28.00,
    isSellable: false,
    usedInServiceIds: [],
    status: "active",
    stockStatus: "normal",
    averageMonthlyUsage: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockMovements: StockMovement[] = [
  {
    id: "1",
    productId: "1",
    product: mockProducts[0],
    type: "in",
    reason: "purchase",
    quantity: 20,
    previousStock: 5,
    newStock: 25,
    unitCost: 35.00,
    totalCost: 700.00,
    createdById: "user1",
    createdByName: "Admin",
    unitId: "1",
    createdAt: new Date("2024-01-10T10:30:00"),
    updatedAt: new Date("2024-01-10T10:30:00"),
  },
  {
    id: "2",
    productId: "1",
    product: mockProducts[0],
    type: "out",
    reason: "service_usage",
    quantity: 1,
    previousStock: 26,
    newStock: 25,
    appointmentId: "apt1",
    createdById: "user2",
    createdByName: "Maria",
    unitId: "1",
    notes: "Corte + Escova - Cliente João",
    createdAt: new Date("2024-01-15T14:00:00"),
    updatedAt: new Date("2024-01-15T14:00:00"),
  },
  {
    id: "3",
    productId: "2",
    product: mockProducts[1],
    type: "out",
    reason: "service_usage",
    quantity: 1,
    previousStock: 9,
    newStock: 8,
    appointmentId: "apt2",
    createdById: "user2",
    createdByName: "Maria",
    unitId: "1",
    createdAt: new Date("2024-01-15T15:30:00"),
    updatedAt: new Date("2024-01-15T15:30:00"),
  },
  {
    id: "4",
    productId: "3",
    product: mockProducts[2],
    type: "adjustment",
    reason: "manual_adjustment",
    quantity: -2,
    previousStock: 5,
    newStock: 3,
    createdById: "user1",
    createdByName: "Admin",
    unitId: "1",
    notes: "Ajuste após inventário",
    createdAt: new Date("2024-01-14T09:00:00"),
    updatedAt: new Date("2024-01-14T09:00:00"),
  },
  {
    id: "5",
    productId: "4",
    product: mockProducts[3],
    type: "out",
    reason: "loss",
    quantity: 3,
    previousStock: 3,
    newStock: 0,
    createdById: "user1",
    createdByName: "Admin",
    unitId: "1",
    notes: "Produtos vencidos",
    createdAt: new Date("2024-01-12T11:00:00"),
    updatedAt: new Date("2024-01-12T11:00:00"),
  },
];

const mockAlerts: StockAlert[] = [
  {
    id: "1",
    productId: "4",
    product: mockProducts[3],
    type: "out_of_stock",
    severity: "critical",
    currentStock: 0,
    minimumStock: 5,
    createdAt: new Date("2024-01-12T11:00:00"),
    unitId: "1",
  },
  {
    id: "2",
    productId: "3",
    product: mockProducts[2],
    type: "low_stock",
    severity: "critical",
    currentStock: 3,
    minimumStock: 5,
    createdAt: new Date("2024-01-14T09:00:00"),
    unitId: "1",
  },
  {
    id: "3",
    productId: "2",
    product: mockProducts[1],
    type: "low_stock",
    severity: "warning",
    currentStock: 8,
    minimumStock: 10,
    createdAt: new Date("2024-01-15T15:30:00"),
    unitId: "1",
  },
];

const mockStats: StockStats = {
  totalProducts: 5,
  lowStockCount: 2,
  outOfStockCount: 1,
  totalValue: 4250.00,
  recentMovements: mockMovements.slice(0, 5),
  topUsedProducts: [
    { productId: "1", productName: "Shampoo Profissional 1L", usageCount: 45 },
    { productId: "2", productName: "Condicionador Profissional 1L", usageCount: 38 },
    { productId: "3", productName: "Óleo para Barba 30ml", usageCount: 22 },
  ],
  pendingPurchases: 2,
};

// ===== TIPOS DE ABAS =====
type TabType = "products" | "suppliers" | "movements" | "alerts";

// ===== COMPONENTE PRINCIPAL =====
export default function StockPage() {
  const { user } = useSalonAuth();
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para Produtos
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categories, setCategories] = useState<ProductCategory[]>(mockCategories);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<ProductCreateInput>>({});
  const [productFilter, setProductFilter] = useState<{
    categoryId?: string;
    stockStatus?: StockStatus;
    status?: Status;
  }>({});

  // Estados para Fornecedores
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<Partial<SupplierCreateInput>>({});

  // Estados para Movimentações
  const [movements, setMovements] = useState<StockMovement[]>(mockMovements);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState<Partial<StockMovementCreateInput>>({});
  const [movementFilter, setMovementFilter] = useState<{
    type?: MovementType;
    reason?: MovementReason;
    productId?: string;
  }>({});

  // Estados para Alertas
  const [alerts, setAlerts] = useState<StockAlert[]>(mockAlerts);
  const [alertFilter, setAlertFilter] = useState<{
    type?: "low_stock" | "out_of_stock";
    severity?: "warning" | "critical";
  }>({});

  // Estados gerais
  const [stats, setStats] = useState<StockStats>(mockStats);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "product" | "supplier"; id: string } | null>(null);

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm);
      const matchesCategory = !productFilter.categoryId || product.categoryId === productFilter.categoryId;
      const matchesStockStatus = !productFilter.stockStatus || product.stockStatus === productFilter.stockStatus;
      const matchesStatus = !productFilter.status || product.status === productFilter.status;
      return matchesSearch && matchesCategory && matchesStockStatus && matchesStatus;
    });
  }, [products, searchTerm, productFilter]);

  // Filtrar fornecedores
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch =
        !searchTerm ||
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.tradeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.cnpj?.includes(searchTerm);
      return matchesSearch;
    });
  }, [suppliers, searchTerm]);

  // Filtrar movimentações
  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const matchesSearch =
        !searchTerm ||
        movement.product?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !movementFilter.type || movement.type === movementFilter.type;
      const matchesReason = !movementFilter.reason || movement.reason === movementFilter.reason;
      const matchesProduct = !movementFilter.productId || movement.productId === movementFilter.productId;
      return matchesSearch && matchesType && matchesReason && matchesProduct;
    });
  }, [movements, searchTerm, movementFilter]);

  // Filtrar alertas
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesType = !alertFilter.type || alert.type === alertFilter.type;
      const matchesSeverity = !alertFilter.severity || alert.severity === alertFilter.severity;
      return matchesType && matchesSeverity;
    });
  }, [alerts, alertFilter]);

  // Handlers de Produtos
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        categoryId: product.categoryId,
        currentStock: product.currentStock,
        minimumStock: product.minimumStock,
        maximumStock: product.maximumStock,
        unitOfMeasure: product.unitOfMeasure,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        isSellable: product.isSellable,
        supplierId: product.supplierId,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        unitOfMeasure: "unit",
        isSellable: false,
        currentStock: 0,
        minimumStock: 1,
      });
    }
    setProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.categoryId) return;

    setIsLoading(true);
    try {
      if (editingProduct) {
        // Atualizar produto
        const updatedProduct: Product = {
          ...editingProduct,
          ...productForm,
          name: productForm.name!,
          categoryId: productForm.categoryId!,
          currentStock: productForm.currentStock ?? 0,
          minimumStock: productForm.minimumStock ?? 1,
          unitOfMeasure: productForm.unitOfMeasure ?? "unit",
          costPrice: productForm.costPrice ?? 0,
          isSellable: productForm.isSellable ?? false,
          usedInServiceIds: editingProduct.usedInServiceIds,
          status: editingProduct.status,
          stockStatus: calculateStockStatus(productForm.currentStock ?? 0, productForm.minimumStock ?? 1),
          category: categories.find((c) => c.id === productForm.categoryId),
          supplier: suppliers.find((s) => s.id === productForm.supplierId),
          updatedAt: new Date(),
        };
        setProducts(products.map((p) => (p.id === editingProduct.id ? updatedProduct : p)));
      } else {
        // Criar produto
        const newProduct: Product = {
          id: String(Date.now()),
          name: productForm.name!,
          description: productForm.description,
          sku: productForm.sku,
          barcode: productForm.barcode,
          categoryId: productForm.categoryId!,
          category: categories.find((c) => c.id === productForm.categoryId),
          currentStock: productForm.currentStock ?? 0,
          minimumStock: productForm.minimumStock ?? 1,
          maximumStock: productForm.maximumStock,
          unitOfMeasure: productForm.unitOfMeasure ?? "unit",
          costPrice: productForm.costPrice ?? 0,
          sellingPrice: productForm.sellingPrice,
          isSellable: productForm.isSellable ?? false,
          supplierId: productForm.supplierId,
          supplier: suppliers.find((s) => s.id === productForm.supplierId),
          usedInServiceIds: [],
          status: "active",
          stockStatus: calculateStockStatus(productForm.currentStock ?? 0, productForm.minimumStock ?? 1),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setProducts([...products, newProduct]);
      }
      setProductModalOpen(false);
      setProductForm({});
      setEditingProduct(null);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStockStatus = (current: number, minimum: number): StockStatus => {
    if (current === 0) return "out_of_stock";
    if (current < minimum * 0.5) return "critical";
    if (current < minimum) return "low";
    return "normal";
  };

  const handleToggleProductStatus = (product: Product) => {
    const newStatus = product.status === "active" ? "inactive" : "active";
    setProducts(
      products.map((p) =>
        p.id === product.id ? { ...p, status: newStatus as Status, updatedAt: new Date() } : p
      )
    );
  };

  // Handlers de Fornecedores
  const handleOpenSupplierModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierForm({
        name: supplier.name,
        tradeName: supplier.tradeName,
        cnpj: supplier.cnpj,
        contactName: supplier.contactName,
        phone: supplier.phone,
        email: supplier.email,
        website: supplier.website,
        address: supplier.address,
        paymentTerms: supplier.paymentTerms,
        notes: supplier.notes,
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm({});
    }
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name) return;

    setIsLoading(true);
    try {
      if (editingSupplier) {
        const updatedSupplier: Supplier = {
          ...editingSupplier,
          ...supplierForm,
          name: supplierForm.name!,
          updatedAt: new Date(),
        };
        setSuppliers(suppliers.map((s) => (s.id === editingSupplier.id ? updatedSupplier : s)));
      } else {
        const newSupplier: Supplier = {
          id: String(Date.now()),
          name: supplierForm.name!,
          tradeName: supplierForm.tradeName,
          cnpj: supplierForm.cnpj,
          contactName: supplierForm.contactName,
          phone: supplierForm.phone,
          email: supplierForm.email,
          website: supplierForm.website,
          address: supplierForm.address,
          paymentTerms: supplierForm.paymentTerms,
          notes: supplierForm.notes,
          totalPurchases: 0,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setSuppliers([...suppliers, newSupplier]);
      }
      setSupplierModalOpen(false);
      setSupplierForm({});
      setEditingSupplier(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSupplierStatus = (supplier: Supplier) => {
    const newStatus = supplier.status === "active" ? "inactive" : "active";
    setSuppliers(
      suppliers.map((s) =>
        s.id === supplier.id ? { ...s, status: newStatus as Status, updatedAt: new Date() } : s
      )
    );
  };

  // Handlers de Movimentações
  const handleOpenMovementModal = () => {
    setMovementForm({
      type: "in",
      reason: "purchase",
      quantity: 1,
      unitId: "1",
    });
    setMovementModalOpen(true);
  };

  const handleSaveMovement = async () => {
    if (!movementForm.productId || !movementForm.quantity) return;

    setIsLoading(true);
    try {
      const product = products.find((p) => p.id === movementForm.productId);
      if (!product) return;

      const quantity = movementForm.type === "out" ? -Math.abs(movementForm.quantity) : Math.abs(movementForm.quantity);
      const newStock = product.currentStock + quantity;

      const newMovement: StockMovement = {
        id: String(Date.now()),
        productId: movementForm.productId,
        product: product,
        type: movementForm.type!,
        reason: movementForm.reason!,
        quantity: Math.abs(movementForm.quantity),
        previousStock: product.currentStock,
        newStock: newStock,
        unitCost: movementForm.unitCost,
        totalCost: movementForm.unitCost ? movementForm.unitCost * movementForm.quantity : undefined,
        createdById: user?.id || "user1",
        createdByName: user?.name || "Admin",
        unitId: movementForm.unitId!,
        notes: movementForm.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Atualiza o estoque do produto
      const updatedProduct: Product = {
        ...product,
        currentStock: newStock,
        stockStatus: calculateStockStatus(newStock, product.minimumStock),
        lastMovementDate: new Date(),
        updatedAt: new Date(),
      };

      setProducts(products.map((p) => (p.id === product.id ? updatedProduct : p)));
      setMovements([newMovement, ...movements]);

      // Verifica se precisa criar alerta
      if (newStock <= 0) {
        const existingAlert = alerts.find((a) => a.productId === product.id && a.type === "out_of_stock");
        if (!existingAlert) {
          const newAlert: StockAlert = {
            id: String(Date.now()),
            productId: product.id,
            product: updatedProduct,
            type: "out_of_stock",
            severity: "critical",
            currentStock: newStock,
            minimumStock: product.minimumStock,
            createdAt: new Date(),
            unitId: "1",
          };
          setAlerts([newAlert, ...alerts]);
        }
      } else if (newStock < product.minimumStock) {
        const existingAlert = alerts.find((a) => a.productId === product.id && a.type === "low_stock");
        if (!existingAlert) {
          const newAlert: StockAlert = {
            id: String(Date.now()),
            productId: product.id,
            product: updatedProduct,
            type: "low_stock",
            severity: newStock < product.minimumStock * 0.5 ? "critical" : "warning",
            currentStock: newStock,
            minimumStock: product.minimumStock,
            createdAt: new Date(),
            unitId: "1",
          };
          setAlerts([newAlert, ...alerts]);
        }
      }

      setMovementModalOpen(false);
      setMovementForm({});
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers de Alertas
  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(
      alerts.map((a) =>
        a.id === alertId ? { ...a, acknowledgedAt: new Date(), acknowledgedById: user?.id } : a
      )
    );
  };

  const handleAcknowledgeAllAlerts = () => {
    setAlerts(
      alerts.map((a) => ({
        ...a,
        acknowledgedAt: a.acknowledgedAt || new Date(),
        acknowledgedById: a.acknowledgedById || user?.id,
      }))
    );
  };

  // Handler de Exclusão
  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === "product") {
      setProducts(products.filter((p) => p.id !== itemToDelete.id));
    } else if (itemToDelete.type === "supplier") {
      setSuppliers(suppliers.filter((s) => s.id !== itemToDelete.id));
    }

    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  // Definições das colunas
  const productColumns: Column<Product>[] = [
    {
      key: "name",
      header: "Produto",
      sortable: true,
      render: (product) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            <Package className="h-5 w-5 text-gray-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {product.sku && <span>SKU: {product.sku}</span>}
              {product.barcode && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Barcode className="h-3 w-3" />
                    {product.barcode}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoria",
      render: (product) => (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {product.category?.name || "-"}
        </span>
      ),
    },
    {
      key: "stockStatus",
      header: "Estoque",
      sortable: true,
      render: (product) => (
        <StockStatusBadge
          status={product.stockStatus}
          currentStock={product.currentStock}
          minimumStock={product.minimumStock}
        />
      ),
    },
    {
      key: "costPrice",
      header: "Preço Custo",
      sortable: true,
      render: (product) => (
        <span className="font-medium">R$ {product.costPrice.toFixed(2)}</span>
      ),
    },
    {
      key: "sellingPrice",
      header: "Preço Venda",
      render: (product) => (
        product.isSellable && product.sellingPrice ? (
          <span className="font-medium text-green-600">R$ {product.sellingPrice.toFixed(2)}</span>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (product) => <StatusBadge status={product.status} />,
    },
  ];

  const supplierColumns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Fornecedor",
      sortable: true,
      render: (supplier) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{supplier.name}</p>
            {supplier.tradeName && (
              <p className="text-xs text-gray-500">{supplier.tradeName}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "cnpj",
      header: "CNPJ",
      render: (supplier) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {supplier.cnpj || "-"}
        </span>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (supplier) => (
        <div className="text-sm">
          {supplier.contactName && <p className="font-medium">{supplier.contactName}</p>}
          {supplier.phone && (
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <Phone className="h-3 w-3" />
              {supplier.phone}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "totalPurchases",
      header: "Compras",
      sortable: true,
      render: (supplier) => (
        <div className="text-center">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {supplier.totalPurchases}
          </span>
          {supplier.lastPurchaseDate && (
            <p className="text-xs text-gray-500">
              Última: {new Date(supplier.lastPurchaseDate).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (supplier) => <StatusBadge status={supplier.status} />,
    },
  ];

  const movementColumns: Column<StockMovement>[] = [
    {
      key: "createdAt",
      header: "Data/Hora",
      sortable: true,
      render: (movement) => (
        <div className="text-sm">
          <p className="font-medium">
            {new Date(movement.createdAt).toLocaleDateString("pt-BR")}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(movement.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      ),
    },
    {
      key: "product",
      header: "Produto",
      render: (movement) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{movement.product?.name || "-"}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (movement) => <MovementTypeBadge type={movement.type} />,
    },
    {
      key: "reason",
      header: "Motivo",
      render: (movement) => <ReasonBadge reason={movement.reason} />,
    },
    {
      key: "quantity",
      header: "Quantidade",
      render: (movement) => (
        <div className="text-center">
          <span
            className={`text-lg font-bold ${
              movement.type === "in"
                ? "text-green-600"
                : movement.type === "out"
                ? "text-red-600"
                : "text-blue-600"
            }`}
          >
            {movement.type === "in" ? "+" : movement.type === "out" ? "-" : ""}
            {movement.quantity}
          </span>
          <p className="text-xs text-gray-500">
            {movement.previousStock} → {movement.newStock}
          </p>
        </div>
      ),
    },
    {
      key: "createdByName",
      header: "Por",
      render: (movement) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {movement.createdByName}
        </span>
      ),
    },
  ];

  const alertColumns: Column<StockAlert>[] = [
    {
      key: "createdAt",
      header: "Data",
      sortable: true,
      render: (alert) => (
        <span className="text-sm">
          {new Date(alert.createdAt).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      key: "product",
      header: "Produto",
      render: (alert) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{alert.product?.name || "-"}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (alert) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            alert.type === "out_of_stock"
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          {alert.type === "out_of_stock" ? "Sem Estoque" : "Estoque Baixo"}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severidade",
      render: (alert) => <AlertSeverityBadge severity={alert.severity} />,
    },
    {
      key: "currentStock",
      header: "Estoque",
      render: (alert) => (
        <div className="text-center">
          <span className="text-lg font-bold text-red-600">{alert.currentStock}</span>
          <p className="text-xs text-gray-500">mín: {alert.minimumStock}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (alert) => (
        alert.acknowledgedAt ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Reconhecido
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            <Bell className="h-3 w-3" />
            Pendente
          </span>
        )
      ),
    },
  ];

  // Ações das linhas
  const renderProductActions = (product: Product) => (
    <>
      <ActionMenuItem
        onClick={() => handleOpenProductModal(product)}
        icon={<Edit2 className="h-4 w-4" />}
      >
        Editar
      </ActionMenuItem>
      <ActionMenuItem
        onClick={() => handleOpenMovementModal()}
        icon={<ArrowUpDown className="h-4 w-4" />}
      >
        Movimentar
      </ActionMenuItem>
      <ActionMenuItem
        onClick={() => handleToggleProductStatus(product)}
        icon={product.status === "active" ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
      >
        {product.status === "active" ? "Desativar" : "Ativar"}
      </ActionMenuItem>
      <ActionMenuItem
        onClick={() => {
          setItemToDelete({ type: "product", id: product.id });
          setDeleteModalOpen(true);
        }}
        icon={<Trash2 className="h-4 w-4" />}
        variant="danger"
      >
        Excluir
      </ActionMenuItem>
    </>
  );

  const renderSupplierActions = (supplier: Supplier) => (
    <>
      <ActionMenuItem
        onClick={() => handleOpenSupplierModal(supplier)}
        icon={<Edit2 className="h-4 w-4" />}
      >
        Editar
      </ActionMenuItem>
      <ActionMenuItem
        onClick={() => handleToggleSupplierStatus(supplier)}
        icon={supplier.status === "active" ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
      >
        {supplier.status === "active" ? "Desativar" : "Ativar"}
      </ActionMenuItem>
      <ActionMenuItem
        onClick={() => {
          setItemToDelete({ type: "supplier", id: supplier.id });
          setDeleteModalOpen(true);
        }}
        icon={<Trash2 className="h-4 w-4" />}
        variant="danger"
      >
        Excluir
      </ActionMenuItem>
    </>
  );

  const renderAlertActions = (alert: StockAlert) => (
    <>
      {!alert.acknowledgedAt && (
        <ActionMenuItem
          onClick={() => handleAcknowledgeAlert(alert.id)}
          icon={<CheckCircle className="h-4 w-4" />}
        >
          Reconhecer
        </ActionMenuItem>
      )}
      <ActionMenuItem
        onClick={() => {
          setMovementForm({
            productId: alert.productId,
            type: "in",
            reason: "purchase",
            quantity: alert.minimumStock - alert.currentStock,
            unitId: "1",
          });
          setMovementModalOpen(true);
        }}
        icon={<Plus className="h-4 w-4" />}
      >
        Repor Estoque
      </ActionMenuItem>
    </>
  );

  // Unidades de medida
  const unitOfMeasureOptions: { value: UnitOfMeasure; label: string }[] = [
    { value: "unit", label: "Unidade" },
    { value: "ml", label: "Mililitros (ml)" },
    { value: "l", label: "Litros (L)" },
    { value: "g", label: "Gramas (g)" },
    { value: "kg", label: "Quilogramas (kg)" },
    { value: "oz", label: "Onças (oz)" },
    { value: "pack", label: "Pacote" },
  ];

  // Motivos de movimentação
  const movementReasonOptions: { value: MovementReason; label: string; types: MovementType[] }[] = [
    { value: "purchase", label: "Compra de Fornecedor", types: ["in"] },
    { value: "service_usage", label: "Uso em Serviço", types: ["out"] },
    { value: "manual_adjustment", label: "Ajuste Manual", types: ["adjustment"] },
    { value: "loss", label: "Perda/Quebra", types: ["out"] },
    { value: "return", label: "Devolução", types: ["in", "out"] },
    { value: "transfer", label: "Transferência", types: ["in", "out"] },
    { value: "sale", label: "Venda Direta", types: ["out"] },
    { value: "inventory_count", label: "Contagem de Inventário", types: ["adjustment"] },
  ];

  const filteredReasons = movementReasonOptions.filter(
    (r) => movementForm.type && r.types.includes(movementForm.type)
  );

  const pendingAlerts = alerts.filter((a) => !a.acknowledgedAt);

  return (
    <SalonLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Estoque
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gerencie produtos, fornecedores e movimentações de estoque
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingAlerts.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  {pendingAlerts.length} alerta{pendingAlerts.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Produtos"
            value={String(stats.totalProducts)}
            icon={Package}
            color="primary"
          />
          <StatsCard
            title="Estoque Baixo"
            value={String(stats.lowStockCount)}
            icon={TrendingDown}
            color="warning"
          />
          <StatsCard
            title="Sem Estoque"
            value={String(stats.outOfStockCount)}
            icon={AlertTriangle}
            color="danger"
          />
          <StatsCard
            title="Valor em Estoque"
            value={`R$ ${stats.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="success"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4 overflow-x-auto">
            {[
              { id: "products" as TabType, label: "Produtos", icon: Package, count: products.length },
              { id: "suppliers" as TabType, label: "Fornecedores", icon: Truck, count: suppliers.length },
              { id: "movements" as TabType, label: "Movimentações", icon: ArrowUpDown, count: movements.length },
              { id: "alerts" as TabType, label: "Alertas", icon: AlertTriangle, count: pendingAlerts.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm("");
                }}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      tab.id === "alerts" && pendingAlerts.length > 0
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Barra de Ações */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={
                  activeTab === "products"
                    ? "Buscar produtos..."
                    : activeTab === "suppliers"
                    ? "Buscar fornecedores..."
                    : activeTab === "movements"
                    ? "Buscar movimentações..."
                    : "Buscar alertas..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtros específicos por aba */}
            {activeTab === "products" && (
              <>
                <select
                  value={productFilter.categoryId || ""}
                  onChange={(e) => setProductFilter({ ...productFilter, categoryId: e.target.value || undefined })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">Todas categorias</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <select
                  value={productFilter.stockStatus || ""}
                  onChange={(e) => setProductFilter({ ...productFilter, stockStatus: e.target.value as StockStatus || undefined })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">Todos status</option>
                  <option value="normal">Normal</option>
                  <option value="low">Baixo</option>
                  <option value="critical">Crítico</option>
                  <option value="out_of_stock">Sem Estoque</option>
                </select>
              </>
            )}

            {activeTab === "movements" && (
              <>
                <select
                  value={movementFilter.type || ""}
                  onChange={(e) => setMovementFilter({ ...movementFilter, type: e.target.value as MovementType || undefined })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">Todos tipos</option>
                  <option value="in">Entrada</option>
                  <option value="out">Saída</option>
                  <option value="adjustment">Ajuste</option>
                </select>
                <select
                  value={movementFilter.productId || ""}
                  onChange={(e) => setMovementFilter({ ...movementFilter, productId: e.target.value || undefined })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">Todos produtos</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {activeTab === "alerts" && (
              <>
                <select
                  value={alertFilter.severity || ""}
                  onChange={(e) => setAlertFilter({ ...alertFilter, severity: e.target.value as "warning" | "critical" || undefined })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">Todas severidades</option>
                  <option value="critical">Crítico</option>
                  <option value="warning">Atenção</option>
                </select>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "products" && (
              <Button onClick={() => handleOpenProductModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            )}
            {activeTab === "suppliers" && (
              <Button onClick={() => handleOpenSupplierModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Fornecedor
              </Button>
            )}
            {activeTab === "movements" && (
              <Button onClick={handleOpenMovementModal}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Movimentação
              </Button>
            )}
            {activeTab === "alerts" && pendingAlerts.length > 0 && (
              <Button variant="outline" onClick={handleAcknowledgeAllAlerts}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Reconhecer Todos
              </Button>
            )}
          </div>
        </div>

        {/* Tabelas */}
        {activeTab === "products" && (
          <DataTable
            columns={productColumns}
            data={filteredProducts}
            keyExtractor={(product) => product.id}
            isLoading={isLoading}
            rowActions={renderProductActions}
            emptyMessage="Nenhum produto encontrado"
          />
        )}

        {activeTab === "suppliers" && (
          <DataTable
            columns={supplierColumns}
            data={filteredSuppliers}
            keyExtractor={(supplier) => supplier.id}
            isLoading={isLoading}
            rowActions={renderSupplierActions}
            emptyMessage="Nenhum fornecedor encontrado"
          />
        )}

        {activeTab === "movements" && (
          <DataTable
            columns={movementColumns}
            data={filteredMovements}
            keyExtractor={(movement) => movement.id}
            isLoading={isLoading}
            emptyMessage="Nenhuma movimentação encontrada"
          />
        )}

        {activeTab === "alerts" && (
          <DataTable
            columns={alertColumns}
            data={filteredAlerts}
            keyExtractor={(alert) => alert.id}
            isLoading={isLoading}
            rowActions={renderAlertActions}
            emptyMessage="Nenhum alerta encontrado"
          />
        )}
      </div>

      {/* Modal de Produto */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setProductForm({});
          setEditingProduct(null);
        }}
        title={editingProduct ? "Editar Produto" : "Novo Produto"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome do Produto *"
              placeholder="Ex: Shampoo Profissional"
              value={productForm.name || ""}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Categoria *
              </label>
              <select
                value={productForm.categoryId || ""}
                onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Descrição"
            placeholder="Descrição do produto"
            value={productForm.description || ""}
            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="SKU"
              placeholder="Ex: SHP-001"
              value={productForm.sku || ""}
              onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
            />
            <Input
              label="Código de Barras"
              placeholder="Ex: 7891234567890"
              value={productForm.barcode || ""}
              onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Unidade de Medida
              </label>
              <select
                value={productForm.unitOfMeasure || "unit"}
                onChange={(e) => setProductForm({ ...productForm, unitOfMeasure: e.target.value as UnitOfMeasure })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                {unitOfMeasureOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Estoque Atual"
              type="number"
              min={0}
              value={productForm.currentStock ?? 0}
              onChange={(e) => setProductForm({ ...productForm, currentStock: Number(e.target.value) })}
            />
            <Input
              label="Estoque Mínimo *"
              type="number"
              min={1}
              value={productForm.minimumStock ?? 1}
              onChange={(e) => setProductForm({ ...productForm, minimumStock: Number(e.target.value) })}
            />
            <Input
              label="Estoque Máximo"
              type="number"
              min={0}
              value={productForm.maximumStock ?? ""}
              onChange={(e) => setProductForm({ ...productForm, maximumStock: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Preço de Custo *"
              type="number"
              min={0}
              step={0.01}
              value={productForm.costPrice ?? ""}
              onChange={(e) => setProductForm({ ...productForm, costPrice: Number(e.target.value) })}
            />
            <Input
              label="Preço de Venda"
              type="number"
              min={0}
              step={0.01}
              value={productForm.sellingPrice ?? ""}
              onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fornecedor
              </label>
              <select
                value={productForm.supplierId || ""}
                onChange={(e) => setProductForm({ ...productForm, supplierId: e.target.value || undefined })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="">Selecione...</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="isSellable"
                checked={productForm.isSellable || false}
                onChange={(e) => setProductForm({ ...productForm, isSellable: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isSellable" className="text-sm text-gray-700 dark:text-gray-300">
                Produto disponível para venda direta
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setProductModalOpen(false);
                setProductForm({});
                setEditingProduct(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveProduct} disabled={isLoading || !productForm.name || !productForm.categoryId}>
              {isLoading ? "Salvando..." : editingProduct ? "Salvar" : "Criar Produto"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Fornecedor */}
      <Modal
        isOpen={supplierModalOpen}
        onClose={() => {
          setSupplierModalOpen(false);
          setSupplierForm({});
          setEditingSupplier(null);
        }}
        title={editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Razão Social *"
              placeholder="Nome da empresa"
              value={supplierForm.name || ""}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
            />
            <Input
              label="Nome Fantasia"
              placeholder="Nome comercial"
              value={supplierForm.tradeName || ""}
              onChange={(e) => setSupplierForm({ ...supplierForm, tradeName: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="CNPJ"
              placeholder="00.000.000/0001-00"
              value={supplierForm.cnpj || ""}
              onChange={(e) => setSupplierForm({ ...supplierForm, cnpj: e.target.value })}
            />
            <Input
              label="Nome do Contato"
              placeholder="Pessoa de contato"
              value={supplierForm.contactName || ""}
              onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={supplierForm.phone || ""}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
            />
            <Input
              label="E-mail"
              type="email"
              placeholder="contato@fornecedor.com"
              value={supplierForm.email || ""}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
            />
          </div>

          <Input
            label="Website"
            placeholder="https://www.fornecedor.com"
            value={supplierForm.website || ""}
            onChange={(e) => setSupplierForm({ ...supplierForm, website: e.target.value })}
          />

          <Input
            label="Condições de Pagamento"
            placeholder="Ex: 30/60/90 dias"
            value={supplierForm.paymentTerms || ""}
            onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações
            </label>
            <textarea
              placeholder="Notas sobre o fornecedor..."
              value={supplierForm.notes || ""}
              onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSupplierModalOpen(false);
                setSupplierForm({});
                setEditingSupplier(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveSupplier} disabled={isLoading || !supplierForm.name}>
              {isLoading ? "Salvando..." : editingSupplier ? "Salvar" : "Criar Fornecedor"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Movimentação */}
      <Modal
        isOpen={movementModalOpen}
        onClose={() => {
          setMovementModalOpen(false);
          setMovementForm({});
        }}
        title="Nova Movimentação de Estoque"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Produto *
            </label>
            <select
              value={movementForm.productId || ""}
              onChange={(e) => setMovementForm({ ...movementForm, productId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="">Selecione um produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Estoque: {p.currentStock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo *
              </label>
              <select
                value={movementForm.type || "in"}
                onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as MovementType, reason: undefined })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="in">Entrada</option>
                <option value="out">Saída</option>
                <option value="adjustment">Ajuste</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Motivo *
              </label>
              <select
                value={movementForm.reason || ""}
                onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value as MovementReason })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                <option value="">Selecione...</option>
                {filteredReasons.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Quantidade *"
              type="number"
              min={1}
              value={movementForm.quantity ?? 1}
              onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
            />
            {movementForm.type === "in" && (
              <Input
                label="Custo Unitário"
                type="number"
                min={0}
                step={0.01}
                value={movementForm.unitCost ?? ""}
                onChange={(e) => setMovementForm({ ...movementForm, unitCost: e.target.value ? Number(e.target.value) : undefined })}
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observações
            </label>
            <textarea
              placeholder="Notas sobre a movimentação..."
              value={movementForm.notes || ""}
              onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>

          {movementForm.productId && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Estoque atual:</strong>{" "}
                {products.find((p) => p.id === movementForm.productId)?.currentStock || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Estoque após:</strong>{" "}
                {(products.find((p) => p.id === movementForm.productId)?.currentStock || 0) +
                  (movementForm.type === "out" ? -(movementForm.quantity || 0) : (movementForm.quantity || 0))}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setMovementModalOpen(false);
                setMovementForm({});
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveMovement}
              disabled={isLoading || !movementForm.productId || !movementForm.quantity || !movementForm.reason}
            >
              {isLoading ? "Salvando..." : "Registrar Movimentação"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={`Excluir ${itemToDelete?.type === "product" ? "Produto" : "Fornecedor"}`}
        message={`Tem certeza que deseja excluir este ${
          itemToDelete?.type === "product" ? "produto" : "fornecedor"
        }? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
      />
    </SalonLayout>
  );
}
