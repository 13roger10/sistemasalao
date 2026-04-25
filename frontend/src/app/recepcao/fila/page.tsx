"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  ArrowLeft,
  Clock,
  Plus,
  Trash2,
  Send,
  X,
  Search,
  CalendarPlus,
  CheckCircle,
  Loader2,
  Users,
} from "lucide-react";

const SALON_ID = "1";
const STORAGE_KEY = "belezza_fila_espera";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilaEntry {
  id: string;
  clienteNome: string;
  clienteId: number | null;
  telefone: string;
  servicoNota: string;
  chegouEm: string;
}

interface ClienteResult {
  id: number;
  name: string;
  phone: string;
  whatsapp: string;
}

interface Profissional {
  id: number;
  nome: string;
}

interface Servico {
  id: number;
  nome: string;
  duracaoMinutos: number;
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

function loadFila(): FilaEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFila(fila: FilaEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fila));
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function waitMinutes(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  if (d.startsWith("55") && d.length >= 12) return `+${d}`;
  return `+${d}`;
}

function toLocalDatetimeValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Add-to-queue panel ───────────────────────────────────────────────────────

interface AddPanelProps {
  onAdd: (entry: Omit<FilaEntry, "id" | "chegouEm">) => void;
}

function AddPanel({ onAdd }: AddPanelProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ClienteResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ClienteResult | null>(null);
  const [manualNome, setManualNome] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [servicoNota, setServicoNota] = useState("");
  const [open, setOpen] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get<ClienteResult[]>(`/clientes/salon/${SALON_ID}`, {
        params: { search: q.trim(), size: 8 },
      });
      const list = Array.isArray(res.data) ? res.data : (res.data as { content?: ClienteResult[] }).content ?? [];
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 350);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  function selectCliente(c: ClienteResult) {
    setSelected(c);
    setSearch(c.name);
    setResults([]);
  }

  function handleAdd() {
    const nome = selected ? selected.name : manualNome.trim();
    const tel = selected ? (selected.whatsapp || selected.phone) : manualPhone.trim();
    if (!nome) return;
    onAdd({
      clienteNome: nome,
      clienteId: selected ? selected.id : null,
      telefone: tel,
      servicoNota: servicoNota.trim(),
    });
    setSelected(null);
    setSearch("");
    setManualNome("");
    setManualPhone("");
    setServicoNota("");
    setOpen(false);
  }

  return (
    <div className="mb-5 rounded-xl border bg-white shadow-sm">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-violet-600"
      >
        <Plus className="h-4 w-4" />
        Adicionar cliente à fila
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {/* Client search */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Buscar cliente cadastrado
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
                placeholder="Nome ou telefone..."
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-violet-400 focus:outline-none"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />}
            </div>
            {results.length > 0 && (
              <ul className="mt-1 rounded-lg border border-gray-200 bg-white shadow-sm">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => selectCliente(c)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-violet-50"
                    >
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="text-gray-400">{c.phone || c.whatsapp}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle className="h-3.5 w-3.5" /> {selected.name} selecionado
              </p>
            )}
          </div>

          {/* Manual entry fallback */}
          {!selected && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Nome (walk-in)</label>
                <input
                  value={manualNome}
                  onChange={(e) => setManualNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Telefone</label>
                <input
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Service note */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Serviço desejado</label>
            <input
              value={servicoNota}
              onChange={(e) => setServicoNota(e.target.value)}
              placeholder="Ex: corte + escova"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={!selected && !manualNome.trim()}
            className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            Adicionar à fila
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Booking modal ────────────────────────────────────────────────────────────

interface BookingModalProps {
  entry: FilaEntry;
  onClose: () => void;
  onBooked: (entryId: string) => void;
}

function BookingModal({ entry, onClose, onBooked }: BookingModalProps) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profId, setProfId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [dataHora, setDataHora] = useState(toLocalDatetimeValue());
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Profissional[]>(`/profissionais/salon/${SALON_ID}`),
      api.get<Servico[]>(`/servicos/salon/${SALON_ID}`),
    ]).then(([p, s]) => {
      const profs = Array.isArray(p.data) ? p.data : (p.data as { content?: Profissional[] }).content ?? [];
      const servs = Array.isArray(s.data) ? s.data : (s.data as { content?: Servico[] }).content ?? [];
      setProfissionais(profs);
      setServicos(servs.filter((sv) => (sv as Servico & { ativo?: boolean }).ativo !== false));
    }).catch(() => {});
  }, []);

  async function handleAgendar() {
    if (!profId || !servicoId || !entry.clienteId) return;
    setLoading(true);
    try {
      await api.post("/agendamentos", {
        clienteId: entry.clienteId,
        profissionalId: Number(profId),
        servicoId: Number(servicoId),
        dataHora: new Date(dataHora).toISOString(),
      });

      // Notify client
      if (entry.telefone) {
        const hora = new Date(dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const prof = profissionais.find((p) => String(p.id) === profId);
        const serv = servicos.find((s) => String(s.id) === servicoId);
        await api.post("/whatsapp/messages/send", {
          telefone: normalizePhone(entry.telefone),
          mensagem: `Olá ${entry.clienteNome.split(" ")[0]}! Sua vaga na fila foi confirmada. Agendamento às ${hora} com ${prof?.nome ?? "profissional"} para ${serv?.nome ?? "serviço"}. Nos vemos em breve! ✅`,
          salonId: Number(SALON_ID),
        }).catch(() => {});
      }

      setBooked(true);
      setTimeout(() => { onBooked(entry.id); onClose(); }, 1500);
    } catch {
      alert("Erro ao agendar. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold text-gray-900">Agendar — {entry.clienteNome}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          {entry.servicoNota && (
            <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">
              Serviço desejado: <strong>{entry.servicoNota}</strong>
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Profissional</label>
            <select
              value={profId}
              onChange={(e) => setProfId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            >
              <option value="">Selecionar...</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Serviço</label>
            <select
              value={servicoId}
              onChange={(e) => setServicoId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            >
              <option value="">Selecionar...</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>{s.nome} ({s.duracaoMinutos}min)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Data e hora</label>
            <input
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            />
          </div>

          {booked && (
            <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4" /> Agendado e cliente notificado!
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleAgendar}
            disabled={!profId || !servicoId || !entry.clienteId || loading || booked}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Agendar
          </button>
        </div>

        {!entry.clienteId && (
          <p className="px-5 pb-4 text-center text-xs text-amber-600">
            Cliente walk-in (sem cadastro) — cadastre-o primeiro para agendar.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Queue card ───────────────────────────────────────────────────────────────

interface QueueCardProps {
  entry: FilaEntry;
  position: number;
  onRemove: (id: string) => void;
  onNotify: (entry: FilaEntry) => void;
  onBook: (entry: FilaEntry) => void;
  notifyState: "idle" | "sending" | "done" | "error";
}

function QueueCard({ entry, position, onRemove, onNotify, onBook, notifyState }: QueueCardProps) {
  const wait = waitMinutes(entry.chegouEm);

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm">
      {/* Position */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
        {position}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">{entry.clienteNome}</p>
          {!entry.clienteId && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-600">walk-in</span>
          )}
        </div>
        {entry.servicoNota && (
          <p className="text-xs text-gray-500">{entry.servicoNota}</p>
        )}
        {entry.telefone && (
          <p className="text-xs text-gray-400">{entry.telefone}</p>
        )}
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          Chegou às {formatTime(entry.chegouEm)} · aguardando {wait}min
        </p>

        {/* Actions */}
        <div className="mt-2 flex flex-wrap gap-2">
          {entry.telefone && (
            <button
              onClick={() => onNotify(entry)}
              disabled={notifyState === "sending" || notifyState === "done"}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              {notifyState === "sending" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : notifyState === "done" ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {notifyState === "done" ? "Notificado" : "Notificar"}
            </button>
          )}

          <button
            onClick={() => onBook(entry)}
            className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Agendar
          </button>

          <button
            onClick={() => onRemove(entry.id)}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Retirar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function FilaContent() {
  const router = useRouter();
  const [fila, setFila] = useState<FilaEntry[]>([]);
  const [bookingEntry, setBookingEntry] = useState<FilaEntry | null>(null);
  const [notifyStates, setNotifyStates] = useState<Record<string, "idle" | "sending" | "done" | "error">>({});

  useEffect(() => {
    setFila(loadFila());
  }, []);

  function persistFila(next: FilaEntry[]) {
    setFila(next);
    saveFila(next);
  }

  function handleAdd(data: Omit<FilaEntry, "id" | "chegouEm">) {
    const entry: FilaEntry = { ...data, id: newId(), chegouEm: new Date().toISOString() };
    persistFila([...fila, entry]);
  }

  function handleRemove(id: string) {
    persistFila(fila.filter((e) => e.id !== id));
  }

  function handleBooked(id: string) {
    persistFila(fila.filter((e) => e.id !== id));
  }

  async function handleNotify(entry: FilaEntry) {
    if (!entry.telefone) return;
    setNotifyStates((p) => ({ ...p, [entry.id]: "sending" }));
    try {
      await api.post("/whatsapp/messages/send", {
        telefone: normalizePhone(entry.telefone),
        mensagem: `Olá ${entry.clienteNome.split(" ")[0]}! É a sua vez! Por favor, dirija-se à recepção. Estamos esperando por você. 🎉`,
        salonId: Number(SALON_ID),
      });
      setNotifyStates((p) => ({ ...p, [entry.id]: "done" }));
    } catch {
      setNotifyStates((p) => ({ ...p, [entry.id]: "error" }));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={() => router.back()} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2">
            <Users className="h-5 w-5 text-violet-600" />
            <div>
              <h1 className="font-semibold text-gray-900">Fila de Espera</h1>
              <p className="text-xs text-gray-400">{fila.length} na fila agora</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <AddPanel onAdd={handleAdd} />

        {fila.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-400">Nenhum cliente na fila.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fila.map((entry, i) => (
              <QueueCard
                key={entry.id}
                entry={entry}
                position={i + 1}
                onRemove={handleRemove}
                onNotify={handleNotify}
                onBook={setBookingEntry}
                notifyState={notifyStates[entry.id] ?? "idle"}
              />
            ))}
          </div>
        )}
      </main>

      {bookingEntry && (
        <BookingModal
          entry={bookingEntry}
          onClose={() => setBookingEntry(null)}
          onBooked={handleBooked}
        />
      )}
    </div>
  );
}

export default function FilaPage() {
  return (
    <ProtectedRoute requiredRole="receptionist">
      <FilaContent />
    </ProtectedRoute>
  );
}
