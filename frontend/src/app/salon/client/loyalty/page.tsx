"use client";

import { useState, useEffect, ReactNode } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SalonLayout } from "@/components/layout/SalonLayout";
import type {
  LoyaltyLevel,
  LoyaltyMemberSummary,
  PointsTransaction,
  PointsTransactionType,
  Reward,
  RewardType,
} from "@/types/salon";

// ===== COMPONENTES AUXILIARES =====

// Badge de Nivel com mais destaque
const LevelDisplay = ({ level }: { level: LoyaltyLevel }) => {
  const config: Record<string, { icon: ReactNode; bg: string; ring: string; label: string; description: string }> = {
    bronze: {
      icon: <Medal className="h-8 w-8" />,
      bg: "bg-gradient-to-br from-amber-400 to-amber-600",
      ring: "ring-amber-400",
      label: "Bronze",
      description: "Continue acumulando para subir de nivel!",
    },
    silver: {
      icon: <Award className="h-8 w-8" />,
      bg: "bg-gradient-to-br from-gray-300 to-gray-500",
      ring: "ring-gray-400",
      label: "Prata",
      description: "Voce esta no caminho certo!",
    },
    gold: {
      icon: <Crown className="h-8 w-8" />,
      bg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
      ring: "ring-yellow-400",
      label: "Ouro",
      description: "Voce e um cliente VIP!",
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
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {c.label}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {c.description}
        </p>
      </div>
    </div>
  );
};

// Card de Progresso (10 cortes = 1 grátis)
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
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {programName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {current} de {required} serviços
            </p>
          </div>
        </div>
        {freeServicesAvailable > 0 && (
          <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {freeServicesAvailable} grátis!
          </div>
        )}
      </div>

      {/* Círculos de progresso */}
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

      {/* Barra de progresso */}
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

      {/* Botão de resgate */}
      {freeServicesAvailable > 0 && (
        <Button
          variant="primary"
          className="mt-4 w-full"
          onClick={onRedeemFree}
        >
          <Gift className="mr-2 h-4 w-4" />
          Resgatar Serviço Grátis
        </Button>
      )}
    </div>
  );
};

// Card de Saldo de Pontos
const PointsBalanceCard = ({
  currentPoints,
  lifetimePoints,
  pointsExpiringSoon,
  onConvertPoints,
}: {
  currentPoints: number;
  lifetimePoints: number;
  pointsExpiringSoon: number;
  expirationDate?: Date;
  onConvertPoints: () => void;
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-violet-500 to-purple-600 p-6 text-white shadow-lg dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-violet-100">Seus Pontos</p>
          <p className="mt-1 text-4xl font-bold">{currentPoints}</p>
          <p className="mt-1 text-sm text-violet-200">
            Total acumulado: {lifetimePoints} pontos
          </p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
          <Star className="h-8 w-8" />
        </div>
      </div>

      {pointsExpiringSoon > 0 && (
        <div className="mt-4 rounded-lg bg-white/10 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-300" />
            <span className="text-sm">
              <strong>{pointsExpiringSoon} pontos</strong> expiram em 30 dias
            </span>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        className="mt-4 w-full border-white/30 bg-white/10 text-white hover:bg-white/20"
        onClick={onConvertPoints}
      >
        <TrendingUp className="mr-2 h-4 w-4" />
        Converter em Desconto
      </Button>
    </div>
  );
};

// Item de Transacao
const TransactionItem = ({ transaction }: { transaction: PointsTransaction }) => {
  const config: Record<string, { icon: ReactNode; bg: string; iconColor: string; pointsColor: string; prefix: string }> = {
    earn: {
      icon: <ArrowUp className="h-4 w-4" />,
      bg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      pointsColor: "text-green-600 dark:text-green-400",
      prefix: "+",
    },
    redeem: {
      icon: <ArrowDown className="h-4 w-4" />,
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
      pointsColor:
        transaction.points > 0
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400",
      prefix: transaction.points > 0 ? "+" : "",
    },
    bonus: {
      icon: <Gift className="h-4 w-4" />,
      bg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      pointsColor: "text-purple-600 dark:text-purple-400",
      prefix: "+",
    },
  };

  const c = config[transaction.type] || config.earn;

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${c.bg} ${c.iconColor}`}
        >
          {c.icon}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {transaction.description}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(transaction.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold ${c.pointsColor}`}>
          {c.prefix}
          {transaction.points} pts
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Saldo: {transaction.balanceAfter} pts
        </p>
      </div>
    </div>
  );
};

// Card de Recompensa Disponível
const RewardCard = ({
  reward,
  currentPoints,
  onRedeem,
}: {
  reward: Reward;
  currentPoints: number;
  onRedeem: () => void;
}) => {
  const canRedeem = currentPoints >= reward.pointsCost;

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        canRedeem
          ? "border-violet-200 bg-violet-50 dark:border-violet-900/50 dark:bg-violet-900/20"
          : "border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              canRedeem
                ? "bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-300"
                : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {reward.name}
            </h4>
            {reward.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {reward.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            canRedeem
              ? "bg-violet-200 text-violet-800 dark:bg-violet-800 dark:text-violet-200"
              : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
          }`}
        >
          {reward.pointsCost} pontos
        </div>
        <Button
          variant={canRedeem ? "primary" : "outline"}
          size="sm"
          disabled={!canRedeem}
          onClick={onRedeem}
        >
          {canRedeem ? "Resgatar" : `Faltam ${reward.pointsCost - currentPoints} pts`}
        </Button>
      </div>
    </div>
  );
};

// ===== COMPONENTE PRINCIPAL =====
export default function ClientLoyaltyPage() {
  // ===== ESTADOS =====
  const [memberSummary, setMemberSummary] = useState<LoyaltyMemberSummary | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modais
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showRedeemFreeModal, setShowRedeemFreeModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  // Conversão de pontos
  const [convertPoints, setConvertPoints] = useState(100);
  const conversionRate = 100; // 100 pontos = R$ 1,00
  const discountValue = convertPoints / conversionRate;

  // ===== CARREGAR DADOS =====
  // Nota: API de fidelidade ainda nao implementada no backend
  // Usando dados de demonstracao
  const loadData = () => {
    setIsLoading(true);
    setError(null);

    // Simula carregamento
    setTimeout(() => {
      // Dados de demonstracao
      const mockSummary: LoyaltyMemberSummary = {
        clientId: '1',
        clientName: 'Cliente',
        currentLevel: 'bronze' as LoyaltyLevel,
        currentPoints: 150,
        lifetimePoints: 450,
        pointsExpiringSoon: 0,
        nextLevel: 'silver' as LoyaltyLevel,
        pointsToNextLevel: 350,
        availableRewards: [],
        redeemedRewards: [],
        memberSince: new Date(),
      };
      setMemberSummary(mockSummary);

      // Transacoes de demonstracao
      const mockTransactions: PointsTransaction[] = [
        {
          id: '1',
          clientId: '1',
          type: 'earn' as PointsTransactionType,
          points: 50,
          balanceAfter: 150,
          description: 'Corte de cabelo',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          unitId: '1',
        },
        {
          id: '2',
          clientId: '1',
          type: 'earn' as PointsTransactionType,
          points: 30,
          balanceAfter: 100,
          description: 'Barba',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          unitId: '1',
        },
        {
          id: '3',
          clientId: '1',
          type: 'bonus' as PointsTransactionType,
          points: 70,
          balanceAfter: 70,
          description: 'Bonus de boas-vindas',
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          unitId: '1',
        },
      ];
      setTransactions(mockTransactions);

      // Recompensas de demonstracao
      const mockRewards: Reward[] = [
        {
          id: '1',
          name: 'Desconto de 10%',
          description: 'Desconto de 10% em qualquer servico',
          type: 'discount_percentage' as RewardType,
          pointsCost: 100,
          discountValue: 10,
          validityDays: 30,
          isActive: true,
          currentRedemptions: 0,
          totalRedemptions: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Corte Gratis',
          description: 'Um corte de cabelo gratuito',
          type: 'free_service' as RewardType,
          pointsCost: 500,
          validityDays: 60,
          isActive: true,
          currentRedemptions: 0,
          totalRedemptions: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          name: 'Desconto de R$20',
          description: 'R$20 de desconto em servicos acima de R$50',
          type: 'discount_fixed' as RewardType,
          pointsCost: 200,
          discountValue: 20,
          minPurchaseAmount: 50,
          validityDays: 30,
          isActive: true,
          currentRedemptions: 0,
          totalRedemptions: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      setRewards(mockRewards);

      setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    loadData();
  }, []);

  // ===== HANDLERS =====
  const handleConvertPoints = () => {
    alert("Funcionalidade em desenvolvimento. Em breve voce podera converter seus pontos!");
    setShowConvertModal(false);
  };

  const handleRedeemFree = () => {
    setShowRedeemFreeModal(true);
  };

  const handleConfirmRedeemFree = () => {
    alert("Funcionalidade em desenvolvimento. Em breve voce podera resgatar servicos gratis!");
    setShowRedeemFreeModal(false);
  };

  const handleRedeemReward = (reward: Reward) => {
    setSelectedReward(reward);
    setShowRewardModal(true);
  };

  const handleConfirmRedeemReward = () => {
    alert("Funcionalidade em desenvolvimento. Em breve voce podera resgatar recompensas!");
    setShowRewardModal(false);
    setSelectedReward(null);
  };

  // ===== RENDER =====
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

  if (error || !memberSummary) {
    return (
      <SalonLayout>
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Erro ao carregar
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {error || "Nao foi possivel carregar seus dados de fidelidade."}
            </p>
            <Button variant="primary" className="mt-4" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </SalonLayout>
    );
  }

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

        {/* Nivel e Saldo */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Nível */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <LevelDisplay level={memberSummary.currentLevel} />

            {memberSummary.nextLevel && memberSummary.pointsToNextLevel && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Próximo nível: {memberSummary.nextLevel === "silver" ? "Prata" : "Ouro"}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {memberSummary.pointsToNextLevel} pontos restantes
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                    style={{
                      width: `${
                        100 -
                        (memberSummary.pointsToNextLevel /
                          (memberSummary.pointsToNextLevel +
                            memberSummary.currentPoints)) *
                          100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>
                Membro desde{" "}
                {new Date(memberSummary.memberSince).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Saldo de Pontos */}
          <PointsBalanceCard
            currentPoints={memberSummary.currentPoints}
            lifetimePoints={memberSummary.lifetimePoints}
            pointsExpiringSoon={memberSummary.pointsExpiringSoon}
            expirationDate={memberSummary.expirationDate}
            onConvertPoints={() => setShowConvertModal(true)}
          />
        </div>

        {/* Progresso do Programa */}
        {memberSummary.programProgress && (
          <ProgressCard
            current={memberSummary.programProgress.current}
            required={memberSummary.programProgress.required}
            programName={memberSummary.programProgress.programName}
            freeServicesAvailable={memberSummary.programProgress.freeServicesAvailable}
            onRedeemFree={handleRedeemFree}
          />
        )}

        {/* Recompensas Disponíveis */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Recompensas Disponíveis
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                currentPoints={memberSummary.currentPoints}
                onRedeem={() => handleRedeemReward(reward)}
              />
            ))}
          </div>
        </div>

        {/* Extrato de Pontos */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Extrato de Pontos
          </h2>
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <Star className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                Nenhuma movimentação encontrada
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Converter Pontos */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title="Converter Pontos em Desconto"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-violet-50 p-4 text-center dark:bg-violet-900/20">
            <p className="text-sm text-violet-600 dark:text-violet-400">
              Seu saldo atual
            </p>
            <p className="text-3xl font-bold text-violet-800 dark:text-violet-300">
              {memberSummary.currentPoints} pontos
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pontos para converter
            </label>
            <input
              type="range"
              min={100}
              max={memberSummary.currentPoints}
              step={100}
              value={convertPoints}
              onChange={(e) => setConvertPoints(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="mt-2 flex justify-between text-sm text-gray-500">
              <span>100 pts</span>
              <span>{memberSummary.currentPoints} pts</span>
            </div>
          </div>

          <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
            <p className="text-sm text-green-600 dark:text-green-400">
              Você receberá
            </p>
            <p className="text-3xl font-bold text-green-800 dark:text-green-300">
              R$ {discountValue.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              ({convertPoints} pontos)
            </p>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Taxa de conversão: {conversionRate} pontos = R$ 1,00
          </p>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConvertModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleConvertPoints}
              disabled={convertPoints > memberSummary.currentPoints}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Converter Pontos
            </Button>
          </div>
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
              Você completou {memberSummary.programProgress?.required} serviços e
              ganhou um serviço grátis!
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ao confirmar, um cupom será gerado para você apresentar no
              próximo agendamento.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRedeemFreeModal(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmRedeemFree}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmar Resgate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Resgatar Recompensa */}
      <Modal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        title="Confirmar Resgate"
      >
        {selectedReward && (
          <div className="space-y-4">
            <div className="rounded-lg bg-violet-50 p-6 text-center dark:bg-violet-900/20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
                <Gift className="h-8 w-8 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-violet-800 dark:text-violet-300">
                {selectedReward.name}
              </h3>
              {selectedReward.description && (
                <p className="mt-2 text-violet-600 dark:text-violet-400">
                  {selectedReward.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Custo
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedReward.pointsCost} pontos
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Validade
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedReward.validityDays} dias
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Seu saldo atual:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {memberSummary.currentPoints} pts
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Após resgate:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {memberSummary.currentPoints - selectedReward.pointsCost} pts
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRewardModal(false)}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirmRedeemReward}>
                <Gift className="mr-2 h-4 w-4" />
                Confirmar Resgate
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </SalonLayout>
  );
}
