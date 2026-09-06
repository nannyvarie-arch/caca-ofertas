import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { notFound } from '../lib/apiError';
import { getPrisma } from '../db/prisma';

export interface SearchKeywordRouteDeps {
  resolveUser: CurrentUserResolver;
}

const NICHE_KEYWORDS: Record<string, Record<string, string[]>> = {
  'Emagrecimento/Fitness': {
    'Emagrecimento': ['emagrecimento', 'perder peso', 'dieta para emagrecer', 'como emagrecer rápido', 'barriga chapada'],
    'Musculação': ['treino em casa', 'exercícios para emagrecer', 'musculação feminina', 'treino funcional'],
    'Suplementos': ['whey protein', 'termogênico', 'creatina', 'suplemento para emagrecer'],
  },
  'Receitas/Culinária': {
    'Receitas Low Calorie': ['receitas low carb', 'receitas para emagrecer', 'receitas saudáveis', 'receitas fitness'],
    'Receituário': ['receituário completo', 'livro de receitas', 'receitas fáceis', 'receitas rápidas'],
    'Confeitaria': ['curso de confeitaria', 'receitas de bolos', 'decoração de bolos'],
  },
  'Artesanato': {
    'Crochê': ['aula de crochê', 'crochê para iniciantes', 'padrões de crochê', 'crochê rentável'],
    'Mãos Livres': ['artesanato para vender', 'ideias de artesanato', 'lucro com artesanato'],
    'Bijuterias': ['como fazer bijuterias', 'curso de bijuterias', 'materiais para bijuterias'],
  },
  'Educação Infantil': {
    'Atividades': ['atividades para crianças', 'atividades pedagógicas', 'folhas de atividades'],
    'Material Escolar': ['material educativo', 'apostila infantil', 'jogos educativos'],
    ' alfabetização': ['método de alfabetização', 'como ensinar a ler', 'alfabetização divertida'],
  },
  'Concursos/Estudos': {
    'Provas': ['preparação para concurso', 'prova de concurso', 'edital de concurso'],
    'Apostilas': ['apostila de concurso', 'material para concurso', 'curso para concurso'],
    'Estudos': ['técnicas de estudo', 'como estudar para provas', 'cronograma de estudos'],
  },
  'Renda Extra/Empreendedorismo': {
    'Renda Extra': ['renda extra', 'como ganhar dinheiro extra', 'trabalho extra de casa'],
    'Dropshipping': ['dropshipping brasil', 'como começar dropshipping', 'fornecedor dropshipping'],
    'Infoprodutos': ['criar infoproduto', 'como vender infoprodutos', 'lançamento de infoproduto'],
  },
  'Marketing Digital': {
    'Tráfego Pago': ['tráfego pago', 'facebook ads', 'google ads', 'anúncios online'],
    'Copywriting': ['copywriting', 'como vender com texto', 'páginas de venda'],
    'Social Media': ['gestão de redes sociais', 'marketing de conteúdo', 'instagram para empresas'],
  },
  'Beleza': {
    'Maquiagem': ['aula de maquiagem', 'maquiagem profissional', 'curso de maquiagem'],
    'Cuidados com a Pele': ['skincare', 'rotina de skincare', 'cuidados com a pele'],
    'Cabelos': ['tratamento capilar', 'cuidados com o cabelo', 'produtos para cabelo'],
  },
  'Maternidade': {
    'Gravidez': ['gestação saudável', 'preparação para o parto', 'cuidados na gravidez'],
    'Bebê': ['cuidados com o bebê', 'deco de berço', 'primeiros meses de vida'],
    'Amamentação': ['amamentação', 'dicas de amamentação', 'aleitamento materno'],
  },
  'Relacionamentos': {
    'Relacionamento': ['dicas de relacionamento', 'como reconquistar', 'comunicação no namoro'],
    'Autoconhecimento': ['autoconhecimento', 'desenvolvimento pessoal', 'autoestima'],
  },
  'Finanças Pessoais': {
    'Controle Financeiro': ['controle financeiro pessoal', 'como economizar', 'planilha de gastos'],
    'Investimentos': ['investimentos para iniciantes', 'renda fixa', 'como investir'],
    'Dívidas': ['quitar dívidas', 'negociação de dívidas', 'sair do sufoco financeiro'],
  },
  'Desenvolvimento Pessoal': {
    'Produtividade': ['produtividade pessoal', 'gestão de tempo', 'hábitos produtivos'],
    'Mindset': ['mindset de sucesso', 'pensamento positivo', 'motivação diária'],
    'Liderança': ['liderança', 'gestão de equipes', 'desenvolvimento de liderança'],
  },
  'Idiomas': {
    'Inglês': ['aprender inglês', 'curso de inglês', 'inglês para iniciantes'],
    'Espanhol': ['curso de espanhol', 'aprender espanhol', 'espanhol básico'],
    'Outros': ['curso de francês', 'curso de alemão', 'curso de italiano'],
  },
  'Espiritualidade': {
    'Meditação': ['meditação guiada', 'como meditar', 'meditação para iniciantes'],
    'Yoga': ['yoga em casa', 'aula de yoga', 'yoga para iniciantes'],
    'Desenvolvimento Espiritual': ['desenvolvimento espiritual', 'espiritualidade', 'meditação profunda'],
  },
  'Casa/Organização': {
    'Organização': ['organização doméstica', 'como organizar a casa', 'decluttering'],
    'Decoração': ['decoração de ambientes', 'dicas de decoração', 'casa organizada'],
    'Limpeza': ['dicas de limpeza', 'limpeza profunda', 'produtos de limpeza caseiros'],
  },
  'Pets': {
    'Cachorros': ['cuidados com cachorro', 'treinamento de cachorro', 'alimentação canina'],
    'Gatos': ['cuidados com gatos', 'gatos de estimação', 'alimentação felina'],
    'Outros Pets': ['como cuidar de pet', 'pet shop em casa', 'saúde animal'],
  },
  'Saúde/Bem-estar': {
    'Saúde Natural': ['remédio natural', 'fitoterapia', 'medicina natural'],
    'Ansiedade': ['como controlar ansiedade', 'ansiedade tratamento', 'dicas para ansiedade'],
    'Dor nas Costas': ['dor nas costas tratamento', 'exercícios para dor nas costas', 'coluna saudável'],
  },
  'Intenção de Compra': {
    'Ebooks': ['ebook gratuito', 'ebook para download', 'livro digital'],
    'Cursos': ['curso online barato', 'curso rápido', 'curso com certificado'],
    'Planilhas': ['planilha de controle', 'planilha financeira', 'planilha para celular'],
  },
};

export function registerSearchKeywordRoutes(app: FastifyInstance, deps: SearchKeywordRouteDeps): void {
  const prisma = getPrisma();

  app.get('/api/keywords', async () => {
    const keywords: { keyword: string; niche: string; subniche: string }[] = [];
    for (const [niche, subniches] of Object.entries(NICHE_KEYWORDS)) {
      for (const [subniche, kws] of Object.entries(subniches)) {
        for (const kw of kws) {
          keywords.push({ keyword: kw, niche, subniche });
        }
      }
    }
    return { success: true, data: keywords, total: keywords.length };
  });

  app.get('/api/keywords/favorites', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const favorites = await prisma.keywordFavorite.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { success: true, data: favorites.map(f => ({ id: f.id, keyword: f.keyword, niche: f.niche })) };
  });

  app.post('/api/keywords/favorites', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { keyword: string; niche?: string };
    if (!body.keyword?.trim()) return { success: false, error: 'keyword obrigatória.' };
    const fav = await prisma.keywordFavorite.upsert({
      where: { userId_keyword: { userId, keyword: body.keyword.trim() } },
      create: { userId, keyword: body.keyword.trim(), niche: body.niche },
      update: {},
    });
    return { success: true, data: { id: fav.id, keyword: fav.keyword, niche: fav.niche } };
  });

  app.delete('/api/keywords/favorites/:keyword', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { keyword } = request.params as { keyword: string };
    await prisma.keywordFavorite.deleteMany({ where: { userId, keyword: decodeURIComponent(keyword) } });
    return { success: true };
  });

  app.post('/api/search/keyword', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { keyword: string; filters?: any };
    if (!body.keyword?.trim()) return { success: false, error: 'keyword obrigatória.' };

    await prisma.miningSearch.create({ data: { userId, query: body.keyword.trim(), type: 'manual' } });

    const jobId = 'kw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

    return { success: true, data: { jobId, keyword: body.keyword.trim(), status: 'pending', message: 'Busca iniciada. Os resultados aparecerão em Ofertas Mineradas quando a extensão coletar os dados.' } };
  });

  app.get('/api/search/keyword/:jobId', async (request) => {
    const { jobId } = request.params as { jobId: string };
    return { success: true, data: { jobId, status: 'pending', message: 'Busca aguardando coleta pela extensão.' } };
  });
}
