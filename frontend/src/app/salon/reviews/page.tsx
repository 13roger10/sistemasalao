"use client";

import { useState, useMemo } from "react";
import {
  Star,
  Users,
  TrendingUp,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  Reply,
  Flag,
  Trophy,
  Medal,
  Award,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Calendar,
  BarChart3,
  Send,
  X,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type {
  Review,
  ReviewStatus,
  ProfessionalRatingSummary,
  ReviewStats,
} from "@/types/salon";

// ===== COMPONENTES AUXILIARES =====

// Componente de Estrelas
const StarRating = ({
  rating,
  size = "md",
  showValue = false,
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) => {
  const [hovered, setHovered] = useState(0);

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-6 w-6",
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && onChange?.(star)}
            className={cn(
              "focus:outline-none",
              interactive && "cursor-pointer hover:scale-110 transition-transform"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                (interactive ? hovered >= star : false) || rating >= star
                  ? "fill-yellow-400 text-yellow-400"
                  : rating >= star - 0.5
                  ? "fill-yellow-400/50 text-yellow-400"
                  : "text-gray-300 dark:text-gray-600"
              )}
            />
          </button>
        ))}
      </div>
      {showValue && (
        <span className="ml-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

// Card de Estatística
const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "primary",
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  color?: "primary" | "success" | "warning" | "info" | "purple";
  subtitle?: string;
}) => {
  const colorMap = {
    primary: "bg-violet-500",
    success: "bg-green-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[color]}`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-1">
          {trend === "up" ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : trend === "down" ? (
            <TrendingUp className="h-4 w-4 rotate-180 text-red-500" />
          ) : (
            <Minus className="h-4 w-4 text-gray-400" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              trend === "up"
                ? "text-green-600 dark:text-green-400"
                : trend === "down"
                ? "text-red-600 dark:text-red-400"
                : "text-gray-500"
            )}
          >
            {trendValue}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            vs mês anterior
          </span>
        </div>
      )}
    </div>
  );
};

// Badge de Status
const StatusBadge = ({ status }: { status: ReviewStatus }) => {
  const config = {
    pending: {
      icon: <Clock className="h-3 w-3" />,
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-400",
      label: "Pendente",
    },
    published: {
      icon: <CheckCircle className="h-3 w-3" />,
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
      label: "Publicada",
    },
    hidden: {
      icon: <EyeOff className="h-3 w-3" />,
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-700 dark:text-gray-300",
      label: "Oculta",
    },
    spam: {
      icon: <Flag className="h-3 w-3" />,
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      label: "Spam",
    },
  };

  const { icon, bg, text, label } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      {icon}
      {label}
    </span>
  );
};

// Card de Profissional no Ranking
const ProfessionalRankCard = ({
  professional,
  position,
  onClick,
}: {
  professional: ProfessionalRatingSummary;
  position: number;
  onClick?: () => void;
}) => {
  const positionIcon = {
    1: <Trophy className="h-5 w-5 text-yellow-500" />,
    2: <Medal className="h-5 w-5 text-gray-400" />,
    3: <Award className="h-5 w-5 text-amber-600" />,
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-lg border p-4 transition-all",
        "dark:border-gray-800 dark:bg-gray-900/50",
        position <= 3
          ? "border-violet-200 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-900/10"
          : "border-gray-200 bg-white",
        onClick && "cursor-pointer hover:border-violet-300 hover:shadow-md"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center">
        {position <= 3 ? (
          positionIcon[position as 1 | 2 | 3]
        ) : (
          <span className="text-lg font-bold text-gray-400">#{position}</span>
        )}
      </div>

      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
          {professional.professionalName.charAt(0)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {professional.professionalName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <StarRating rating={professional.averageRating} size="sm" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({professional.totalReviews} avaliações)
          </span>
        </div>
      </div>

      <div className="text-right">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {professional.averageRating.toFixed(1)}
        </p>
        <div className="flex items-center gap-1 justify-end">
          {professional.trend.direction === "up" ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : professional.trend.direction === "down" ? (
            <TrendingUp className="h-3 w-3 rotate-180 text-red-500" />
          ) : (
            <Minus className="h-3 w-3 text-gray-400" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              professional.trend.direction === "up"
                ? "text-green-600"
                : professional.trend.direction === "down"
                ? "text-red-600"
                : "text-gray-500"
            )}
          >
            {professional.trend.change > 0 ? "+" : ""}
            {professional.trend.change.toFixed(1)}
          </span>
        </div>
      </div>

      <ChevronRight className="h-5 w-5 text-gray-400" />
    </div>
  );
};

// Card de Review
const ReviewCard = ({
  review,
  onRespond,
  onViewDetails,
  onChangeStatus,
}: {
  review: Review;
  onRespond: () => void;
  onViewDetails: () => void;
  onChangeStatus: (status: ReviewStatus) => void;
}) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
            <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
              {review.clientName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {review.clientName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {review.professionalName} • {review.serviceNames.join(", ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={review.status} />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(review.createdAt)}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <StarRating rating={review.rating} size="md" showValue />
        {review.comment && (
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            "{review.comment}"
          </p>
        )}
      </div>

      {review.response && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Reply className="h-4 w-4" />
            <span>Resposta do salão</span>
            {review.respondedAt && (
              <span className="text-xs">
                • {formatDate(review.respondedAt)}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {review.response}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t pt-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          {review.isVerified && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="h-3 w-3" />
              Verificada
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {review.status === "published" && !review.response && (
            <Button variant="outline" size="sm" onClick={onRespond}>
              <Reply className="mr-1 h-4 w-4" />
              Responder
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            <Eye className="mr-1 h-4 w-4" />
            Ver
          </Button>
          {review.status === "pending" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChangeStatus("published")}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Aprovar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChangeStatus("hidden")}
                className="text-gray-600"
              >
                <EyeOff className="mr-1 h-4 w-4" />
                Ocultar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// NPS Gauge
const NPSGauge = ({ score }: { score: number }) => {
  const getColor = (score: number) => {
    if (score >= 50) return "text-green-500";
    if (score >= 0) return "text-yellow-500";
    return "text-red-500";
  };

  const getLabel = (score: number) => {
    if (score >= 70) return "Excelente";
    if (score >= 50) return "Muito Bom";
    if (score >= 30) return "Bom";
    if (score >= 0) return "Razoável";
    return "Precisa Melhorar";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${((score + 100) / 200) * 251.2} 251.2`}
            strokeLinecap="round"
            className={getColor(score)}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-2xl font-bold ${getColor(score)}`}>
            {score}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {getLabel(score)}
      </p>
    </div>
  );
};

// ===== MOCK DATA =====

const mockStats: ReviewStats = {
  totalReviews: 847,
  averageRating: 4.6,
  pendingResponses: 12,
  reviewsThisMonth: 42,
  npsScore: 72,
  topRatedProfessional: {
    professionalId: "1",
    professionalName: "Ana Silva",
    rating: 4.9,
  },
};

const mockProfessionalsRanking: ProfessionalRatingSummary[] = [
  {
    professionalId: "1",
    professionalName: "Ana Silva",
    averageRating: 4.9,
    totalReviews: 156,
    ratingDistribution: { 1: 2, 2: 3, 3: 8, 4: 28, 5: 115 },
    recentReviews: [],
    trend: { currentPeriod: 4.9, previousPeriod: 4.8, change: 0.1, direction: "up" },
    promoters: 85,
    passives: 10,
    detractors: 5,
    npsScore: 80,
  },
  {
    professionalId: "2",
    professionalName: "Carlos Souza",
    averageRating: 4.7,
    totalReviews: 203,
    ratingDistribution: { 1: 5, 2: 8, 3: 15, 4: 45, 5: 130 },
    recentReviews: [],
    trend: { currentPeriod: 4.7, previousPeriod: 4.6, change: 0.1, direction: "up" },
    promoters: 78,
    passives: 15,
    detractors: 7,
    npsScore: 71,
  },
  {
    professionalId: "3",
    professionalName: "Mariana Costa",
    averageRating: 4.6,
    totalReviews: 178,
    ratingDistribution: { 1: 4, 2: 6, 3: 18, 4: 50, 5: 100 },
    recentReviews: [],
    trend: { currentPeriod: 4.6, previousPeriod: 4.7, change: -0.1, direction: "down" },
    promoters: 72,
    passives: 18,
    detractors: 10,
    npsScore: 62,
  },
  {
    professionalId: "4",
    professionalName: "Pedro Lima",
    averageRating: 4.5,
    totalReviews: 142,
    ratingDistribution: { 1: 3, 2: 7, 3: 20, 4: 52, 5: 60 },
    recentReviews: [],
    trend: { currentPeriod: 4.5, previousPeriod: 4.5, change: 0, direction: "stable" },
    promoters: 65,
    passives: 22,
    detractors: 13,
    npsScore: 52,
  },
  {
    professionalId: "5",
    professionalName: "Julia Santos",
    averageRating: 4.4,
    totalReviews: 98,
    ratingDistribution: { 1: 2, 2: 5, 3: 15, 4: 38, 5: 38 },
    recentReviews: [],
    trend: { currentPeriod: 4.4, previousPeriod: 4.2, change: 0.2, direction: "up" },
    promoters: 60,
    passives: 25,
    detractors: 15,
    npsScore: 45,
  },
];

const mockReviews: Review[] = [
  {
    id: "1",
    clientId: "c1",
    clientName: "Maria Fernanda",
    professionalId: "1",
    professionalName: "Ana Silva",
    appointmentId: "a1",
    serviceIds: ["s1"],
    serviceNames: ["Corte Feminino"],
    rating: 5,
    comment: "Atendimento maravilhoso! A Ana é muito atenciosa e fez exatamente o corte que eu queria. Super recomendo!",
    status: "published",
    isVerified: true,
    source: "online",
    unitId: "u1",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    response: "Muito obrigada, Maria! Foi um prazer atender você. Volte sempre!",
    respondedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    clientId: "c2",
    clientName: "João Paulo",
    professionalId: "2",
    professionalName: "Carlos Souza",
    appointmentId: "a2",
    serviceIds: ["s2", "s3"],
    serviceNames: ["Corte Masculino", "Barba"],
    rating: 4,
    comment: "Bom atendimento, só achei que demorou um pouco mais que o esperado.",
    status: "published",
    isVerified: true,
    source: "online",
    unitId: "u1",
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
  },
  {
    id: "3",
    clientId: "c3",
    clientName: "Patricia Lima",
    professionalId: "3",
    professionalName: "Mariana Costa",
    appointmentId: "a3",
    serviceIds: ["s4"],
    serviceNames: ["Coloração"],
    rating: 5,
    comment: "A cor ficou perfeita! Mariana é uma artista. Já agendei o próximo retoque.",
    status: "pending",
    isVerified: true,
    source: "online",
    unitId: "u1",
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date("2024-01-16"),
  },
  {
    id: "4",
    clientId: "c4",
    clientName: "Roberto Alves",
    professionalId: "2",
    professionalName: "Carlos Souza",
    appointmentId: "a4",
    serviceIds: ["s2"],
    serviceNames: ["Corte Masculino"],
    rating: 3,
    comment: "O corte ficou ok, mas esperava mais pelo preço cobrado.",
    status: "published",
    isVerified: true,
    source: "online",
    unitId: "u1",
    createdAt: new Date("2024-01-13"),
    updatedAt: new Date("2024-01-13"),
  },
  {
    id: "5",
    clientId: "c5",
    clientName: "Camila Mendes",
    professionalId: "1",
    professionalName: "Ana Silva",
    appointmentId: "a5",
    serviceIds: ["s1", "s5"],
    serviceNames: ["Corte Feminino", "Escova"],
    rating: 5,
    comment: "Sempre saio daqui linda! Ana conhece meu cabelo e sempre acerta no corte.",
    status: "pending",
    isVerified: true,
    source: "online",
    unitId: "u1",
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date("2024-01-16"),
  },
];

// ===== PÁGINA PRINCIPAL =====

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "ranking">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("all");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalRatingSummary | null>(null);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar reviews
  const filteredReviews = useMemo(() => {
    return mockReviews.filter((review) => {
      const matchesSearch =
        review.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.professionalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.comment?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || review.status === statusFilter;
      const matchesRating = ratingFilter === "all" || review.rating === ratingFilter;
      return matchesSearch && matchesStatus && matchesRating;
    });
  }, [searchTerm, statusFilter, ratingFilter]);

  // Handlers
  const handleRespond = (review: Review) => {
    setSelectedReview(review);
    setResponseText("");
    setShowRespondModal(true);
  };

  const handleViewDetails = (review: Review) => {
    setSelectedReview(review);
    setShowDetailsModal(true);
  };

  const handleViewProfessional = (professional: ProfessionalRatingSummary) => {
    setSelectedProfessional(professional);
    setShowProfessionalModal(true);
  };

  const handleChangeStatus = (review: Review, status: ReviewStatus) => {
    console.log("Changing status", review.id, status);
    // API call aqui
  };

  const handleSubmitResponse = async () => {
    if (!selectedReview || !responseText.trim()) return;
    setIsSubmitting(true);
    // Simular API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setShowRespondModal(false);
    setResponseText("");
  };

  const tabs = [
    { id: "overview" as const, label: "Visão Geral", icon: BarChart3 },
    { id: "reviews" as const, label: "Avaliações", icon: MessageSquare },
    { id: "ranking" as const, label: "Ranking", icon: Trophy },
  ];

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Avaliações
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gerencie as avaliações dos clientes e veja o ranking dos profissionais
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-white text-violet-600 shadow dark:bg-gray-900 dark:text-violet-400"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Visão Geral */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total de Avaliações"
                value={mockStats.totalReviews.toLocaleString()}
                icon={MessageSquare}
                trend="up"
                trendValue="+12%"
                color="primary"
              />
              <StatsCard
                title="Nota Média"
                value={mockStats.averageRating.toFixed(1)}
                icon={Star}
                trend="up"
                trendValue="+0.2"
                color="warning"
                subtitle="de 5.0"
              />
              <StatsCard
                title="Pendentes de Resposta"
                value={mockStats.pendingResponses.toString()}
                icon={Clock}
                color="info"
                subtitle="aguardando"
              />
              <StatsCard
                title="Este Mês"
                value={mockStats.reviewsThisMonth.toString()}
                icon={Calendar}
                trend="up"
                trendValue="+8"
                color="success"
              />
            </div>

            {/* NPS e Top Professional */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* NPS Score */}
              <div className="rounded-xl border bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  NPS Score
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Net Promoter Score
                </p>
                <div className="mt-6 flex justify-center">
                  <NPSGauge score={mockStats.npsScore} />
                </div>
                <div className="mt-6 flex justify-around">
                  <div className="text-center">
                    <ThumbsUp className="mx-auto h-5 w-5 text-green-500" />
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                      68%
                    </p>
                    <p className="text-xs text-gray-500">Promotores</p>
                  </div>
                  <div className="text-center">
                    <Minus className="mx-auto h-5 w-5 text-yellow-500" />
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                      28%
                    </p>
                    <p className="text-xs text-gray-500">Passivos</p>
                  </div>
                  <div className="text-center">
                    <ThumbsDown className="mx-auto h-5 w-5 text-red-500" />
                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                      4%
                    </p>
                    <p className="text-xs text-gray-500">Detratores</p>
                  </div>
                </div>
              </div>

              {/* Top Professional */}
              <div className="rounded-xl border bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Profissional Destaque
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Maior nota média do mês
                </p>
                <div className="mt-6 flex flex-col items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500">
                    <Trophy className="h-8 w-8 text-white" />
                  </div>
                  <p className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                    {mockStats.topRatedProfessional?.professionalName}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <StarRating
                      rating={mockStats.topRatedProfessional?.rating || 0}
                      size="md"
                    />
                    <span className="text-lg font-semibold text-yellow-500">
                      {mockStats.topRatedProfessional?.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    156 avaliações
                  </p>
                </div>
              </div>

              {/* Distribuição de Notas */}
              <div className="rounded-xl border bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Distribuição de Notas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Últimos 30 dias
                </p>
                <div className="mt-6 space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const percentages = { 5: 72, 4: 18, 3: 6, 2: 3, 1: 1 };
                    const percent = percentages[rating as 1 | 2 | 3 | 4 | 5];
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-12">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {rating}
                          </span>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="flex-1 h-3 bg-gray-200 rounded-full dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
                          {percent}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Avaliações Recentes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Avaliações Recentes
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("reviews")}
                >
                  Ver todas
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {mockReviews.slice(0, 4).map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onRespond={() => handleRespond(review)}
                    onViewDetails={() => handleViewDetails(review)}
                    onChangeStatus={(status) => handleChangeStatus(review, status)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Avaliações */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, profissional ou comentário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ReviewStatus | "all")
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="all">Todos os status</option>
                <option value="pending">Pendentes</option>
                <option value="published">Publicadas</option>
                <option value="hidden">Ocultas</option>
                <option value="spam">Spam</option>
              </select>
              <select
                value={ratingFilter}
                onChange={(e) =>
                  setRatingFilter(
                    e.target.value === "all" ? "all" : parseInt(e.target.value)
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="all">Todas as notas</option>
                <option value="5">5 estrelas</option>
                <option value="4">4 estrelas</option>
                <option value="3">3 estrelas</option>
                <option value="2">2 estrelas</option>
                <option value="1">1 estrela</option>
              </select>
            </div>

            {/* Lista de Reviews */}
            <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                <div className="rounded-xl border bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                    Nenhuma avaliação encontrada
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Tente ajustar os filtros de busca
                  </p>
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onRespond={() => handleRespond(review)}
                    onViewDetails={() => handleViewDetails(review)}
                    onChangeStatus={(status) => handleChangeStatus(review, status)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Ranking */}
        {activeTab === "ranking" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Ranking de Profissionais
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Classificação por nota média de avaliações
              </p>
              <div className="space-y-3">
                {mockProfessionalsRanking.map((professional, index) => (
                  <ProfessionalRankCard
                    key={professional.professionalId}
                    professional={professional}
                    position={index + 1}
                    onClick={() => handleViewProfessional(professional)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Responder Avaliação */}
      <Modal
        isOpen={showRespondModal}
        onClose={() => setShowRespondModal(false)}
        title="Responder Avaliação"
      >
        {selectedReview && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                  <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                    {selectedReview.clientName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedReview.clientName}
                  </p>
                  <StarRating rating={selectedReview.rating} size="sm" showValue />
                </div>
              </div>
              {selectedReview.comment && (
                <p className="mt-3 text-gray-600 dark:text-gray-300">
                  "{selectedReview.comment}"
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sua resposta
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                placeholder="Digite sua resposta ao cliente..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRespondModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitResponse}
                disabled={!responseText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Resposta
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Detalhes da Avaliação */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Detalhes da Avaliação"
      >
        {selectedReview && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                  <span className="text-lg font-semibold text-violet-600 dark:text-violet-400">
                    {selectedReview.clientName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedReview.clientName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cliente
                  </p>
                </div>
              </div>
              <StatusBadge status={selectedReview.status} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Profissional
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedReview.professionalName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Serviços
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedReview.serviceNames.join(", ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Data</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(selectedReview.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fonte
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedReview.source === "online" ? "Online" : "Admin"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Avaliação
              </p>
              <StarRating rating={selectedReview.rating} size="lg" showValue />
            </div>

            {selectedReview.comment && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Comentário
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  {selectedReview.comment}
                </p>
              </div>
            )}

            {selectedReview.response && (
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Resposta do Salão
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  {selectedReview.response}
                </p>
                {selectedReview.respondedAt && (
                  <p className="mt-2 text-xs text-gray-500">
                    Respondido em{" "}
                    {new Date(selectedReview.respondedAt).toLocaleDateString(
                      "pt-BR"
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between border-t pt-4 dark:border-gray-700">
              <div className="flex gap-2">
                {selectedReview.status !== "published" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleChangeStatus(selectedReview, "published");
                      setShowDetailsModal(false);
                    }}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Publicar
                  </Button>
                )}
                {selectedReview.status === "published" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleChangeStatus(selectedReview, "hidden");
                      setShowDetailsModal(false);
                    }}
                  >
                    <EyeOff className="mr-1 h-4 w-4" />
                    Ocultar
                  </Button>
                )}
              </div>
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Detalhes do Profissional */}
      <Modal
        isOpen={showProfessionalModal}
        onClose={() => setShowProfessionalModal(false)}
        title="Detalhes do Profissional"
        size="lg"
      >
        {selectedProfessional && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <span className="text-2xl font-semibold text-violet-600 dark:text-violet-400">
                  {selectedProfessional.professionalName.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedProfessional.professionalName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={selectedProfessional.averageRating} size="md" />
                  <span className="text-lg font-semibold text-yellow-500">
                    {selectedProfessional.averageRating.toFixed(1)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    ({selectedProfessional.totalReviews} avaliações)
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                <ThumbsUp className="mx-auto h-6 w-6 text-green-500" />
                <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
                  {selectedProfessional.promoters}%
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Promotores
                </p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-4 text-center dark:bg-yellow-900/20">
                <Minus className="mx-auto h-6 w-6 text-yellow-500" />
                <p className="mt-2 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {selectedProfessional.passives}%
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Passivos
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
                <ThumbsDown className="mx-auto h-6 w-6 text-red-500" />
                <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                  {selectedProfessional.detractors}%
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  Detratores
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                Distribuição de Notas
              </h4>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count =
                    selectedProfessional.ratingDistribution[
                      rating as 1 | 2 | 3 | 4 | 5
                    ];
                  const percent = Math.round(
                    (count / selectedProfessional.totalReviews) * 100
                  );
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-12">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {rating}
                        </span>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1 h-3 bg-gray-200 rounded-full dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16 text-right">
                        {count} ({percent}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
              <div>
                <p className="text-sm text-violet-600 dark:text-violet-400">
                  NPS Score
                </p>
                <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">
                  {selectedProfessional.npsScore}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedProfessional.trend.direction === "up" ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : selectedProfessional.trend.direction === "down" ? (
                  <TrendingUp className="h-5 w-5 rotate-180 text-red-500" />
                ) : (
                  <Minus className="h-5 w-5 text-gray-400" />
                )}
                <span
                  className={cn(
                    "text-lg font-medium",
                    selectedProfessional.trend.direction === "up"
                      ? "text-green-600"
                      : selectedProfessional.trend.direction === "down"
                      ? "text-red-600"
                      : "text-gray-500"
                  )}
                >
                  {selectedProfessional.trend.change > 0 ? "+" : ""}
                  {selectedProfessional.trend.change.toFixed(1)} vs período anterior
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowProfessionalModal(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </SalonLayout>
  );
}
