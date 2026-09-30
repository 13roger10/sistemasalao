"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ApiException, type AgendamentoAfetado } from "@/services/salon/api";

/** Erro do backend pedindo a escolha sobre agendamentos marcados (BUG-033). */
export function agendamentosAfetadosDoErro(error: unknown): AgendamentoAfetado[] | null {
  return error instanceof ApiException && error.code === "AGENDAMENTOS_AFETADOS"
    ? error.agendamentosAfetados ?? []
    : null;
}

interface AgendamentosAfetadosModalProps {
  isOpen: boolean;
  /** O que está sendo feito, ex.: "Desativar o profissional Carlos". */
  titulo: string;
  afetados: AgendamentoAfetado[];
  isLoading?: boolean;
  onEscolher: (acao: "cancelar" | "manter") => void;
  onClose: () => void;
}

const formatarData = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

/**
 * Ausência ou desativação que atinge agendamentos marcados: mostra quem será afetado e deixa a
 * equipe escolher entre cancelar avisando os clientes ou manter para remanejar um a um.
 */
export function AgendamentosAfetadosModal({
  isOpen, titulo, afetados, isLoading = false, onEscolher, onClose,
}: AgendamentosAfetadosModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titulo}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Voltar
          </Button>
          <Button variant="outline" onClick={() => onEscolher("manter")} disabled={isLoading}>
            Manter e remanejar
          </Button>
          <Button variant="danger" onClick={() => onEscolher("cancelar")} isLoading={isLoading}>
            Cancelar e avisar clientes
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {afetados.length === 1 ? "Há 1 agendamento marcado" : `Há ${afetados.length} agendamentos marcados`} que
        {afetados.length === 1 ? " será atingido" : " serão atingidos"}. Você pode cancelá-los — os clientes
        recebem o aviso para reagendar — ou mantê-los e remanejar cada um pela agenda.
      </p>
      <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
        {afetados.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{a.clienteNome ?? "Cliente"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {a.servicos.join(", ")}
                {a.profissionalNome ? ` · ${a.profissionalNome}` : ""}
                {a.clienteTelefone ? ` · ${a.clienteTelefone}` : ""}
              </p>
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatarData(a.dataHora)}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
