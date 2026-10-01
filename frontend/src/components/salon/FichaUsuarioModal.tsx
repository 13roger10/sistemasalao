"use client";

import { useEffect, useState } from "react";
import { Cake, CalendarClock, Mail, MessageCircle, Phone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { userService, type FichaUsuario, type ItemAgendaFicha } from "@/services/user";
import { useSalonAuth } from "@/contexts/SalonAuthContext";

const PERFIS: Record<string, string> = {
  ADMIN: "Administrador",
  PROFISSIONAL: "Profissional",
  RECEPCIONISTA: "Recepcionista",
  CLIENTE: "Cliente",
};

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  PENDENTE: { rotulo: "Pendente", classe: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  CONFIRMADO: { rotulo: "Confirmado", classe: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  EM_ANDAMENTO: { rotulo: "Em andamento", classe: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  CONCLUIDO: { rotulo: "Concluído", classe: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  CANCELADO: { rotulo: "Cancelado", classe: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  NO_SHOW: { rotulo: "Faltou", classe: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const moeda = (v?: number | null) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "1990-05-10" -> "10/05/1990" (sem fuso: a data não muda de dia) */
const dataBR = (iso?: string | null) => {
  if (!iso) return null;
  const [a, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${a}`;
};

const dataHoraBR = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function linkWhatsApp(numero?: string | null): string | null {
  const digitos = (numero || "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b py-2.5 last:border-b-0 sm:flex-row sm:gap-4 dark:border-gray-700">
      <dt className="w-40 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">{rotulo}</dt>
      <dd className="min-w-0 text-sm text-gray-900 dark:text-white">{children}</dd>
    </div>
  );
}

function ListaAgenda({ titulo, itens, vazio, rotuloCom }: { titulo: string; itens: ItemAgendaFicha[]; vazio: string; rotuloCom: string }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">{vazio}</p>
      ) : (
        <ul className="divide-y rounded-lg border dark:divide-gray-700 dark:border-gray-700">
          {itens.map((a) => {
            const st = STATUS[a.status] ?? { rotulo: a.status, classe: "bg-gray-100 text-gray-600" };
            return (
              <li key={a.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{dataHoraBR(a.dataHora)}</p>
                  <p className="truncate text-sm text-gray-600 dark:text-gray-300">
                    {a.servicos.length > 0 ? a.servicos.join(", ") : "Serviço não informado"}
                  </p>
                  {a.com && <p className="text-xs text-gray-500 dark:text-gray-400">{rotuloCom}: {a.com}</p>}
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", st.classe)}>{st.rotulo}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{moeda(a.valor)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface FichaUsuarioModalProps {
  usuarioId: number | null;
  onClose: () => void;
  /** Abre a edição desta pessoa */
  onEditar?: () => void;
  rotuloEditar?: string;
}

/**
 * Ficha do usuário na tela Usuários: dados (aniversário, telefone, WhatsApp...) e, para cliente e
 * profissional, a aba Agenda — a recepcionista não tem agenda.
 */
export function FichaUsuarioModal({ usuarioId, onClose, onEditar, rotuloEditar = "Editar usuário" }: FichaUsuarioModalProps) {
  const { user } = useSalonAuth();
  const [ficha, setFicha] = useState<FichaUsuario | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<"dados" | "agenda">("dados");

  useEffect(() => {
    if (usuarioId == null) return;
    let ativo = true;
    setFicha(null);
    setAba("dados");
    setErro(null);
    setCarregando(true);
    userService
      .ficha(usuarioId)
      .then((f) => { if (ativo) setFicha(f); })
      .catch(() => { if (ativo) setErro("Não foi possível carregar a ficha do usuário"); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [usuarioId]);

  const temAgenda = !!ficha?.agenda;
  const hoje = new Date();
  const aniversarioHoje = (() => {
    if (!ficha?.dataNascimento) return false;
    const [, m, d] = ficha.dataNascimento.split("-").map(Number);
    return m === hoje.getMonth() + 1 && d === hoje.getDate();
  })();
  const zap = linkWhatsApp(ficha?.whatsapp);
  const rotuloCom = ficha?.role === "CLIENTE" ? "Profissional" : "Cliente";
  // Profissional vendo outra pessoa: o backend não manda contatos — as linhas nem aparecem
  const restrito = user?.role === "PROFESSIONAL" && !!ficha && String(ficha.id) !== String(user.id);

  return (
    <Modal isOpen={usuarioId != null} onClose={onClose} title={ficha?.nome ?? "Usuário"} size="lg">
      {carregando ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
      ) : erro ? (
        <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">{erro}</p>
      ) : ficha ? (
        <div className="space-y-4">
          <div role="tablist" aria-label="Ficha" className="flex gap-2 border-b dark:border-gray-700">
            {([["dados", "Dados"], ...(temAgenda ? [["agenda", "Agenda"]] : [])] as [string, string][]).map(([valor, rotulo]) => (
              <button
                key={valor}
                role="tab"
                aria-selected={aba === valor}
                onClick={() => setAba(valor as "dados" | "agenda")}
                className={cn(
                  "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  aba === valor
                    ? "border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                {valor === "agenda" && <CalendarClock className="mr-1.5 inline h-4 w-4" />}
                {rotulo}
              </button>
            ))}
          </div>

          {aba === "dados" ? (
            <dl>
              <Linha rotulo="Perfil">
                {PERFIS[ficha.role] ?? ficha.role} · {ficha.ativo ? "Ativo" : "Inativo"}
              </Linha>
              <Linha rotulo="Aniversário">
                {ficha.dataNascimento ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {dataBR(ficha.dataNascimento)}
                    {ficha.idade != null && <span className="text-gray-500 dark:text-gray-400">({ficha.idade} anos)</span>}
                    {aniversarioHoje && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 text-xs text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                        <Cake className="h-3 w-3" /> Aniversário hoje
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400">Não informado</span>
                )}
              </Linha>
              {!restrito && (<>
              <Linha rotulo="Telefone">
                {ficha.telefone ? (
                  <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" />{ficha.telefone}</span>
                ) : <span className="text-gray-400">Não informado</span>}
              </Linha>
              <Linha rotulo="WhatsApp">
                {ficha.whatsapp ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {ficha.whatsapp}
                    {zap && (
                      <a href={zap} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline dark:text-green-400">
                        <MessageCircle className="h-3.5 w-3.5" /> Abrir conversa
                      </a>
                    )}
                  </span>
                ) : <span className="text-gray-400">Não informado</span>}
              </Linha>
              <Linha rotulo="E-mail">
                {ficha.email ? (
                  <span className="inline-flex items-center gap-1.5 break-all"><Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />{ficha.email}</span>
                ) : <span className="text-gray-400">Não informado</span>}
              </Linha>
              </>)}
              {ficha.cliente && (
                <>
                  <Linha rotulo="Atendimentos">{ficha.cliente.totalAgendamentos} · total gasto {moeda(ficha.cliente.totalGasto)}</Linha>
                  <Linha rotulo="Última visita">{ficha.cliente.ultimaVisita ? dataHoraBR(ficha.cliente.ultimaVisita) : "—"}</Linha>
                  {ficha.cliente.noShows > 0 && <Linha rotulo="Faltas">{ficha.cliente.noShows}</Linha>}
                  {ficha.cliente.observacoes && <Linha rotulo="Observações">{ficha.cliente.observacoes}</Linha>}
                </>
              )}
              {ficha.profissional && (
                <>
                  <Linha rotulo="Especialidade">{ficha.profissional.especialidade || "—"}</Linha>
                  <Linha rotulo="Serviços">
                    {ficha.profissional.servicos.length > 0 ? ficha.profissional.servicos.join(", ") : "Nenhum serviço nesta unidade"}
                  </Linha>
                  {ficha.profissional.valorComissao != null && (
                    <Linha rotulo="Comissão">
                      {ficha.profissional.tipoComissao === "FIXO"
                        ? moeda(ficha.profissional.valorComissao)
                        : `${ficha.profissional.valorComissao}%`}
                    </Linha>
                  )}
                </>
              )}
              {!restrito && (
                <>
                  <Linha rotulo="Criado em">{dataHoraBR(ficha.criadoEm)}</Linha>
                  <Linha rotulo="Último login">{ficha.ultimoLogin ? dataHoraBR(ficha.ultimoLogin) : "Nunca entrou"}</Linha>
                </>
              )}
            </dl>
          ) : ficha.agenda ? (
            <div className="max-h-[60vh] space-y-5 overflow-y-auto">
              {/* O profissional vê na ficha do cliente só os atendimentos com ele */}
              <ListaAgenda
                titulo={restrito ? "Próximos com você" : "Próximos"}
                itens={ficha.agenda.proximos}
                vazio={restrito ? "Nenhum agendamento futuro com você." : "Nenhum agendamento futuro nesta unidade."}
                rotuloCom={rotuloCom}
              />
              <ListaAgenda
                titulo={restrito ? "Anteriores com você" : "Anteriores"}
                itens={ficha.agenda.anteriores}
                vazio={restrito ? "Nenhum atendimento anterior com você." : "Nenhum agendamento anterior nesta unidade."}
                rotuloCom={rotuloCom}
              />
            </div>
          ) : null}

          {onEditar && (
            <div className="flex justify-end border-t pt-3 dark:border-gray-700">
              <button
                onClick={onEditar}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                {rotuloEditar}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
