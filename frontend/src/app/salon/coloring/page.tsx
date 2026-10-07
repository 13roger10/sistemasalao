"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Palette,
  User,
  Calendar,
  Eye,
  Plus,
  Droplets,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { coloringService } from "@/services/salon/coloringService";
import type { ColoringProfile, SkinToneLabels, SkinUndertoneLabels } from "@/types/salon/coloring";

// Client Card with Coloring Info
const ClientColoringCard = ({
  profile,
  onClick,
}: {
  profile: ColoringProfile;
  onClick: () => void;
}) => {
  const skinToneLabels: Record<string, string> = {
    MUITO_CLARO: 'Muito Claro',
    CLARO: 'Claro',
    MEDIO: 'Médio',
    MORENO_CLARO: 'Moreno Claro',
    MORENO: 'Moreno',
    MORENO_ESCURO: 'Moreno Escuro',
    NEGRO: 'Negro',
  };

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
            <User className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{profile.clienteNome}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.clienteEmail}</p>
          </div>
        </div>
        {profile.temAlergia && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            Alergia
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-300">
            Tom: {profile.tomPele ? skinToneLabels[profile.tomPele] : 'Não informado'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-300">
            Cor atual: {profile.corAtual || 'Não informado'}
          </span>
        </div>
      </div>

      {profile.ultimaQuimica && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          Última química: {new Date(profile.ultimaQuimica).toLocaleDateString('pt-BR')}
        </div>
      )}
    </div>
  );
};

// Stats Card
const StatsCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-3">
      <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

export default function ColoringPage() {
  const { user } = useSalonAuth();

  // States
  const [profiles, setProfiles] = useState<ColoringProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalFichas: 0,
    comAlergia: 0,
    comQuimica: 0,
  });

  // Load profiles
  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await coloringService.profile.list();
      setProfiles(data);
      setStats({
        totalFichas: data.length,
        comAlergia: data.filter(p => p.temAlergia).length,
        comQuimica: data.filter(p => p.temQuimica).length,
      });
    } catch (error) {
      console.error("Erro ao carregar fichas:", error);
      setProfiles([]);
      setLoadError("Não foi possível carregar as fichas de coloração.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Filter profiles
  const filteredProfiles = profiles.filter(
    p => (p.clienteNome ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
         (p.clienteEmail ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SalonLayout requiredRole={["ADMIN", "PROFESSIONAL"]} pageTitle="Coloração">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Consultoria de Coloração</h1>
            <p className="text-gray-500 dark:text-gray-400">Fichas de coloração e histórico dos clientes</p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Nova Ficha
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsCard
            icon={<Palette className="h-5 w-5 text-violet-500" />}
            label="Total de Fichas"
            value={stats.totalFichas}
            color="bg-violet-100 dark:bg-violet-900/30"
          />
          <StatsCard
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
            label="Com Alergia"
            value={stats.comAlergia}
            color="bg-red-100 dark:bg-red-900/30"
          />
          <StatsCard
            icon={<Sparkles className="h-5 w-5 text-amber-500" />}
            label="Com Química"
            value={stats.comQuimica}
            color="bg-amber-100 dark:bg-amber-900/30"
          />
        </div>

        {/* Search */}
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Buscar cliente por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {loadError}
          </div>
        )}

        {/* Profiles Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-gray-700 dark:bg-gray-800/50">
            <Palette className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? "Nenhum cliente encontrado" : "Nenhuma ficha cadastrada"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm
                ? "Tente buscar com outros termos"
                : "Crie a primeira ficha de coloração para um cliente"}
            </p>
            {!searchTerm && (
              <Button leftIcon={<Plus className="h-4 w-4" />}>
                Criar Ficha
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <Link href={`/salon/coloring/${profile.clienteId}`} key={profile.id}>
                <ClientColoringCard
                  profile={profile}
                  onClick={() => {}}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </SalonLayout>
  );
}
