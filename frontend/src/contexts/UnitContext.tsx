"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useSalonAuth } from "./SalonAuthContext";
import { unitService } from "@/services/salon/unitService";
import { entrarNaUnidade } from "@/lib/session-refresh";
import { salaoDoToken, salaoAtual } from "@/lib/salao-atual";
import { api as salonApi } from "@/services/salon/api";

// ===== Types =====
interface UnitOption {
  id: string;
  name: string;
  color?: string;
  isHeadquarters?: boolean;
}

interface UnitContextType {
  // Current selected unit
  selectedUnit: UnitOption | null;
  selectedUnitId: string | null;

  // Available units for selection
  availableUnits: UnitOption[];

  // Actions
  selectUnit: (unitId: string) => Promise<void>;
  /** Recarrega a lista (depois de criar, renomear, ativar ou desativar uma unidade) */
  reloadUnits: () => void;

  // Permissions
  canViewAllUnits: boolean;
  canChangeUnit: boolean;

  /** Nome do salão/barbearia em que o usuário está (exibido no topo) */
  salonName: string | null;

  // Loading state
  isLoading: boolean;
}

// ===== Context =====
const UnitContext = createContext<UnitContextType | undefined>(undefined);

// ===== Storage key =====
const SELECTED_UNIT_KEY = "salon_selected_unit";

// ===== Provider =====
interface UnitProviderProps {
  children: ReactNode;
}

export function UnitProvider({ children }: UnitProviderProps) {
  const { user, isAuthenticated, isRole, token } = useSalonAuth();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [availableUnits, setAvailableUnits] = useState<UnitOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [versao, setVersao] = useState(0);
  const reloadUnits = useCallback(() => setVersao((v) => v + 1), []);
  const [nomeDoSalao, setNomeDoSalao] = useState<string | null>(null);

  // Check permissions
  const canViewAllUnits = isRole("ADMIN");
  // Cliente e equipe trocam de unidade só quando estão vinculados a mais de uma
  const canChangeUnit = isRole("ADMIN") || availableUnits.length > 1;

  // Load available units based on user role
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setAvailableUnits([]);
      setSelectedUnitId(null);
      setNomeDoSalao(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (canViewAllUnits) {
      // Admin: as unidades dele (cada uma é um salão). A selecionada é a do token — a "atual" que
      // o backend devolve —, não a salva no navegador: é ela que vale em todas as telas.
      let cancelled = false;
      unitService
        .list()
        .then((unidades) => {
          if (cancelled) return;
          const ativas: UnitOption[] = unidades
            .filter((u) => u.ativo)
            .map((u) => ({ id: String(u.id), name: u.nome, isHeadquarters: u.sede }));
          setAvailableUnits(ativas);

          const atual = unidades.find((u) => u.atual);
          const unitId = atual ? String(atual.id) : null;
          if (unitId) localStorage.setItem(SELECTED_UNIT_KEY, unitId);
          else localStorage.removeItem(SELECTED_UNIT_KEY);
          setSelectedUnitId(unitId);
        })
        .catch(() => {
          if (cancelled) return;
          localStorage.removeItem(SELECTED_UNIT_KEY);
          setAvailableUnits([]);
          setSelectedUnitId(null);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    // Cliente: o token não traz salão (ele pode ser cliente de várias unidades). Antes o agendamento
    // caía no salão 1: o cliente cadastrado numa unidade agendava na sede e ficava vinculado a ela.
    // Agora vale a unidade em que ele é cliente — a escolhida nesta sessão ou a do vínculo mais recente.
    if (isRole("CLIENT")) {
      let cancelado = false;
      salonApi
        .get<{ id: number; nome: string }[]>("/clientes/meus-saloes")
        .then((saloes) => {
          if (cancelado) return;
          if (saloes.length === 0) {
            // Ainda sem cadastro em nenhum salão (ex.: conta criada pelo agendamento público)
            setAvailableUnits([]);
            setSelectedUnitId(null);
            return salonApi
              .get<{ id: number; nome: string }>(`/salons/${salaoAtual()}`)
              .then((s) => { if (!cancelado) setNomeDoSalao(s.nome); });
          }
          const opcoes = saloes.map((s) => ({ id: String(s.id), name: s.nome }));
          const salva = localStorage.getItem(SELECTED_UNIT_KEY);
          const escolhida = opcoes.find((o) => o.id === salva) ?? opcoes[0];
          localStorage.setItem(SELECTED_UNIT_KEY, escolhida.id);
          setAvailableUnits(opcoes);
          setSelectedUnitId(escolhida.id);
          setNomeDoSalao(escolhida.name);
        })
        .catch(() => {
          if (!cancelado) setNomeDoSalao(null);
        })
        .finally(() => {
          if (!cancelado) setIsLoading(false);
        });
      return () => {
        cancelado = true;
      };
    }

    // Demais perfis (recepção, profissional): o salão vem do próprio login. O usuário
    // salvo não traz unitId, então antes a recepcionista ficava sem salão (e as telas usavam o
    // salão 1 fixo); o salão está no token de acesso (claim "salonId"), o mesmo que o backend usa.
    const unidade = user.unitId || salaoDoToken(token);
    setAvailableUnits(unidade ? [{ id: unidade, name: "Meu salão", isHeadquarters: true }] : []);
    setSelectedUnitId(unidade || null);
    setIsLoading(false);

    // Unidades em que o profissional/recepcionista trabalha (pode ser mais de uma do mesmo dono):
    // dão o nome no topo e, se houver mais de uma, o seletor para trocar de unidade
    let cancelado = false;
    salonApi
      .get<{ id: number; nome: string; atual: boolean }[]>("/equipe/unidades/minhas")
      .then((lista) => {
        if (cancelado) return;
        const atual = lista.find((u) => String(u.id) === unidade) ?? lista.find((u) => u.atual);
        if (lista.length > 0) setAvailableUnits(lista.map((u) => ({ id: String(u.id), name: u.nome })));
        if (atual) {
          setNomeDoSalao(atual.nome);
          return;
        }
        // Sem lista (ex.: vínculo ainda não carregado): o nome do salão do token
        return salonApi
          .get<{ id: number; nome: string }>(`/salons/${unidade || salaoAtual()}`)
          .then((s) => { if (!cancelado) setNomeDoSalao(s.nome); });
      })
      .catch(() => {
        if (!cancelado) setNomeDoSalao(null);
      });
    return () => {
      cancelado = true;
    };
  }, [isAuthenticated, user, canViewAllUnits, token, versao]);

  // Trocar de unidade (só o admin): o backend emite uma sessão nova com o salão da unidade e a
  // página recarrega, para todas as telas, notificações e WebSocket passarem a usar a unidade nova.
  // Lança erro com a mensagem do backend (ex.: unidade desativada).
  const selectUnit = useCallback(async (unitId: string) => {
    if (!canChangeUnit || unitId === selectedUnitId) return;
    if (canViewAllUnits) {
      await entrarNaUnidade(unitId);
    } else if (isRole("PROFESSIONAL") || isRole("RECEPCIONIST")) {
      // Equipe: o backend confere o vínculo e devolve a sessão da unidade
      await entrarNaUnidade(unitId, "equipe");
    } else {
      // Cliente: o salão não vai no token; a escolha vale para esta sessão (apagada ao sair)
      if (!availableUnits.some((u) => u.id === unitId)) return;
      localStorage.setItem(SELECTED_UNIT_KEY, unitId);
    }
    window.location.reload();
  }, [canChangeUnit, canViewAllUnits, availableUnits, selectedUnitId, isRole]);

  // Get selected unit object
  const selectedUnit = selectedUnitId
    ? availableUnits.find(u => u.id === selectedUnitId) || null
    : null;
  const salonName = canViewAllUnits ? selectedUnit?.name ?? null : nomeDoSalao;

  return (
    <UnitContext.Provider
      value={{
        selectedUnit,
        selectedUnitId,
        availableUnits,
        selectUnit,
        reloadUnits,
        canViewAllUnits,
        canChangeUnit,
        salonName,
        isLoading,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
}

// ===== Hook =====
export function useUnit() {
  const context = useContext(UnitContext);

  if (context === undefined) {
    throw new Error("useUnit must be used within a UnitProvider");
  }

  return context;
}

// ===== Helper component to filter data by unit =====
interface UnitFilterProps {
  children: (unitId: string | null) => ReactNode;
}

export function UnitFilter({ children }: UnitFilterProps) {
  const { selectedUnitId } = useUnit();
  return <>{children(selectedUnitId)}</>;
}
