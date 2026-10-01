"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Building2 } from "lucide-react";
import { clientService, type UnidadeDoCliente } from "@/services/salon/clientService";

/** O modal chama salvar() junto com o "Salvar Alterações" (e Cancelar descarta a escolha). */
export interface VinculoUnidadesClienteRef {
  salvar: () => Promise<void>;
}

/**
 * Salões/barbearias (unidades do mesmo estabelecimento) a que o cliente está vinculado. Só o
 * administrador e a recepção usam — o backend também restringe. A unidade atual fica sempre
 * marcada: para tirar o cliente dela, use Excluir.
 */
export const VinculoUnidadesCliente = forwardRef<VinculoUnidadesClienteRef, { clientId: string }>(
  function VinculoUnidadesCliente({ clientId }, ref) {
    const [unidades, setUnidades] = useState<UnidadeDoCliente[]>([]);
    const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
      let ativo = true;
      setCarregando(true);
      setErro(null);
      clientService
        .units(clientId)
        .then((lista) => {
          if (!ativo) return;
          setUnidades(lista);
          setMarcadas(new Set(lista.filter((u) => u.vinculado).map((u) => u.id)));
        })
        .catch(() => {
          if (ativo) setErro("Não foi possível carregar as unidades");
        })
        .finally(() => {
          if (ativo) setCarregando(false);
        });
      return () => {
        ativo = false;
      };
    }, [clientId]);

    useImperativeHandle(
      ref,
      () => ({
        salvar: async () => {
          const antes = unidades.filter((u) => u.vinculado).map((u) => u.id).sort().join(",");
          const depois = [...marcadas].sort().join(",");
          if (unidades.length === 0 || antes === depois) return;
          await clientService.setUnits(clientId, [...marcadas]);
        },
      }),
      [clientId, unidades, marcadas]
    );

    // Uma unidade só: não há o que vincular
    if (!carregando && !erro && unidades.length <= 1) return null;

    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Salões / barbearias vinculados
        </label>
        <div className="space-y-1 rounded-lg border border-gray-300 p-3 dark:border-gray-600">
          {carregando ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando unidades...</p>
          ) : erro ? (
            <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
          ) : (
            unidades.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <input
                  type="checkbox"
                  checked={marcadas.has(u.id)}
                  disabled={u.atual}
                  onChange={(e) => {
                    const novas = new Set(marcadas);
                    if (e.target.checked) novas.add(u.id);
                    else novas.delete(u.id);
                    setMarcadas(novas);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500 disabled:opacity-60"
                />
                <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <span className="text-sm text-gray-800 dark:text-gray-200">{u.nome}</span>
                {u.atual && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    Unidade atual
                  </span>
                )}
              </label>
            ))
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          O cliente passa a ser atendido e a agendar nas unidades marcadas. Histórico, pontos e
          observações são de cada unidade.
        </p>
      </div>
    );
  }
);
