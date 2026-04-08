"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Palette,
  Droplets,
  Calendar,
  AlertTriangle,
  Edit2,
  Plus,
  Clock,
  Star,
  Sparkles,
  Camera,
  Save,
  Lightbulb,
} from "lucide-react";
import { SalonLayout } from "@/components/layout/SalonLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { coloringService } from "@/services/salon/coloringService";
import type {
  ColoringProfile,
  ColoringHistory,
  ColoringProfileCreateInput,
  ColoringHistoryCreateInput,
  TonalitySuggestion,
  SkinTone,
  SkinUndertone,
  HairType,
  ColoringTechnique,
} from "@/types/salon/coloring";

// Tab Component
const Tabs = ({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
}) => (
  <div className="border-b border-gray-200 dark:border-gray-700">
    <nav className="-mb-px flex space-x-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "border-violet-500 text-violet-600 dark:text-violet-400"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  </div>
);

// Info Card
const InfoCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
      {icon}
      {label}
    </div>
    <p className="font-medium text-gray-900 dark:text-white">{value || "-"}</p>
  </div>
);

// History Card
const HistoryCard = ({ history }: { history: ColoringHistory }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white">{history.tecnicaNome}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(history.dataServico).toLocaleDateString('pt-BR')} • {history.profissionalNome}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < history.satisfacaoCliente
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
      {history.marcaTinta && (
        <div>
          <span className="text-gray-500 dark:text-gray-400">Marca:</span>{" "}
          <span className="text-gray-900 dark:text-white">{history.marcaTinta}</span>
        </div>
      )}
      {history.nomeCor && (
        <div>
          <span className="text-gray-500 dark:text-gray-400">Cor:</span>{" "}
          <span className="text-gray-900 dark:text-white">{history.nomeCor} {history.numeroCor}</span>
        </div>
      )}
      {history.oxidante && (
        <div>
          <span className="text-gray-500 dark:text-gray-400">Oxidante:</span>{" "}
          <span className="text-gray-900 dark:text-white">{history.oxidante}</span>
        </div>
      )}
      {history.tempoAplicacao && (
        <div>
          <span className="text-gray-500 dark:text-gray-400">Tempo:</span>{" "}
          <span className="text-gray-900 dark:text-white">{history.tempoAplicacao} min</span>
        </div>
      )}
    </div>

    {history.formulacao && (
      <div className="mb-3 rounded-lg bg-violet-50 p-2 dark:bg-violet-900/20">
        <span className="text-xs text-violet-600 dark:text-violet-400">Formulação:</span>
        <p className="text-sm text-violet-900 dark:text-violet-100">{history.formulacao}</p>
      </div>
    )}

    <div className="flex items-center gap-4">
      {history.corAntes && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Antes:</span>
          <span className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700">{history.corAntes}</span>
        </div>
      )}
      {history.corDepois && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Depois:</span>
          <span className="rounded bg-violet-100 px-2 py-1 text-xs text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{history.corDepois}</span>
        </div>
      )}
    </div>

    {history.observacoes && (
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{history.observacoes}</p>
    )}
  </div>
);

export default function ClientColoringPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  // States
  const [profile, setProfile] = useState<ColoringProfile | null>(null);
  const [history, setHistory] = useState<ColoringHistory[]>([]);
  const [suggestions, setSuggestions] = useState<TonalitySuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Mock data
        const mockProfile: ColoringProfile = {
          id: "1",
          clienteId: clientId,
          clienteNome: "Maria Silva",
          clienteEmail: "maria@email.com",
          clienteTelefone: "(11) 99999-0001",
          salonId: "1",
          tomPele: "MORENO_CLARO",
          tomPeleDescricao: "Moreno Claro",
          subtomPele: "QUENTE",
          subtomPeleDescricao: "Quente",
          tipoCabelo: "ONDULADO",
          tipoCabeloDescricao: "Ondulado",
          corNatural: "Castanho Escuro",
          corAtual: "Castanho Iluminado",
          porcentagemBrancos: "10%",
          texturaCabelo: "Média",
          porosidade: "Normal",
          elasticidade: "Boa",
          temQuimica: true,
          historicoQuimico: "Balayage há 3 meses, mechas anteriores",
          ultimaQuimica: "2026-01-15T00:00:00",
          temAlergia: false,
          sensibilidadeCouro: false,
          preferenciaCores: "Tons quentes, mel e caramelo",
          coresEvitar: "Tons frios, cinza",
          observacoes: "Cliente prefere manutenção a cada 3 meses",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockHistory: ColoringHistory[] = [
          {
            id: "1",
            fichaId: "1",
            clienteId: clientId,
            clienteNome: "Maria Silva",
            profissionalId: "1",
            profissionalNome: "Ana Colorista",
            dataServico: "2026-01-15T10:00:00",
            tecnica: "BALAYAGE",
            tecnicaNome: "Balayage",
            tecnicaDescricao: "Técnica de mão livre com efeito natural",
            marcaTinta: "Wella",
            nomeCor: "Caramelo",
            numeroCor: "7.43",
            oxidante: "20 vol",
            formulacao: "30g Wella 7.43 + 30g 7.3 + 60ml OX 20vol",
            tempoAplicacao: 45,
            tempoPausa: 35,
            corAntes: "Castanho Escuro",
            corDepois: "Castanho Iluminado",
            resultadoObtido: "Excelente",
            satisfacaoCliente: 5,
            observacoes: "Cliente amou o resultado. Manutenção recomendada em 3 meses.",
            recomendacoes: "Usar shampoo sem sulfato",
            criadoEm: "2026-01-15T10:00:00",
          },
          {
            id: "2",
            fichaId: "1",
            clienteId: clientId,
            clienteNome: "Maria Silva",
            profissionalId: "1",
            profissionalNome: "Ana Colorista",
            dataServico: "2025-10-10T14:00:00",
            tecnica: "LUZES",
            tecnicaNome: "Luzes",
            tecnicaDescricao: "Mechas finas com papel alumínio",
            marcaTinta: "L'Oréal",
            nomeCor: "Dourado",
            numeroCor: "8.3",
            oxidante: "30 vol",
            formulacao: "Pó descolorante + OX 30vol",
            tempoAplicacao: 60,
            tempoPausa: 40,
            corAntes: "Castanho Natural",
            corDepois: "Castanho com Luzes",
            satisfacaoCliente: 4,
            criadoEm: "2025-10-10T14:00:00",
          },
        ];

        const mockSuggestions: TonalitySuggestion = {
          tomPele: "Moreno Claro",
          subtomPele: "Quente",
          coresRecomendadas: [
            {
              categoria: "Loiros",
              tons: ["Dourado", "Mel", "Caramelo", "Cobre"],
              descricao: "Tons quentes que harmonizam com o subtom da pele",
              nivel: "Claro a Médio",
            },
            {
              categoria: "Castanhos",
              tons: ["Chocolate", "Marrom Dourado", "Canela"],
              descricao: "Castanhos com reflexos quentes",
              nivel: "Médio",
            },
          ],
          coresEvitar: ["Cinza", "Prata", "Loiro Platinado", "Preto Azulado"],
          dicasGerais: [
            "Prefira tons com base dourada ou alaranjada",
            "Evite tons acinzentados que podem deixar a pele amarelada",
          ],
        };

        setProfile(mockProfile);
        setHistory(mockHistory);
        setSuggestions(mockSuggestions);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [clientId]);

  if (isLoading) {
    return (
      <SalonLayout requiredRole={["ADMIN", "PROFESSIONAL"]} pageTitle="Coloração">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      </SalonLayout>
    );
  }

  if (!profile) {
    return (
      <SalonLayout requiredRole={["ADMIN", "PROFESSIONAL"]} pageTitle="Coloração">
        <div className="text-center py-12">
          <p className="text-gray-500">Ficha não encontrada</p>
          <Button onClick={() => router.back()} variant="ghost" className="mt-4">
            Voltar
          </Button>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout requiredRole={["ADMIN", "PROFESSIONAL"]} pageTitle="Coloração">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <User className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{profile.clienteNome}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{profile.clienteEmail}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(true)} leftIcon={<Edit2 className="h-4 w-4" />}>
              Editar Ficha
            </Button>
            <Button onClick={() => setIsHistoryModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Registrar Coloração
            </Button>
          </div>
        </div>

        {/* Alert for allergies */}
        {profile.temAlergia && (
          <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Atenção: Cliente com alergias</p>
              <p className="text-sm text-red-600 dark:text-red-300">{profile.alergias}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: "profile", label: "Ficha Técnica", icon: <Palette className="h-4 w-4" /> },
            { id: "history", label: "Histórico", icon: <Clock className="h-4 w-4" /> },
            { id: "suggestions", label: "Sugestões", icon: <Lightbulb className="h-4 w-4" /> },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab Content */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Skin Analysis */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Droplets className="h-5 w-5 text-violet-500" />
                Análise de Pele
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoCard label="Tom de Pele" value={profile.tomPeleDescricao || "-"} />
                <InfoCard label="Subtom" value={profile.subtomPeleDescricao || "-"} />
                <InfoCard label="Tipo de Cabelo" value={profile.tipoCabeloDescricao || "-"} />
                <InfoCard label="Textura" value={profile.texturaCabelo || "-"} />
              </div>
            </div>

            {/* Hair Info */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Características do Cabelo
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoCard label="Cor Natural" value={profile.corNatural || "-"} />
                <InfoCard label="Cor Atual" value={profile.corAtual || "-"} />
                <InfoCard label="% Brancos" value={profile.porcentagemBrancos || "-"} />
                <InfoCard label="Porosidade" value={profile.porosidade || "-"} />
              </div>
            </div>

            {/* Chemical History */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Histórico Químico</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${profile.temQuimica ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <span className="text-gray-700 dark:text-gray-300">
                    {profile.temQuimica ? 'Possui histórico de química' : 'Sem histórico de química'}
                  </span>
                </div>
                {profile.historicoQuimico && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 pl-5">{profile.historicoQuimico}</p>
                )}
                {profile.ultimaQuimica && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 pl-5">
                    Última química: {new Date(profile.ultimaQuimica).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {/* Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Preferências</h3>
                <p className="text-gray-600 dark:text-gray-400">{profile.preferenciaCores || "Não informado"}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Cores a Evitar</h3>
                <p className="text-gray-600 dark:text-gray-400">{profile.coresEvitar || "Não informado"}</p>
              </div>
            </div>

            {/* Observations */}
            {profile.observacoes && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Observações</h3>
                <p className="text-gray-600 dark:text-gray-400">{profile.observacoes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-12 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum registro de coloração</p>
                <Button onClick={() => setIsHistoryModalOpen(true)} className="mt-4" leftIcon={<Plus className="h-4 w-4" />}>
                  Registrar Primeira Coloração
                </Button>
              </div>
            ) : (
              history.map((h) => <HistoryCard key={h.id} history={h} />)
            )}
          </div>
        )}

        {activeTab === "suggestions" && suggestions && (
          <div className="space-y-6">
            {/* Recommended Colors */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-500" />
                Cores Recomendadas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.coresRecomendadas.map((rec, idx) => (
                  <div key={idx} className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                    <h4 className="font-medium text-green-800 dark:text-green-200">{rec.categoria}</h4>
                    <p className="text-sm text-green-600 dark:text-green-300 mb-2">{rec.descricao}</p>
                    <div className="flex flex-wrap gap-2">
                      {rec.tons.map((tom, i) => (
                        <span key={i} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-800 dark:text-green-100">
                          {tom}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Colors to Avoid */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Cores a Evitar
              </h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.coresEvitar.map((cor, idx) => (
                  <span key={idx} className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {cor}
                  </span>
                ))}
              </div>
            </div>

            {/* General Tips */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Dicas Gerais
              </h3>
              <ul className="space-y-2">
                {suggestions.dicasGerais.map((dica, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-amber-500">•</span>
                    {dica}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Ficha de Coloração"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button leftIcon={<Save className="h-4 w-4" />}>Salvar</Button>
          </>
        }
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <p className="text-sm text-gray-500">Formulário de edição da ficha...</p>
        </div>
      </Modal>

      {/* Register History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Registrar Coloração"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsHistoryModalOpen(false)}>Cancelar</Button>
            <Button leftIcon={<Save className="h-4 w-4" />}>Registrar</Button>
          </>
        }
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <p className="text-sm text-gray-500">Formulário de registro de coloração...</p>
        </div>
      </Modal>
    </SalonLayout>
  );
}
