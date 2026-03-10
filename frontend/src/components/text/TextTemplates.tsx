"use client";

import { useState, useCallback, useMemo } from "react";
import type { TextTemplate } from "@/types";

interface TextTemplatesProps {
  onInsert: (text: string) => void;
  onClose?: () => void;
}

const TEMPLATES: TextTemplate[] = [
  // CTA Templates
  {
    id: "cta-comment",
    name: "Comentar",
    description: "Convide para comentar",
    content: "💬 O que voce achou? Conta pra gente nos comentarios!",
    category: "cta",
  },
  {
    id: "cta-save",
    name: "Salvar",
    description: "Convide para salvar o post",
    content: "📌 Salve esse post para nao esquecer!",
    category: "cta",
  },
  {
    id: "cta-share",
    name: "Compartilhar",
    description: "Convide para compartilhar",
    content: "📲 Marque uma amiga que precisa ver isso!",
    category: "cta",
  },
  {
    id: "cta-follow",
    name: "Seguir",
    description: "Convide para seguir",
    content: "👆 Siga @seu_perfil para mais conteudo!",
    category: "cta",
    variables: ["@seu_perfil"],
  },
  {
    id: "cta-like",
    name: "Curtir",
    description: "Peca para curtir",
    content: "❤️ Curtiu? Deixa um coracao!",
    category: "cta",
  },

  // Greeting Templates
  {
    id: "greeting-morning",
    name: "Bom dia",
    description: "Saudacao matinal",
    content: "☀️ Bom dia, lindas!\n\nComo voces estao hoje?",
    category: "greeting",
  },
  {
    id: "greeting-afternoon",
    name: "Boa tarde",
    description: "Saudacao da tarde",
    content: "✨ Boa tarde, queridas!\n\nProntinhas para arrasar?",
    category: "greeting",
  },
  {
    id: "greeting-evening",
    name: "Boa noite",
    description: "Saudacao noturna",
    content: "🌙 Boa noite, amores!\n\nHora de relaxar e cuidar de voces.",
    category: "greeting",
  },

  // Promo Templates
  {
    id: "promo-discount",
    name: "Desconto",
    description: "Anunciar desconto",
    content: "🎉 PROMO ESPECIAL!\n\n💰 XX% OFF em todos os servicos\n⏰ Valido ate DD/MM\n\n📱 Agende ja pelo WhatsApp!",
    category: "promo",
    variables: ["XX%", "DD/MM"],
  },
  {
    id: "promo-new",
    name: "Novidade",
    description: "Anunciar novidade",
    content: "✨ NOVIDADE NO SALAO!\n\nAgora oferecemos [SERVICO]!\n\n🔥 Agenda aberta!\n📱 Chama no WhatsApp",
    category: "promo",
    variables: ["[SERVICO]"],
  },
  {
    id: "promo-limited",
    name: "Vagas Limitadas",
    description: "Criar urgencia",
    content: "⚡ ULTIMAS VAGAS!\n\nRestam apenas X horarios essa semana!\n\n📱 Garanta o seu agora",
    category: "promo",
    variables: ["X"],
  },

  // Bio Templates
  {
    id: "bio-link",
    name: "Link na Bio",
    description: "Direcionar para bio",
    content: "\n\n🔗 Link na bio para mais informacoes!",
    category: "bio",
  },
  {
    id: "bio-catalog",
    name: "Catalogo",
    description: "Ver catalogo",
    content: "\n\n📖 Veja nosso catalogo completo no link da bio!",
    category: "bio",
  },

  // Booking Templates
  {
    id: "booking-whatsapp",
    name: "WhatsApp",
    description: "Agendamento por WhatsApp",
    content: "\n\n📱 Agende pelo WhatsApp:\n(XX) XXXXX-XXXX",
    category: "booking",
    variables: ["(XX) XXXXX-XXXX"],
  },
  {
    id: "booking-dm",
    name: "Direct",
    description: "Agendamento por DM",
    content: "\n\n💬 Agende pelo Direct!\nRespondo rapido 💜",
    category: "booking",
  },
  {
    id: "booking-address",
    name: "Endereco",
    description: "Mostrar endereco",
    content: "\n\n📍 Estamos em:\nRua XXXXX, 000 - Bairro\nCidade - Estado",
    category: "booking",
    variables: ["Rua XXXXX, 000 - Bairro", "Cidade - Estado"],
  },
  {
    id: "booking-hours",
    name: "Horario",
    description: "Horario de funcionamento",
    content: "\n\n⏰ Horario de funcionamento:\nSeg a Sex: 9h - 18h\nSab: 9h - 14h",
    category: "booking",
  },

  // General Templates
  {
    id: "general-before-after",
    name: "Antes e Depois",
    description: "Post de transformacao",
    content: "✨ ANTES E DEPOIS\n\nMais uma transformacao incrivel!\n\n💇‍♀️ Procedimento: [SERVICO]\n⏱️ Duracao: Xh\n\n💜 O que acharam?",
    category: "general",
    variables: ["[SERVICO]", "Xh"],
  },
  {
    id: "general-testimonial",
    name: "Depoimento",
    description: "Post de depoimento",
    content: "💜 CLIENTE SATISFEITA!\n\n\"[DEPOIMENTO]\"\n\n- [NOME DA CLIENTE]\n\n✨ Obrigada pela confianca!",
    category: "general",
    variables: ["[DEPOIMENTO]", "[NOME DA CLIENTE]"],
  },
  {
    id: "general-tips",
    name: "Dica",
    description: "Post de dica",
    content: "💡 DICA DO DIA!\n\n[SUA DICA AQUI]\n\n💜 Gostou? Salva esse post!",
    category: "general",
    variables: ["[SUA DICA AQUI]"],
  },
];

const CATEGORY_LABELS: Record<TextTemplate["category"], string> = {
  cta: "Chamadas para Acao",
  greeting: "Saudacoes",
  promo: "Promocoes",
  bio: "Bio & Links",
  booking: "Agendamento",
  general: "Geral",
};

const CATEGORY_ICONS: Record<TextTemplate["category"], string> = {
  cta: "📢",
  greeting: "👋",
  promo: "🎁",
  bio: "🔗",
  booking: "📅",
  general: "📝",
};

export function TextTemplates({ onInsert, onClose }: TextTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<TextTemplate["category"]>("cta");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(
    () => [...new Set(TEMPLATES.map((t) => t.category))],
    []
  );

  const filteredTemplates = useMemo(() => {
    let templates = TEMPLATES;

    if (selectedCategory) {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.content.toLowerCase().includes(query)
      );
    }

    return templates;
  }, [selectedCategory, searchQuery]);

  const handleInsert = useCallback(
    (template: TextTemplate) => {
      onInsert(template.content);
    },
    [onInsert]
  );

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Templates de Texto</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar templates..."
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === category
                ? "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <span>{CATEGORY_ICONS[category]}</span>
            <span>{CATEGORY_LABELS[category]}</span>
          </button>
        ))}
      </div>

      {/* Templates List */}
      <div className="max-h-80 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="group rounded-xl border border-gray-200 dark:border-gray-700 p-3 transition-colors hover:border-violet-300 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{template.description}</p>
                </div>
                <button
                  onClick={() => handleInsert(template)}
                  className="rounded-lg bg-violet-100 dark:bg-violet-900/50 px-3 py-1 text-sm font-medium text-violet-700 dark:text-violet-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-violet-200 dark:hover:bg-violet-800"
                >
                  Usar
                </button>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-2">
                <p className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                  {template.content}
                </p>
              </div>
              {template.variables && template.variables.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-400">Substituir:</span>
                  {template.variables.map((v, i) => (
                    <span
                      key={i}
                      className="rounded bg-yellow-100 dark:bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-700 dark:text-yellow-400"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum template encontrado
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 Clique em &quot;Usar&quot; para inserir o template na sua legenda
        </p>
      </div>
    </div>
  );
}
