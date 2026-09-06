// CAÇAOFERTA — Biblioteca interna de palavras-chave estratégicas para pesquisa de ofertas low ticket.
// Organizada por NICHO → SUBNICHO → PALAVRAS-CHAVE.
// Não representa volume de pesquisa — são termos estratégicos para descoberta de anúncios.

export interface KeywordEntry {
  keyword: string;
}

export interface SubNiche {
  name: string;
  keywords: KeywordEntry[];
}

export interface Niche {
  name: string;
  slug: string;
  subniches: SubNiche[];
}

export interface PurchaseIntent {
  name: string;
  keywords: KeywordEntry[];
}

// ── Palavras de Intenção de Compra ─────────────────────────────────────────
export const PURCHASE_INTENT_KEYWORDS: PurchaseIntent = {
  name: 'Intenção de Compra',
  keywords: [
    { keyword: 'comprar' },
    { keyword: 'oferta' },
    { keyword: 'promoção' },
    { keyword: 'desconto' },
    { keyword: 'cupom' },
    { keyword: 'kit' },
    { keyword: 'combo' },
    { keyword: 'método' },
    { keyword: 'protocolo' },
    { keyword: 'programa' },
    { keyword: 'desafio' },
    { keyword: 'curso' },
    { keyword: 'ebook' },
    { keyword: 'e-book' },
    { keyword: 'apostila' },
    { keyword: 'guia' },
    { keyword: 'planner' },
    { keyword: 'planilha' },
    { keyword: 'template' },
    { keyword: 'moldes' },
    { keyword: 'pack' },
    { keyword: 'pacote' },
    { keyword: 'material' },
    { keyword: 'passo a passo' },
    { keyword: 'bônus' },
    { keyword: 'acesso imediato' },
    { keyword: 'material completo' },
    { keyword: 'conteúdo exclusivo' },
    { keyword: 'preço especial' },
    { keyword: 'condição especial' },
    { keyword: 'oferta especial' },
    { keyword: 'últimas vagas' },
  ],
};

// ── Emagrecimento e Fitness ────────────────────────────────────────────────
const EMAGRECIMENTO: Niche = {
  name: 'Emagrecimento e Fitness',
  slug: 'emagrecimento',
  subniches: [
    {
      name: 'Emagrecimento',
      keywords: [
        { keyword: 'emagrecimento' },
        { keyword: 'emagrecer' },
        { keyword: 'perder peso' },
        { keyword: 'perder barriga' },
        { keyword: 'secar barriga' },
        { keyword: 'gordura abdominal' },
        { keyword: 'barriga chapada' },
      ],
    },
    {
      name: 'Dieta',
      keywords: [
        { keyword: 'dieta' },
        { keyword: 'dieta para emagrecer' },
        { keyword: 'alimentação saudável' },
      ],
    },
    {
      name: 'Receitas Fitness',
      keywords: [
        { keyword: 'receitas fitness' },
      ],
    },
    {
      name: 'Exercícios',
      keywords: [
        { keyword: 'treino em casa' },
        { keyword: 'exercícios em casa' },
      ],
    },
    {
      name: 'Desafios',
      keywords: [
        { keyword: 'desafio 21 dias' },
        { keyword: 'desafio 30 dias' },
      ],
    },
  ],
};

// ── Receitas e Culinária ───────────────────────────────────────────────────
const RECEITAS: Niche = {
  name: 'Receitas e Culinária',
  slug: 'receitas',
  subniches: [
    {
      name: 'Receitas',
      keywords: [
        { keyword: 'receitas' },
        { keyword: 'receitas fáceis' },
        { keyword: 'receitas rápidas' },
        { keyword: 'receitas econômicas' },
        { keyword: 'receitas saudáveis' },
        { keyword: 'receitas para vender' },
      ],
    },
    {
      name: 'Air Fryer',
      keywords: [
        { keyword: 'air fryer' },
        { keyword: 'receitas air fryer' },
      ],
    },
    {
      name: 'Doces',
      keywords: [
        { keyword: 'bolo' },
        { keyword: 'bolos' },
        { keyword: 'bolo no pote' },
        { keyword: 'brigadeiro gourmet' },
        { keyword: 'doces para vender' },
      ],
    },
    {
      name: 'Salgados',
      keywords: [
        { keyword: 'salgados para vender' },
      ],
    },
    {
      name: 'Marmitas',
      keywords: [
        { keyword: 'marmitas' },
        { keyword: 'marmitas fitness' },
      ],
    },
    {
      name: 'Confeitaria',
      keywords: [
        { keyword: 'confeitaria' },
      ],
    },
  ],
};

// ── Artesanato ─────────────────────────────────────────────────────────────
const ARTESANATO: Niche = {
  name: 'Artesanato',
  slug: 'artesanato',
  subniches: [
    {
      name: 'Crochê',
      keywords: [
        { keyword: 'crochê' },
        { keyword: 'curso de crochê' },
        { keyword: 'receitas de crochê' },
      ],
    },
    {
      name: 'Amigurumi',
      keywords: [
        { keyword: 'amigurumi' },
        { keyword: 'amigurumi fácil' },
        { keyword: 'bonecas de crochê' },
      ],
    },
    {
      name: 'Costura',
      keywords: [
        { keyword: 'costura' },
        { keyword: 'corte e costura' },
      ],
    },
    {
      name: 'Bordado',
      keywords: [
        { keyword: 'bordado' },
      ],
    },
    {
      name: 'Pintura',
      keywords: [
        { keyword: 'pintura em tecido' },
      ],
    },
    {
      name: 'Artesanato Geral',
      keywords: [
        { keyword: 'artesanato' },
        { keyword: 'artesanato para vender' },
        { keyword: 'moldes' },
        { keyword: 'moldes para artesanato' },
        { keyword: 'passo a passo artesanato' },
      ],
    },
  ],
};

// ── Educação Infantil ──────────────────────────────────────────────────────
const EDUCACAO_INFANTIL: Niche = {
  name: 'Educação Infantil',
  slug: 'educacao-infantil',
  subniches: [
    {
      name: 'Alfabetização',
      keywords: [
        { keyword: 'alfabetização' },
        { keyword: 'aprender a ler' },
        { keyword: 'leitura' },
      ],
    },
    {
      name: 'Atividades',
      keywords: [
        { keyword: 'atividades infantis' },
        { keyword: 'atividades educação infantil' },
        { keyword: 'atividades para crianças' },
        { keyword: 'atividades para imprimir' },
      ],
    },
    {
      name: 'Matemática',
      keywords: [
        { keyword: 'matemática infantil' },
        { keyword: 'tabuada' },
      ],
    },
    {
      name: 'Caligrafia',
      keywords: [
        { keyword: 'caligrafia' },
        { keyword: 'letra cursiva' },
      ],
    },
    {
      name: 'Escolar',
      keywords: [
        { keyword: 'educação infantil' },
        { keyword: 'atividades escolares' },
        { keyword: 'reforço escolar' },
        { keyword: 'material pedagógico' },
      ],
    },
  ],
};

// ── Concursos e Estudos ────────────────────────────────────────────────────
const CONCURSOS: Niche = {
  name: 'Concursos e Estudos',
  slug: 'concursos',
  subniches: [
    {
      name: 'Concurso Público',
      keywords: [
        { keyword: 'concurso público' },
        { keyword: 'concursos' },
        { keyword: 'apostila concurso' },
        { keyword: 'questões de concurso' },
        { keyword: 'simulados' },
        { keyword: 'estudo para concurso' },
      ],
    },
    {
      name: 'ENEM',
      keywords: [
        { keyword: 'ENEM' },
      ],
    },
    {
      name: 'Vestibular',
      keywords: [
        { keyword: 'vestibular' },
      ],
    },
    {
      name: 'Técnicas de Estudo',
      keywords: [
        { keyword: 'estudar para concurso' },
        { keyword: 'cronograma de estudos' },
        { keyword: 'técnicas de estudo' },
        { keyword: 'mapa mental' },
        { keyword: 'resumo' },
        { keyword: 'apostila' },
        { keyword: 'material de estudo' },
      ],
    },
  ],
};

// ── Renda Extra e Empreendedorismo ─────────────────────────────────────────
const RENDA_EXTRA: Niche = {
  name: 'Renda Extra e Empreendedorismo',
  slug: 'renda-extra',
  subniches: [
    {
      name: 'Renda Extra',
      keywords: [
        { keyword: 'renda extra' },
        { keyword: 'ganhar dinheiro' },
        { keyword: 'ganhar dinheiro em casa' },
        { keyword: 'renda extra online' },
      ],
    },
    {
      name: 'Trabalho em Casa',
      keywords: [
        { keyword: 'trabalhar em casa' },
        { keyword: 'trabalho online' },
      ],
    },
    {
      name: 'Negócios',
      keywords: [
        { keyword: 'negócio próprio' },
        { keyword: 'empreendedorismo' },
        { keyword: 'pequeno negócio' },
        { keyword: 'negócio lucrativo' },
      ],
    },
    {
      name: 'Vendas',
      keywords: [
        { keyword: 'vender pela internet' },
        { keyword: 'como vender' },
        { keyword: 'renda pela internet' },
      ],
    },
    {
      name: 'Celular',
      keywords: [
        { keyword: 'ganhar dinheiro com celular' },
        { keyword: 'renda extra pelo celular' },
      ],
    },
  ],
};

// ── Marketing Digital ──────────────────────────────────────────────────────
const MARKETING_DIGITAL: Niche = {
  name: 'Marketing Digital',
  slug: 'marketing-digital',
  subniches: [
    {
      name: 'Tráfego Pago',
      keywords: [
        { keyword: 'marketing digital' },
        { keyword: 'tráfego pago' },
        { keyword: 'Facebook Ads' },
        { keyword: 'Meta Ads' },
        { keyword: 'anúncios' },
      ],
    },
    {
      name: 'Afiliados',
      keywords: [
        { keyword: 'afiliados' },
        { keyword: 'marketing de afiliados' },
      ],
    },
    {
      name: 'Vendas',
      keywords: [
        { keyword: 'vender online' },
        { keyword: 'vendas online' },
      ],
    },
    {
      name: 'Instagram',
      keywords: [
        { keyword: 'Instagram' },
        { keyword: 'Instagram para negócios' },
      ],
    },
    {
      name: 'Copywriting',
      keywords: [
        { keyword: 'copywriting' },
        { keyword: 'copy' },
      ],
    },
    {
      name: 'Funil e Lançamentos',
      keywords: [
        { keyword: 'funil de vendas' },
        { keyword: 'lançamento' },
        { keyword: 'produto digital' },
        { keyword: 'infoproduto' },
      ],
    },
  ],
};

// ── Beleza ─────────────────────────────────────────────────────────────────
const BELEZA: Niche = {
  name: 'Beleza',
  slug: 'beleza',
  subniches: [
    {
      name: 'Skincare',
      keywords: [
        { keyword: 'skincare' },
        { keyword: 'cuidados com a pele' },
        { keyword: 'pele' },
        { keyword: 'manchas' },
        { keyword: 'melasma' },
        { keyword: 'acne' },
        { keyword: 'rugas' },
        { keyword: 'rejuvenescimento' },
      ],
    },
    {
      name: 'Cabelo',
      keywords: [
        { keyword: 'cabelo' },
        { keyword: 'crescimento capilar' },
        { keyword: 'queda de cabelo' },
        { keyword: 'hidratação capilar' },
      ],
    },
    {
      name: 'Unhas',
      keywords: [
        { keyword: 'unhas' },
      ],
    },
    {
      name: 'Maquiagem',
      keywords: [
        { keyword: 'maquiagem' },
      ],
    },
    {
      name: 'Estética',
      keywords: [
        { keyword: 'beleza' },
        { keyword: 'estética' },
      ],
    },
  ],
};

// ── Maternidade ────────────────────────────────────────────────────────────
const MATERNIDADE: Niche = {
  name: 'Maternidade',
  slug: 'maternidade',
  subniches: [
    {
      name: 'Gravidez',
      keywords: [
        { keyword: 'maternidade' },
        { keyword: 'gravidez' },
      ],
    },
    {
      name: 'Bebê',
      keywords: [
        { keyword: 'bebê' },
        { keyword: 'recém nascido' },
        { keyword: 'sono do bebê' },
        { keyword: 'bebê dormir' },
        { keyword: 'rotina do bebê' },
      ],
    },
    {
      name: 'Alimentação Infantil',
      keywords: [
        { keyword: 'alimentação infantil' },
        { keyword: 'introdução alimentar' },
      ],
    },
    {
      name: 'Desenvolvimento',
      keywords: [
        { keyword: 'educação infantil' },
        { keyword: 'atividades para bebê' },
        { keyword: 'desenvolvimento infantil' },
      ],
    },
  ],
};

// ── Relacionamentos ────────────────────────────────────────────────────────
const RELACIONAMENTOS: Niche = {
  name: 'Relacionamentos',
  slug: 'relacionamentos',
  subniches: [
    {
      name: 'Relacionamento',
      keywords: [
        { keyword: 'relacionamento' },
        { keyword: 'relacionamento saudável' },
        { keyword: 'comunicação no relacionamento' },
      ],
    },
    {
      name: 'Reconquista',
      keywords: [
        { keyword: 'reconquistar' },
        { keyword: 'reconquista' },
        { keyword: 'voltar com ex' },
      ],
    },
    {
      name: 'Casamento',
      keywords: [
        { keyword: 'casamento' },
        { keyword: 'crise no relacionamento' },
      ],
    },
    {
      name: 'Autoestima',
      keywords: [
        { keyword: 'autoestima' },
        { keyword: 'confiança' },
        { keyword: 'namoro' },
        { keyword: 'término' },
      ],
    },
  ],
};

// ── Finanças ───────────────────────────────────────────────────────────────
const FINANCAS: Niche = {
  name: 'Finanças',
  slug: 'financas',
  subniches: [
    {
      name: 'Finanças Pessoais',
      keywords: [
        { keyword: 'finanças pessoais' },
        { keyword: 'organização financeira' },
        { keyword: 'controle financeiro' },
      ],
    },
    {
      name: 'Dívidas',
      keywords: [
        { keyword: 'sair das dívidas' },
        { keyword: 'quitar dívidas' },
      ],
    },
    {
      name: 'Investimentos',
      keywords: [
        { keyword: 'investimentos' },
        { keyword: 'renda passiva' },
      ],
    },
    {
      name: 'Educação Financeira',
      keywords: [
        { keyword: 'educação financeira' },
        { keyword: 'planejamento financeiro' },
        { keyword: 'dinheiro' },
        { keyword: 'economia' },
        { keyword: 'orçamento pessoal' },
      ],
    },
  ],
};

// ── Desenvolvimento Pessoal ────────────────────────────────────────────────
const DESENVOLVIMENTO_PESSOAL: Niche = {
  name: 'Desenvolvimento Pessoal',
  slug: 'desenvolvimento-pessoal',
  subniches: [
    {
      name: 'Produtividade',
      keywords: [
        { keyword: 'desenvolvimento pessoal' },
        { keyword: 'produtividade' },
        { keyword: 'gestão do tempo' },
      ],
    },
    {
      name: 'Foco e Disciplina',
      keywords: [
        { keyword: 'foco' },
        { keyword: 'disciplina' },
        { keyword: 'hábitos' },
      ],
    },
    {
      name: 'Organização',
      keywords: [
        { keyword: 'organização' },
        { keyword: 'planejamento' },
      ],
    },
    {
      name: 'Inteligência Emocional',
      keywords: [
        { keyword: 'inteligência emocional' },
        { keyword: 'autoestima' },
        { keyword: 'motivação' },
        { keyword: 'procrastinação' },
      ],
    },
  ],
};

// ── Idiomas ────────────────────────────────────────────────────────────────
const IDIOMAS: Niche = {
  name: 'Idiomas',
  slug: 'idiomas',
  subniches: [
    {
      name: 'Inglês',
      keywords: [
        { keyword: 'inglês' },
        { keyword: 'aprender inglês' },
        { keyword: 'inglês rápido' },
        { keyword: 'inglês online' },
        { keyword: 'inglês para iniciantes' },
        { keyword: 'conversação em inglês' },
        { keyword: 'curso de inglês' },
      ],
    },
    {
      name: 'Espanhol',
      keywords: [
        { keyword: 'espanhol' },
        { keyword: 'aprender espanhol' },
      ],
    },
    {
      name: 'Francês',
      keywords: [
        { keyword: 'francês' },
      ],
    },
    {
      name: 'Geral',
      keywords: [
        { keyword: 'idiomas' },
        { keyword: 'aprender idiomas' },
      ],
    },
  ],
};

// ── Tecnologia e IA ────────────────────────────────────────────────────────
const TECNOLOGIA_IA: Niche = {
  name: 'Tecnologia e IA',
  slug: 'tecnologia-ia',
  subniches: [
    {
      name: 'Inteligência Artificial',
      keywords: [
        { keyword: 'inteligência artificial' },
        { keyword: 'IA' },
        { keyword: 'ChatGPT' },
        { keyword: 'prompts' },
        { keyword: 'prompt' },
      ],
    },
    {
      name: 'Automação',
      keywords: [
        { keyword: 'automação' },
        { keyword: 'ferramentas de IA' },
        { keyword: 'automação de vendas' },
      ],
    },
    {
      name: 'IA para Negócios',
      keywords: [
        { keyword: 'inteligência artificial para negócios' },
        { keyword: 'IA para marketing' },
        { keyword: 'IA para ganhar dinheiro' },
        { keyword: 'produtividade com IA' },
      ],
    },
  ],
};

// ── Casa e Organização ─────────────────────────────────────────────────────
const CASA_ORGANIZACAO: Niche = {
  name: 'Casa e Organização',
  slug: 'casa-organizacao',
  subniches: [
    {
      name: 'Organização',
      keywords: [
        { keyword: 'organização da casa' },
        { keyword: 'casa organizada' },
        { keyword: 'organização' },
      ],
    },
    {
      name: 'Limpeza',
      keywords: [
        { keyword: 'limpeza' },
        { keyword: 'limpeza doméstica' },
      ],
    },
    {
      name: 'Decoração',
      keywords: [
        { keyword: 'decoração' },
      ],
    },
    {
      name: 'Planejamento Doméstico',
      keywords: [
        { keyword: 'planner doméstico' },
        { keyword: 'rotina doméstica' },
        { keyword: 'lista de tarefas' },
        { keyword: 'organização financeira doméstica' },
      ],
    },
  ],
};

// ── Biblioteca Completa ────────────────────────────────────────────────────
export const NICHE_LIBRARY: Niche[] = [
  EMAGRECIMENTO,
  RECEITAS,
  ARTESANATO,
  EDUCACAO_INFANTIL,
  CONCURSOS,
  RENDA_EXTRA,
  MARKETING_DIGITAL,
  BELEZA,
  MATERNIDADE,
  RELACIONAMENTOS,
  FINANCAS,
  DESENVOLVIMENTO_PESSOAL,
  IDIOMAS,
  TECNOLOGIA_IA,
  CASA_ORGANIZACAO,
];

// ── Index de busca rápida ──────────────────────────────────────────────────
interface KeywordIndexEntry {
  keyword: string;
  niche: string;
  nicheSlug: string;
  subniche: string;
}

const _keywordIndex: KeywordIndexEntry[] = [];

function buildIndex(): void {
  if (_keywordIndex.length > 0) return;
  for (const niche of NICHE_LIBRARY) {
    for (const subniche of niche.subniches) {
      for (const entry of subniche.keywords) {
        _keywordIndex.push({
          keyword: entry.keyword.toLowerCase(),
          niche: niche.name,
          nicheSlug: niche.slug,
          subniche: subniche.name,
        });
      }
    }
  }
}

/** Busca uma palavra-chave na biblioteca e retorna nicho/subnicho. */
export function lookupKeyword(term: string): KeywordIndexEntry | null {
  buildIndex();
  const lower = term.toLowerCase().trim();
  return _keywordIndex.find((e) => e.keyword === lower) ?? null;
}

/** Busca parcial (includes) — retorna todas as correspondências. */
export function searchKeywords(term: string): KeywordIndexEntry[] {
  buildIndex();
  const lower = term.toLowerCase().trim();
  if (!lower) return [];
  return _keywordIndex.filter((e) => e.keyword.includes(lower));
}

/** Retorna todas as palavras-chave de um nicho específico. */
export function getKeywordsByNiche(nicheSlug: string): KeywordIndexEntry[] {
  buildIndex();
  return _keywordIndex.filter((e) => e.nicheSlug === nicheSlug);
}

/** Retorna total de palavras-chave na biblioteca. */
export function getTotalKeywordCount(): number {
  buildIndex();
  return _keywordIndex.length;
}

/** Combina palavra-chave + intenção de compra para pesquisa. */
export function combineWithIntent(keyword: string): string[] {
  return PURCHASE_INTENT_KEYWORDS.keywords.map((intent) => `${keyword} ${intent.keyword}`);
}
