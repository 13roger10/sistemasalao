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
import { salaoDoToken } from "@/lib/salao-atual";

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

  // Check permissions
  const canViewAllUnits = isRole("ADMIN");
  const canChangeUnit = isRole("ADMIN");

  // Load available units based on user role
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setAvailableUnits([]);
      setSelectedUnitId(null);
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

    // Demais perfis (recepção, profissional, cliente): o salão vem do próprio login. O usuário
    // salvo não traz unitId, então antes a recepcionista ficava sem salão (e as telas usavam o
    // salão 1 fixo); o salão está no token de acesso (claim "salonId"), o mesmo que o backend usa.
    const unidade = user.unitId || salaoDoToken(token);
    setAvailableUnits(unidade ? [{ id: unidade, name: "Meu salão", isHeadquarters: true }] : []);
    setSelectedUnitId(unidade || null);
    setIsLoading(false);
  }, [isAuthenticated, user, canViewAllUnits, token, versao]);

  // Trocar de unidade (só o admin): o backend emite uma sessão nova com o salão da unidade e a
  // página recarrega, para todas as telas, notificações e WebSocket passarem a usar a unidade nova.
  // Lança erro com a mensagem do backend (ex.: unidade desativada).
  const selectUnit = useCallback(async (unitId: string) => {
    if (!canChangeUnit || unitId === selectedUnitId) return;
    await entrarNaUnidade(unitId);
    window.location.reload();
  }, [canChangeUnit, selectedUnitId]);

  // Get selected unit object
  const selectedUnit = selectedUnitId
    ? availableUnits.find(u => u.id === selectedUnitId) || null
    : null;

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
