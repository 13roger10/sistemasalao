"use client";

import { useEffect, useState } from "react";
import { Cake, Mail, MessageCircle, Phone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { Aniversariante } from "@/services/salon/clientService";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Link do WhatsApp com a mensagem de parabéns (número brasileiro sem DDI ganha o 55). */
function linkParabens(pessoa: Aniversariante, salonName?: string | null): string | null {
  const digitos = (pessoa.whatsapp || pessoa.telefone || "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  const numero = digitos.length <= 11 ? `55${digitos}` : digitos;
  const primeiroNome = pessoa.nome.split(" ")[0];
  const deQuem = salonName ? `A equipe do ${salonName.trim()}` : "Nossa equipe";
  const texto = `Olá, ${primeiroNome}! ${deQuem} deseja um feliz aniversário! Que o seu dia seja incrível.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

interface AniversariantesModalProps {
  isOpen: boolean;
  onClose: () => void;
  aniversariantes: Aniversariante[];
  carregando: boolean;
  erro?: string | null;
  salonName?: string | null;
  abaInicial?: "hoje" | "mes";
}

/** Aniversariantes do dia e do mês da unidade, com atalho para mandar parabéns pelo WhatsApp. */
export function AniversariantesModal({
  isOpen,
  onClose,
  aniversariantes,
  carregando,
  erro,
  salonName,
  abaInicial = "hoje",
}: AniversariantesModalProps) {
  const [aba, setAba] = useState<"hoje" | "mes">(abaInicial);
  useEffect(() => {
    if (isOpen) setAba(abaInicial);
  }, [isOpen, abaInicial]);

  const deHoje = aniversariantes.filter((a) => a.hoje);
  const lista = aba === "hoje" ? deHoje : aniversariantes;
  const mes = MESES[new Date().getMonth()];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aniversariantes" size="lg">
      <div className="space-y-4">
        <div role="tablist" aria-label="Período" className="flex gap-2">
          {([
            ["hoje", `Hoje (${deHoje.length})`],
            ["mes", `Em ${mes} (${aniversariantes.length})`],
          ] as const).map(([valor, rotulo]) => (
            <button
              key={valor}
              role="tab"
              aria-selected={aba === valor}
              onClick={() => setAba(valor)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                aba === valor
                  ? "bg-violet-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Carregando aniversariantes...</p>
        ) : erro ? (
          <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{erro}</p>
        ) : lista.length === 0 ? (
          <div className="py-10 text-center">
            <Cake className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {aba === "hoje" ? "Nenhum cliente faz aniversário hoje." : `Nenhum cliente faz aniversário em ${mes}.`}
            </p>
          </div>
        ) : (
          <ul className="max-h-[60vh] divide-y overflow-y-auto rounded-lg border dark:divide-gray-700 dark:border-gray-700">
            {lista.map((pessoa) => {
              const link = linkParabens(pessoa, salonName);
              return (
                <li key={pessoa.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <div
                    className={cn(
                      "flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-lg text-xs font-semibold",
                      pessoa.hoje
                        ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    )}
                    aria-label={`Dia ${pessoa.dia}`}
                  >
                    <span className="text-base leading-none">{String(pessoa.dia).padStart(2, "0")}</span>
                    <span className="mt-0.5 text-[10px] uppercase">{mes.slice(0, 3)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-gray-900 dark:text-white">
                      <span className="truncate">{pessoa.nome}</span>
                      {pessoa.hoje && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 text-xs text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                          <Cake className="h-3 w-3" /> Hoje
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Completa {pessoa.idade} anos</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {(pessoa.whatsapp || pessoa.telefone) && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {pessoa.whatsapp || pessoa.telefone}
                        </span>
                      )}
                      {pessoa.email && (
                        <span className="inline-flex items-center gap-1 break-all">
                          <Mail className="h-3 w-3" /> {pessoa.email}
                        </span>
                      )}
                    </div>
                  </div>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Enviar parabéns
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
