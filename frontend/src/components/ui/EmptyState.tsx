"use client";

import { ReactNode } from "react";
import {
  Inbox,
  Search,
  FileQuestion,
  AlertCircle,
  Users,
  Calendar,
  Scissors,
  Package,
  CreditCard,
  Star,
  Gift
} from "lucide-react";
import { Button } from "./Button";

type EmptyStateVariant =
  | "default"
  | "search"
  | "error"
  | "clients"
  | "appointments"
  | "services"
  | "stock"
  | "finance"
  | "reviews"
  | "promotions";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "outline";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantConfig: Record<EmptyStateVariant, {
  icon: ReactNode;
  title: string;
  description: string;
  iconBg: string;
}> = {
  default: {
    icon: <Inbox className="h-8 w-8" />,
    title: "Nenhum item encontrado",
    description: "Não há itens para exibir no momento.",
    iconBg: "bg-gray-100 dark:bg-gray-800 text-gray-400",
  },
  search: {
    icon: <Search className="h-8 w-8" />,
    title: "Nenhum resultado encontrado",
    description: "Tente ajustar os filtros ou termo de busca.",
    iconBg: "bg-blue-100 dark:bg-blue-900/30 text-blue-500",
  },
  error: {
    icon: <AlertCircle className="h-8 w-8" />,
    title: "Algo deu errado",
    description: "Ocorreu um erro ao carregar os dados. Tente novamente.",
    iconBg: "bg-red-100 dark:bg-red-900/30 text-red-500",
  },
  clients: {
    icon: <Users className="h-8 w-8" />,
    title: "Nenhum cliente cadastrado",
    description: "Comece cadastrando seu primeiro cliente para gerenciar seus atendimentos.",
    iconBg: "bg-violet-100 dark:bg-violet-900/30 text-violet-500",
  },
  appointments: {
    icon: <Calendar className="h-8 w-8" />,
    title: "Nenhum agendamento",
    description: "Não há agendamentos para o período selecionado.",
    iconBg: "bg-green-100 dark:bg-green-900/30 text-green-500",
  },
  services: {
    icon: <Scissors className="h-8 w-8" />,
    title: "Nenhum serviço cadastrado",
    description: "Cadastre os serviços oferecidos pelo seu salão.",
    iconBg: "bg-amber-100 dark:bg-amber-900/30 text-amber-500",
  },
  stock: {
    icon: <Package className="h-8 w-8" />,
    title: "Estoque vazio",
    description: "Adicione produtos ao seu inventário para começar o controle.",
    iconBg: "bg-orange-100 dark:bg-orange-900/30 text-orange-500",
  },
  finance: {
    icon: <CreditCard className="h-8 w-8" />,
    title: "Sem movimentações",
    description: "Não há transações financeiras para o período selecionado.",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500",
  },
  reviews: {
    icon: <Star className="h-8 w-8" />,
    title: "Sem avaliações",
    description: "Ainda não há avaliações de clientes.",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-500",
  },
  promotions: {
    icon: <Gift className="h-8 w-8" />,
    title: "Sem promoções ativas",
    description: "Crie promoções e cupons para atrair mais clientes.",
    iconBg: "bg-pink-100 dark:bg-pink-900/30 text-pink-500",
  },
};

export function EmptyState({
  variant = "default",
  title,
  description,
  icon,
  action,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-12 px-4 text-center
        ${className}
      `}
    >
      <div
        className={`
          mb-4 flex h-16 w-16 items-center justify-center rounded-full
          ${config.iconBg}
        `}
      >
        {icon || config.icon}
      </div>

      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        {title || config.title}
      </h3>

      <p className="mb-6 max-w-sm text-gray-500 dark:text-gray-400">
        {description || config.description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && (
            <Button
              variant={action.variant || "primary"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Loading State Component
interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingState({
  title = "Carregando...",
  description,
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-12 px-4 text-center
        ${className}
      `}
    >
      <div className="mb-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>

      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>

      {description && (
        <p className="text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  );
}

// Error State Component
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Erro ao carregar",
  description = "Ocorreu um erro ao carregar os dados. Por favor, tente novamente.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: "Tentar novamente",
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
    />
  );
}

// No Results State (for search)
interface NoResultsStateProps {
  searchTerm?: string;
  onClearSearch?: () => void;
  className?: string;
}

export function NoResultsState({
  searchTerm,
  onClearSearch,
  className = "",
}: NoResultsStateProps) {
  return (
    <EmptyState
      variant="search"
      title="Nenhum resultado encontrado"
      description={
        searchTerm
          ? `Não encontramos resultados para "${searchTerm}". Tente outro termo.`
          : "Não encontramos resultados para sua busca."
      }
      action={
        onClearSearch
          ? {
              label: "Limpar busca",
              onClick: onClearSearch,
              variant: "outline",
            }
          : undefined
      }
      className={className}
    />
  );
}
