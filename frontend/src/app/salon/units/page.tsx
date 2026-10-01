"use client";

import { useCallback, useEffect, useState } from "react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Users,
  DollarSign,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  Crown,
  LogIn,
  Power,
  Scissors,
  AlertCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { useUnit } from "@/contexts/UnitContext";
import { unitService, type Unidade, type UnidadeInput } from "@/services/salon/unitService";

// Cada unidade é um salão/barbearia independente: equipe, serviços, clientes, agenda e caixa
// próprios. O admin entra em uma unidade (seletor do topo ou botão "Entrar") e todas as telas
// passam a mostrar só os dados dela.

const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const motivo = (err: unknown, padrao: string) =>
  err instanceof Error && err.message ? err.message.replace(/^\[HTTP \d+\]\s*/, "") : padrao;

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
          {subValue && <p className="text-xs text-gray-500 dark:text-gray-400">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

function UnitCard({
  unit,
  onEnter,
  onEdit,
  onToggleActive,
}: {
  unit: Unidade;
  onEnter: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const cidadeUf = [unit.cidade, unit.estado].filter(Boolean).join("/");

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-white p-5 dark:bg-gray-900",
        unit.atual ? "border-violet-300 ring-1 ring-violet-200 dark:border-violet-700 dark:ring-violet-900" : "dark:border-gray-800"
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900 dark:text-white">{unit.nome}</h3>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {unit.sede && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Crown className="h-3 w-3" />
                  Sede
                </span>
              )}
              {unit.atual && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  Em uso
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  unit.ativo
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                )}
              >
                {unit.ativo ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {unit.ativo ? "Ativa" : "Desativada"}
              </span>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label={`Opções da unidade ${unit.nome}`}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                {!unit.atual && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleActive();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 py-2 text-sm",
                      unit.ativo
                        ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        : "text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                    )}
                  >
                    <Power className="h-4 w-4" />
                    {unit.ativo ? "Desativar" : "Reativar"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {unit.endereco || "Endereço não informado"}
            {cidadeUf && (
              <>
                <br />
                {cidadeUf}
                {unit.cep ? ` — CEP ${unit.cep}` : ""}
              </>
            )}
          </span>
        </div>
        {unit.telefone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>{unit.telefone}</span>
          </div>
        )}
        {unit.cnpj && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>CNPJ {unit.cnpj}</span>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 border-t pt-4 dark:border-gray-800">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Profissionais</p>
          <p className="font-semibold text-gray-900 dark:text-white">{unit.totalProfissionais}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Clientes</p>
          <p className="font-semibold text-gray-900 dark:text-white">{unit.totalClientes}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Serviços</p>
          <p className="font-semibold text-gray-900 dark:text-white">{unit.totalServicos}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Faturamento (30 dias)</p>
          <p className="font-semibold text-gray-900 dark:text-white">{moeda(Number(unit.faturamentoMes) || 0)}</p>
        </div>
      </div>

      {/* Entrar */}
      <div className="mt-4 pt-1">
        {unit.atual ? (
          <p className="text-center text-sm text-violet-700 dark:text-violet-300">Você está nesta unidade</p>
        ) : (
          <button
            onClick={onEnter}
            disabled={!unit.ativo}
            title={unit.ativo ? undefined : "Reative a unidade para entrar nela"}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-900/30"
          >
            <LogIn className="h-4 w-4" />
            Entrar nesta unidade
          </button>
        )}
      </div>
    </div>
  );
}

const CAMPO =
  "w-full rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const ROTULO = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

function UnitFormModal({
  unit,
  onClose,
  onSave,
}: {
  unit?: Unidade | null;
  onClose: () => void;
  onSave: (data: UnidadeInput) => Promise<void>;
}) {
  const isEditing = !!unit;
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<Required<UnidadeInput>>({
    nome: unit?.nome || "",
    telefone: unit?.telefone || "",
    cnpj: unit?.cnpj || "",
    descricao: unit?.descricao || "",
    endereco: unit?.endereco || "",
    cidade: unit?.cidade || "",
    estado: unit?.estado || "",
    cep: unit?.cep || "",
  });
  const campo = (nome: keyof UnidadeInput) => ({
    id: `unidade-${nome}`,
    value: form[nome],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [nome]: e.target.value }),
    className: CAMPO,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await onSave({ ...form, nome: form.nome.trim(), estado: form.estado.trim().toUpperCase() });
    } catch (err) {
      setErro(motivo(err, "Não foi possível salvar a unidade"));
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unidade-titulo"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-900"
      >
        <h2 id="unidade-titulo" className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          {isEditing ? "Editar unidade" : "Nova unidade"}
        </h2>
        {!isEditing && (
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            A nova unidade começa com as regras de agendamento, a comissão padrão e os horários de
            funcionamento da unidade atual. Profissionais, serviços e clientes são cadastrados em cada
            unidade.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="unidade-nome" className={ROTULO}>
                Nome da unidade *
              </label>
              <input type="text" required maxLength={150} placeholder="Ex.: Barbearia Centro" {...campo("nome")} />
            </div>
            <div>
              <label htmlFor="unidade-telefone" className={ROTULO}>
                Telefone
              </label>
              <input type="tel" maxLength={20} placeholder="(11) 3456-7890" {...campo("telefone")} />
            </div>
            <div>
              <label htmlFor="unidade-cnpj" className={ROTULO}>
                CNPJ
              </label>
              <input type="text" maxLength={20} placeholder="00.000.000/0000-00" {...campo("cnpj")} />
            </div>
          </div>

          <hr className="dark:border-gray-700" />
          <h3 className="font-medium text-gray-900 dark:text-white">Endereço</h3>

          <div>
            <label htmlFor="unidade-endereco" className={ROTULO}>
              Endereço
            </label>
            <input type="text" maxLength={300} placeholder="Rua, número, bairro" {...campo("endereco")} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="unidade-cidade" className={ROTULO}>
                Cidade
              </label>
              <input type="text" maxLength={100} {...campo("cidade")} />
            </div>
            <div>
              <label htmlFor="unidade-estado" className={ROTULO}>
                Estado (UF)
              </label>
              <input type="text" maxLength={2} placeholder="SP" pattern="[A-Za-z]{2}" title="Sigla com 2 letras" {...campo("estado")} />
            </div>
            <div>
              <label htmlFor="unidade-cep" className={ROTULO}>
                CEP
              </label>
              <input type="text" maxLength={10} placeholder="01234-567" {...campo("cep")} />
            </div>
          </div>

          <div>
            <label htmlFor="unidade-descricao" className={ROTULO}>
              Descrição
            </label>
            <textarea rows={3} maxLength={500} {...campo("descricao")} />
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {erro}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar unidade"}
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
  const { selectUnit, reloadUnits } = useUnit();
  const isAdmin = isRole("ADMIN");
  const [units, setUnits] = useState<Unidade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; unidade?: Unidade } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unidade | null>(null);

  const carregar = useCallback(async () => {
    try {
      setUnits(await unitService.list());
      setErro(null);
    } catch (err) {
      setErro(motivo(err, "Erro ao carregar as unidades"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) carregar();
    else setIsLoading(false);
  }, [isAdmin, carregar]);

  const termo = searchTerm.trim().toLowerCase();
  const filteredUnits = units.filter((u) => {
    const matchesSearch =
      !termo || [u.nome, u.cidade, u.endereco].some((v) => v?.toLowerCase().includes(termo));
    const matchesStatus =
      statusFilter === "all" || (statusFilter === "active" ? u.ativo : !u.ativo);
    return matchesSearch && matchesStatus;
  });

  const ativas = units.filter((u) => u.ativo);
  const totais = ativas.reduce(
    (t, u) => ({
      profissionais: t.profissionais + u.totalProfissionais,
      clientes: t.clientes + u.totalClientes,
      faturamento: t.faturamento + (Number(u.faturamentoMes) || 0),
    }),
    { profissionais: 0, clientes: 0, faturamento: 0 }
  );

  const handleSave = async (data: UnidadeInput) => {
    if (editingUnit) {
      await unitService.update(editingUnit.id, data);
      setAviso({ texto: `Unidade "${data.nome}" atualizada.` });
    } else {
      const nova = await unitService.create(data);
      setAviso({ texto: `Unidade "${nova.nome}" criada.`, unidade: nova });
    }
    setShowModal(false);
    setEditingUnit(null);
    await carregar();
    reloadUnits();
  };

  const entrar = async (unit: Unidade) => {
    try {
      await selectUnit(String(unit.id));
    } catch (err) {
      setErro(motivo(err, "Não foi possível entrar na unidade"));
    }
  };

  const alternarAtiva = async (unit: Unidade) => {
    if (
      unit.ativo &&
      !confirm(
        `Desativar a unidade "${unit.nome}"? Ela sai do agendamento online e ninguém mais entra nela. Os dados ficam guardados e você pode reativá-la depois.`
      )
    ) {
      return;
    }
    try {
      if (unit.ativo) await unitService.deactivate(unit.id);
      else await unitService.activate(unit.id);
      setAviso({ texto: `Unidade "${unit.nome}" ${unit.ativo ? "desativada" : "reativada"}.` });
      setErro(null);
      await carregar();
      reloadUnits();
    } catch (err) {
      setErro(motivo(err, "Não foi possível alterar a unidade"));
    }
  };

  if (!isAdmin) {
    return (
      <SalonLayout>
        <div className="rounded-xl border bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Apenas o administrador gerencia as unidades.</p>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Unidades</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Cada unidade tem equipe, serviços, clientes, agenda e caixa próprios
            </p>
          </div>
          <button
            onClick={() => {
              setEditingUnit(null);
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Nova unidade
          </button>
        </div>

        {erro && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {erro}
          </div>
        )}
        {aviso && (
          <div className="flex flex-col gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800 sm:flex-row sm:items-center sm:justify-between dark:bg-green-900/20 dark:text-green-300">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {aviso.texto}
            </span>
            <div className="flex gap-2">
              {aviso.unidade && (
                <button
                  onClick={() => entrar(aviso.unidade!)}
                  className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
                >
                  Entrar agora para cadastrar a equipe e os serviços
                </button>
              )}
              <button onClick={() => setAviso(null)} className="px-2 text-xs underline">
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={Building2}
            label="Unidades"
            value={units.length}
            subValue={`${ativas.length} ativa${ativas.length === 1 ? "" : "s"}`}
            color="violet"
          />
          <StatsCard icon={Scissors} label="Profissionais" value={totais.profissionais} subValue="Nas unidades ativas" color="blue" />
          <StatsCard icon={Users} label="Clientes" value={totais.clientes} subValue="Nas unidades ativas" color="green" />
          <StatsCard
            icon={DollarSign}
            label="Faturamento"
            value={moeda(totais.faturamento)}
            subValue="Últimos 30 dias"
            color="amber"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, cidade ou endereço..."
              aria-label="Buscar unidades"
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
                {status === "all" ? "Todas" : status === "active" ? "Ativas" : "Desativadas"}
              </button>
            ))}
          </div>
        </div>

        {/* Units Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">Nenhuma unidade encontrada</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {termo || statusFilter !== "all" ? "Tente outros filtros" : "Crie sua primeira unidade para começar"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredUnits.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                onEnter={() => entrar(unit)}
                onEdit={() => {
                  setEditingUnit(unit);
                  setShowModal(true);
                }}
                onToggleActive={() => alternarAtiva(unit)}
              />
            ))}
          </div>
        )}
      </div>

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
