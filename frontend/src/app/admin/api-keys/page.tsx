"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Trash2,
  Ban,
  Copy,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import {
  apiKeysService,
  type ApiKeyResponse,
  type ApiKeyCreatedResponse,
  type Escopo,
} from "@/services/apiKeys";

const DEFAULT_SALON_ID = 1;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ScopeBadge({ scope }: { scope: Escopo }) {
  return scope === "write" ? (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      read + write
    </span>
  ) : (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      somente leitura
    </span>
  );
}

// ─── Raw key display (shown once after creation) ──────────────────────────────

function CreatedKeyBanner({
  created,
  onDismiss,
}: {
  created: ApiKeyCreatedResponse;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(created.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-900/20">
      <div className="mb-3 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Copie sua API Key agora — ela não será exibida novamente.
          </p>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
            Guarde em local seguro (variável de ambiente, cofre de segredos, etc.)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white p-3 font-mono text-sm dark:border-amber-700 dark:bg-gray-900">
        <span className="flex-1 break-all text-gray-800 dark:text-gray-200">
          {created.rawKey}
        </span>
        <button
          onClick={copy}
          className="shrink-0 rounded p-1.5 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40"
          title="Copiar"
        >
          {copied ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Entendi, já copiei
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const salonId = DEFAULT_SALON_ID;

  const [keys, setKeys] = useState<ApiKeyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [escopo, setEscopo] = useState<Escopo>("read");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Newly created key — show raw key once
  const [createdKey, setCreatedKey] = useState<ApiKeyCreatedResponse | null>(null);

  // Revoke / delete
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyResponse | null>(null);
  const [isActing, setIsActing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setKeys(await apiKeysService.listar(salonId));
    } catch {
      setError("Não foi possível carregar as API Keys.");
    } finally {
      setIsLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!nome.trim()) {
      setCreateError("Nome é obrigatório.");
      return;
    }
    setIsCreating(true);
    setCreateError("");
    try {
      const escopos: Escopo[] = escopo === "write" ? ["read", "write"] : ["read"];
      const created = await apiKeysService.criar(salonId, { nome: nome.trim(), escopos });
      setCreatedKey(created);
      setKeys((prev) => [
        {
          id: created.id,
          nome: created.nome,
          keyPrefix: created.keyPrefix + "••••••••••••••••••••••",
          escopos: created.escopos,
          ativo: true,
          ultimoUsoEm: null,
          expiraEm: created.expiraEm,
          criadoEm: created.criadoEm,
        },
        ...prev,
      ]);
      setIsCreateOpen(false);
      setNome("");
      setEscopo("read");
    } catch {
      setCreateError("Erro ao criar API Key.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsActing(true);
    try {
      await apiKeysService.revogar(salonId, revokeTarget.id);
      setKeys((prev) =>
        prev.map((k) => (k.id === revokeTarget.id ? { ...k, ativo: false } : k))
      );
      setRevokeTarget(null);
    } finally {
      setIsActing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsActing(true);
    try {
      await apiKeysService.excluir(salonId, deleteTarget.id);
      setKeys((prev) => prev.filter((k) => k.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <AdminLayout title="API Keys">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              API Keys
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gere chaves para integrar seu site ou sistema ao Belezza via API pública.
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Nova API Key
          </Button>
        </div>

        {/* Newly created key banner */}
        {createdKey && (
          <CreatedKeyBanner
            created={createdKey}
            onDismiss={() => setCreatedKey(null)}
          />
        )}

        {/* API reference card */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
          <h2 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            Como usar
          </h2>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Inclua o header <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">X-API-Key: {"<sua-chave>"}</code> em todas as requisições.
          </p>
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p><span className="font-mono text-violet-600 dark:text-violet-400">GET</span>  /api/v1/salons/{"{id}"}/info</p>
            <p><span className="font-mono text-violet-600 dark:text-violet-400">GET</span>  /api/v1/salons/{"{id}"}/servicos</p>
            <p><span className="font-mono text-violet-600 dark:text-violet-400">GET</span>  /api/v1/salons/{"{id}"}/profissionais</p>
            <p><span className="font-mono text-violet-600 dark:text-violet-400">GET</span>  /api/v1/salons/{"{id}"}/disponibilidade?data=YYYY-MM-DD&servicoIds=1,2</p>
            <p><span className="font-mono text-amber-600 dark:text-amber-400">POST</span> /api/v1/salons/{"{id}"}/agendamentos <span className="text-amber-500">(escopo write)</span></p>
          </div>
        </div>

        {/* Keys table */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-500">{error}</div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-400">
              <Key className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhuma API Key criada ainda.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
              >
                Criar primeira chave
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {keys.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <Key className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {k.nome}
                      </p>
                      {!k.ativo && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                          Revogada
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">
                      {k.keyPrefix}
                    </p>
                  </div>

                  {/* Scope */}
                  <ScopeBadge scope={k.escopos.includes("write") ? "write" : "read"} />

                  {/* Last used */}
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    {k.ultimoUsoEm ? formatDate(k.ultimoUsoEm) : "Nunca usada"}
                  </div>

                  {/* Actions */}
                  {k.ativo && (
                    <button
                      onClick={() => setRevokeTarget(k)}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-amber-900/20"
                      title="Revogar"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(k)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setNome("");
          setEscopo("read");
          setCreateError("");
        }}
        title="Nova API Key"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateOpen(false);
                setNome("");
                setEscopo("read");
                setCreateError("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} isLoading={isCreating}>
              Gerar chave
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {createError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {createError}
            </div>
          )}
          <Input
            label="Nome *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="ex: Website, App mobile..."
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Escopo *
            </label>
            <select
              value={escopo}
              onChange={(e) => setEscopo(e.target.value as Escopo)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="read">Somente leitura (info, serviços, disponibilidade)</option>
              <option value="write">Leitura + Escrita (inclui criar agendamentos)</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Revoke modal */}
      <ConfirmModal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revogar API Key"
        message={`Tem certeza que deseja revogar "${revokeTarget?.nome}"? Integrações que usam esta chave deixarão de funcionar imediatamente.`}
        confirmText="Revogar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isActing}
      />

      {/* Delete modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir API Key"
        message={`Excluir "${deleteTarget?.nome}" permanentemente? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isActing}
      />
    </AdminLayout>
  );
}
