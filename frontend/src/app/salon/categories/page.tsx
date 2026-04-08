"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Users,
  Filter,
  ChevronRight,
  Briefcase,
  LayoutGrid,
  List,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSalonAuth } from "@/contexts/SalonAuthContext";
import { professionalService } from "@/services/salon/professionalService";
import {
  CategoryBadge,
  CategoryCard,
  CategoryIcon,
  categoryConfig,
} from "@/components/professional/CategoryBadge";
import { LevelBadge, LevelStars, levelConfig } from "@/components/professional/LevelBadge";
import type {
  Professional,
  ProfessionalCategory,
  ProfessionalLevel,
  CategoryInfo,
  LevelInfo,
} from "@/types/salon";

// Card de estatísticas
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
        <p className="text-xl font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  </div>
);

// Card de profissional compacto
const ProfessionalCompactCard = ({
  professional,
}: {
  professional: Professional;
}) => (
  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      {professional.avatar ? (
        <img
          src={professional.avatar}
          alt={professional.name}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <span className="text-sm font-medium">
          {professional.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 dark:text-white truncate">
        {professional.name}
      </p>
      <div className="flex items-center gap-2 mt-0.5">
        {professional.level && (
          <LevelBadge level={professional.level} size="sm" showIcon={false} />
        )}
        {professional.specializations && (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {professional.specializations}
          </span>
        )}
      </div>
    </div>
    <ChevronRight className="h-4 w-4 text-gray-400" />
  </div>
);

export default function CategoriesPage() {
  const { user } = useSalonAuth();

  // Estados
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<ProfessionalCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [categoriesData, levelsData, professionalsData] = await Promise.all(
        [
          professionalService.getCategories(),
          professionalService.getLevels(),
          professionalService.getAll({ salonId: 1 }),
        ]
      );
      setCategories(categoriesData);
      setLevels(levelsData);
      setProfessionals(professionalsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Contar profissionais por categoria
  const countByCategory = (category: ProfessionalCategory) => {
    return professionals.filter((p) => p.category === category).length;
  };

  // Contar profissionais por nível
  const countByLevel = (level: ProfessionalLevel) => {
    return professionals.filter((p) => p.level === level).length;
  };

  // Filtrar profissionais
  const filteredProfessionals = professionals.filter((p) => {
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.specializations?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Agrupar por categoria
  const groupedByCategory = Object.keys(categoryConfig).reduce(
    (acc, cat) => {
      const category = cat as ProfessionalCategory;
      acc[category] = filteredProfessionals.filter(
        (p) => p.category === category
      );
      return acc;
    },
    {} as Record<ProfessionalCategory, Professional[]>
  );

  // Categorias ativas (com profissionais)
  const activeCategories = Object.entries(groupedByCategory)
    .filter(([_, profs]) => profs.length > 0)
    .map(([cat, _]) => cat as ProfessionalCategory);

  return (
    <SalonLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Categorias de Profissionais
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerencie e visualize profissionais por categoria
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "primary" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "primary" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<Users className="h-5 w-5 text-blue-600" />}
            label="Total de Profissionais"
            value={professionals.length}
            color="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatsCard
            icon={<Briefcase className="h-5 w-5 text-purple-600" />}
            label="Categorias Ativas"
            value={activeCategories.length}
            color="bg-purple-100 dark:bg-purple-900/30"
          />
          <StatsCard
            icon={<Users className="h-5 w-5 text-green-600" />}
            label="Profissionais Ativos"
            value={professionals.filter((p) => p.status === "active").length}
            color="bg-green-100 dark:bg-green-900/30"
          />
          <StatsCard
            icon={<Filter className="h-5 w-5 text-orange-600" />}
            label="Níveis Disponíveis"
            value={levels.length}
            color="bg-orange-100 dark:bg-orange-900/30"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar profissional..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Todas
            </Button>
            {activeCategories.slice(0, 5).map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                <CategoryBadge
                  category={cat}
                  size="sm"
                  showLabel={false}
                  className="mr-1"
                />
                {categoryConfig[cat].label}
              </Button>
            ))}
            {activeCategories.length > 5 && (
              <Button variant="outline" size="sm">
                +{activeCategories.length - 5}
              </Button>
            )}
          </div>
        </div>

        {/* Conteúdo Principal */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : viewMode === "grid" ? (
          /* Visualização em Grid - Cards de Categoria */
          <div className="space-y-6">
            {/* Cards de categoria */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(categoryConfig).map(([cat, config]) => {
                const category = cat as ProfessionalCategory;
                const count = countByCategory(category);
                if (count === 0 && selectedCategory !== null) return null;
                return (
                  <CategoryCard
                    key={cat}
                    category={category}
                    count={count}
                    selected={selectedCategory === category}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === category ? null : category
                      )
                    }
                  />
                );
              })}
            </div>

            {/* Profissionais da categoria selecionada */}
            {selectedCategory && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex items-center gap-2">
                  <CategoryIcon category={selectedCategory} size="md" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {categoryConfig[selectedCategory].label}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({groupedByCategory[selectedCategory].length} profissionais)
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupedByCategory[selectedCategory].map((prof) => (
                    <ProfessionalCompactCard key={prof.id} professional={prof} />
                  ))}
                  {groupedByCategory[selectedCategory].length === 0 && (
                    <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
                      Nenhum profissional nesta categoria
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Visualização em Lista */
          <div className="space-y-4">
            {Object.entries(groupedByCategory)
              .filter(([_, profs]) => profs.length > 0)
              .map(([cat, profs]) => {
                const category = cat as ProfessionalCategory;
                return (
                  <div
                    key={cat}
                    className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
                      <CategoryIcon category={category} size="md" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {categoryConfig[category].label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {profs.length} profissionais
                        </p>
                      </div>
                      <CategoryBadge category={category} size="sm" />
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {profs.map((prof) => (
                        <div
                          key={prof.id}
                          className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {prof.avatar ? (
                              <img
                                src={prof.avatar}
                                alt={prof.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium">
                                {prof.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {prof.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {prof.email}
                            </p>
                          </div>
                          {prof.level && (
                            <LevelBadge level={prof.level} size="sm" />
                          )}
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              prof.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {prof.status === "active" ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Seção de Níveis */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Níveis de Experiência
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(levelConfig).map(([lvl, config]) => {
              const level = lvl as ProfessionalLevel;
              const count = countByLevel(level);
              return (
                <div
                  key={lvl}
                  className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor}`}
                >
                  <div className="flex items-center justify-between">
                    <LevelBadge level={level} showStars />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {count}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    profissionais
                  </p>
                  <div className="mt-2">
                    <LevelStars level={level} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SalonLayout>
  );
}
