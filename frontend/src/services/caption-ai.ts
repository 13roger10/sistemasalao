// Serviço de IA para geração de legendas - Fase 9
// Este serviço gera legendas inteligentes para posts de redes sociais

import type {
  CaptionGenerationOptions,
  CaptionGenerationResult,
  GeneratedCaption,
  CaptionTone,
  ContentCategory,
  CaptionTemplate,
} from "@/types";

// Gera ID único
const generateId = (): string => {
  return `caption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Simula delay de processamento
const simulateProcessing = (minMs: number, maxMs: number): Promise<void> => {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

// ===== Caption Templates por Categoria =====

const captionTemplates: Record<ContentCategory, CaptionTemplate[]> = {
  beauty: [
    {
      id: "beauty_1",
      name: "Transformação",
      description: "Para posts de transformação de beleza",
      template: "Beleza que transforma, resultados que encantam! {emoji} {cta}",
      category: "beauty",
      tone: "elegant",
      variables: ["emoji", "cta"],
    },
    {
      id: "beauty_2",
      name: "Autocuidado",
      description: "Para posts sobre autocuidado",
      template: "Seu momento de cuidar de você chegou! {emoji} Porque você merece o melhor. {cta}",
      category: "beauty",
      tone: "inspirational",
      variables: ["emoji", "cta"],
    },
  ],
  hair: [
    {
      id: "hair_1",
      name: "Novo Visual",
      description: "Para mudanças de cabelo",
      template: "Novo visual, nova energia! {emoji} Transforme seu look e conquiste o mundo. {cta}",
      category: "hair",
      tone: "fun",
      variables: ["emoji", "cta"],
    },
    {
      id: "hair_2",
      name: "Cabelos Saudáveis",
      description: "Para tratamentos capilares",
      template: "Cabelos saudáveis começam com cuidados especiais {emoji} Invista na saúde dos seus fios! {cta}",
      category: "hair",
      tone: "educational",
      variables: ["emoji", "cta"],
    },
  ],
  nails: [
    {
      id: "nails_1",
      name: "Nail Art",
      description: "Para designs de unhas",
      template: "Unhas que são verdadeiras obras de arte! {emoji} Cada detalhe conta. {cta}",
      category: "nails",
      tone: "elegant",
      variables: ["emoji", "cta"],
    },
    {
      id: "nails_2",
      name: "Tendência",
      description: "Para tendências de unhas",
      template: "A tendência do momento chegou! {emoji} Suas unhas merecem esse upgrade. {cta}",
      category: "nails",
      tone: "promotional",
      variables: ["emoji", "cta"],
    },
  ],
  skincare: [
    {
      id: "skincare_1",
      name: "Rotina",
      description: "Para rotinas de skincare",
      template: "Sua pele merece uma rotina de cuidados especial {emoji} Comece hoje sua jornada para uma pele radiante! {cta}",
      category: "skincare",
      tone: "educational",
      variables: ["emoji", "cta"],
    },
    {
      id: "skincare_2",
      name: "Resultados",
      description: "Para mostrar resultados",
      template: "Resultados reais para peles reais {emoji} A consistência é o segredo! {cta}",
      category: "skincare",
      tone: "inspirational",
      variables: ["emoji", "cta"],
    },
  ],
  makeup: [
    {
      id: "makeup_1",
      name: "Glam",
      description: "Para looks glamourosos",
      template: "Maquiagem é arte, e você é a tela! {emoji} Brilhe com toda a sua luz. {cta}",
      category: "makeup",
      tone: "elegant",
      variables: ["emoji", "cta"],
    },
    {
      id: "makeup_2",
      name: "Natural",
      description: "Para looks naturais",
      template: "Menos é mais! {emoji} Realce sua beleza natural com toques sutis. {cta}",
      category: "makeup",
      tone: "casual",
      variables: ["emoji", "cta"],
    },
  ],
  wellness: [
    {
      id: "wellness_1",
      name: "Bem-estar",
      description: "Para posts de bem-estar",
      template: "Cuide da sua mente e do seu corpo {emoji} Bem-estar é prioridade! {cta}",
      category: "wellness",
      tone: "inspirational",
      variables: ["emoji", "cta"],
    },
  ],
  promotion: [
    {
      id: "promo_1",
      name: "Oferta",
      description: "Para promoções",
      template: "PROMOÇÃO IMPERDÍVEL! {emoji} Aproveite condições especiais por tempo limitado. {cta}",
      category: "promotion",
      tone: "promotional",
      variables: ["emoji", "cta"],
    },
    {
      id: "promo_2",
      name: "Desconto",
      description: "Para descontos",
      template: "Desconto especial para você! {emoji} Não perca essa oportunidade única. {cta}",
      category: "promotion",
      tone: "promotional",
      variables: ["emoji", "cta"],
    },
  ],
  before_after: [
    {
      id: "ba_1",
      name: "Transformação",
      description: "Para antes e depois",
      template: "O poder da transformação! {emoji} Deslize para ver o antes e depois. {cta}",
      category: "before_after",
      tone: "inspirational",
      variables: ["emoji", "cta"],
    },
  ],
  tutorial: [
    {
      id: "tutorial_1",
      name: "Passo a passo",
      description: "Para tutoriais",
      template: "Tutorial completo! {emoji} Salve este post e aprenda passo a passo. {cta}",
      category: "tutorial",
      tone: "educational",
      variables: ["emoji", "cta"],
    },
  ],
  testimonial: [
    {
      id: "test_1",
      name: "Depoimento",
      description: "Para depoimentos de clientes",
      template: "O que nossos clientes dizem {emoji} Sua satisfação é nossa maior recompensa! {cta}",
      category: "testimonial",
      tone: "professional",
      variables: ["emoji", "cta"],
    },
  ],
};

// ===== Emojis por Categoria =====

const emojisByCategory: Record<ContentCategory, string[]> = {
  beauty: ["✨", "💫", "🌟", "💎", "👑", "🦋", "🌸", "💕"],
  hair: ["💇‍♀️", "✨", "💫", "🌟", "💁‍♀️", "👸", "🎀", "💖"],
  nails: ["💅", "✨", "💎", "🌸", "🎨", "💕", "⭐", "🌟"],
  skincare: ["🧴", "✨", "🌿", "💧", "🌸", "💆‍♀️", "🌟", "💎"],
  makeup: ["💄", "💋", "✨", "🌟", "💫", "👄", "🎨", "💕"],
  wellness: ["🧘‍♀️", "💆‍♀️", "🌿", "✨", "💫", "🌸", "💕", "🦋"],
  promotion: ["🔥", "⚡", "🎉", "💥", "🚨", "✨", "💫", "🌟"],
  before_after: ["➡️", "✨", "🔄", "💫", "🌟", "📸", "👀", "💕"],
  tutorial: ["📝", "✏️", "📚", "💡", "✨", "👆", "📌", "🎯"],
  testimonial: ["💬", "⭐", "❤️", "🙏", "✨", "💕", "👏", "🌟"],
};

// ===== Hashtags por Categoria =====

const hashtagsByCategory: Record<ContentCategory, string[]> = {
  beauty: [
    "#beleza", "#beauty", "#beautytips", "#selfcare", "#skincare",
    "#glam", "#beautyblogger", "#instabeauty", "#beautyaddict", "#beautylover"
  ],
  hair: [
    "#cabelo", "#hair", "#hairstyle", "#haircut", "#cabeloperfeito",
    "#haircolor", "#hairgoals", "#hairdresser", "#cabelosaudavel", "#loiro"
  ],
  nails: [
    "#unhas", "#nails", "#nailart", "#manicure", "#unhasdecoradas",
    "#nailsofinstagram", "#naildesign", "#unhasperfeitas", "#esmalte", "#nailpolish"
  ],
  skincare: [
    "#skincare", "#cuidadoscomapele", "#pele", "#skin", "#skincarerotine",
    "#pelesaudavel", "#dermatologia", "#antiaging", "#hidratacao", "#glow"
  ],
  makeup: [
    "#maquiagem", "#makeup", "#makeuptutorial", "#makeupartist", "#mua",
    "#makeuplover", "#instamakeup", "#beautymakeup", "#makeupoftheday", "#glam"
  ],
  wellness: [
    "#bemestar", "#wellness", "#saude", "#vidasaudavel", "#equilibrio",
    "#mindfulness", "#autocuidado", "#qualidadedevida", "#saudeebeleza", "#relax"
  ],
  promotion: [
    "#promocao", "#oferta", "#desconto", "#imperdivel", "#aproveite",
    "#oportunidade", "#sale", "#blackfriday", "#liquidacao", "#ofertaespecial"
  ],
  before_after: [
    "#antesedepois", "#beforeandafter", "#transformacao", "#resultado",
    "#mudanca", "#evolucao", "#progresso", "#transformation", "#results", "#wow"
  ],
  tutorial: [
    "#tutorial", "#dicasdebeleza", "#aprenda", "#passoapasso", "#dicas",
    "#howto", "#beautytips", "#tutorialdemaquiagem", "#dicasdecabelo", "#tips"
  ],
  testimonial: [
    "#depoimento", "#clientesatisfeita", "#feedback", "#avaliacaocliente",
    "#satisfacao", "#recomendo", "#confianca", "#qualidade", "#obrigada", "#love"
  ],
};

// ===== Call to Actions por Tom =====

const ctaByTone: Record<CaptionTone, string[]> = {
  professional: [
    "Agende seu horário conosco.",
    "Entre em contato para mais informações.",
    "Marque sua consulta hoje.",
  ],
  casual: [
    "Bora marcar? Me chama no direct!",
    "Vem conferir!",
    "Passa aqui que te espero!",
  ],
  fun: [
    "Corre aqui que tá imperdível!",
    "Bora arrasar juntas? Me chama!",
    "Vem que tá demais!",
  ],
  elegant: [
    "Permita-se viver esta experiência única.",
    "Agende seu momento especial.",
    "Descubra o luxo do cuidado pessoal.",
  ],
  inspirational: [
    "Comece sua transformação hoje!",
    "Dê o primeiro passo para a mudança.",
    "Sua jornada começa aqui.",
  ],
  promotional: [
    "Aproveite! Vagas limitadas!",
    "Corra! Promoção por tempo limitado!",
    "Garanta já o seu!",
  ],
  educational: [
    "Salve este post para consultar depois!",
    "Compartilhe com quem precisa saber!",
    "Deixe suas dúvidas nos comentários!",
  ],
};

// ===== Caption Generation Functions =====

function selectEmojis(category: ContentCategory, count: number = 2): string[] {
  const emojis = emojisByCategory[category] || emojisByCategory.beauty;
  const shuffled = [...emojis].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function selectHashtags(
  category: ContentCategory,
  count: number = 10,
  keywords?: string[]
): string[] {
  const baseHashtags = hashtagsByCategory[category] || hashtagsByCategory.beauty;
  const shuffled = [...baseHashtags].sort(() => Math.random() - 0.5);
  let selected = shuffled.slice(0, count);

  // Adiciona hashtags personalizadas baseadas em keywords
  if (keywords && keywords.length > 0) {
    const customHashtags = keywords
      .filter((k) => k.trim())
      .map((k) => `#${k.trim().toLowerCase().replace(/\s+/g, "")}`);
    selected = [...customHashtags, ...selected].slice(0, count);
  }

  return selected;
}

function selectCTA(tone: CaptionTone): string {
  const ctas = ctaByTone[tone] || ctaByTone.casual;
  return ctas[Math.floor(Math.random() * ctas.length)];
}

function generateCaptionText(
  options: CaptionGenerationOptions,
  variant: number = 0
): string {
  const templates = captionTemplates[options.category] || captionTemplates.beauty;
  const template = templates[variant % templates.length];

  const emojis = selectEmojis(options.category, 2);
  const emojiStr = options.includeEmoji ? emojis.join(" ") : "";
  const cta = options.includeCallToAction ? selectCTA(options.tone) : "";

  let text = template.template
    .replace("{emoji}", emojiStr)
    .replace("{cta}", cta)
    .trim();

  // Ajusta tamanho baseado na opção de comprimento
  if (options.length === "short") {
    // Mantém apenas a primeira frase
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    text = sentences[0] + (text.match(/[.!?]/)?.[0] || "!");
  } else if (options.length === "long") {
    // Adiciona contexto extra
    const extras = [
      `\n\nNosso compromisso é com a sua satisfação.`,
      `\n\nQualidade e dedicação em cada detalhe.`,
      `\n\nTransformando sonhos em realidade.`,
    ];
    text += extras[Math.floor(Math.random() * extras.length)];
  }

  // Adiciona nome do negócio se fornecido
  if (options.businessName) {
    text += `\n\n📍 ${options.businessName}`;
  }

  return text;
}

function estimateEngagement(caption: GeneratedCaption): "low" | "medium" | "high" {
  let score = 0;

  // Tamanho ideal (100-200 caracteres para Instagram)
  if (caption.characterCount >= 100 && caption.characterCount <= 200) {
    score += 2;
  } else if (caption.characterCount >= 50 && caption.characterCount <= 300) {
    score += 1;
  }

  // Tem emojis
  if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(caption.text)) {
    score += 1;
  }

  // Tem hashtags suficientes
  if (caption.hashtags.length >= 5) {
    score += 1;
  }

  // Tom engajador
  if (["fun", "inspirational", "promotional"].includes(caption.tone)) {
    score += 1;
  }

  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

// ===== Main Generation Function =====

export async function generateCaption(
  imageData: string,
  options: CaptionGenerationOptions,
  onProgress?: (progress: number) => void
): Promise<CaptionGenerationResult> {
  onProgress?.(10);
  await simulateProcessing(300, 500);

  onProgress?.(30);
  await simulateProcessing(400, 600);

  // Gera legenda principal
  const mainText = generateCaptionText(options, 0);
  const mainHashtags = selectHashtags(options.category, 10, options.keywords);

  const mainCaption: GeneratedCaption = {
    id: generateId(),
    text: mainText,
    hashtags: mainHashtags,
    characterCount: mainText.length,
    estimatedEngagement: "medium",
    tone: options.tone,
  };
  mainCaption.estimatedEngagement = estimateEngagement(mainCaption);

  onProgress?.(50);
  await simulateProcessing(300, 500);

  // Gera alternativas
  const alternatives: GeneratedCaption[] = [];
  for (let i = 1; i <= 3; i++) {
    const altText = generateCaptionText(options, i);
    const altHashtags = selectHashtags(options.category, 8, options.keywords);

    const altCaption: GeneratedCaption = {
      id: generateId(),
      text: altText,
      hashtags: altHashtags,
      characterCount: altText.length,
      estimatedEngagement: "medium",
      tone: options.tone,
    };
    altCaption.estimatedEngagement = estimateEngagement(altCaption);
    alternatives.push(altCaption);
  }

  onProgress?.(70);
  await simulateProcessing(200, 400);

  // Sugestões adicionais
  const suggestedHashtags = selectHashtags(options.category, 15, options.keywords);
  const suggestedEmojis = selectEmojis(options.category, 6);

  // Dicas contextuais
  const tips = generateTips(options);

  onProgress?.(100);

  return {
    mainCaption,
    alternatives,
    suggestedHashtags,
    suggestedEmojis,
    tips,
    generatedAt: Date.now(),
  };
}

function generateTips(options: CaptionGenerationOptions): string[] {
  const tips: string[] = [];

  if (options.platform === "instagram" || options.platform === "both") {
    tips.push("Use até 30 hashtags no Instagram para maior alcance.");
    tips.push("Publique entre 11h-13h ou 19h-21h para melhor engajamento.");
  }

  if (options.platform === "facebook" || options.platform === "both") {
    tips.push("No Facebook, legendas mais curtas tendem a ter melhor performance.");
  }

  if (!options.includeCallToAction) {
    tips.push("Considere adicionar uma chamada para ação para aumentar interações.");
  }

  if (options.category === "promotion") {
    tips.push("Inclua urgência na sua promoção (ex: 'por tempo limitado').");
  }

  if (options.category === "tutorial") {
    tips.push("Peça para salvarem o post - isso aumenta o alcance do algoritmo.");
  }

  return tips.slice(0, 3);
}

// ===== Regenerate Single Caption =====

export async function regenerateCaption(
  options: CaptionGenerationOptions,
  onProgress?: (progress: number) => void
): Promise<GeneratedCaption> {
  onProgress?.(30);
  await simulateProcessing(200, 400);

  const text = generateCaptionText(options, Math.floor(Math.random() * 10));
  const hashtags = selectHashtags(options.category, 10, options.keywords);

  onProgress?.(100);

  const caption: GeneratedCaption = {
    id: generateId(),
    text,
    hashtags,
    characterCount: text.length,
    estimatedEngagement: "medium",
    tone: options.tone,
  };
  caption.estimatedEngagement = estimateEngagement(caption);

  return caption;
}

// ===== Get Templates =====

export function getTemplatesByCategory(category: ContentCategory): CaptionTemplate[] {
  return captionTemplates[category] || [];
}

export function getAllCategories(): { id: ContentCategory; label: string }[] {
  return [
    { id: "beauty", label: "Beleza Geral" },
    { id: "hair", label: "Cabelo" },
    { id: "nails", label: "Unhas" },
    { id: "skincare", label: "Skincare" },
    { id: "makeup", label: "Maquiagem" },
    { id: "wellness", label: "Bem-estar" },
    { id: "promotion", label: "Promoção" },
    { id: "before_after", label: "Antes e Depois" },
    { id: "tutorial", label: "Tutorial" },
    { id: "testimonial", label: "Depoimento" },
  ];
}

export function getAllTones(): { id: CaptionTone; label: string }[] {
  return [
    { id: "professional", label: "Profissional" },
    { id: "casual", label: "Casual" },
    { id: "fun", label: "Divertido" },
    { id: "elegant", label: "Elegante" },
    { id: "inspirational", label: "Inspiracional" },
    { id: "promotional", label: "Promocional" },
    { id: "educational", label: "Educacional" },
  ];
}

// Export do serviço
export const captionAIService = {
  generateCaption,
  regenerateCaption,
  getTemplatesByCategory,
  getAllCategories,
  getAllTones,
};

export default captionAIService;
