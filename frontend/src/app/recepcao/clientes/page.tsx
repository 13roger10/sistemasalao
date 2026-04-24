"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clientService } from "@/services/salon/clientService";
import { api } from "@/services/salon/api";
import type { Client, Appointment } from "@/types/salon";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, Search, Plus, X, User, Phone, Mail,
  MessageSquare, FileText, Edit2, Loader2, AlertCircle,
  History, Clock, Scissors, ChevronRight,
} from "lucide-react";

const SALON_ID = "1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function fmtDate(raw: Date | string | undefined): string {
  if (!raw) return "—";
  try {
    const d = typeof raw === "string" ? parseISO(raw) : raw;
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return String(raw).slice(0, 10);
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending:     "Pendente",
  confirmed:   "Confirmado",
  in_progress: "Em andamento",
  completed:   "Concluído",
  canceled:    "Cancelado",
  no_show:     "Não compareceu",
};

const STATUS_CLS: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-700",
  confirmed:   "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed:   "bg-gray-100 text-gray-600",
  canceled:    "bg-red-100 text-red-600",
  no_show:     "bg-orange-100 text-orange-700",
};

function serviceNames(appt: Appointment): string {
  return appt.services?.map((s) => s.service?.name ?? "").filter(Boolean).join(" + ") || "—";
}

// ─── History Panel ────────────────────────────────────────────────────────────

interface HistoryPanelProps {
  client: Client;
  onClose: () => void;
}

function HistoryPanel({ client, onClose }: HistoryPanelProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api
      .get<{ content: Appointment[] } | Appointment[]>(
        `/agendamentos/cliente/${client.id}`,
        { size: 50, sort: "dataHora,desc" }
      )
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { content: Appointment[] }).content ?? [];
        setAppointments(list);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [client.id]);

  const total = appointments.length;
  const concluded = appointments.filter((a) => a.status === "completed").length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 font-semibold text-sm">
            {client.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate">{client.name}</p>
            <p className="text-xs text-gray-500">Histórico de atendimentos</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm">Erro ao carregar histórico</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{total}</p>
                  <p className="mt-0.5 text-xs text-gray-500">Agendamentos</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                  <p className="text-2xl font-bold text-violet-600">{concluded}</p>
                  <p className="mt-0.5 text-xs text-gray-500">Concluídos</p>
                </div>
              </div>

              {/* List */}
              {appointments.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                  <History className="h-10 w-10" />
                  <p className="text-sm">Nenhum atendimento registrado</p>
                </div>
              ) : (
                <div className="px-4 pb-6 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">
                    Atendimentos
                  </p>
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                    >
                      {/* Date + Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span>{fmtDate(appt.date)}</span>
                          {appt.startTime && (
                            <span className="text-gray-400">às {appt.startTime}</span>
                          )}
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_CLS[appt.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABEL[appt.status] ?? appt.status}
                        </span>
                      </div>

                      {/* Services */}
                      <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-700">
                        <Scissors className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <span>{serviceNames(appt)}</span>
                      </div>

                      {/* Professional */}
                      {appt.professional?.name && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span>{appt.professional.name}</span>
                        </div>
                      )}

                      {/* Cancellation reason */}
                      {appt.status === "canceled" && appt.cancellationReason && (
                        <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">
                          Motivo: {appt.cancellationReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Client Form Modal ────────────────────────────────────────────────────────

interface ClientFormData {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  notes: string;
}

const EMPTY_FORM: ClientFormData = {
  name: "", phone: "", whatsapp: "", email: "", notes: "",
};

function ClientModal({
  client,
  onSave,
  onClose,
}: {
  client: Client | null;
  onSave: (data: ClientFormData) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ClientFormData>(
    client
      ? {
          name: client.name ?? "",
          phone: client.phone ?? "",
          whatsapp: client.whatsapp ?? "",
          email: client.email ?? "",
          notes: client.notes ?? "",
        }
      : EMPTY_FORM
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<ClientFormData>>({});

  const set = (k: keyof ClientFormData, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<ClientFormData> = {};
    if (!form.name.trim()) e.name = "Nome é obrigatório";
    if (!form.phone.replace(/\D/g, "")) e.phone = "Telefone é obrigatório";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "E-mail inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSave({
        ...form,
        phone: form.phone.replace(/\D/g, ""),
        whatsapp: form.whatsapp.replace(/\D/g, ""),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            {client ? "Editar Cliente" : "Novo Cliente"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nome completo"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-violet-500 ${
                  errors.name ? "border-red-400" : "border-gray-200"
                }`}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Telefone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={(e) => set("phone", formatPhone(e.target.value))}
                className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-violet-500 ${
                  errors.phone ? "border-red-400" : "border-gray-200"
                }`}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
            )}
          </div>

          {/* WhatsApp */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">WhatsApp</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", formatPhone(e.target.value))}
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="email"
                placeholder="exemplo@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-violet-500 ${
                  errors.email ? "border-red-400" : "border-gray-200"
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <textarea
                placeholder="Observações sobre o cliente..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-5 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {client ? "Salvar" : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({
  client,
  onEdit,
  onHistory,
}: {
  client: Client;
  onEdit: (c: Client) => void;
  onHistory: (c: Client) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 font-semibold text-sm">
        {client.name?.charAt(0).toUpperCase() ?? "?"}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 truncate">{client.name}</p>
        <div className="mt-1 space-y-0.5">
          {client.phone && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.whatsapp && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MessageSquare className="h-3 w-3 flex-shrink-0" />
              <span>{client.whatsapp}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.notes && (
            <div className="flex items-start gap-1.5 text-xs text-gray-400">
              <FileText className="h-3 w-3 flex-shrink-0 mt-px" />
              <span className="line-clamp-2">{client.notes}</span>
            </div>
          )}
        </div>

        {/* History link */}
        <button
          onClick={() => onHistory(client)}
          className="mt-2 flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800"
        >
          <History className="h-3 w-3" />
          Ver histórico
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Edit */}
      <button
        onClick={() => onEdit(client)}
        className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <Edit2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecepcaoClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; client: Client | null }>({
    open: false,
    client: null,
  });
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await clientService.list({ salonId: SALON_ID, search: search || undefined });
      setClients(result.data ?? result.items ?? []);
    } catch {
      setError("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openCreate = () => setModal({ open: true, client: null });
  const openEdit = (c: Client) => setModal({ open: true, client: c });
  const closeModal = () => setModal({ open: false, client: null });

  const handleSave = async (data: ClientFormData) => {
    try {
      if (modal.client) {
        await clientService.update(String(modal.client.id), {
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          whatsapp: data.whatsapp || undefined,
          notes: data.notes || undefined,
        });
        showToast("Cliente atualizado com sucesso");
      } else {
        await clientService.create({
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          whatsapp: data.whatsapp || undefined,
          notes: data.notes || undefined,
          salonId: SALON_ID,
        });
        showToast("Cliente cadastrado com sucesso");
      }
      closeModal();
      load();
    } catch {
      showToast("Erro ao salvar cliente.", "error");
      throw new Error("save failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[100] rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Client form modal */}
      {modal.open && (
        <ClientModal
          client={modal.client}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {/* History panel */}
      {historyClient && (
        <HistoryPanel
          client={historyClient}
          onClose={() => setHistoryClient(null)}
        />
      )}

      {/* Header */}
      <header className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Clientes</h1>
            <p className="text-xs text-gray-500">{clients.length} cadastrados</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Novo
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 shadow-sm outline-none focus:border-violet-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* State: loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        )}

        {/* State: error */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm">{error}</p>
            <button onClick={load} className="text-sm text-violet-600 hover:underline">
              Tentar novamente
            </button>
          </div>
        )}

        {/* State: empty */}
        {!loading && !error && clients.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <User className="h-10 w-10" />
            <p className="text-sm">
              {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </p>
            {!search && (
              <button
                onClick={openCreate}
                className="text-sm text-violet-600 hover:underline"
              >
                Cadastrar primeiro cliente
              </button>
            )}
          </div>
        )}

        {/* Client list */}
        {!loading && !error && clients.length > 0 && (
          <div className="space-y-3">
            {clients.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                onEdit={openEdit}
                onHistory={setHistoryClient}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
