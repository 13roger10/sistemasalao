"use client";

import { useState } from "react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Users,
  DollarSign,
  Star,
  Settings,
  Trash2,
  Edit,
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle,
  Crown,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSalonAuth } from "@/contexts/SalonAuthContext";

// ===== Types =====
interface Unit {
  id: string;
  name: string;
  tradeName?: string;
  phone: string;
  email?: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  status: "active" | "inactive";
  isHeadquarters: boolean;
  managerName?: string;
  totalProfessionals: number;
  totalClients: number;
  monthlyRevenue: number;
  revenueChange: number;
  averageRating: number;
  logo?: string;
  color?: string;
}

// ===== Mock Data =====
const MOCK_UNITS: Unit[] = [
  {
    id: "1",
    name: "Belezza Centro",
    tradeName: "Belezza Hair & Beauty",
    phone: "(11) 3456-7890",
    email: "centro@belezza.com",
    address: {
      street: "Rua das Flores",
      number: "123",
      neighborhood: "Centro",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01234-567",
    },
    status: "active",
    isHeadquarters: true,
    managerName: "Maria Silva",
    totalProfessionals: 8,
    totalClients: 342,
    monthlyRevenue: 45800,
    revenueChange: 12.5,
    averageRating: 4.8,
    color: "#8B5CF6",
  },
  {
    id: "2",
    name: "Belezza Jardins",
    phone: "(11) 3456-7891",
    email: "jardins@belezza.com",
    address: {
      street: "Av. Brasil",
      number: "456",
      neighborhood: "Jardins",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "01456-789",
    },
    status: "active",
    isHeadquarters: false,
    managerName: "Carlos Santos",
    totalProfessionals: 6,
    totalClients: 256,
    monthlyRevenue: 38200,
    revenueChange: 8.3,
    averageRating: 4.6,
    color: "#10B981",
  },
  {
    id: "3",
    name: "Belezza Moema",
    phone: "(11) 3456-7892",
    address: {
      street: "Rua Gaivota",
      number: "789",
      neighborhood: "Moema",
      city: "Sao Paulo",
      state: "SP",
      zipCode: "04567-890",
    },
    status: "inactive",
    isHeadquarters: false,
    managerName: "Ana Costa",
    totalProfessionals: 4,
    totalClients: 128,
    monthlyRevenue: 0,
    revenueChange: 0,
    averageRating: 4.5,
    color: "#F59E0B",
  },
];

const MOCK_STATS = {
  totalUnits: 3,
  activeUnits: 2,
  totalRevenue: 84000,
  totalClients: 726,
  totalProfessionals: 18,
};

// ===== Components =====
function StatsCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = "violet",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: "violet" | "green" | "blue" | "amber";
}) {
  const colorClasses = {
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div className="rounded-xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg p-2", colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function UnitCard({
  unit,
  onEdit,
  onSettings,
  onDelete,
}: {
  unit: Unit;
  onEdit: () => void;
  onSettings: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: unit.color || "#8B5CF6" }}
          >
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {unit.name}
              </h3>
              {unit.isHeadquarters && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Crown className="h-3 w-3" />
                  Matriz
                </span>
              )}
            </div>
            {unit.tradeName && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {unit.tradeName}
              </p>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    onSettings();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Settings className="h-4 w-4" />
                  Configuracoes
                </button>
                <hr className="my-1 dark:border-gray-700" />
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="mb-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            unit.status === "active"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
          )}
        >
          {unit.status === "active" ? (
            <CheckCircle className="h-3.5 w-3.5" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          {unit.status === "active" ? "Ativa" : "Inativa"}
        </span>
      </div>

      {/* Info */}
      <div className="mb-4 space-y-2">
        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {unit.address.street}, {unit.address.number} - {unit.address.neighborhood}
            <br />
            {unit.address.city}/{unit.address.state}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Phone className="h-4 w-4" />
          <span>{unit.phone}</span>
        </div>
        {unit.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="h-4 w-4" />
            <span>{unit.email}</span>
          </div>
        )}
        {unit.managerName && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="h-4 w-4" />
            <span>Gerente: {unit.managerName}</span>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 border-t pt-4 dark:border-gray-800">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Profissionais</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {unit.totalProfessionals}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Clientes</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {unit.totalClients}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Faturamento</p>
          <div className="flex items-center gap-1">
            <p className="font-semibold text-gray-900 dark:text-white">
              R$ {unit.monthlyRevenue.toLocaleString("pt-BR")}
            </p>
            {unit.revenueChange !== 0 && (
              <span
                className={cn(
                  "flex items-center text-xs font-medium",
                  unit.revenueChange > 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {unit.revenueChange > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(unit.revenueChange)}%
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Avaliacao</p>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <p className="font-semibold text-gray-900 dark:text-white">
              {unit.averageRating.toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnitFormModal({
  unit,
  onClose,
  onSave,
}: {
  unit?: Unit | null;
  onClose: () => void;
  onSave: (data: Partial<Unit>) => void;
}) {
  const isEditing = !!unit;
  const [formData, setFormData] = useState({
    name: unit?.name || "",
    tradeName: unit?.tradeName || "",
    phone: unit?.phone || "",
    email: unit?.email || "",
    street: unit?.address.street || "",
    number: unit?.address.number || "",
    neighborhood: unit?.address.neighborhood || "",
    city: unit?.address.city || "",
    state: unit?.address.state || "",
    zipCode: unit?.address.zipCode || "",
    managerName: unit?.managerName || "",
    color: unit?.color || "#8B5CF6",
    isHeadquarters: unit?.isHeadquarters || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      tradeName: formData.tradeName || undefined,
      phone: formData.phone,
      email: formData.email || undefined,
      address: {
        street: formData.street,
        number: formData.number,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
      },
      managerName: formData.managerName || undefined,
      color: formData.color,
      isHeadquarters: formData.isHeadquarters,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-900">
        <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
          {isEditing ? "Editar Unidade" : "Nova Unidade"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome da Unidade *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Ex: Belezza Centro"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Telefone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="(11) 3456-7890"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <hr className="dark:border-gray-700" />
          <h3 className="font-medium text-gray-900 dark:text-white">Endereco</h3>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rua *
              </label>
              <input
                type="text"
                required
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Numero *
              </label>
              <input
                type="text"
                required
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bairro *
              </label>
              <input
                type="text"
                required
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cidade *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Estado *
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                maxLength={2}
                placeholder="SP"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                CEP
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="01234-567"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gerente Responsavel
              </label>
              <input
                type="text"
                value={formData.managerName}
                onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cor da Unidade
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20 cursor-pointer rounded-lg border"
                />
                <span className="text-sm text-gray-500">{formData.color}</span>
              </div>
            </div>
            <div className="flex items-center">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isHeadquarters}
                  onChange={(e) =>
                    setFormData({ ...formData, isHeadquarters: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Definir como Matriz
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              {isEditing ? "Salvar Alteracoes" : "Criar Unidade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Main Page =====
export default function UnitsPage() {
  const { isRole } = useSalonAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [units, setUnits] = useState(MOCK_UNITS);

  const filteredUnits = units.filter((unit) => {
    const matchesSearch =
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.address.neighborhood.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || unit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSave = (data: Partial<Unit>) => {
    if (editingUnit) {
      setUnits(
        units.map((u) =>
          u.id === editingUnit.id ? { ...u, ...data } as Unit : u
        )
      );
    } else {
      const newUnit: Unit = {
        id: String(Date.now()),
        status: "active",
        totalProfessionals: 0,
        totalClients: 0,
        monthlyRevenue: 0,
        revenueChange: 0,
        averageRating: 0,
        ...data,
      } as Unit;
      setUnits([...units, newUnit]);
    }
    setShowModal(false);
    setEditingUnit(null);
  };

  const handleDelete = (unitId: string) => {
    if (confirm("Tem certeza que deseja excluir esta unidade?")) {
      setUnits(units.filter((u) => u.id !== unitId));
    }
  };

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Unidades
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Gerencie as unidades do seu negocio
            </p>
          </div>
          {isRole("ADMIN") && (
            <button
              onClick={() => {
                setEditingUnit(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Nova Unidade
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            icon={Building2}
            label="Total Unidades"
            value={MOCK_STATS.totalUnits}
            subValue={`${MOCK_STATS.activeUnits} ativas`}
            color="violet"
          />
          <StatsCard
            icon={Users}
            label="Profissionais"
            value={MOCK_STATS.totalProfessionals}
            color="blue"
          />
          <StatsCard
            icon={Users}
            label="Clientes"
            value={MOCK_STATS.totalClients}
            color="green"
          />
          <StatsCard
            icon={DollarSign}
            label="Faturamento Total"
            value={`R$ ${MOCK_STATS.totalRevenue.toLocaleString("pt-BR")}`}
            subValue="Este mes"
            color="amber"
          />
          <StatsCard
            icon={ArrowRightLeft}
            label="Transferencias"
            value="3"
            subValue="Pendentes"
            color="blue"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar unidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border py-2 pl-10 pr-4 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  statusFilter === status
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                )}
              >
                {status === "all" ? "Todas" : status === "active" ? "Ativas" : "Inativas"}
              </button>
            ))}
          </div>
        </div>

        {/* Units Grid */}
        {filteredUnits.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Nenhuma unidade encontrada
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm
                ? "Tente buscar com outros termos"
                : "Crie sua primeira unidade para comecar"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredUnits.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onEdit={() => {
                  setEditingUnit(unit);
                  setShowModal(true);
                }}
                onSettings={() => {
                  // TODO: Open settings modal
                }}
                onDelete={() => handleDelete(unit.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <UnitFormModal
          unit={editingUnit}
          onClose={() => {
            setShowModal(false);
            setEditingUnit(null);
          }}
          onSave={handleSave}
        />
      )}
    </SalonLayout>
  );
}
