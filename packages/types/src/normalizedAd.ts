/**
 * Forma canônica e normalizada de um anúncio produzida pelo parser.
 *
 * FASE 04: esta é a estrutura INTERNA do parser (valores/tokens em inglês:
 * status active/inactive/unknown, mídia image/video/carousel/unknown e
 * plataformas facebook/instagram/messenger/audience-network). A adaptação para
 * o domínio da aplicação (status/mídia em pt) é feita por um mapeamento fino
 * ao derivar o `ParsedAd` — nunca duplicar lógica de extração.
 *
 * Regra de ouro: nenhum campo é inventado. Valor não detectado = null
 * (listas ficam vazias). `status` nunca é null: ausência de evidência é
 * `unknown`, jamais `inactive`.
 */

export type NormalizedAdStatus = 'active' | 'inactive' | 'unknown';
export type NormalizedMediaType = 'image' | 'video' | 'carousel' | 'unknown';

export const NORMALIZED_PLATFORMS = ['facebook', 'instagram', 'messenger', 'audience-network'] as const;
export type NormalizedPlatform = (typeof NORMALIZED_PLATFORMS)[number];

/**
 * Confiança do parser (apenas para depuração/filtros internos).
 * NÃO é uma probabilidade nem deve ser exibida ao usuário como certeza.
 */
export type ParseConfidence = 'high' | 'medium' | 'low';

export interface NormalizedAd {
  /** ID oficial da Biblioteca de Anúncios (somente quando exposto). */
  adLibraryId: string | null;
  /** ID numérico da página anunciante (extraído do link de perfil). */
  pageId: string | null;
  pageName: string | null;
  status: NormalizedAdStatus;
  /** Data de início da veiculação (YYYY-MM-DD, calendário, sem fuso). */
  deliveryStartDate: string | null;
  /** Data de encerramento quando a Meta informa (YYYY-MM-DD). */
  deliveryStopDate: string | null;
  /**
   * Dias de veiculação (seção 12): ativo → hoje − início; encerrado com stop
   * → fim − início; caso contrário null.
   */
  runningDays: number | null;
  /** Plataformas de veiculação detectadas (normalizadas e sem duplicatas). */
  platforms: NormalizedPlatform[];
  mediaType: NormalizedMediaType;
  creativeText: string | null;
  headline: string | null;
  description: string | null;
  cta: string | null;
  destinationUrl: string | null;
  /** Domínio de destino normalizado (PSL) ou null quando não há destino. */
  destinationDomain: string | null;
  adSnapshotUrl: string | null;
  /**
   * URL da mídia principal do anúncio extraída da página (arquivo de vídeo
   * quando há vídeo; caso contrário a imagem do criativo exibida).
   */
  creativeUrl: string | null;
  /**
   * Representação em miniatura usada no card (poster de vídeo ou imagem do
   * criativo). Para image/carousel, a Meta renderiza o próprio criativo como
   * capa — sem evidência de um arquivo menor distinto, os dois apontam para o
   * mesmo asset extraído (nada é fabricado).
   */
  thumbnailUrl: string | null;
  parseConfidence: ParseConfidence;
}