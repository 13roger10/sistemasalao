"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  ChevronDown,
  Shield,
  Eye,
  Edit3,
  Zap,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import {
  equipeStudioService,
  type MembroStudio,
  type FuncaoStudio,
  FUNCAO_LABELS,
  FUNCAO_COLORS,
  FUNCOES_ASSIGNING,
} from "@/services/equipeStudio";

// ─── Salon ID resolution (same default as the rest of the admin area) ─────────
const DEFAULT_SALON_ID = 1;

// ─── Role icon ────────────────────────────────────────────────────────────────

function FuncaoIcon({ funcao }: { funcao: FuncaoStudio }) {
  const cls = "h-3.5 w-3.5";
  switch (funcao) {
    case "PROPRIETARIO":
      return <Shield className={cls} />;
    case "GESTOR":
      return <Zap className={cls} />;
    case "EDITOR":
      return <Edit3 className={cls} />;
    case "VISUALIZADOR":
      return <Eye className={cls} />;
  }
}

function FuncaoBadge({ funcao }: { funcao: FuncaoStudio }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${FUNCAO_COLORS[funcao]}`}
    >
      <FuncaoIcon funcao={funcao} />
      {FUNCAO_LABELS[funcao]}
    </span>
  );
}

// ─── Permission matrix info ───────────────────────────────────────────────────

const MATRIX_ROWS: { label: string; prop: FuncaoStudio[] }[] = [
  { label: "Visualizar posts e analytics", prop: ["PROPRIETARIO", "GESTOR", "EDITOR", "VISUALIZADOR"] },
  { label: "Criar e editar posts", prop: ["PROPRIETARIO", "GESTOR", "EDITOR"] },
  { label: "Agendar publicações", prop: ["PROPRIETARIO", "GESTOR", "EDITOR"] },
  { label: "Publicar imediatamente", prop: ["PROPRIETARIO", "GESTOR"] },
  { label: "Conectar contas sociais", prop: ["PROPRIETARIO"] },
  { label: "Gerenciar equipe", prop: ["PROPRIETARIO"] },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [membros, setMembros] = useState<MembroStudio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add member modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addFuncao, setAddFuncao] = useState<FuncaoStudio>("EDITOR");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Change role dropdown
  const [changingId, setChangingId] = useState<number | null>(null);

  // Remove member modal
  const [removeTarget, setRemoveTarget] = useState<MembroStudio | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const salonId = DEFAULT_SALON_ID;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await equipeStudioService.listar(salonId);
      setMembros(data);
    } catch {
      setError("Não foi possível carregar a equipe.");
    } finally {
      setIsLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!addEmail.trim()) {
      setAddError("E-mail é obrigatório.");
      return;
    }
    setIsAdding(true);
    setAddError("");
    try {
      const novo = await equipeStudioService.adicionar(salonId, addEmail.trim(), addFuncao);
      setMembros((prev) => [...prev, novo]);
      setIsAddOpen(false);
      setAddEmail("");
      setAddFuncao("EDITOR");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Erro ao adicionar membro.";
      setAddError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleChangeFuncao = async (membro: MembroStudio, funcao: FuncaoStudio) => {
    setChangingId(membro.id);
    try {
      const updated = await equipeStudioService.alterarFuncao(salonId, membro.id, funcao);
      setMembros((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      // silently restore; real app would show a toast
    } finally {
      setChangingId(null);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      await equipeStudioService.remover(salonId, removeTarget.id);
      setMembros((prev) => prev.filter((m) => m.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch {
      setIsRemoving(false);
    }
  };

  return (
    <AdminLayout title="Equipe Studio">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Equipe do Studio
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerencie quem tem acesso ao Social Studio e suas permissões.
            </p>
          </div>
          <Button
            onClick={() => setIsAddOpen(true)}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Adicionar Membro
          </Button>
        </div>

        {/* Member list */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-500">{error}</div>
          ) : membros.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-400">
              <Users className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhum membro na equipe ainda.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddOpen(true)}
              >
                Adicionar primeiro membro
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {membros.map((m) => (
                <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt={m.nome}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      m.nome.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {m.nome}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {m.email}
                    </p>
                  </div>

                  {/* Role badge / selector */}
                  {m.funcao === "PROPRIETARIO" ? (
                    <FuncaoBadge funcao={m.funcao} />
                  ) : (
                    <div className="relative">
                      <select
                        value={m.funcao}
                        disabled={changingId === m.id}
                        onChange={(e) =>
                          handleChangeFuncao(m, e.target.value as FuncaoStudio)
                        }
                        className="appearance-none rounded-full border border-gray-200 bg-white py-1 pl-3 pr-7 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      >
                        {FUNCOES_ASSIGNING.map((f) => (
                          <option key={f} value={f}>
                            {FUNCAO_LABELS[f]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                    </div>
                  )}

                  {/* Remove */}
                  {m.funcao !== "PROPRIETARIO" && (
                    <button
                      onClick={() => setRemoveTarget(m)}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Remover membro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Permission matrix */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Matriz de Permissões
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-5 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Ação
                  </th>
                  {(["PROPRIETARIO", "GESTOR", "EDITOR", "VISUALIZADOR"] as FuncaoStudio[]).map(
                    (f) => (
                      <th
                        key={f}
                        className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400"
                      >
                        <FuncaoBadge funcao={f} />
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {MATRIX_ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
                  >
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                      {row.label}
                    </td>
                    {(["PROPRIETARIO", "GESTOR", "EDITOR", "VISUALIZADOR"] as FuncaoStudio[]).map(
                      (f) => (
                        <td key={f} className="px-4 py-3 text-center">
                          {row.prop.includes(f) ? (
                            <span className="text-green-500">✓</span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">✗</span>
                          )}
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add member modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setAddEmail("");
          setAddFuncao("EDITOR");
          setAddError("");
        }}
        title="Adicionar Membro"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddOpen(false);
                setAddEmail("");
                setAddFuncao("EDITOR");
                setAddError("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAdd} isLoading={isAdding}>
              Adicionar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {addError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {addError}
            </div>
          )}
          <Input
            label="E-mail do usuário *"
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="email@exemplo.com"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Função *
            </label>
            <select
              value={addFuncao}
              onChange={(e) => setAddFuncao(e.target.value as FuncaoStudio)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {FUNCOES_ASSIGNING.map((f) => (
                <option key={f} value={f}>
                  {FUNCAO_LABELS[f]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {addFuncao === "GESTOR" &&
                "Pode publicar, agendar e criar posts. Não gerencia a equipe."}
              {addFuncao === "EDITOR" &&
                "Pode criar, editar e agendar posts. Não publica diretamente."}
              {addFuncao === "VISUALIZADOR" && "Acesso somente leitura."}
            </p>
          </div>
        </div>
      </Modal>

      {/* Remove confirmation */}
      <ConfirmModal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remover Membro"
        message={`Tem certeza que deseja remover "${removeTarget?.nome}" da equipe? Esta ação revogará o acesso ao Social Studio.`}
        confirmText="Remover"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isRemoving}
      />
    </AdminLayout>
  );
}
