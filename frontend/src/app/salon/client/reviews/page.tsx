"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
  Calendar,
  Send,
  Scissors,
  User,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { appointmentService } from "@/services/salon/appointmentService";
import { reviewService } from "@/services/salon/reviewService";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import type { Appointment } from "@/types/salon";
import type { Review } from "@/types/salon/review";

// ===== COMPONENTES =====

// Componente de Estrelas Interativo
const StarRating = ({
  rating,
  size = "md",
  showValue = false,
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: "sm" | "md" | "lg" | "xl";
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) => {
  const [hovered, setHovered] = useState(0);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
    xl: "h-10 w-10",
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && onChange?.(star)}
            className={cn(
              "focus:outline-none transition-transform",
              interactive && "cursor-pointer hover:scale-110"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                (interactive && hovered >= star) || rating >= star
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300 dark:text-gray-600"
              )}
            />
          </button>
        ))}
      </div>
      {showValue && rating > 0 && (
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {rating.toFixed(0)}/5
        </span>
      )}
    </div>
  );
};

// Card de Agendamento Pendente de Avaliação
const PendingReviewCard = ({
  appointment,
  onReview,
}: {
  appointment: Appointment;
  onReview: () => void;
}) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const serviceName = appointment.services?.[0]?.service?.name || "Atendimento";

  return (
    <div className="rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
            <Scissors className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {serviceName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              com {appointment.professional?.name || "profissional"}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="h-3 w-3" />
          Pendente
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Calendar className="h-4 w-4" />
        <span>Atendimento em {formatDate(appointment.date)}</span>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={onReview} className="w-full sm:w-auto">
          <Star className="mr-2 h-4 w-4" />
          Avaliar Atendimento
        </Button>
      </div>
    </div>
  );
};

// Card de Avaliação Já Feita
const CompletedReviewCard = ({ review }: { review: Review }) => {
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
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {review.serviceNames.join(", ") || "Atendimento"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              com {review.professionalName}
            </p>
          </div>
        </div>
        <div className="text-right">
          <StarRating rating={review.rating} size="sm" />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatDate(review.createdAt)}
          </p>
        </div>
      </div>

      {review.comment && (
        <div className="mt-4">
          <p className="text-gray-600 dark:text-gray-300">&quot;{review.comment}&quot;</p>
        </div>
      )}

      {review.response && (
        <div className="mt-4 rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">
            Resposta do salão
          </p>
          <p className="text-sm text-violet-700 dark:text-violet-300">
            {review.response}
          </p>
        </div>
      )}
    </div>
  );
};

// Labels para cada nota
const ratingLabels: Record<number, string> = {
  1: "Muito Ruim",
  2: "Ruim",
  3: "Regular",
  4: "Bom",
  5: "Excelente",
};

// ===== PÁGINA PRINCIPAL =====

export default function ClientReviewsPage() {
  const { user, isLoading: authLoading } = useSalonAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load the client's own appointments + their own reviews
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [appointmentsResponse, myReviews] = await Promise.all([
          appointmentService.getMyAppointments({ page: 1, limit: 100 }),
          reviewService.listMine(),
        ]);
        setAppointments(appointmentsResponse.data);
        setReviews(myReviews);
      } catch (err) {
        console.error("Erro ao carregar avaliações:", err);
        setLoadError("Não foi possível carregar suas avaliações. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user, authLoading]);

  // Completed appointments that still don't have a review
  const pendingAppointments = useMemo(() => {
    const reviewedIds = new Set(reviews.map((r) => String(r.appointmentId)));
    return appointments
      .filter((apt) => apt.status === "completed" && !reviewedIds.has(apt.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, reviews]);

  // Reviews enriched with service names from the matching appointment
  // (AvaliacaoResponse from the backend doesn't carry service info by itself)
  const completedReviews = useMemo(() => {
    const byId = new Map(appointments.map((apt) => [apt.id, apt]));
    return reviews
      .map((review) => {
        const apt = byId.get(String(review.appointmentId));
        return apt
          ? { ...review, serviceNames: apt.services.map((s) => s.service?.name || "Atendimento") }
          : review;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [appointments, reviews]);

  const handleOpenReview = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRating(0);
    setComment("");
    setSubmitError(null);
    setSubmitSuccess(false);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedAppointment || rating === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await reviewService.createReal({
        agendamentoId: selectedAppointment.id,
        nota: rating,
        comentario: comment || undefined,
      });
      setReviews((prev) => [
        { ...created, serviceNames: selectedAppointment.services.map((s) => s.service?.name || "Atendimento") },
        ...prev,
      ]);
      setSubmitSuccess(true);
      setTimeout(() => {
        setShowReviewModal(false);
        setSelectedAppointment(null);
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message.replace(/^\[HTTP \d+\] /, "") : "Não foi possível enviar sua avaliação. Tente novamente.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estatísticas do cliente
  const clientStats = useMemo(() => {
    const totalReviews = completedReviews.length;
    const avgRating = totalReviews > 0
      ? completedReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews
      : 0;
    return { totalReviews, avgRating };
  }, [completedReviews]);

  if (isLoading || authLoading) {
    return (
      <SalonLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Minhas Avaliações
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Avalie seus atendimentos e veja suas avaliações anteriores
          </p>
        </div>

        {loadError && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {loadError}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {pendingAppointments.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pendentes
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {clientStats.totalReviews}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Avaliações feitas
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {clientStats.avgRating.toFixed(1)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nota média
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setActiveTab("pending")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all",
              activeTab === "pending"
                ? "bg-white text-violet-600 shadow dark:bg-gray-900 dark:text-violet-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            )}
          >
            <Clock className="h-4 w-4" />
            Pendentes
            {pendingAppointments.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                {pendingAppointments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all",
              activeTab === "completed"
                ? "bg-white text-violet-600 shadow dark:bg-gray-900 dark:text-violet-400"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            )}
          >
            <CheckCircle className="h-4 w-4" />
            Avaliadas
          </button>
        </div>

        {/* Content */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            {pendingAppointments.length === 0 ? (
              <div className="rounded-xl border bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  Tudo em dia!
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Você não tem avaliações pendentes no momento.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Você tem {pendingAppointments.length} atendimento(s) aguardando avaliação
                      </p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                        Sua opinião é muito importante para nós!
                      </p>
                    </div>
                  </div>
                </div>
                {pendingAppointments.map((appointment) => (
                  <PendingReviewCard
                    key={appointment.id}
                    appointment={appointment}
                    onReview={() => handleOpenReview(appointment)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "completed" && (
          <div className="space-y-4">
            {completedReviews.length === 0 ? (
              <div className="rounded-xl border bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  Nenhuma avaliação ainda
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Suas avaliações aparecerão aqui após você avaliar um atendimento.
                </p>
              </div>
            ) : (
              completedReviews.map((review) => (
                <CompletedReviewCard key={review.id} review={review} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal de Avaliação */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => !isSubmitting && setShowReviewModal(false)}
        title={submitSuccess ? "Avaliação Enviada!" : "Avaliar Atendimento"}
      >
        {selectedAppointment && (
          <div className="space-y-6">
            {submitSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  Obrigado pela sua avaliação!
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Sua opinião é muito importante para continuarmos melhorando.
                </p>
              </div>
            ) : (
              <>
                {/* Info do Atendimento */}
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                      <User className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedAppointment.professional?.name || "Profissional"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedAppointment.services?.[0]?.service?.name || "Atendimento"}
                      </p>
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    {submitError}
                  </div>
                )}

                {/* Rating */}
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Como foi seu atendimento?
                  </p>
                  <div className="flex justify-center">
                    <StarRating
                      rating={rating}
                      size="xl"
                      interactive
                      onChange={setRating}
                    />
                  </div>
                  {rating > 0 && (
                    <p className="mt-3 text-lg font-medium text-gray-900 dark:text-white">
                      {ratingLabels[rating]}
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Comentário <span className="text-gray-400">(opcional)</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Conte como foi sua experiência..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Sua avaliação ajuda outros clientes e o profissional a melhorar
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowReviewModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmitReview}
                    disabled={rating === 0 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Avaliação
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </SalonLayout>
  );
}
