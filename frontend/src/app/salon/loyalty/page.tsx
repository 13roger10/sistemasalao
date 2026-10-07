"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Star,
  Gift,
  Users,
  Plus,
  Edit2,
  Award,
  Target,
  ChevronRight,
  CheckCircle,
  Clock,
  Crown,
  Medal,
  Search,
  Scissors,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  fidelidadeService,
  type FidelidadeCliente,
  type FidelidadePrograma,
  type FidelidadeResumo,
  type NivelFidelidade,
  type TipoRecompensa,
} from "@/services/salon/fidelidadeService";

// Programa de fidelidade ligado à API /api/fidelidade (BUG-012: antes tudo era fictício —
// "156 membros" e "45.000 pontos" num salão com 1 membro). O modelo do backend é por visitas:
// a cada N visitas o cliente ganha um crédito de recompensa; o nível sobe com os pontos de nível.

const NIVEIS: Record<NivelFidelidade, { label: string; icon: React.ReactNode; bg: string; text: string; barra: string }> = {
  BRONZE: {
    label: "Bronze",
    icon: <Medal className="h-3 w-3" />,
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    barra: "bg-amber-500",
  },
  PRATA: {
    label: "Prata",
    icon: <Award className="h-3 w-3" />,
    bg: "bg-gray-200 dark:bg-gray-700",
    text: "text-gray-700 dark:text-gray-300",
    barra: "bg-gray-500",
  },
  OURO: {
    label: "Ouro",
    icon: <Crown className="h-3 w-3" />,
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
    barra: "bg-yellow-500",
  },
};

const RECOMPENSAS: Record<TipoRecompensa, string> = {
  SERVICO_GRATIS: "Serviço grátis",
  DESCONTO_PERCENTUAL: "Desconto (%)",
  DESCONTO_VALOR: "Desconto (R$)",
};

const LevelBadge = ({ nivel }: { nivel: NivelFidelidade }) => {
  const c = NIVEIS[nivel] ?? NIVEIS.BRONZE;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {c.label}
    </span>
  );
};

const StatsCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{title}</p>
    <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value.toLocaleString("pt-BR")}</p>
  </div>
);

const recompensaTexto = (p: FidelidadePrograma) =>
  p.recompensaTipo === "SERVICO_GRATIS"
    ? p.servicoRecompensaNome || "1 serviço grátis"
    : p.recompensaValorFormatado || RECOMPENSAS[p.recompensaTipo];

const ProgramCard = ({
  program,
  onEdit,
  onDeactivate,
}: {
  program: FidelidadePrograma;
  onEdit: () => void;
  onDeactivate: () => void;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
          <Scissors className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{program.nome}</h3>
          {program.descricao && <p className="text-sm text-gray-500 dark:text-gray-400">{program.descricao}</p>}
        </div>
      </div>
      {program.ativo && (
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Editar programa">
          <Edit2 className="h-4 w-4" />
        </Button>
      )}
    </div>

    <div className="mt-6 grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
      <div className="text-center">
        <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">{program.visitasNecessarias}</div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Visitas necessárias</p>
      </div>
      <div className="flex items-center justify-center">
        <ChevronRight className="h-6 w-6 text-gray-400" />
      </div>
      <div className="text-center">
        <div className="text-base font-bold text-green-600 dark:text-green-400">{recompensaTexto(program)}</div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Recompensa</p>
      </div>
    </div>

    <div className="mt-4 flex items-center justify-between text-sm">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          program.ativo
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
        }`}
      >
        {program.ativo ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
        {program.ativo ? "Ativo" : "Inativo"}
      </span>
      {program.ativo && (
        <button onClick={onDeactivate} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">
          Desativar
        </button>
      )}
    </div>
  </div>
);

const MemberCard = ({ member, onClick }: { member: FidelidadeCliente; onClick: () => void }) => {
  const progresso = member.visitasNecessarias ? (member.visitasAtuais / member.visitasNecessarias) * 100 : 0;
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            {(member.clienteNome || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{member.clienteNome}</h3>
            <LevelBadge nivel={member.nivel} />
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Créditos</p>
          <p className="text-lg font-semibold text-violet-600 dark:text-violet-400">{member.creditosDisponiveis}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total de visitas</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{member.totalVisitas}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">{member.programaNome}</span>
          <span>
            {member.visitasAtuais}/{member.visitasNecessarias}
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="h-full bg-violet-500 transition-all" style={{ width: `${Math.min(progresso, 100)}%` }} />
        </div>
      </div>
    </div>
  );
};

const PROGRAMA_VAZIO = {
  nome: "",
  descricao: "",
  visitasNecessarias: 10,
  recompensaTipo: "SERVICO_GRATIS" as TipoRecompensa,
  recompensaValor: "",
};

export default function LoyaltyPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "programs" | "members">("overview");

  const [programs, setPrograms] = useState<FidelidadePrograma[]>([]);
  const [members, setMembers] = useState<FidelidadeCliente[]>([]);
  const [resumo, setResumo] = useState<FidelidadeResumo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<NivelFidelidade | "all">("all");

  const [showProgramModal, setShowProgramModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<FidelidadePrograma | null>(null);
  const [programForm, setProgramForm] = useState(PROGRAMA_VAZIO);
  const [programToDeactivate, setProgramToDeactivate] = useState<FidelidadePrograma | null>(null);

  const [selectedMember, setSelectedMember] = useState<FidelidadeCliente | null>(null);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusForm, setBonusForm] = useState({ creditos: 1, descricao: "" });
  const [isSaving, setIsSaving] = useState(false);

  const carregar = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [p, m, r] = await Promise.all([
        fidelidadeService.listarProgramas(),
        fidelidadeService.listarClientes(),
        fidelidadeService.resumo(),
      ]);
      setPrograms(p);
      setMembers(m);
      setResumo(r);
    } catch (error) {
      console.error("Erro ao carregar fidelidade:", error);
      setLoadError("Não foi possível carregar o programa de fidelidade.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filteredMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          (!searchTerm || (m.clienteNome || "").toLowerCase().includes(searchTerm.toLowerCase())) &&
          (levelFilter === "all" || m.nivel === levelFilter)
      ),
    [members, searchTerm, levelFilter]
  );

  const porNivel: Record<NivelFidelidade, number> = {
    BRONZE: resumo?.totalClientesBronze ?? 0,
    PRATA: resumo?.totalClientesPrata ?? 0,
    OURO: resumo?.totalClientesOuro ?? 0,
  };
  const totalMembros = resumo?.totalClientesInscritos ?? 0;

  const abrirNovoPrograma = () => {
    setSelectedProgram(null);
    setProgramForm(PROGRAMA_VAZIO);
    setShowProgramModal(true);
  };

  const abrirEdicao = (p: FidelidadePrograma) => {
    setSelectedProgram(p);
    setProgramForm({
      nome: p.nome,
      descricao: p.descricao || "",
      visitasNecessarias: p.visitasNecessarias,
      recompensaTipo: p.recompensaTipo,
      recompensaValor: p.recompensaValor != null ? String(p.recompensaValor) : "",
    });
    setShowProgramModal(true);
  };

  const exigeValor = programForm.recompensaTipo !== "SERVICO_GRATIS";

  const salvarPrograma = async () => {
    setIsSaving(true);
    try {
      const dados = {
        nome: programForm.nome.trim(),
        descricao: programForm.descricao.trim() || undefined,
        visitasNecessarias: programForm.visitasNecessarias,
        recompensaTipo: programForm.recompensaTipo,
        recompensaValor: exigeValor ? Number(programForm.recompensaValor.replace(",", ".")) : undefined,
      };
      if (selectedProgram) {
        await fidelidadeService.atualizarPrograma(selectedProgram.id, dados);
      } else {
        await fidelidadeService.criarPrograma(dados);
      }
      toast.success(selectedProgram ? "Programa atualizado" : "Programa criado");
      setShowProgramModal(false);
      await carregar();
    } catch (error) {
      toast.error("Não foi possível salvar o programa", error instanceof Error ? error.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const desativarPrograma = async () => {
    if (!programToDeactivate) return;
    try {
      await fidelidadeService.desativarPrograma(programToDeactivate.id);
      toast.success("Programa desativado");
      await carregar();
    } catch (error) {
      toast.error("Não foi possível desativar", error instanceof Error ? error.message : undefined);
    } finally {
      setProgramToDeactivate(null);
    }
  };

  const darBonus = async () => {
    if (!selectedMember) return;
    setIsSaving(true);
    try {
      await fidelidadeService.adicionarBonus(selectedMember.id, bonusForm.creditos, bonusForm.descricao.trim() || undefined);
      toast.success("Bônus registrado", `${bonusForm.creditos} crédito(s) para ${selectedMember.clienteNome}`);
      setShowBonusModal(false);
      setSelectedMember(null);
      await carregar();
    } catch (error) {
      toast.error("Não foi possível dar o bônus", error instanceof Error ? error.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const programasAtivos = programs.filter((p) => p.ativo);

  return (
    <SalonLayout requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Programa de Fidelidade</h1>
            <p className="text-gray-500 dark:text-gray-400">Regras por visitas, níveis e recompensas dos clientes</p>
          </div>
          <Button variant="primary" onClick={abrirNovoPrograma}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Programa
          </Button>
        </div>

        {loadError && (
          <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={carregar}>
              Tentar de novo
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Membros" value={totalMembros} icon={Users} color="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" />
          <StatsCard title="Visitas registradas" value={resumo?.totalVisitasRegistradas ?? 0} icon={Star} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
          <StatsCard title="Recompensas resgatadas" value={resumo?.totalResgatesRealizados ?? 0} icon={Gift} color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
          <StatsCard title="Créditos a resgatar" value={resumo?.totalCreditosDisponiveis ?? 0} icon={Target} color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" />
        </div>

        <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "overview", label: "Visão Geral", icon: Star },
              { id: "programs", label: "Programas", icon: Target },
              { id: "members", label: "Membros", icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-violet-500 text-violet-600 dark:text-violet-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Programas ativos</h2>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {programasAtivos.map((program) => (
                      <ProgramCard
                        key={program.id}
                        program={program}
                        onEdit={() => abrirEdicao(program)}
                        onDeactivate={() => setProgramToDeactivate(program)}
                      />
                    ))}
                    {programasAtivos.length === 0 && (
                      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600 lg:col-span-2">
                        <Scissors className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Nenhum programa ativo</h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                          Crie uma regra, por exemplo: a cada 10 visitas, 1 serviço grátis
                        </p>
                        <Button variant="primary" className="mt-4" onClick={abrirNovoPrograma}>
                          <Plus className="mr-2 h-4 w-4" />
                          Criar Programa
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Distribuição de membros</h2>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {(Object.keys(NIVEIS) as NivelFidelidade[]).map((nivel) => (
                      <div key={nivel} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                          <LevelBadge nivel={nivel} />
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">{porNivel[nivel]}</span>
                        </div>
                        <div className="mt-3 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full ${NIVEIS[nivel].barra}`}
                            style={{ width: `${totalMembros ? (porNivel[nivel] / totalMembros) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "programs" && (
              <div className="grid gap-6 lg:grid-cols-2">
                {programs.map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onEdit={() => abrirEdicao(program)}
                    onDeactivate={() => setProgramToDeactivate(program)}
                  />
                ))}
                {programs.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400">Nenhum programa cadastrado.</p>
                )}
              </div>
            )}

            {activeTab === "members" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar membro..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value as NivelFidelidade | "all")}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">Todos os níveis</option>
                    <option value="BRONZE">Bronze</option>
                    <option value="PRATA">Prata</option>
                    <option value="OURO">Ouro</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMembers.map((member) => (
                    <MemberCard key={member.id} member={member} onClick={() => setSelectedMember(member)} />
                  ))}
                </div>

                {filteredMembers.length === 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-gray-500 dark:text-gray-400">Nenhum membro encontrado</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: Programa */}
      <Modal
        isOpen={showProgramModal}
        onClose={() => setShowProgramModal(false)}
        title={selectedProgram ? "Editar Programa" : "Novo Programa"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do programa *</label>
            <Input
              value={programForm.nome}
              onChange={(e) => setProgramForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: 10 visitas = 1 corte grátis"
              maxLength={100}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <textarea
              value={programForm.descricao}
              onChange={(e) => setProgramForm((f) => ({ ...f, descricao: e.target.value }))}
              rows={2}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Visitas necessárias *</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={programForm.visitasNecessarias}
                onChange={(e) =>
                  setProgramForm((f) => ({ ...f, visitasNecessarias: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Recompensa *</label>
              <select
                value={programForm.recompensaTipo}
                onChange={(e) => setProgramForm((f) => ({ ...f, recompensaTipo: e.target.value as TipoRecompensa }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {(Object.keys(RECOMPENSAS) as TipoRecompensa[]).map((t) => (
                  <option key={t} value={t}>
                    {RECOMPENSAS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {exigeValor && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {programForm.recompensaTipo === "DESCONTO_PERCENTUAL" ? "Desconto (%) *" : "Desconto (R$) *"}
              </label>
              <Input
                inputMode="decimal"
                value={programForm.recompensaValor}
                onChange={(e) => setProgramForm((f) => ({ ...f, recompensaValor: e.target.value }))}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowProgramModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={salvarPrograma}
              isLoading={isSaving}
              disabled={!programForm.nome.trim() || (exigeValor && !(Number(programForm.recompensaValor.replace(",", ".")) > 0))}
            >
              {selectedProgram ? "Salvar Alterações" : "Criar Programa"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!programToDeactivate}
        onClose={() => setProgramToDeactivate(null)}
        onConfirm={desativarPrograma}
        title="Desativar programa"
        message={`Desativar "${programToDeactivate?.nome}"? Os clientes deixam de acumular visitas neste programa.`}
        confirmText="Desativar"
        variant="danger"
      />

      {/* Modal: Membro */}
      <Modal
        isOpen={!!selectedMember && !showBonusModal}
        onClose={() => setSelectedMember(null)}
        title={selectedMember?.clienteNome ?? "Membro"}
        size="lg"
      >
        {selectedMember && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge nivel={selectedMember.nivel} />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Membro desde {new Date(selectedMember.criadoEm).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-violet-50 p-4 dark:bg-violet-900/20">
                <p className="text-sm text-violet-600 dark:text-violet-400">Créditos disponíveis</p>
                <p className="text-2xl font-bold text-violet-800 dark:text-violet-300">{selectedMember.creditosDisponiveis}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total de visitas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedMember.totalVisitas}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Resgates</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedMember.totalResgates}</p>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{selectedMember.programaNome}</span>
                <span>
                  {selectedMember.visitasAtuais}/{selectedMember.visitasNecessarias} visitas
                </span>
              </div>
              {selectedMember.proximoNivel && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Faltam <strong>{selectedMember.pontosParaProximoNivel} pontos</strong> para o nível{" "}
                  {NIVEIS[selectedMember.proximoNivel]?.label}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedMember(null)}>
                Fechar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setBonusForm({ creditos: 1, descricao: "" });
                  setShowBonusModal(true);
                }}
              >
                <Gift className="mr-2 h-4 w-4" />
                Dar bônus
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Bônus */}
      <Modal isOpen={showBonusModal} onClose={() => setShowBonusModal(false)} title="Dar créditos de bônus">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">{selectedMember?.clienteNome}</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Créditos *</label>
            <Input
              type="number"
              min="1"
              value={bonusForm.creditos}
              onChange={(e) => setBonusForm((f) => ({ ...f, creditos: Math.max(1, parseInt(e.target.value) || 1) }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo</label>
            <Input
              value={bonusForm.descricao}
              onChange={(e) => setBonusForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: aniversário, indicação"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBonusModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={darBonus} isLoading={isSaving}>
              Dar {bonusForm.creditos} crédito(s)
            </Button>
          </div>
        </div>
      </Modal>
    </SalonLayout>
  );
}
