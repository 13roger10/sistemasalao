"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Scissors,
  Clock,
  DollarSign,
  Percent,
  Tag,
  Package,
  CheckCircle,
  XCircle,
  Layers,
  Copy,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { DataTable, ActionMenuItem, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { serviceService } from "@/services/salon/serviceService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import type {
  Service,
  ServiceCreateInput,
  ServiceUpdateInput,
  ServiceFilters,
  ServiceCategory,
  CategoryCreateInput,
  ServiceCombo,
  ServiceComboCreateInput,
} from "@/types/salon";

// Badge de Status
const StatusBadge = ({ status }: { status: "active" | "inactive" }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === "active"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {status === "active" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {status === "active" ? "Ativo" : "Inativo"}
    </span>
  );
};

// Badge de Categoria
const CategoryBadge = ({ category }: { category?: ServiceCategory }) => {
  if (!category) return <span className="text-gray-400">-</span>;

  const colors: Record<string, { bg: string; text: string }> = {
    Cabelo: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-400" },
    Barba: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" },
    Estética: { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-700 dark:text-pink-400" },
  };

  const colorConfig = colors[category.name] || { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-700 dark:text-gray-300" };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorConfig.bg} ${colorConfig.text}`}>
      <Tag className="h-3 w-3" />
      {category.name}
    </span>
  );
};

// Card de Estatísticas
const StatsCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-3">
      <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

// Tabs Component
const Tabs = ({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
}) => (
  <div className="border-b border-gray-200 dark:border-gray-700">
    <nav className="-mb-px flex space-x-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "border-violet-500 text-violet-600 dark:text-violet-400"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  </div>
);

export default function ServicesPage() {
  const { user } = useSalonAuth();

  // Estados de aba ativa
  const [activeTab, setActiveTab] = useState<"services" | "categories" | "combos">("services");

  // Estados de listagem - Serviços
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Estados de listagem - Categorias
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Estados de listagem - Combos
  const [combos, setCombos] = useState<ServiceCombo[]>([]);
  const [isLoadingCombos, setIsLoadingCombos] = useState(false);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Estados de modais - Serviço
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de modais - Categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  // Estados de modais - Combo
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [isDeleteComboModalOpen, setIsDeleteComboModalOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<ServiceCombo | null>(null);

  // Estados do formulário - Serviço
  const [formData, setFormData] = useState<ServiceCreateInput>({
    name: "",
    description: "",
    categoryId: "",
    price: 0,
    durationMinutes: 30,
    commissionPercentage: 50,
    showInOnlineBooking: true,
    loyaltyPointsEarned: 10,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Estados do formulário - Categoria
  const [categoryFormData, setCategoryFormData] = useState<CategoryCreateInput>({
    name: "",
    description: "",
    icon: "",
    color: "#8B5CF6",
  });

  // Estados do formulário - Combo
  const [comboFormData, setComboFormData] = useState<ServiceComboCreateInput>({
    name: "",
    description: "",
    serviceIds: [],
    comboPrice: 0,
    showInOnlineBooking: true,
  });

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Formatar duração
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Carregar serviços
  const loadServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: ServiceFilters = {};
      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.categoryId = categoryFilter;

      const response = await serviceService.list({
        page,
        limit: 10,
        ...filters,
      });

      setServices(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalItems(response.meta.total);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      // Mock data
      setServices([
        {
          id: "1",
          name: "Corte Masculino",
          description: "Corte tradicional masculino",
          categoryId: "1",
          category: { id: "1", name: "Cabelo", order: 1, status: "active", createdAt: new Date(), updatedAt: new Date() },
          price: 50,
          durationMinutes: 30,
          commissionPercentage: 50,
          usesStock: false,
          loyaltyPointsEarned: 10,
          status: "active",
          showInOnlineBooking: true,
          requiresConfirmation: false,
          unitIds: [],
          totalBookings: 150,
          averageRating: 4.8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "Barba Completa",
          description: "Barba com navalha e toalha quente",
          categoryId: "2",
          category: { id: "2", name: "Barba", order: 2, status: "active", createdAt: new Date(), updatedAt: new Date() },
          price: 35,
          durationMinutes: 25,
          commissionPercentage: 50,
          usesStock: false,
          loyaltyPointsEarned: 8,
          status: "active",
          showInOnlineBooking: true,
          requiresConfirmation: false,
          unitIds: [],
          totalBookings: 120,
          averageRating: 4.9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          name: "Limpeza de Pele",
          description: "Limpeza facial profunda",
          categoryId: "3",
          category: { id: "3", name: "Estética", order: 3, status: "active", createdAt: new Date(), updatedAt: new Date() },
          price: 120,
          durationMinutes: 60,
          commissionPercentage: 40,
          usesStock: true,
          loyaltyPointsEarned: 20,
          status: "active",
          showInOnlineBooking: true,
          requiresConfirmation: true,
          unitIds: [],
          totalBookings: 45,
          averageRating: 4.7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "4",
          name: "Corte + Barba",
          description: "Combo corte masculino com barba",
          categoryId: "1",
          category: { id: "1", name: "Cabelo", order: 1, status: "active", createdAt: new Date(), updatedAt: new Date() },
          price: 75,
          promotionalPrice: 70,
          durationMinutes: 50,
          commissionPercentage: 50,
          usesStock: false,
          loyaltyPointsEarned: 15,
          status: "active",
          showInOnlineBooking: true,
          requiresConfirmation: false,
          unitIds: [],
          totalBookings: 200,
          averageRating: 4.9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as Service[]);
      setTotalPages(1);
      setTotalItems(4);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, statusFilter, categoryFilter]);

  // Carregar categorias
  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const data = await serviceService.categories.list();
      setCategories(data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      // Mock data
      setCategories([
        { id: "1", name: "Cabelo", description: "Serviços de corte e tratamento capilar", order: 1, status: "active", createdAt: new Date(), updatedAt: new Date() },
        { id: "2", name: "Barba", description: "Serviços de barba e bigode", order: 2, status: "active", createdAt: new Date(), updatedAt: new Date() },
        { id: "3", name: "Estética", description: "Serviços de estética facial e corporal", order: 3, status: "active", createdAt: new Date(), updatedAt: new Date() },
      ] as ServiceCategory[]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Carregar combos
  const loadCombos = useCallback(async () => {
    setIsLoadingCombos(true);
    try {
      const data = await serviceService.combos.list();
      setCombos(data);
    } catch (error) {
      console.error("Erro ao carregar combos:", error);
      // Mock data
      setCombos([
        {
          id: "1",
          name: "Dia do Noivo",
          description: "Pacote completo para noivos",
          services: [
            { serviceId: "1" },
            { serviceId: "2" },
          ],
          regularPrice: 85,
          comboPrice: 70,
          discountPercentage: 18,
          totalDurationMinutes: 55,
          status: "active",
          showInOnlineBooking: true,
          currentUses: 25,
          unitIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "Pai e Filho",
          description: "2 cortes masculinos",
          services: [
            { serviceId: "1" },
            { serviceId: "1" },
          ],
          regularPrice: 100,
          comboPrice: 80,
          discountPercentage: 20,
          totalDurationMinutes: 60,
          status: "active",
          showInOnlineBooking: true,
          currentUses: 15,
          unitIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as ServiceCombo[]);
    } finally {
      setIsLoadingCombos(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
    loadCategories();
  }, [loadServices, loadCategories]);

  useEffect(() => {
    if (activeTab === "combos" && combos.length === 0) {
      loadCombos();
    }
  }, [activeTab, combos.length, loadCombos]);

  // Handlers de busca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadServices();
  };

  // Handlers de CRUD - Serviço
  const handleCreateService = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await serviceService.create(formData);
      setIsCreateModalOpen(false);
      resetForm();
      loadServices();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormErrors({
        submit: err.response?.data?.message || "Erro ao criar serviço",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateService = async () => {
    if (!selectedService || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const updateData: ServiceUpdateInput = {
        name: formData.name,
        description: formData.description,
        categoryId: formData.categoryId,
        price: formData.price,
        promotionalPrice: formData.promotionalPrice,
        durationMinutes: formData.durationMinutes,
        commissionPercentage: formData.commissionPercentage,
        showInOnlineBooking: formData.showInOnlineBooking,
        loyaltyPointsEarned: formData.loyaltyPointsEarned,
      };

      await serviceService.update(selectedService.id, updateData);
      setIsEditModalOpen(false);
      resetForm();
      loadServices();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFormErrors({
        submit: err.response?.data?.message || "Erro ao atualizar serviço",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async () => {
    if (!selectedService) return;

    setIsSubmitting(true);
    try {
      await serviceService.delete(selectedService.id);
      setIsDeleteModalOpen(false);
      setSelectedService(null);
      loadServices();
    } catch (error) {
      console.error("Erro ao excluir serviço:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateService = async (service: Service) => {
    try {
      await serviceService.duplicate(service.id);
      loadServices();
    } catch (error) {
      console.error("Erro ao duplicar serviço:", error);
    }
  };

  // Handlers de CRUD - Categoria
  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setFormErrors({ categoryName: "Nome é obrigatório" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedCategory) {
        await serviceService.categories.update(selectedCategory.id, categoryFormData);
      } else {
        await serviceService.categories.create(categoryFormData);
      }
      setIsCategoryModalOpen(false);
      resetCategoryForm();
      loadCategories();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      await serviceService.categories.delete(selectedCategory.id);
      setIsDeleteCategoryModalOpen(false);
      setSelectedCategory(null);
      loadCategories();
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers de CRUD - Combo
  const handleSaveCombo = async () => {
    if (!comboFormData.name.trim() || comboFormData.serviceIds.length < 2) {
      setFormErrors({
        comboName: !comboFormData.name.trim() ? "Nome é obrigatório" : "",
        comboServices: comboFormData.serviceIds.length < 2 ? "Selecione pelo menos 2 serviços" : "",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedCombo) {
        await serviceService.combos.update(selectedCombo.id, comboFormData);
      } else {
        await serviceService.combos.create(comboFormData);
      }
      setIsComboModalOpen(false);
      resetComboForm();
      loadCombos();
    } catch (error) {
      console.error("Erro ao salvar combo:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCombo = async () => {
    if (!selectedCombo) return;

    setIsSubmitting(true);
    try {
      await serviceService.combos.delete(selectedCombo.id);
      setIsDeleteComboModalOpen(false);
      setSelectedCombo(null);
      loadCombos();
    } catch (error) {
      console.error("Erro ao excluir combo:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validação do formulário - Serviço
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Nome é obrigatório";
    }

    if (!formData.categoryId) {
      errors.categoryId = "Categoria é obrigatória";
    }

    if (formData.price <= 0) {
      errors.price = "Preço deve ser maior que zero";
    }

    if (formData.durationMinutes <= 0) {
      errors.durationMinutes = "Duração deve ser maior que zero";
    }

    if (formData.commissionPercentage !== undefined && (formData.commissionPercentage < 0 || formData.commissionPercentage > 100)) {
      errors.commissionPercentage = "Comissão deve estar entre 0 e 100%";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Reset formulários
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      price: 0,
      durationMinutes: 30,
      commissionPercentage: 50,
      showInOnlineBooking: true,
      loyaltyPointsEarned: 10,
    });
    setFormErrors({});
    setSelectedService(null);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: "",
      description: "",
      icon: "",
      color: "#8B5CF6",
    });
    setSelectedCategory(null);
    setFormErrors({});
  };

  const resetComboForm = () => {
    setComboFormData({
      name: "",
      description: "",
      serviceIds: [],
      comboPrice: 0,
      showInOnlineBooking: true,
    });
    setSelectedCombo(null);
    setFormErrors({});
  };

  // Abrir modal de edição - Serviço
  const openEditModal = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      categoryId: service.categoryId,
      price: service.price,
      promotionalPrice: service.promotionalPrice,
      durationMinutes: service.durationMinutes,
      commissionPercentage: service.commissionPercentage || 50,
      showInOnlineBooking: service.showInOnlineBooking,
      loyaltyPointsEarned: service.loyaltyPointsEarned,
    });
    setIsEditModalOpen(true);
  };

  // Abrir modal de edição - Categoria
  const openEditCategoryModal = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      color: category.color || "#8B5CF6",
    });
    setIsCategoryModalOpen(true);
  };

  // Abrir modal de edição - Combo
  const openEditComboModal = (combo: ServiceCombo) => {
    setSelectedCombo(combo);
    setComboFormData({
      name: combo.name,
      description: combo.description || "",
      serviceIds: combo.services.map((s) => s.serviceId),
      comboPrice: combo.comboPrice,
      showInOnlineBooking: combo.showInOnlineBooking,
    });
    setIsComboModalOpen(true);
  };

  // Colunas da tabela - Serviços
  const serviceColumns: Column<Service>[] = [
    {
      key: "name",
      header: "Serviço",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Scissors className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
            {item.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{item.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoria",
      render: (item) => <CategoryBadge category={item.category} />,
    },
    {
      key: "duration",
      header: "Tempo",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          <Clock className="h-4 w-4 text-gray-400" />
          {formatDuration(item.durationMinutes)}
        </div>
      ),
    },
    {
      key: "price",
      header: "Valor",
      render: (item) => (
        <div>
          {item.promotionalPrice ? (
            <div>
              <span className="text-sm text-gray-400 line-through">{formatCurrency(item.price)}</span>
              <p className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(item.promotionalPrice)}
              </p>
            </div>
          ) : (
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(item.price)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "commission",
      header: "Comissão",
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Percent className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 dark:text-white">{item.commissionPercentage || 0}%</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  // Colunas da tabela - Categorias
  const categoryColumns: Column<ServiceCategory>[] = [
    {
      key: "name",
      header: "Categoria",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${item.color}20` }}
          >
            <Tag className="h-5 w-5" style={{ color: item.color || "#8B5CF6" }} />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
            {item.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "order",
      header: "Ordem",
      render: (item) => (
        <span className="text-gray-700 dark:text-gray-300">{item.order}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  // Colunas da tabela - Combos
  const comboColumns: Column<ServiceCombo>[] = [
    {
      key: "name",
      header: "Combo",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-pink-500">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
            {item.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "services",
      header: "Serviços",
      render: (item) => (
        <span className="text-gray-700 dark:text-gray-300">
          {item.services.length} serviço{item.services.length > 1 ? "s" : ""}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Tempo Total",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          <Clock className="h-4 w-4 text-gray-400" />
          {formatDuration(item.totalDurationMinutes)}
        </div>
      ),
    },
    {
      key: "price",
      header: "Valor",
      render: (item) => (
        <div>
          <span className="text-sm text-gray-400 line-through">{formatCurrency(item.regularPrice)}</span>
          <p className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(item.comboPrice)}
          </p>
        </div>
      ),
    },
    {
      key: "discount",
      header: "Desconto",
      render: (item) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          -{item.discountPercentage}%
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  // Formulário de Serviço
  const ServiceForm = () => (
    <div className="space-y-6">
      {formErrors.submit && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {formErrors.submit}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Nome do Serviço *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={formErrors.name}
          placeholder="Ex: Corte Masculino"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Categoria *
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 dark:text-white ${
              formErrors.categoryId
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-gray-300 focus:border-violet-500 focus:ring-violet-500/20 dark:border-gray-600"
            } bg-white dark:bg-gray-700`}
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {formErrors.categoryId && (
            <p className="mt-1 text-sm text-red-500">{formErrors.categoryId}</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Descrição
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descreva o serviço..."
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor (R$) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className={`w-full rounded-lg border pl-10 pr-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 dark:text-white ${
                formErrors.price
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-300 focus:border-violet-500 focus:ring-violet-500/20 dark:border-gray-600"
              } bg-white dark:bg-gray-700`}
            />
          </div>
          {formErrors.price && (
            <p className="mt-1 text-sm text-red-500">{formErrors.price}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor Promocional (R$)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.promotionalPrice || ""}
              onChange={(e) => setFormData({ ...formData, promotionalPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="Opcional"
              className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tempo Estimado (min) *
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              min="5"
              step="5"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 30 })}
              className={`w-full rounded-lg border pl-10 pr-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 dark:text-white ${
                formErrors.durationMinutes
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-300 focus:border-violet-500 focus:ring-violet-500/20 dark:border-gray-600"
              } bg-white dark:bg-gray-700`}
            />
          </div>
          {formErrors.durationMinutes && (
            <p className="mt-1 text-sm text-red-500">{formErrors.durationMinutes}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Comissão (%)
          </label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              min="0"
              max="100"
              value={formData.commissionPercentage}
              onChange={(e) => setFormData({ ...formData, commissionPercentage: parseInt(e.target.value) || 0 })}
              className={`w-full rounded-lg border pl-10 pr-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 dark:text-white ${
                formErrors.commissionPercentage
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-300 focus:border-violet-500 focus:ring-violet-500/20 dark:border-gray-600"
              } bg-white dark:bg-gray-700`}
            />
          </div>
          {formErrors.commissionPercentage && (
            <p className="mt-1 text-sm text-red-500">{formErrors.commissionPercentage}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Pontos de Fidelidade
          </label>
          <input
            type="number"
            min="0"
            value={formData.loyaltyPointsEarned}
            onChange={(e) => setFormData({ ...formData, loyaltyPointsEarned: parseInt(e.target.value) || 0 })}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.showInOnlineBooking}
            onChange={(e) => setFormData({ ...formData, showInOnlineBooking: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Disponível para agendamento online</span>
        </label>
      </div>
    </div>
  );

  // Formulário de Categoria
  const CategoryForm = () => (
    <div className="space-y-4">
      <Input
        label="Nome da Categoria *"
        value={categoryFormData.name}
        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
        error={formErrors.categoryName}
        placeholder="Ex: Cabelo, Barba, Estética"
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Descrição
        </label>
        <textarea
          value={categoryFormData.description}
          onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
          placeholder="Descrição da categoria..."
          rows={2}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Cor
        </label>
        <input
          type="color"
          value={categoryFormData.color}
          onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
          className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600"
        />
      </div>
    </div>
  );

  // Formulário de Combo
  const ComboForm = () => {
    const selectedServices = services.filter((s) => comboFormData.serviceIds.includes(s.id));
    const regularPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const totalDuration = selectedServices.reduce((acc, s) => acc + s.durationMinutes, 0);
    const discount = regularPrice > 0 && comboFormData.comboPrice > 0
      ? Math.round(((regularPrice - comboFormData.comboPrice) / regularPrice) * 100)
      : 0;

    return (
      <div className="space-y-4">
        <Input
          label="Nome do Combo *"
          value={comboFormData.name}
          onChange={(e) => setComboFormData({ ...comboFormData, name: e.target.value })}
          error={formErrors.comboName}
          placeholder="Ex: Dia do Noivo"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descrição
          </label>
          <textarea
            value={comboFormData.description}
            onChange={(e) => setComboFormData({ ...comboFormData, description: e.target.value })}
            placeholder="Descrição do combo..."
            rows={2}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Serviços Incluídos *
          </label>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-300 p-3 dark:border-gray-600">
            {services.filter(s => s.status === "active").map((service) => (
              <label key={service.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="checkbox"
                  checked={comboFormData.serviceIds.includes(service.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setComboFormData({
                        ...comboFormData,
                        serviceIds: [...comboFormData.serviceIds, service.id],
                      });
                    } else {
                      setComboFormData({
                        ...comboFormData,
                        serviceIds: comboFormData.serviceIds.filter((id) => id !== service.id),
                      });
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{service.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrency(service.price)} • {formatDuration(service.durationMinutes)}
                  </p>
                </div>
              </label>
            ))}
          </div>
          {formErrors.comboServices && (
            <p className="mt-1 text-sm text-red-500">{formErrors.comboServices}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Valor do Combo (R$) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={comboFormData.comboPrice}
                onChange={(e) => setComboFormData({ ...comboFormData, comboPrice: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Resumo</p>
            <p className="text-sm">
              <span className="text-gray-400 line-through">{formatCurrency(regularPrice)}</span>
              <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(comboFormData.comboPrice)}
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {discount > 0 && <span className="text-green-600 dark:text-green-400">-{discount}% </span>}
              • {formatDuration(totalDuration)}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={comboFormData.showInOnlineBooking}
            onChange={(e) => setComboFormData({ ...comboFormData, showInOnlineBooking: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Disponível para agendamento online</span>
        </label>
      </div>
    );
  };

  return (
    <SalonLayout requiredRole={["ADMIN", "RECEPCIONIST"]} pageTitle="Serviços">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Serviços</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie os serviços do salão</p>
          </div>
          <div className="flex gap-2">
            {activeTab === "services" && (
              <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Novo Serviço
              </Button>
            )}
            {activeTab === "categories" && (
              <Button onClick={() => setIsCategoryModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Nova Categoria
              </Button>
            )}
            {activeTab === "combos" && (
              <Button onClick={() => setIsComboModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Novo Combo
              </Button>
            )}
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<Scissors className="h-5 w-5 text-violet-500" />}
            label="Total de Serviços"
            value={services.length}
            color="bg-violet-100 dark:bg-violet-900/30"
          />
          <StatsCard
            icon={<Tag className="h-5 w-5 text-amber-500" />}
            label="Categorias"
            value={categories.length}
            color="bg-amber-100 dark:bg-amber-900/30"
          />
          <StatsCard
            icon={<Package className="h-5 w-5 text-pink-500" />}
            label="Combos"
            value={combos.length}
            color="bg-pink-100 dark:bg-pink-900/30"
          />
          <StatsCard
            icon={<DollarSign className="h-5 w-5 text-green-500" />}
            label="Ticket Médio"
            value={formatCurrency(
              services.length > 0
                ? services.reduce((acc, s) => acc + s.price, 0) / services.length
                : 0
            )}
            color="bg-green-100 dark:bg-green-900/30"
          />
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: "services", label: "Serviços", icon: <Scissors className="h-4 w-4" /> },
            { id: "categories", label: "Categorias", icon: <Tag className="h-4 w-4" /> },
            { id: "combos", label: "Combos", icon: <Package className="h-4 w-4" /> },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as "services" | "categories" | "combos")}
        />

        {/* Tab: Serviços */}
        {activeTab === "services" && (
          <>
            {/* Filtros */}
            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row">
              <form onSubmit={handleSearch} className="flex flex-1 gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Buscar
                </Button>
              </form>

              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todas as categorias</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "" | "active" | "inactive");
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>

            {/* Tabela de Serviços */}
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <DataTable
                data={services}
                columns={serviceColumns}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="Nenhum serviço encontrado"
                emptyAction={{
                  label: "Adicionar serviço",
                  onClick: () => setIsCreateModalOpen(true),
                }}
                pagination={{
                  currentPage: page,
                  totalPages,
                  totalItems,
                  itemsPerPage: 10,
                  onPageChange: setPage,
                }}
                rowActions={(item) => (
                  <>
                    <ActionMenuItem
                      onClick={() => openEditModal(item)}
                      icon={<Edit2 className="h-4 w-4" />}
                    >
                      Editar
                    </ActionMenuItem>
                    <ActionMenuItem
                      onClick={() => handleDuplicateService(item)}
                      icon={<Copy className="h-4 w-4" />}
                    >
                      Duplicar
                    </ActionMenuItem>
                    <ActionMenuItem
                      onClick={() => {
                        setSelectedService(item);
                        setIsDeleteModalOpen(true);
                      }}
                      icon={<Trash2 className="h-4 w-4" />}
                      variant="danger"
                    >
                      Excluir
                    </ActionMenuItem>
                  </>
                )}
                striped
              />
            </div>
          </>
        )}

        {/* Tab: Categorias */}
        {activeTab === "categories" && (
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <DataTable
              data={categories}
              columns={categoryColumns}
              keyExtractor={(item) => item.id}
              isLoading={isLoadingCategories}
              emptyMessage="Nenhuma categoria encontrada"
              emptyAction={{
                label: "Adicionar categoria",
                onClick: () => setIsCategoryModalOpen(true),
              }}
              rowActions={(item) => (
                <>
                  <ActionMenuItem
                    onClick={() => openEditCategoryModal(item)}
                    icon={<Edit2 className="h-4 w-4" />}
                  >
                    Editar
                  </ActionMenuItem>
                  <ActionMenuItem
                    onClick={() => {
                      setSelectedCategory(item);
                      setIsDeleteCategoryModalOpen(true);
                    }}
                    icon={<Trash2 className="h-4 w-4" />}
                    variant="danger"
                  >
                    Excluir
                  </ActionMenuItem>
                </>
              )}
              striped
            />
          </div>
        )}

        {/* Tab: Combos */}
        {activeTab === "combos" && (
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <DataTable
              data={combos}
              columns={comboColumns}
              keyExtractor={(item) => item.id}
              isLoading={isLoadingCombos}
              emptyMessage="Nenhum combo encontrado"
              emptyAction={{
                label: "Adicionar combo",
                onClick: () => setIsComboModalOpen(true),
              }}
              rowActions={(item) => (
                <>
                  <ActionMenuItem
                    onClick={() => openEditComboModal(item)}
                    icon={<Edit2 className="h-4 w-4" />}
                  >
                    Editar
                  </ActionMenuItem>
                  <ActionMenuItem
                    onClick={() => {
                      setSelectedCombo(item);
                      setIsDeleteComboModalOpen(true);
                    }}
                    icon={<Trash2 className="h-4 w-4" />}
                    variant="danger"
                  >
                    Excluir
                  </ActionMenuItem>
                </>
              )}
              striped
            />
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar Serviço */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={isEditModalOpen ? "Editar Serviço" : "Novo Serviço"}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={isEditModalOpen ? handleUpdateService : handleCreateService}
              isLoading={isSubmitting}
            >
              {isEditModalOpen ? "Salvar Alterações" : "Criar Serviço"}
            </Button>
          </>
        }
      >
        <ServiceForm />
      </Modal>

      {/* Modal de Excluir Serviço */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedService(null);
        }}
        onConfirm={handleDeleteService}
        title="Excluir Serviço"
        message={`Tem certeza que deseja excluir o serviço "${selectedService?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Modal de Criar/Editar Categoria */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          resetCategoryForm();
        }}
        title={selectedCategory ? "Editar Categoria" : "Nova Categoria"}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCategoryModalOpen(false);
                resetCategoryForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} isLoading={isSubmitting}>
              {selectedCategory ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      >
        <CategoryForm />
      </Modal>

      {/* Modal de Excluir Categoria */}
      <ConfirmModal
        isOpen={isDeleteCategoryModalOpen}
        onClose={() => {
          setIsDeleteCategoryModalOpen(false);
          setSelectedCategory(null);
        }}
        onConfirm={handleDeleteCategory}
        title="Excluir Categoria"
        message={`Tem certeza que deseja excluir a categoria "${selectedCategory?.name}"? Serviços desta categoria ficarão sem categoria.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Modal de Criar/Editar Combo */}
      <Modal
        isOpen={isComboModalOpen}
        onClose={() => {
          setIsComboModalOpen(false);
          resetComboForm();
        }}
        title={selectedCombo ? "Editar Combo" : "Novo Combo"}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsComboModalOpen(false);
                resetComboForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCombo} isLoading={isSubmitting}>
              {selectedCombo ? "Salvar" : "Criar"}
            </Button>
          </>
        }
      >
        <ComboForm />
      </Modal>

      {/* Modal de Excluir Combo */}
      <ConfirmModal
        isOpen={isDeleteComboModalOpen}
        onClose={() => {
          setIsDeleteComboModalOpen(false);
          setSelectedCombo(null);
        }}
        onConfirm={handleDeleteCombo}
        title="Excluir Combo"
        message={`Tem certeza que deseja excluir o combo "${selectedCombo?.name}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isSubmitting}
      />
    </SalonLayout>
  );
}
