"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Tag,
  Megaphone,
  Gift,
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Percent,
  DollarSign,
  Users,
  Mail,
  MessageCircle,
  Eye,
  Edit2,
  Trash2,
  Send,
  Copy,
  TrendingUp,
  UserX,
  Cake,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Play,
  Pause,
  Settings,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { DataTable, Column, ActionMenuItem } from "@/components/ui/DataTable";
import { promotionService } from "@/services/salon";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import type {
  Coupon,
  CouponCreateInput,
  CouponDiscountType,
  Campaign,
  CampaignCreateInput,
  CampaignTrigger,
  CampaignChannel,
  CashbackRule,
  PromotionalPackage,
  PromotionStats,
} from "@/types/salon";
import type { DateRange } from "@/types/salon/common";

// ===== COMPONENTES AUXILIARES =====

// Badge de Status
const StatusBadge = ({ active }: { active: boolean }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      active
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
    }`}
  >
    {active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {active ? "Ativo" : "Inativo"}
  </span>
);

// Badge de Desconto
const DiscountBadge = ({
  type,
  value,
}: {
  type: CouponDiscountType;
  value: number;
}) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
    {type === "percentage" ? (
      <>
        <Percent className="h-3 w-3" />
        {value}%
      </>
    ) : (
      <>
        <DollarSign className="h-3 w-3" />
        R$ {value.toFixed(2)}
      </>
    )}
  </span>
);

// Badge de Canal
const ChannelBadge = ({ channel }: { channel: CampaignChannel }) => {
  const config = {
    whatsapp: { icon: MessageCircle, bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "WhatsApp" },
    email: { icon: Mail, bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: "Email" },
    sms: { icon: MessageCircle, bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", label: "SMS" },
    push: { icon: Megaphone, bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Push" },
  };
  const { icon: Icon, bg, text, label } = config[channel];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

// Badge de Trigger
const TriggerBadge = ({ trigger }: { trigger: CampaignTrigger }) => {
  const config: Record<CampaignTrigger, { icon: React.ComponentType<{className?: string}>, label: string }> = {
    birthday: { icon: Cake, label: "Aniversário" },
    inactive_60_days: { icon: UserX, label: "Inativo 60d" },
    after_first_visit: { icon: Users, label: "1ª Visita" },
    after_service: { icon: CheckCircle, label: "Pós-Serviço" },
    welcome: { icon: Gift, label: "Boas-vindas" },
    manual: { icon: Send, label: "Manual" },
  };
  const { icon: Icon, label } = config[trigger];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

// Card de Estatística
const StatsCard = ({
  title,
  value,
  icon: Icon,
  color = "primary",
  trend,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: "primary" | "success" | "warning" | "danger";
  trend?: { value: string; up: boolean };
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
        {trend && (
          <span className={`text-xs font-medium ${trend.up ? "text-green-600" : "text-red-600"}`}>
            {trend.up ? "+" : "-"}{trend.value}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

// ===== DADOS MOCK =====
const mockCoupons: Coupon[] = [
  {
    id: "1",
    code: "PRIMEIRAVISITA",
    description: "Desconto para primeira visita",
    discountType: "percentage",
    discountValue: 15,
    validFrom: new Date("2024-01-01"),
    validUntil: new Date("2024-12-31"),
    isActive: true,
    maxUses: 100,
    currentUses: 45,
    isPublic: true,
    isFirstPurchaseOnly: true,
    totalDiscountGiven: 1350,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    code: "ANIVERSARIO2024",
    description: "Cupom especial de aniversário",
    discountType: "fixed",
    discountValue: 50,
    validFrom: new Date("2024-01-01"),
    validUntil: new Date("2024-12-31"),
    isActive: true,
    maxUsesPerClient: 1,
    currentUses: 23,
    isPublic: false,
    isBirthdayOnly: true,
    targetLoyaltyLevels: ["gold", "silver"],
    totalDiscountGiven: 1150,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    code: "VOLTA10",
    description: "Volte e ganhe 10% de desconto",
    discountType: "percentage",
    discountValue: 10,
    validFrom: new Date("2024-01-01"),
    validUntil: new Date("2024-06-30"),
    isActive: false,
    maxUses: 50,
    currentUses: 50,
    isPublic: true,
    totalDiscountGiven: 750,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Feliz Aniversário",
    description: "Mensagem automática de aniversário com cupom",
    trigger: "birthday",
    channel: "whatsapp",
    template: "Olá {nome}! Feliz aniversário! 🎂 Você ganhou um cupom especial de presente: {cupom}",
    couponId: "2",
    isActive: true,
    sendTime: "09:00",
    totalSent: 156,
    totalOpened: 134,
    totalClicked: 89,
    totalConverted: 45,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Reativação de Clientes",
    description: "Campanha para clientes inativos há 60+ dias",
    trigger: "inactive_60_days",
    triggerConfig: { inactiveDays: 60 },
    channel: "whatsapp",
    template: "Oi {nome}! Sentimos sua falta! 💇 Volte e ganhe 15% de desconto no seu próximo serviço com o cupom: {cupom}",
    couponId: "3",
    isActive: true,
    totalSent: 89,
    totalOpened: 67,
    totalClicked: 34,
    totalConverted: 18,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    name: "Boas-vindas Email",
    description: "Email de boas-vindas para novos clientes",
    trigger: "welcome",
    channel: "email",
    template: "Bem-vindo(a) ao nosso salão, {nome}! Estamos muito felizes em ter você conosco.",
    subject: "Bem-vindo ao Belezza!",
    isActive: true,
    totalSent: 234,
    totalOpened: 189,
    totalClicked: 67,
    totalConverted: 23,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockCashbackRules: CashbackRule[] = [
  {
    id: "1",
    name: "Cashback Padrão",
    percentage: 5,
    minPurchaseAmount: 100,
    cashbackExpirationDays: 30,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Cashback Gold",
    percentage: 10,
    minPurchaseAmount: 50,
    maxCashbackAmount: 100,
    applicableLoyaltyLevels: ["gold"],
    cashbackExpirationDays: 60,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockPackages: PromotionalPackage[] = [
  {
    id: "1",
    name: "Pacote Noiva",
    description: "Pacote completo para noivas",
    services: [
      { serviceId: "1", quantity: 1, service: { name: "Penteado", price: 200 } },
      { serviceId: "2", quantity: 1, service: { name: "Maquiagem", price: 180 } },
      { serviceId: "3", quantity: 1, service: { name: "Manicure", price: 50 } },
    ],
    regularPrice: 430,
    packagePrice: 350,
    discountPercentage: 19,
    isActive: true,
    maxSales: 20,
    currentSales: 8,
    validityDays: 90,
    canBeGifted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "5 Cortes",
    description: "Pacote de 5 cortes com desconto",
    services: [
      { serviceId: "4", quantity: 5, service: { name: "Corte Feminino", price: 80 } },
    ],
    regularPrice: 400,
    packagePrice: 320,
    discountPercentage: 20,
    isActive: true,
    currentSales: 15,
    validityDays: 180,
    canBeGifted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockInactiveClients = [
  { id: "1", name: "Maria Santos", phone: "(11) 99999-1111", email: "maria@email.com", lastVisitAt: new Date("2024-01-15"), daysSinceVisit: 75 },
  { id: "2", name: "João Silva", phone: "(11) 99999-2222", email: "joao@email.com", lastVisitAt: new Date("2024-01-10"), daysSinceVisit: 80 },
  { id: "3", name: "Ana Costa", phone: "(11) 99999-3333", lastVisitAt: new Date("2024-01-05"), daysSinceVisit: 85 },
];

const mockServices = [
  { id: "1", name: "Corte Feminino", price: 80 },
  { id: "2", name: "Corte Masculino", price: 50 },
  { id: "3", name: "Coloração", price: 200 },
  { id: "4", name: "Manicure", price: 50 },
  { id: "5", name: "Pedicure", price: 60 },
  { id: "6", name: "Escova", price: 70 },
];

// ===== COMPONENTE PRINCIPAL =====
export default function PromotionsPage() {
  const { user } = useSalonAuth();

  // ===== ESTADOS =====
  const [activeTab, setActiveTab] = useState<"coupons" | "campaigns" | "cashback" | "packages">("coupons");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [cashbackRules, setCashbackRules] = useState<CashbackRule[]>([]);
  const [packages, setPackages] = useState<PromotionalPackage[]>([]);
  const [inactiveClients, setInactiveClients] = useState(mockInactiveClients);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modais
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showCashbackModal, setShowCashbackModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showInactiveClientsModal, setShowInactiveClientsModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showSendCampaignModal, setShowSendCampaignModal] = useState(false);

  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedCashbackRule, setSelectedCashbackRule] = useState<CashbackRule | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PromotionalPackage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);

  // Formulários
  const [couponForm, setCouponForm] = useState<CouponCreateInput>({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: 10,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isPublic: true,
  });

  const [campaignForm, setCampaignForm] = useState<CampaignCreateInput>({
    name: "",
    description: "",
    trigger: "manual",
    channel: "whatsapp",
    template: "",
  });

  const [cashbackForm, setCashbackForm] = useState({
    name: "",
    percentage: 5,
    minPurchaseAmount: 0,
    maxCashbackAmount: undefined as number | undefined,
    cashbackExpirationDays: 30,
  });

  const [packageForm, setPackageForm] = useState({
    name: "",
    description: "",
    services: [] as { serviceId: string; quantity: number }[],
    packagePrice: 0,
    validityDays: 90,
    maxSales: undefined as number | undefined,
    canBeGifted: false,
  });

  // ===== CARREGAR DADOS =====
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Em produção: await promotionService...
      setCoupons(mockCoupons);
      setCampaigns(mockCampaigns);
      setCashbackRules(mockCashbackRules);
      setPackages(mockPackages);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== ESTATÍSTICAS =====
  const stats = useMemo(() => {
    return {
      activeCoupons: coupons.filter((c) => c.isActive).length,
      activeCampaigns: campaigns.filter((c) => c.isActive).length,
      totalDiscountsThisMonth: coupons.reduce((sum, c) => sum + c.totalDiscountGiven, 0),
      totalCashbackIssued: 2500, // mock
      couponUsageRate: coupons.length > 0
        ? Math.round((coupons.reduce((sum, c) => sum + c.currentUses, 0) / coupons.reduce((sum, c) => sum + (c.maxUses || 100), 0)) * 100)
        : 0,
      inactiveClients: inactiveClients.length,
    };
  }, [coupons, campaigns, inactiveClients]);

  // ===== FILTROS =====
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!coupon.code.toLowerCase().includes(search) && !coupon.description?.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (statusFilter === "active" && !coupon.isActive) return false;
      if (statusFilter === "inactive" && coupon.isActive) return false;
      return true;
    });
  }, [coupons, searchTerm, statusFilter]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!campaign.name.toLowerCase().includes(search) && !campaign.description?.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (statusFilter === "active" && !campaign.isActive) return false;
      if (statusFilter === "inactive" && campaign.isActive) return false;
      return true;
    });
  }, [campaigns, searchTerm, statusFilter]);

  // ===== HANDLERS DE CUPONS =====
  const handleSaveCoupon = async () => {
    try {
      if (selectedCoupon) {
        setCoupons((prev) =>
          prev.map((c) =>
            c.id === selectedCoupon.id
              ? { ...c, ...couponForm, updatedAt: new Date() }
              : c
          )
        );
      } else {
        const newCoupon: Coupon = {
          id: `coupon-${Date.now()}`,
          ...couponForm,
          isPublic: couponForm.isPublic ?? true,
          isActive: true,
          currentUses: 0,
          totalDiscountGiven: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setCoupons((prev) => [...prev, newCoupon]);
      }
      setShowCouponModal(false);
      setSelectedCoupon(null);
      resetCouponForm();
    } catch (error) {
      console.error("Erro ao salvar cupom:", error);
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      maxUses: coupon.maxUses,
      maxUsesPerClient: coupon.maxUsesPerClient,
      minPurchaseAmount: coupon.minPurchaseAmount,
      isPublic: coupon.isPublic,
      isFirstPurchaseOnly: coupon.isFirstPurchaseOnly,
      isBirthdayOnly: coupon.isBirthdayOnly,
      targetLoyaltyLevels: coupon.targetLoyaltyLevels,
    });
    setShowCouponModal(true);
  };

  const handleToggleCoupon = (coupon: Coupon) => {
    setCoupons((prev) =>
      prev.map((c) =>
        c.id === coupon.id ? { ...c, isActive: !c.isActive } : c
      )
    );
  };

  const handleCopyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const resetCouponForm = () => {
    setCouponForm({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 10,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isPublic: true,
    });
  };

  // ===== HANDLERS DE CAMPANHAS =====
  const handleSaveCampaign = async () => {
    try {
      if (selectedCampaign) {
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === selectedCampaign.id
              ? { ...c, ...campaignForm, updatedAt: new Date() }
              : c
          )
        );
      } else {
        const newCampaign: Campaign = {
          id: `campaign-${Date.now()}`,
          ...campaignForm,
          isActive: true,
          totalSent: 0,
          totalOpened: 0,
          totalClicked: 0,
          totalConverted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setCampaigns((prev) => [...prev, newCampaign]);
      }
      setShowCampaignModal(false);
      setSelectedCampaign(null);
      resetCampaignForm();
    } catch (error) {
      console.error("Erro ao salvar campanha:", error);
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      description: campaign.description,
      trigger: campaign.trigger,
      triggerConfig: campaign.triggerConfig,
      channel: campaign.channel,
      template: campaign.template,
      subject: campaign.subject,
      couponId: campaign.couponId,
      sendTime: campaign.sendTime,
    });
    setShowCampaignModal(true);
  };

  const handleToggleCampaign = (campaign: Campaign) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaign.id ? { ...c, isActive: !c.isActive } : c
      )
    );
  };

  const handleSendCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowSendCampaignModal(true);
  };

  const handleConfirmSendCampaign = async (clientIds: string[]) => {
    // Em produção: await promotionService.campaigns.triggerManually(selectedCampaign!.id, clientIds)
    console.log("Enviando campanha para:", clientIds);
    setShowSendCampaignModal(false);
    setSelectedCampaign(null);
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: "",
      description: "",
      trigger: "manual",
      channel: "whatsapp",
      template: "",
    });
  };

  // ===== HANDLERS DE CASHBACK =====
  const handleSaveCashback = async () => {
    try {
      if (selectedCashbackRule) {
        setCashbackRules((prev) =>
          prev.map((r) =>
            r.id === selectedCashbackRule.id
              ? { ...r, ...cashbackForm, updatedAt: new Date() }
              : r
          )
        );
      } else {
        const newRule: CashbackRule = {
          id: `cashback-${Date.now()}`,
          ...cashbackForm,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setCashbackRules((prev) => [...prev, newRule]);
      }
      setShowCashbackModal(false);
      setSelectedCashbackRule(null);
      resetCashbackForm();
    } catch (error) {
      console.error("Erro ao salvar cashback:", error);
    }
  };

  const handleEditCashback = (rule: CashbackRule) => {
    setSelectedCashbackRule(rule);
    setCashbackForm({
      name: rule.name,
      percentage: rule.percentage,
      minPurchaseAmount: rule.minPurchaseAmount || 0,
      maxCashbackAmount: rule.maxCashbackAmount,
      cashbackExpirationDays: rule.cashbackExpirationDays,
    });
    setShowCashbackModal(true);
  };

  const handleToggleCashback = (rule: CashbackRule) => {
    setCashbackRules((prev) =>
      prev.map((r) =>
        r.id === rule.id ? { ...r, isActive: !r.isActive } : r
      )
    );
  };

  const resetCashbackForm = () => {
    setCashbackForm({
      name: "",
      percentage: 5,
      minPurchaseAmount: 0,
      maxCashbackAmount: undefined,
      cashbackExpirationDays: 30,
    });
  };

  // ===== HANDLERS DE PACOTES =====
  const handleSavePackage = async () => {
    try {
      const regularPrice = packageForm.services.reduce((sum, s) => {
        const service = mockServices.find((srv) => srv.id === s.serviceId);
        return sum + (service?.price || 0) * s.quantity;
      }, 0);
      const discountPercentage = regularPrice > 0
        ? Math.round(((regularPrice - packageForm.packagePrice) / regularPrice) * 100)
        : 0;

      if (selectedPackage) {
        setPackages((prev) =>
          prev.map((p) =>
            p.id === selectedPackage.id
              ? {
                  ...p,
                  ...packageForm,
                  services: packageForm.services.map((s) => ({
                    ...s,
                    service: mockServices.find((srv) => srv.id === s.serviceId),
                  })),
                  regularPrice,
                  discountPercentage,
                  updatedAt: new Date(),
                }
              : p
          )
        );
      } else {
        const newPackage: PromotionalPackage = {
          id: `package-${Date.now()}`,
          name: packageForm.name,
          description: packageForm.description,
          services: packageForm.services.map((s) => ({
            ...s,
            service: mockServices.find((srv) => srv.id === s.serviceId),
          })),
          regularPrice,
          packagePrice: packageForm.packagePrice,
          discountPercentage,
          validityDays: packageForm.validityDays,
          maxSales: packageForm.maxSales,
          canBeGifted: packageForm.canBeGifted,
          isActive: true,
          currentSales: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setPackages((prev) => [...prev, newPackage]);
      }
      setShowPackageModal(false);
      setSelectedPackage(null);
      resetPackageForm();
    } catch (error) {
      console.error("Erro ao salvar pacote:", error);
    }
  };

  const handleEditPackage = (pkg: PromotionalPackage) => {
    setSelectedPackage(pkg);
    setPackageForm({
      name: pkg.name,
      description: pkg.description || "",
      services: pkg.services.map((s) => ({ serviceId: s.serviceId, quantity: s.quantity })),
      packagePrice: pkg.packagePrice,
      validityDays: pkg.validityDays,
      maxSales: pkg.maxSales,
      canBeGifted: pkg.canBeGifted,
    });
    setShowPackageModal(true);
  };

  const handleTogglePackage = (pkg: PromotionalPackage) => {
    setPackages((prev) =>
      prev.map((p) =>
        p.id === pkg.id ? { ...p, isActive: !p.isActive } : p
      )
    );
  };

  const resetPackageForm = () => {
    setPackageForm({
      name: "",
      description: "",
      services: [],
      packagePrice: 0,
      validityDays: 90,
      maxSales: undefined,
      canBeGifted: false,
    });
  };

  const handleAddServiceToPackage = () => {
    setPackageForm((prev) => ({
      ...prev,
      services: [...prev.services, { serviceId: "", quantity: 1 }],
    }));
  };

  const handleRemoveServiceFromPackage = (index: number) => {
    setPackageForm((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  // ===== HANDLERS DE DELETE =====
  const handleDelete = (type: string, id: string) => {
    setDeleteTarget({ type, id });
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    switch (deleteTarget.type) {
      case "coupon":
        setCoupons((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        break;
      case "campaign":
        setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        break;
      case "cashback":
        setCashbackRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
        break;
      case "package":
        setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        break;
    }

    setShowConfirmDelete(false);
    setDeleteTarget(null);
  };

  // ===== COLUNAS DAS TABELAS =====
  const couponColumns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Cupom",
      render: (coupon) => (
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Tag className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {coupon.code}
              </span>
              <button
                onClick={() => handleCopyCouponCode(coupon.code)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            {coupon.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {coupon.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "discount",
      header: "Desconto",
      render: (coupon) => (
        <div className="flex flex-col gap-1">
          <DiscountBadge type={coupon.discountType} value={coupon.discountValue} />
          {coupon.maxDiscountAmount && (
            <span className="text-xs text-gray-500">
              Máx: R$ {coupon.maxDiscountAmount.toFixed(2)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "validity",
      header: "Validade",
      render: (coupon) => (
        <div className="text-sm">
          <p className="text-gray-900 dark:text-white">
            {new Date(coupon.validFrom).toLocaleDateString("pt-BR")} -{" "}
            {new Date(coupon.validUntil).toLocaleDateString("pt-BR")}
          </p>
          {new Date(coupon.validUntil) < new Date() && (
            <span className="text-xs text-red-500">Expirado</span>
          )}
        </div>
      ),
    },
    {
      key: "usage",
      header: "Uso",
      render: (coupon) => (
        <div className="text-sm">
          <p className="text-gray-900 dark:text-white">
            {coupon.currentUses}{coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
          </p>
          {coupon.maxUses && (
            <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-primary-500"
                style={{ width: `${Math.min((coupon.currentUses / coupon.maxUses) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (coupon) => (
        <div className="flex flex-wrap gap-1">
          {coupon.isFirstPurchaseOnly && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              1ª Compra
            </span>
          )}
          {coupon.isBirthdayOnly && (
            <span className="rounded bg-pink-100 px-1.5 py-0.5 text-xs text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">
              Aniversário
            </span>
          )}
          {coupon.isPublic && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              Público
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (coupon) => <StatusBadge active={coupon.isActive} />,
    },
  ];

  const campaignColumns: Column<Campaign>[] = [
    {
      key: "name",
      header: "Campanha",
      render: (campaign) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
            {campaign.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{campaign.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "trigger",
      header: "Gatilho",
      render: (campaign) => <TriggerBadge trigger={campaign.trigger} />,
    },
    {
      key: "channel",
      header: "Canal",
      render: (campaign) => <ChannelBadge channel={campaign.channel} />,
    },
    {
      key: "metrics",
      header: "Métricas",
      render: (campaign) => (
        <div className="text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Enviados:</span>
              <span className="ml-1 font-medium text-gray-900 dark:text-white">{campaign.totalSent}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Conv:</span>
              <span className="ml-1 font-medium text-green-600 dark:text-green-400">
                {campaign.totalSent > 0 ? Math.round((campaign.totalConverted / campaign.totalSent) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (campaign) => <StatusBadge active={campaign.isActive} />,
    },
  ];

  const renderCouponActions = (coupon: Coupon) => (
    <>
      <ActionMenuItem onClick={() => handleEditCoupon(coupon)} icon={<Edit2 className="h-4 w-4" />}>
        Editar
      </ActionMenuItem>
      <ActionMenuItem onClick={() => handleToggleCoupon(coupon)} icon={coupon.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}>
        {coupon.isActive ? "Desativar" : "Ativar"}
      </ActionMenuItem>
      <ActionMenuItem onClick={() => handleCopyCouponCode(coupon.code)} icon={<Copy className="h-4 w-4" />}>
        Copiar Código
      </ActionMenuItem>
      <ActionMenuItem onClick={() => handleDelete("coupon", coupon.id)} icon={<Trash2 className="h-4 w-4" />} variant="danger">
        Excluir
      </ActionMenuItem>
    </>
  );

  const renderCampaignActions = (campaign: Campaign) => (
    <>
      <ActionMenuItem onClick={() => handleEditCampaign(campaign)} icon={<Edit2 className="h-4 w-4" />}>
        Editar
      </ActionMenuItem>
      <ActionMenuItem onClick={() => handleToggleCampaign(campaign)} icon={campaign.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}>
        {campaign.isActive ? "Pausar" : "Ativar"}
      </ActionMenuItem>
      {campaign.trigger === "manual" && (
        <ActionMenuItem onClick={() => handleSendCampaign(campaign)} icon={<Send className="h-4 w-4" />}>
          Enviar Agora
        </ActionMenuItem>
      )}
      <ActionMenuItem onClick={() => handleDelete("campaign", campaign.id)} icon={<Trash2 className="h-4 w-4" />} variant="danger">
        Excluir
      </ActionMenuItem>
    </>
  );

  // ===== RENDER =====
  return (
    <SalonLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Promoções e Marketing
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Gerencie cupons, campanhas, cashback e pacotes promocionais
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === "coupons" && (
              <Button variant="primary" onClick={() => { resetCouponForm(); setShowCouponModal(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cupom
              </Button>
            )}
            {activeTab === "campaigns" && (
              <>
                <Button variant="outline" onClick={() => setShowInactiveClientsModal(true)}>
                  <UserX className="mr-2 h-4 w-4" />
                  Clientes Inativos ({stats.inactiveClients})
                </Button>
                <Button variant="primary" onClick={() => { resetCampaignForm(); setShowCampaignModal(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Campanha
                </Button>
              </>
            )}
            {activeTab === "cashback" && (
              <Button variant="primary" onClick={() => { resetCashbackForm(); setShowCashbackModal(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Regra
              </Button>
            )}
            {activeTab === "packages" && (
              <Button variant="primary" onClick={() => { resetPackageForm(); setShowPackageModal(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Pacote
              </Button>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Cupons Ativos"
            value={stats.activeCoupons.toString()}
            icon={Tag}
            color="primary"
          />
          <StatsCard
            title="Campanhas Ativas"
            value={stats.activeCampaigns.toString()}
            icon={Megaphone}
            color="success"
          />
          <StatsCard
            title="Descontos (Mês)"
            value={`R$ ${stats.totalDiscountsThisMonth.toFixed(2)}`}
            icon={Percent}
            color="warning"
          />
          <StatsCard
            title="Clientes Inativos"
            value={stats.inactiveClients.toString()}
            icon={UserX}
            color="danger"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "coupons", label: "Cupons", icon: Tag },
              { id: "campaigns", label: "Campanhas", icon: Megaphone },
              { id: "cashback", label: "Cashback", icon: Gift },
              { id: "packages", label: "Pacotes", icon: Package },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab: Cupons */}
        {activeTab === "coupons" && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>

            <DataTable
              data={filteredCoupons}
              columns={couponColumns}
              rowActions={renderCouponActions}
              keyExtractor={(item) => item.id}
              isLoading={loading}
              emptyMessage="Nenhum cupom encontrado"
            />
          </div>
        )}

        {/* Tab: Campanhas */}
        {activeTab === "campaigns" && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todos</option>
                <option value="active">Ativas</option>
                <option value="inactive">Inativas</option>
              </select>
            </div>

            <DataTable
              data={filteredCampaigns}
              columns={campaignColumns}
              rowActions={renderCampaignActions}
              keyExtractor={(item) => item.id}
              isLoading={loading}
              emptyMessage="Nenhuma campanha encontrada"
            />
          </div>
        )}

        {/* Tab: Cashback */}
        {activeTab === "cashback" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cashbackRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{rule.name}</h3>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {rule.percentage}%
                        </p>
                      </div>
                    </div>
                    <StatusBadge active={rule.isActive} />
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    {rule.minPurchaseAmount && rule.minPurchaseAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Compra mínima:</span>
                        <span className="text-gray-900 dark:text-white">
                          R$ {rule.minPurchaseAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {rule.maxCashbackAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cashback máximo:</span>
                        <span className="text-gray-900 dark:text-white">
                          R$ {rule.maxCashbackAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Validade:</span>
                      <span className="text-gray-900 dark:text-white">
                        {rule.cashbackExpirationDays} dias
                      </span>
                    </div>
                    {rule.applicableLoyaltyLevels && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Níveis:</span>
                        <span className="text-gray-900 dark:text-white capitalize">
                          {rule.applicableLoyaltyLevels.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditCashback(rule)}
                    >
                      <Edit2 className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleCashback(rule)}
                    >
                      {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete("cashback", rule.id)}
                      className="text-red-600 hover:bg-red-50 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {cashbackRules.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                <Gift className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhuma regra de cashback
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Crie uma regra para oferecer cashback aos clientes.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => { resetCashbackForm(); setShowCashbackModal(true); }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Regra
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Pacotes */}
        {activeTab === "packages" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{pkg.name}</h3>
                        {pkg.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{pkg.description}</p>
                        )}
                      </div>
                    </div>
                    <StatusBadge active={pkg.isActive} />
                  </div>

                  <div className="mt-4 space-y-2">
                    {pkg.services.map((service, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {service.quantity}x {service.service?.name || "Serviço"}
                        </span>
                        <span className="text-gray-500">
                          R$ {((service.service?.price || 0) * service.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">De: <span className="line-through">R$ {pkg.regularPrice.toFixed(2)}</span></p>
                        <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                          R$ {pkg.packagePrice.toFixed(2)}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        -{pkg.discountPercentage}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>Vendas: {pkg.currentSales}{pkg.maxSales ? `/${pkg.maxSales}` : ""}</span>
                    <span>Validade: {pkg.validityDays}d</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditPackage(pkg)}
                    >
                      <Edit2 className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePackage(pkg)}
                    >
                      {pkg.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete("package", pkg.id)}
                      className="text-red-600 hover:bg-red-50 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {packages.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  Nenhum pacote promocional
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Crie combos de serviços com desconto.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => { resetPackageForm(); setShowPackageModal(true); }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Pacote
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Cupom */}
      <Modal
        isOpen={showCouponModal}
        onClose={() => { setShowCouponModal(false); setSelectedCoupon(null); }}
        title={selectedCoupon ? "Editar Cupom" : "Novo Cupom"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Código do Cupom *
              </label>
              <Input
                value={couponForm.code}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: PROMO10"
                className="uppercase"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Descrição
              </label>
              <Input
                value={couponForm.description || ""}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do cupom"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de Desconto
              </label>
              <select
                value={couponForm.discountType}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, discountType: e.target.value as CouponDiscountType }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor do Desconto *
              </label>
              <Input
                type="number"
                min="0"
                max={couponForm.discountType === "percentage" ? 100 : undefined}
                value={couponForm.discountValue}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Desconto Máximo
              </label>
              <Input
                type="number"
                min="0"
                value={couponForm.maxDiscountAmount || ""}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, maxDiscountAmount: parseFloat(e.target.value) || undefined }))}
                placeholder="Sem limite"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Válido De *
              </label>
              <Input
                type="date"
                value={couponForm.validFrom instanceof Date ? couponForm.validFrom.toISOString().split("T")[0] : ""}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, validFrom: new Date(e.target.value) }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Válido Até *
              </label>
              <Input
                type="date"
                value={couponForm.validUntil instanceof Date ? couponForm.validUntil.toISOString().split("T")[0] : ""}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, validUntil: new Date(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Limite de Usos
              </label>
              <Input
                type="number"
                min="0"
                value={couponForm.maxUses || ""}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, maxUses: parseInt(e.target.value) || undefined }))}
                placeholder="Ilimitado"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Usos por Cliente
              </label>
              <Input
                type="number"
                min="0"
                value={couponForm.maxUsesPerClient || ""}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, maxUsesPerClient: parseInt(e.target.value) || undefined }))}
                placeholder="Ilimitado"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Compra Mínima
              </label>
              <Input
                type="number"
                min="0"
                value={couponForm.minPurchaseAmount || ""}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, minPurchaseAmount: parseFloat(e.target.value) || undefined }))}
                placeholder="Sem mínimo"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={couponForm.isPublic}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Cupom público (visível para todos)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={couponForm.isFirstPurchaseOnly}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, isFirstPurchaseOnly: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Apenas primeira compra</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={couponForm.isBirthdayOnly}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, isBirthdayOnly: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Cupom de aniversário</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowCouponModal(false); setSelectedCoupon(null); }}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveCoupon}
              disabled={!couponForm.code || couponForm.discountValue <= 0}
            >
              {selectedCoupon ? "Salvar" : "Criar Cupom"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Campanha */}
      <Modal
        isOpen={showCampaignModal}
        onClose={() => { setShowCampaignModal(false); setSelectedCampaign(null); }}
        title={selectedCampaign ? "Editar Campanha" : "Nova Campanha"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome da Campanha *
            </label>
            <Input
              value={campaignForm.name}
              onChange={(e) => setCampaignForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Feliz Aniversário"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <Input
              value={campaignForm.description || ""}
              onChange={(e) => setCampaignForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição da campanha"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gatilho *
              </label>
              <select
                value={campaignForm.trigger}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, trigger: e.target.value as CampaignTrigger }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="manual">Manual</option>
                <option value="birthday">Aniversário do Cliente</option>
                <option value="inactive_60_days">Clientes Inativos (60+ dias)</option>
                <option value="welcome">Boas-vindas (Novo Cliente)</option>
                <option value="after_first_visit">Após Primeira Visita</option>
                <option value="after_service">Após Conclusão de Serviço</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Canal *
              </label>
              <select
                value={campaignForm.channel}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, channel: e.target.value as CampaignChannel }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>

          {campaignForm.channel === "email" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Assunto do Email
              </label>
              <Input
                value={campaignForm.subject || ""}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Assunto do email"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mensagem/Template *
            </label>
            <textarea
              value={campaignForm.template}
              onChange={(e) => setCampaignForm((prev) => ({ ...prev, template: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Use {nome} para o nome do cliente, {cupom} para o código do cupom"
            />
            <p className="mt-1 text-xs text-gray-500">
              Variáveis disponíveis: {"{nome}"}, {"{cupom}"}, {"{servico}"}, {"{data}"}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cupom Acoplado
              </label>
              <select
                value={campaignForm.couponId || ""}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, couponId: e.target.value || undefined }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Nenhum</option>
                {coupons.filter((c) => c.isActive).map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.code} ({coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue}`})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Horário de Envio
              </label>
              <Input
                type="time"
                value={campaignForm.sendTime || ""}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, sendTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowCampaignModal(false); setSelectedCampaign(null); }}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveCampaign}
              disabled={!campaignForm.name || !campaignForm.template}
            >
              {selectedCampaign ? "Salvar" : "Criar Campanha"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Cashback */}
      <Modal
        isOpen={showCashbackModal}
        onClose={() => { setShowCashbackModal(false); setSelectedCashbackRule(null); }}
        title={selectedCashbackRule ? "Editar Regra de Cashback" : "Nova Regra de Cashback"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome da Regra *
            </label>
            <Input
              value={cashbackForm.name}
              onChange={(e) => setCashbackForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Cashback Padrão"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Porcentagem de Cashback *
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={cashbackForm.percentage}
                onChange={(e) => setCashbackForm((prev) => ({ ...prev, percentage: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Validade (dias) *
              </label>
              <Input
                type="number"
                min="1"
                value={cashbackForm.cashbackExpirationDays}
                onChange={(e) => setCashbackForm((prev) => ({ ...prev, cashbackExpirationDays: parseInt(e.target.value) || 30 }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Compra Mínima
              </label>
              <Input
                type="number"
                min="0"
                value={cashbackForm.minPurchaseAmount}
                onChange={(e) => setCashbackForm((prev) => ({ ...prev, minPurchaseAmount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cashback Máximo
              </label>
              <Input
                type="number"
                min="0"
                value={cashbackForm.maxCashbackAmount || ""}
                onChange={(e) => setCashbackForm((prev) => ({ ...prev, maxCashbackAmount: parseFloat(e.target.value) || undefined }))}
                placeholder="Sem limite"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowCashbackModal(false); setSelectedCashbackRule(null); }}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveCashback}
              disabled={!cashbackForm.name || cashbackForm.percentage <= 0}
            >
              {selectedCashbackRule ? "Salvar" : "Criar Regra"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Pacote */}
      <Modal
        isOpen={showPackageModal}
        onClose={() => { setShowPackageModal(false); setSelectedPackage(null); }}
        title={selectedPackage ? "Editar Pacote" : "Novo Pacote Promocional"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome do Pacote *
              </label>
              <Input
                value={packageForm.name}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Pacote Noiva"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Descrição
              </label>
              <Input
                value={packageForm.description}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do pacote"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Serviços Inclusos *
              </label>
              <Button variant="outline" size="sm" onClick={handleAddServiceToPackage}>
                <Plus className="mr-1 h-3 w-3" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {packageForm.services.map((service, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={service.serviceId}
                    onChange={(e) => {
                      const newServices = [...packageForm.services];
                      newServices[index].serviceId = e.target.value;
                      setPackageForm((prev) => ({ ...prev, services: newServices }));
                    }}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Selecione um serviço</option>
                    {mockServices.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} - R$ {srv.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="1"
                    value={service.quantity}
                    onChange={(e) => {
                      const newServices = [...packageForm.services];
                      newServices[index].quantity = parseInt(e.target.value) || 1;
                      setPackageForm((prev) => ({ ...prev, services: newServices }));
                    }}
                    className="w-20"
                    placeholder="Qtd"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveServiceFromPackage(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {packageForm.services.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Adicione serviços ao pacote
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Preço do Pacote *
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={packageForm.packagePrice}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, packagePrice: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Validade (dias)
              </label>
              <Input
                type="number"
                min="1"
                value={packageForm.validityDays}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, validityDays: parseInt(e.target.value) || 90 }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Limite de Vendas
              </label>
              <Input
                type="number"
                min="0"
                value={packageForm.maxSales || ""}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, maxSales: parseInt(e.target.value) || undefined }))}
                placeholder="Ilimitado"
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={packageForm.canBeGifted}
              onChange={(e) => setPackageForm((prev) => ({ ...prev, canBeGifted: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Pode ser dado como presente</span>
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowPackageModal(false); setSelectedPackage(null); }}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePackage}
              disabled={!packageForm.name || packageForm.services.length === 0 || packageForm.packagePrice <= 0}
            >
              {selectedPackage ? "Salvar" : "Criar Pacote"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Clientes Inativos */}
      <Modal
        isOpen={showInactiveClientsModal}
        onClose={() => setShowInactiveClientsModal(false)}
        title="Clientes Inativos (60+ dias)"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {inactiveClients.length} clientes não visitam o salão há mais de 60 dias
              </p>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Contato</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Última Visita</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Dias Inativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {inactiveClients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{client.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div>{client.phone}</div>
                      {client.email && <div className="text-xs">{client.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(client.lastVisitAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {client.daysSinceVisit}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInactiveClientsModal(false)}>
              Fechar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowInactiveClientsModal(false);
                setCampaignForm({
                  name: "Reativação de Clientes",
                  description: "Campanha para clientes inativos há 60+ dias",
                  trigger: "inactive_60_days",
                  triggerConfig: { inactiveDays: 60 },
                  channel: "whatsapp",
                  template: "Oi {nome}! Sentimos sua falta! Volte e ganhe um desconto especial.",
                });
                setShowCampaignModal(true);
              }}
            >
              <Megaphone className="mr-2 h-4 w-4" />
              Criar Campanha de Reativação
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Enviar Campanha Manual */}
      <Modal
        isOpen={showSendCampaignModal}
        onClose={() => { setShowSendCampaignModal(false); setSelectedCampaign(null); }}
        title="Enviar Campanha"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Selecione os clientes que receberão a campanha "{selectedCampaign?.name}"
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            {inactiveClients.map((client) => (
              <label
                key={client.id}
                className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" defaultChecked />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.phone}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowSendCampaignModal(false); setSelectedCampaign(null); }}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => handleConfirmSendCampaign(inactiveClients.map((c) => c.id))}
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar para {inactiveClients.length} clientes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmar Delete */}
      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => { setShowConfirmDelete(false); setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />
    </SalonLayout>
  );
}
