"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, QrCode, CreditCard, Plus, Trash2, Split } from "lucide-react";

// Formulário de pagamento de um atendimento, usado pelas telas que registram pagamento
// (recepção, caixa). Regras (as mesmas do backend):
//  - uma forma só: o valor é o total do atendimento; em dinheiro, informa-se o valor recebido
//    e o troco é calculado;
//  - pagamento dividido: várias formas cuja soma precisa fechar exatamente o total.
// O componente não envia nada: devolve as partes em onChange e o pai decide quando enviar
// (POST /api/pagamentos com { agendamentoId, partes }).

export const FORMAS_PAGAMENTO = [
  { value: "DINHEIRO", label: "Dinheiro", icon: Banknote },
  { value: "PIX", label: "PIX", icon: QrCode },
  { value: "CARTAO_CREDITO", label: "Cartão de Crédito", icon: CreditCard },
  { value: "CARTAO_DEBITO", label: "Cartão de Débito", icon: CreditCard },
] as const;

export interface PartePagamento {
  forma: string;
  valor: number;
  valorRecebido?: number;
}

export interface PagamentoFormState {
  partes: PartePagamento[];
  valido: boolean;
  troco: number;
}

interface LinhaDividida {
  forma: string;
  valor: string;
  recebido: string;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Valor digitado em reais (aceita vírgula), arredondado a centavos; NaN se vazio/inválido. */
const lerValor = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? NaN : Math.round(n * 100) / 100;
};

const centavos = (v: number) => Math.round(v * 100);

const ACCENT = {
  emerald: {
    selected: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
    icon: "text-emerald-500",
    link: "text-emerald-600 hover:text-emerald-700",
    focus: "focus:border-emerald-500",
  },
  violet: {
    selected: "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300",
    icon: "text-violet-500",
    link: "text-violet-600 hover:text-violet-700",
    focus: "focus:border-violet-500",
  },
};

const inputBase =
  "w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white";

function CampoReais({
  label,
  value,
  onChange,
  focus,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  focus: string;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-2 text-sm text-gray-500">R$</span>
        <input
          id={id}
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          placeholder="0,00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} ${focus}`}
        />
      </div>
    </div>
  );
}

export function PagamentoForm({
  total,
  onChange,
  accent = "emerald",
}: {
  /** Valor do atendimento a pagar (o que falta, se já houve pagamento parcial). */
  total: number;
  onChange: (estado: PagamentoFormState) => void;
  accent?: keyof typeof ACCENT;
}) {
  const cor = ACCENT[accent];
  const [dividir, setDividir] = useState(false);
  const [forma, setForma] = useState("");
  const [recebido, setRecebido] = useState("");
  const [linhas, setLinhas] = useState<LinhaDividida[]>([
    { forma: "PIX", valor: "", recebido: "" },
    { forma: "DINHEIRO", valor: "", recebido: "" },
  ]);

  const estado = useMemo((): PagamentoFormState & { aviso?: string; restante?: number } => {
    if (!dividir) {
      if (!forma) return { partes: [], valido: false, troco: 0 };
      const rec = lerValor(recebido);
      if (forma === "DINHEIRO" && !isNaN(rec)) {
        if (centavos(rec) < centavos(total)) {
          return { partes: [], valido: false, troco: 0, aviso: `O valor recebido é menor que o total (${brl(total)}).` };
        }
        return { partes: [{ forma, valor: total, valorRecebido: rec }], valido: true, troco: rec - total };
      }
      return { partes: [{ forma, valor: total }], valido: true, troco: 0 };
    }

    const partes: PartePagamento[] = [];
    let troco = 0;
    for (const l of linhas) {
      const v = lerValor(l.valor);
      if (!l.forma || isNaN(v) || v <= 0) return { partes: [], valido: false, troco: 0, aviso: "Preencha forma e valor de cada parte." };
      const rec = lerValor(l.recebido);
      if (l.forma === "DINHEIRO" && !isNaN(rec)) {
        if (centavos(rec) < centavos(v)) {
          return { partes: [], valido: false, troco: 0, aviso: "O valor recebido em dinheiro é menor que a parte em dinheiro." };
        }
        troco += rec - v;
        partes.push({ forma: l.forma, valor: v, valorRecebido: rec });
      } else {
        partes.push({ forma: l.forma, valor: v });
      }
    }
    const restante = (centavos(total) - partes.reduce((s, p) => s + centavos(p.valor), 0)) / 100;
    if (restante !== 0) {
      return {
        partes: [],
        valido: false,
        troco: 0,
        restante,
        aviso: restante > 0 ? `Falta ${brl(restante)} para fechar o total.` : `As partes passam do total em ${brl(-restante)}.`,
      };
    }
    return { partes, valido: true, troco, restante: 0 };
  }, [dividir, forma, recebido, linhas, total]);

  const chave = JSON.stringify([estado.partes, estado.valido, estado.troco]);
  useEffect(() => {
    onChange({ partes: estado.partes, valido: estado.valido, troco: estado.troco });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const setLinha = (i: number, campo: keyof LinhaDividida, valor: string) =>
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
        <span className="text-sm text-gray-600 dark:text-gray-300">Valor a pagar</span>
        <span className="text-lg font-bold text-gray-900 tabular-nums dark:text-white">{brl(total)}</span>
      </div>

      {!dividir ? (
        <>
          <div>
            <p className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Forma de pagamento <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS_PAGAMENTO.map((f) => {
                const Icon = f.icon;
                const ativo = forma === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setForma(f.value)}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all ${
                      ativo ? cor.selected : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${ativo ? cor.icon : "text-gray-400"}`} />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {forma === "DINHEIRO" && (
            <div className="grid grid-cols-2 items-end gap-3">
              <CampoReais id="pag-recebido" label="Valor recebido (opcional)" value={recebido} onChange={setRecebido} focus={cor.focus} />
              <div className="pb-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Troco: </span>
                <span className="font-semibold text-gray-900 tabular-nums dark:text-white">{brl(estado.troco)}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {linhas.map((l, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor={`parte-forma-${i}`} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Forma
                  </label>
                  <select
                    id={`parte-forma-${i}`}
                    value={l.forma}
                    onChange={(e) => setLinha(i, "forma", e.target.value)}
                    className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${cor.focus}`}
                  >
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <CampoReais id={`parte-valor-${i}`} label="Valor" value={l.valor} onChange={(v) => setLinha(i, "valor", v)} focus={cor.focus} />
                </div>
                {linhas.length > 2 && (
                  <button
                    type="button"
                    aria-label="Remover parte"
                    onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}
                    className="mb-0.5 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {l.forma === "DINHEIRO" && (
                <div className="mt-2">
                  <CampoReais
                    id={`parte-recebido-${i}`}
                    label="Valor recebido em dinheiro (opcional)"
                    value={l.recebido}
                    onChange={(v) => setLinha(i, "recebido", v)}
                    focus={cor.focus}
                  />
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLinhas((ls) => [...ls, { forma: "CARTAO_DEBITO", valor: "", recebido: "" }])}
            className={`flex items-center gap-1.5 text-sm font-medium ${cor.link}`}
          >
            <Plus className="h-4 w-4" /> Adicionar forma
          </button>
          {estado.troco > 0 && (
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Troco: <span className="font-semibold tabular-nums">{brl(estado.troco)}</span>
            </p>
          )}
        </div>
      )}

      {estado.aviso && <p className="text-xs text-amber-600 dark:text-amber-400">{estado.aviso}</p>}

      <button
        type="button"
        onClick={() => setDividir((d) => !d)}
        className={`flex items-center gap-1.5 text-sm font-medium ${cor.link}`}
      >
        <Split className="h-4 w-4" />
        {dividir ? "Pagar com uma forma só" : "Dividir pagamento em mais de uma forma"}
      </button>
    </div>
  );
}
