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
  selectUnit: (unitId: string | null) => void;

  // Permissions
  canViewAllUnits: boolean;
  canChangeUnit: boolean;

  // Loading state
  isLoading: boolean;
}

// ===== Context =====
const UnitContext = createContext<UnitContextType | undefined>(undefined);

// ===== Mock units - replace with API call =====
const MOCK_UNITS: UnitOption[] = [
  { id: "1", name: "Belezza Centro", color: "#8B5CF6", isHeadquarters: true },
  { id: "2", name: "Belezza Jardins", color: "#10B981" },
  { id: "3", name: "Belezza Moema", color: "#F59E0B" },
];

// ===== Storage key =====
const SELECTED_UNIT_KEY = "salon_selected_unit";

// ===== Provider =====
interface UnitProviderProps {
  children: ReactNode;
}

export function UnitProvider({ children }: UnitProviderProps) {
  const { user, isAuthenticated, isRole } = useSalonAuth();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [availableUnits, setAvailableUnits] = useState<UnitOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    // Simulate API call
    setIsLoading(true);

    // TODO: Replace with actual API call
    // const units = await unitService.access.getUserUnits(user.id);

    setTimeout(() => {
      if (canViewAllUnits) {
        // Admin can see all units
        setAvailableUnits(MOCK_UNITS);
      } else if (user.unitId) {
        // Other roles see only their assigned unit
        const userUnit = MOCK_UNITS.find(u => u.id === user.unitId);
        setAvailableUnits(userUnit ? [userUnit] : []);
      } else if (user.unitIds && user.unitIds.length > 0) {
        // Multiple units assigned
        const userUnits = MOCK_UNITS.filter(u => user.unitIds?.includes(u.id));
        setAvailableUnits(userUnits);
      } else {
        setAvailableUnits([]);
      }

      // Restore previously selected unit from localStorage
      const savedUnitId = localStorage.getItem(SELECTED_UNIT_KEY);

      if (canViewAllUnits) {
        // Admin: restore saved selection or select all (null)
        if (savedUnitId && MOCK_UNITS.some(u => u.id === savedUnitId)) {
          setSelectedUnitId(savedUnitId);
        } else {
          setSelectedUnitId(null); // null = all units
        }
      } else {
        // Non-admin: set to their unit
        setSelectedUnitId(user.unitId || null);
      }

      setIsLoading(false);
    }, 100);
  }, [isAuthenticated, user, canViewAllUnits]);

  // Select unit
  const selectUnit = useCallback((unitId: string | null) => {
    if (!canChangeUnit && unitId !== user?.unitId) {
      // Non-admin can't change to another unit
      return;
    }

    setSelectedUnitId(unitId);

    if (unitId) {
      localStorage.setItem(SELECTED_UNIT_KEY, unitId);
    } else {
      localStorage.removeItem(SELECTED_UNIT_KEY);
    }
  }, [canChangeUnit, user?.unitId]);

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
