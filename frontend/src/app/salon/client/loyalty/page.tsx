"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import {
  Star,
  Gift,
  TrendingUp,
  Clock,
  CheckCircle,
  Award,
  Crown,
  Medal,
  Scissors,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Calendar,
  Sparkles,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { api } from "@/services/salon/api";
import type { LoyaltyLevel } from "@/types/salon";

// ===== TIPOS DO BACKEND =====

interface FidelidadeClienteResponse {
  id: number;
  clienteId: number;
  clienteNome: string;
  clienteEmail: string;
  programaId: number;
  programaNome: string;
  visitasAtuais: number;
  visitasNecessarias: number;
  totalVisitas: number;
  totalResgates: number;
  creditosDisponiveis: number;
  nivel: "BRONZE" | "PRATA" | "OURO";
  nivelDescricao: string;
  pontosNivel: number;
  pontosParaProximoNivel: number;
  proximoNivel: "BRONZE" | "PRATA" | "OURO" | null;
  progressoVisitas: number;
  progressoNivel: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  recompensaTipo: "SERVICO_GRATIS" | "DESCONTO_PERCENTUAL" | "DESCONTO_VALOR" | null;
  recompensaValorFormatado: string | null;
  servicoRecompensaNome: string | null;
}

interface FidelidadeTransacaoResponse {
  id: number;
  fidelidadeClienteId: number;
  tipo: "VISITA" | "RESGATE" | "BONUS" | "AJUSTE" | "EXPIRACAO";
  tipoDescricao: string;
  visitas: number;
  creditos: number;
  agendamentoId: number | null;
  descricao: string | null;
  criadoEm: string;
  criadoEmFormatado: string;
  icone: string;
  cor: string;
}

interface ExtratoResponse {
  fidelidadeCliente: FidelidadeClienteResponse | null;
  transacoes: FidelidadeTransacaoResponse[];
  resumo: {
    totalVisitasPeriodo: number;
    totalCreditosGanhos: number;
    totalCreditosResgatados: number;
    saldoCreditos: number;
    pontosGanhos: number;
  };
}

// ===== HELPERS DE MAPEAMENTO =====

function mapNivel(nivel: string): LoyaltyLevel {
  if (nivel === "PRATA") return "silver";
  if (nivel === "OURO") return "gold";
  return "bronze";
}

function mapTipoTransacao(tipo: string): "earn" | "redeem" | "expire" | "adjust" | "bonus" {
  switch (tipo) {
    case "VISITA": return "earn";
    case "RESGATE": return "redeem";
    case "EXPIRACAO": return "expire";
    case "AJUSTE": return "adjust";
    case "BONUS": return "bonus";
    default: return "earn";
  }
}

function mapPoints(tx: FidelidadeTransacaoResponse): number {
  if (tx.tipo === "VISITA") return tx.visitas || 1;
  return tx.creditos || 0;
}

function getRewardName(fidelidade: FidelidadeClienteResponse): string {
  if (fidelidade.recompensaTipo === "SERVICO_GRATIS") {
    return fidelidade.servicoRecompensaNome
      ? `${fidelidade.servicoRecompensaNome} Grátis`
      : "Serviço Grátis";
  }
  if (fidelidade.recompensaValorFormatado) {
    return fidelidade.recompensaValorFormatado;
  }
  return "Recompensa";
}

// ===== COMPONENTES AUXILIARES =====

const LevelDisplay = ({ level }: { level: LoyaltyLevel }) => {
  const config: Record<string, { icon: ReactNode; bg: string; ring: string; label: string; description: string }> = {
    bronze: {
      icon: <Medal className="h-8 w-8" />,
      bg: "bg-gradient-to-br from-amber-400 to-amber-600",
      ring: "ring-amber-400",
      label: "Bronze",
      description: "Continue acumulando para subir de nível!",
    },
    silver: {
      icon: <Award className="h-8 w-8" />,
      bg: "bg-gradient-to-br from-gray-300 to-gray-500",
      ring: "ring-gray-400",
      label: "Prata",
      description: "Você está no caminho certo!",
    },
    gold: {
      icon: <Crown className="h-8 w-8" />,
      bg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
      ring: "ring-yellow-400",
      label: "Ouro",
      description: "Você é um cliente VIP!",
    },
  };

  const c = config[level] || config.bronze;

  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${c.bg} text-white shadow-lg ring-4 ${c.ring} ring-offset-2 ring-offset-white dark:ring-offset-gray-900`}
      >
        {c.icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Seu Nível</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{c.description}</p>
      </div>
    </div>
  );
};

const ProgressCard = ({
  current,
  required,
  programName,
  freeServicesAvailable,
  onRedeemFree,
}: {
  current: number;
  required: number;
  programName: string;
  freeServicesAvailable: number;
  onRedeemFree: () => void;
}) => {
  const progressPercent = Math.min((current / required) * 100, 100);
  const circles = Array.from({ length: required }, (_, i) => i < current);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <Scissors className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{programName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {current} de {required} serviços
            </p>
          </div>
        </div>
        {freeServicesAvailable > 0 && (
          <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {freeServicesAvailable} grátis disponível{freeServicesAvailable > 1 ? "is" : ""}!
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {circles.map((filled, index) => (
          <div
            key={index}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
              filled
                ? "bg-violet-500 text-white shadow-md"
                : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
            }`}
          >
            {filled ? <CheckCircle className="h-5 w-5" /> : index + 1}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          {current >= required
            ? "Você completou! Resgate seu serviço grátis!"
            : `Faltam ${required - current} serviço(s) para ganhar 1 grátis`}
        </p>
      </div>

      {freeServicesAvailable > 0 && (
        <Button variant="primary" className="mt-4 w-full" onClick={onRedeemFree}>
          <Gift className="mr-2 h-4 w-4" />
          Resgatar Serviço Grátis
        </Button>
      )}
    </div>
  );
};

const PointsBalanceCard = ({
  currentPoints,
  lifetimePoints,
  onInfoClick,
}: {
  currentPoints: number;
  lifetimePoints: number;
  onInfoClick: () => void;
}) => (
  <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-violet-500 to-purple-600 p-6 text-white shadow-lg dark:border-gray-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-violet-100">Seus Pontos de Nível</p>
        <p className="mt-1 text-4xl font-bold">{currentPoints}</p>
        <p className="mt-1 text-sm text-violet-200">
          Total de visitas: {lifetimePoints}
        </p>
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
        <Star className="h-8 w-8" />
      </div>
    </div>

    <Button
      variant="outline"
      className="mt-4 w-full border-white/30 bg-white/10 text-white hover:bg-white/20"
      onClick={onInfoClick}
    >
      <Info className="mr-2 h-4 w-4" />
      Entender meus pontos
    </Button>
  </div>
);

const TransactionItem = ({
  tipo,
  descricao,
  tipoDescricao,
  points,
  balanceAfter,
  criadoEm,
}: {
  tipo: string;
  descricao: string | null;
  tipoDescricao: string;
  points: number;
  balanceAfter: number;
  criadoEm: string;
}) => {
  const transType = mapTipoTransacao(tipo);
  const config: Record<string, { icon: ReactNode; bg: string; iconColor: string; pointsColor: string; prefix: string }> = {
    earn: {
      icon: <ArrowUp className="h-4 w-4" />,
      bg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      pointsColor: "text-green-600 dark:text-green-400",
      prefix: "+",
    },
    redeem: {
      icon: <Gift className="h-4 w-4" />,
      bg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      pointsColor: "text-blue-600 dark:text-blue-400",
      prefix: "",
    },
    expire: {
      icon: <Clock className="h-4 w-4" />,
      bg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      pointsColor: "text-red-600 dark:text-red-400",
      prefix: "",
    },
    adjust: {
      icon: <TrendingUp className="h-4 w-4" />,
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      pointsColor: points > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
      prefix: points > 0 ? "+" : "",
    },
    bonus: {
      icon: <Sparkles className="h-4 w-4" />,
      bg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      pointsColor: "text-purple-600 dark:text-purple-400",
      prefix: "+",
    },
  };

  const c = config[transType] || config.earn;
  const label = tipo === "VISITA" ? `${points} visita${points !== 1 ? "s" : ""}` : `${c.prefix}${points} crédito${Math.abs(points) !== 1 ? "s" : ""}`;

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.bg} ${c.iconColor}`}>
          {c.icon}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {descricao || tipoDescricao}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(criadoEm).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold ${c.pointsColor}`}>{label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Saldo: {balanceAfter} pts
        </p>
      </div>
    </div>
  );
};

// ===== COMPONENTE PRINCIPAL =====
export default function ClientLoyaltyPage() {
  const [fidelidade, setFidelidade] = useState<FidelidadeClienteResponse | null>(null);
  const [transacoes, setTransacoes] = useState<FidelidadeTransacaoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  // Modais
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showRedeemFreeModal, setShowRedeemFreeModal] = useState(false);

  // ===== CARREGAR DADOS DA API =====
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fidelidadeList, extratoData] = await Promise.all([
        api.get<FidelidadeClienteResponse[]>("/fidelidade/me"),
        api.get<ExtratoResponse>("/fidelidade/me/extrato"),
      ]);

      if (fidelidadeList && fidelidadeList.length > 0) {
        setFidelidade(fidelidadeList[0]);
      } else {
        setFidelidade(null);
      }

      if (extratoData?.transacoes) {
        setTransacoes(extratoData.transacoes);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar dados de fidelidade.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== HANDLERS =====
  const handleRedeemFree = () => {
    setShowRedeemFreeModal(true);
  };

  const handleConfirmRedeemFree = async () => {
    setIsRedeeming(true);
    try {
      await api.post<unknown>("/fidelidade/me/resgatar");
      setShowRedeemFreeModal(false);
      setRedeemSuccess("Serviço grátis resgatado com sucesso! Apresente na sua próxima visita.");
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao resgatar serviço grátis.";
      setError(msg);
      setShowRedeemFreeModal(false);
    } finally {
      setIsRedeeming(false);
    }
  };

  // ===== CALCULAR SALDO POR TRANSAÇÃO =====
  const transacoesComSaldo = (() => {
    const currentPoints = fidelidade?.pontosNivel ?? 0;
    let runningBalance = currentPoints;
    return transacoes.map((tx) => {
      const pts = mapPoints(tx);
      const balAfter = tx.tipo === "VISITA" ? runningBalance : runningBalance;
      if (tx.tipo === "VISITA") runningBalance = runningBalance - pts;
      return { tx, balanceAfter: balAfter };
    });
  })();

  // ===== RENDER: LOADING =====
  if (isLoading) {
    return (
      <SalonLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
          </div>
        </div>
      </SalonLayout>
    );
  }

  if (error && !fidelidade) {
    return (
      <SalonLayout>
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Erro ao carregar
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{error}</p>
            <Button variant="primary" className="mt-4" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </SalonLayout>
    );
  }

  // ===== RENDER: SEM PROGRAMA =====
  if (!fidelidade) {
    return (
      <SalonLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Pontos</h1>
            <p className="text-gray-500 dark:text-gray-400">Acompanhe seus pontos e recompensas</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
              <Star className="h-10 w-10 text-violet-500" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
              Você ainda não está inscrito em nenhum programa de fidelidade
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              A cada visita ao salão, você acumula pontos e pode ganhar serviços grátis!
              Converse com a equipe do salão para se inscrever.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
                <Scissors className="mx-auto mb-2 h-6 w-6 text-violet-500" />
                <p className="font-medium text-gray-900 dark:text-white">Complete visitas</p>
                <p className="mt-1 text-gray-500 dark:text-gray-400">Acumule pontos a cada serviço</p>
              </div>
              <div className="rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
                <Award className="mx-auto mb-2 h-6 w-6 text-violet-500" />
                <p className="font-medium text-gray-900 dark:text-white">Suba de nível</p>
                <p className="mt-1 text-gray-500 dark:text-gray-400">Bronze → Prata → Ouro</p>
              </div>
              <div className="rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
                <Gift className="mx-auto mb-2 h-6 w-6 text-violet-500" />
                <p className="font-medium text-gray-900 dark:text-white">Ganhe recompensas</p>
                <p className="mt-1 text-gray-500 dark:text-gray-400">Resgate serviços grátis</p>
              </div>
            </div>
          </div>
        </div>
      </SalonLayout>
    );
  }

  const currentLevel = mapNivel(fidelidade.nivel);
  const nextLevelLabel = fidelidade.proximoNivel === "PRATA" ? "Prata" : fidelidade.proximoNivel === "OURO" ? "Ouro" : null;

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Pontos</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Acompanhe seus pontos e recompensas
          </p>
        </div>

        {/* Mensagem de sucesso */}
        {redeemSuccess && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/20">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-300">{redeemSuccess}</p>
            <button
              onClick={() => setRedeemSuccess(null)}
              className="ml-auto text-green-600 hover:text-green-800 dark:text-green-400"
            >
              ×
            </button>
          </div>
        )}

        {/* Mensagem de erro (não fatal) */}
        {error && fidelidade && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Nível e Saldo */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Nível */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <LevelDisplay level={currentLevel} />

            {nextLevelLabel && fidelidade.pontosParaProximoNivel > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Próximo nível: {nextLevelLabel}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {fidelidade.pontosParaProximoNivel} pontos restantes
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                    style={{ width: `${Math.min(fidelidade.progressoNivel, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {!nextLevelLabel && (
              <div className="mt-6 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Nível máximo atingido! Você é VIP.
                  </span>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>
                Membro desde{" "}
                {new Date(fidelidade.criadoEm).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Saldo de Pontos */}
          <PointsBalanceCard
            currentPoints={fidelidade.pontosNivel}
            lifetimePoints={fidelidade.totalVisitas}
            onInfoClick={() => setShowInfoModal(true)}
          />
        </div>

        {/* Progresso do Programa */}
        <ProgressCard
          current={fidelidade.visitasAtuais}
          required={fidelidade.visitasNecessarias}
          programName={fidelidade.programaNome}
          freeServicesAvailable={fidelidade.creditosDisponiveis}
          onRedeemFree={handleRedeemFree}
        />

        {/* Recompensa do programa */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Recompensa do Programa
          </h2>

          {fidelidade.creditosDisponiveis > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: fidelidade.creditosDisponiveis }, (_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-900/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-300">
                        <Gift className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {getRewardName(fidelidade)}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Crédito #{i + 1} disponível
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      Disponível para uso
                    </span>
                    <Button variant="primary" size="sm" onClick={handleRedeemFree}>
                      Resgatar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <Scissors className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 font-medium text-gray-700 dark:text-gray-300">
                Nenhum crédito disponível no momento
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Faltam{" "}
                <strong>
                  {fidelidade.visitasNecessarias - fidelidade.visitasAtuais} visita(s)
                </strong>{" "}
                para ganhar 1 {getRewardName(fidelidade).toLowerCase()}
              </p>
            </div>
          )}
        </div>

        {/* Extrato de Pontos */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Extrato de Visitas
          </h2>
          <div className="space-y-3">
            {transacoesComSaldo.map(({ tx, balanceAfter }) => (
              <TransactionItem
                key={tx.id}
                tipo={tx.tipo}
                descricao={tx.descricao}
                tipoDescricao={tx.tipoDescricao}
                points={mapPoints(tx)}
                balanceAfter={balanceAfter}
                criadoEm={tx.criadoEm}
              />
            ))}
          </div>

          {transacoes.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <Star className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                Nenhuma movimentação encontrada
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Informações sobre pontos */}
      <Modal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Como funcionam seus pontos?"
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Medal className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Bronze</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">0 a 49 pontos</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Prata</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">50 a 99 pontos</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Ouro</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">100+ pontos — nível VIP</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-900/20">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="font-medium text-violet-900 dark:text-violet-200">
                  Como ganhar pontos?
                </p>
                <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
                  Cada visita ao salão soma 1 ponto ao seu nível. Você também ganha créditos
                  de serviços grátis ao completar {fidelidade?.visitasNecessarias ?? 10} visitas.
                </p>
              </div>
            </div>
          </div>

          <Button variant="primary" className="w-full" onClick={() => setShowInfoModal(false)}>
            Entendi!
          </Button>
        </div>
      </Modal>

      {/* Modal: Resgatar Serviço Grátis */}
      <Modal
        isOpen={showRedeemFreeModal}
        onClose={() => setShowRedeemFreeModal(false)}
        title="Resgatar Serviço Grátis"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 p-6 text-center dark:bg-green-900/20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <Gift className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-green-800 dark:text-green-300">
              Parabéns!
            </h3>
            <p className="mt-2 text-green-700 dark:text-green-400">
              Você tem{" "}
              <strong>{fidelidade?.creditosDisponiveis ?? 0} crédito(s)</strong> de{" "}
              <strong>{getRewardName(fidelidade!)}</strong> disponível.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ao confirmar, um crédito será descontado do seu saldo e você poderá apresentar
              na sua próxima visita ao salão.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRedeemFreeModal(false)}
              disabled={isRedeeming}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmRedeemFree} disabled={isRedeeming}>
              {isRedeeming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resgatando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Resgate
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </SalonLayout>
  );
}
