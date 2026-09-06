// CAÇAOFERTA — Componentes do Criador de E-books
// Editor de blocos premium com diagramação profissional.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, Trash2, GripVertical, Copy, Image as ImageIcon, Type, Heading1, Heading2,
  List, Quote, AlertTriangle, BookOpen, LayoutTemplate, Star, ChevronDown, ChevronUp,
  Palette, Download, Loader2, Eye, EyeOff, Save, FileText, X, Check, Upload,
  Smartphone, Monitor, Tablet, Frame, Paintbrush, Wand2, FileImage, Bold, Italic,
  Link as LinkIcon, ListOrdered, CheckSquare, Minus, PanelLeftClose, PanelLeft,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────── */

export interface EbookBlock {
  id: string;
  type: string;
  [key: string]: any;
}

export interface EbookData {
  id: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  description: string | null;
  themeId: string;
  coverConfig: any;
  content: EbookBlock[];
  status: string;
  pageCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EbookAssetItem {
  id: string;
  url: string;
  fileName: string | null;
  kind: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  createdAt: string;
}

/* ─── Themes ─────────────────────────────────────────────────────── */

export const EBOOK_THEMES = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Serif clássica + sans humanista, margens generosas, fólios elegantes',
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Merriweather', 'Times New Roman', serif",
    textColor: '#1a1a1a',
    accentColor: '#8b0000',
    accentBg: '#fdf2f2',
    coverGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    previewBg: '#faf8f5',
  },
  {
    id: 'moderno',
    name: 'Moderno',
    description: 'Sans geométrica, grid forte, cor de acento, números grandes',
    headingFont: "'Inter', Helvetica, sans-serif",
    bodyFont: "'Inter', Helvetica, sans-serif",
    textColor: '#111',
    accentColor: '#6366f1',
    accentBg: '#eef2ff',
    coverGradient: 'linear-gradient(135deg, #0f0f23 0%, #1e1b4b 50%, #312e81 100%)',
    previewBg: '#ffffff',
  },
  {
    id: 'minimal',
    name: 'Minimal Luxo',
    description: 'Espaço em branco, serif fina, detalhes dourados, capas sóbrias',
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Inter', Helvetica, sans-serif",
    textColor: '#1a1a1a',
    accentColor: '#b8860b',
    accentBg: '#faf9f5',
    coverGradient: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',
    previewBg: '#fefdfb',
  },
  {
    id: 'revista',
    name: 'Revista',
    description: 'Colunas, box de destaque, imagens full-bleed, legendas, kicker',
    headingFont: "'Inter', Helvetica, sans-serif",
    bodyFont: "'Inter', Helvetica, sans-serif",
    textColor: '#222',
    accentColor: '#e11d48',
    accentBg: '#fff1f2',
    coverGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)',
    previewBg: '#ffffff',
  },
  {
    id: 'workbook',
    name: 'Workbook / Curso',
    description: 'Espaços para anotação, checklists, caixas de exercício, cor vibrante',
    headingFont: "'Inter', Helvetica, sans-serif",
    bodyFont: "'Inter', Helvetica, sans-serif",
    textColor: '#1a1a1a',
    accentColor: '#059669',
    accentBg: '#ecfdf5',
    coverGradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    previewBg: '#f9fafb',
  },
];

/* ─── Block Palette ──────────────────────────────────────────────── */

const BLOCK_TYPES = [
  { type: 'chapter', label: 'Capítulo', icon: BookOpen },
  { type: 'heading', label: 'Título (H2)', icon: Heading1 },
  { type: 'heading3', label: 'Subtítulo (H3)', icon: Heading2 },
  { type: 'paragraph', label: 'Parágrafo', icon: Type },
  { type: 'list', label: 'Lista', icon: List },
  { type: 'checklist', label: 'Checklist', icon: CheckSquare },
  { type: 'quote', label: 'Citação', icon: Quote },
  { type: 'callout', label: 'Callout / Destaque', icon: AlertTriangle },
  { type: 'image', label: 'Imagem', icon: ImageIcon },
  { type: 'table', label: 'Tabela', icon: FileText },
  { type: 'divider', label: 'Divisor', icon: Minus },
  { type: 'pagebreak', label: 'Quebra de Página', icon: FileText },
  { type: 'cta', label: 'Caixa CTA', icon: Star },
  { type: 'toc', label: 'Sumário', icon: ListOrdered },
];

function uid(): string {
  return 'blk-' + Math.random().toString(36).slice(2, 10);
}

function createDefaultBlock(type: string): EbookBlock {
  const base: EbookBlock = { id: uid(), type };
  switch (type) {
    case 'chapter': return { ...base, number: 1, title: 'Novo Capítulo' };
    case 'heading': return { ...base, text: 'Título da seção' };
    case 'heading3': return { ...base, text: 'Subtítulo' };
    case 'paragraph': return { ...base, text: 'Escreva seu texto aqui...', dropCap: false };
    case 'list': return { ...base, items: ['Item 1', 'Item 2', 'Item 3'], ordered: false };
    case 'checklist': return { ...base, items: [{ text: 'Tarefa 1', checked: false }, { text: 'Tarefa 2', checked: false }] };
    case 'quote': return { ...base, text: '"Uma citação inspiradora."', author: '' };
    case 'callout': return { ...base, text: 'Texto de destaque.', label: 'Dica', variant: 'info' };
    case 'image': return { ...base, url: '', caption: '', layout: 'column', assetId: null };
    case 'table': return { ...base, rows: [['Cabeçalho 1', 'Cabeçalho 2'], ['Dados 1', 'Dados 2']] };
    case 'divider': return base;
    case 'pagebreak': return base;
    case 'cta': return { ...base, text: 'Acesse o conteúdo exclusivo', url: '', label: 'Acessar agora' };
    case 'toc': return base;
    default: return base;
  }
}

/* ─── Main Editor Component ──────────────────────────────────────── */

export function EbookEditor({ ebookId, onBack }: { ebookId: string; onBack: () => void }) {
  const [ebook, setEbook] = useState<EbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showBlockPalette, setShowBlockPalette] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [assets, setAssets] = useState<EbookAssetItem[]>([]);
  const [showAssets, setShowAssets] = useState(false);
  const [generatingMockup, setGeneratingMockup] = useState(false);
  const [mockupFrame, setMockupFrame] = useState('book3d');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const themeType = EBOOK_THEMES[0];
  if (!themeType) throw new Error('No themes defined');
  const [theme, setTheme] = useState(themeType);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEbook();
    fetchAssets();
  }, [ebookId]);

  useEffect(() => {
    const t = EBOOK_THEMES.find((th) => th.id === ebook?.themeId) ?? themeType;
    setTheme(t);
  }, [ebook?.themeId]);

  async function fetchEbook() {
    try {
      const res = await fetch(`/api/ebooks/${ebookId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setEbook(data.data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function fetchAssets() {
    try {
      const res = await fetch(`/api/ebooks/${ebookId}/assets`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAssets(data.data ?? []);
      }
    } catch { /* ignore */ }
  }

  const autosave = useCallback((updatedContent: EbookBlock[], extra?: Partial<EbookData>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const body: any = { content: updatedContent, ...extra };
        const res = await fetch(`/api/ebooks/${ebookId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setEbook(data.data);
        }
      } catch { /* ignore */ }
      setSaving(false);
    }, 800);
  }, [ebookId]);

  function updateBlock(blockId: string, updates: Partial<EbookBlock>) {
    if (!ebook) return;
    const newContent = ebook.content.map((b) => (b.id === blockId ? { ...b, ...updates } : b));
    setEbook({ ...ebook, content: newContent });
    autosave(newContent);
  }

  function addBlock(type: string, afterId?: string) {
    if (!ebook) return;
    const newBlock = createDefaultBlock(type);
    let newContent: EbookBlock[];
    if (afterId) {
      const idx = ebook.content.findIndex((b) => b.id === afterId);
      newContent = [...ebook.content.slice(0, idx + 1), newBlock, ...ebook.content.slice(idx + 1)];
    } else {
      newContent = [...ebook.content, newBlock];
    }
    setEbook({ ...ebook, content: newContent });
    autosave(newContent);
    setSelectedBlockId(newBlock.id);
    setShowBlockPalette(false);
  }

  function removeBlock(blockId: string) {
    if (!ebook) return;
    const newContent = ebook.content.filter((b) => b.id !== blockId);
    setEbook({ ...ebook, content: newContent });
    autosave(newContent);
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  }

  function duplicateBlock(blockId: string) {
    if (!ebook) return;
    const block = ebook.content.find((b) => b.id === blockId);
    if (!block) return;
    const dup = { ...structuredClone(block), id: uid() };
    const idx = ebook.content.findIndex((b) => b.id === blockId);
    const newContent = [...ebook.content.slice(0, idx + 1), dup, ...ebook.content.slice(idx + 1)];
    setEbook({ ...ebook, content: newContent });
    autosave(newContent);
  }

  function moveBlock(blockId: string, direction: 'up' | 'down') {
    if (!ebook) return;
    const idx = ebook.content.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= ebook.content.length) return;
    const newContent = [...ebook.content];
    const temp = newContent[idx]!;
    newContent[idx] = newContent[newIdx]!;
    newContent[newIdx] = temp;
    setEbook({ ...ebook, content: newContent });
    autosave(newContent);
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/ebooks/${ebookId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperSize: 'A4' }),
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/pdf')) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${(ebook?.title ?? 'ebook').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const text = await res.text();
          const blob = new Blob([text], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${(ebook?.title ?? 'ebook').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setExportError(data.error?.message ?? 'Erro ao exportar.');
      }
    } catch {
      setExportError('Erro ao conectar com a API.');
    }
    setExporting(false);
  }

  async function handleGenerateMockup() {
    if (assets.length === 0) return;
    const assetId = assets[0]?.id;
    if (!assetId) return;
    setGeneratingMockup(true);
    try {
      const res = await fetch(`/api/ebooks/${ebookId}/mockup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, frame: mockupFrame }),
      });
      if (res.ok) {
        const data = await res.json();
        setAssets((prev) => [data.data, ...prev]);
      }
    } catch { /* ignore */ }
    setGeneratingMockup(false);
  }

  async function handleGenerateAI() {
    if (!aiPrompt.trim()) return;
    setGeneratingImage(true);
    try {
      const res = await fetch(`/api/ebooks/${ebookId}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setAssets((prev) => [data.data, ...prev]);
        setAiPrompt('');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error?.message ?? 'Erro ao gerar imagem.');
      }
    } catch { /* ignore */ }
    setGeneratingImage(false);
  }

  async function handleUploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/ebooks/${ebookId}/assets`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAssets((prev) => [data.data, ...prev]);
      }
    } catch { /* ignore */ }
  }

  async function handleDeleteAsset(assetId: string) {
    try {
      await fetch(`/api/ebooks/${ebookId}/assets/${assetId}`, { method: 'DELETE' });
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!ebook) {
    return (
      <div className="text-center py-20">
        <p className="text-white text-lg">E-book não encontrado.</p>
        <button onClick={onBack} className="mt-4 text-brand-400 hover:text-brand-300 text-sm">← Voltar</button>
      </div>
    );
  }

  const coverBlock = ebook.content.find((b) => b.type === 'cover');
  const estimatedPages = Math.max(1, Math.ceil(ebook.content.filter((b) => b.type === 'paragraph' || b.type === 'heading' || b.type === 'chapter').length / 3));

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* LEFT: Block List */}
      <div className="w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col overflow-hidden shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800">
          <button onClick={onBack} className="text-sm text-neutral-400 hover:text-white mb-2 flex items-center gap-1">
            ← E-books
          </button>
          <input
            type="text"
            value={ebook.title}
            onChange={(e) => {
              const newTitle = e.target.value;
              setEbook({ ...ebook, title: newTitle });
              autosave(ebook.content, { title: newTitle });
            }}
            className="w-full bg-transparent text-white font-bold text-lg outline-none border-b border-transparent focus:border-brand-600 transition-colors"
            placeholder="Título do e-book"
          />
          <div className="flex items-center gap-2 mt-2">
            {saving ? (
              <span className="text-xs text-yellow-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Salvando...</span>
            ) : (
              <span className="text-xs text-green-400 flex items-center gap-1"><Check className="h-3 w-3" /> Salvo</span>
            )}
            <span className="text-xs text-neutral-500">· {estimatedPages} pág.</span>
          </div>
        </div>

        {/* Block List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1" ref={contentRef}>
          {ebook.content.map((block, idx) => (
            <div
              key={block.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors group ${
                selectedBlockId === block.id
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-transparent'
              }`}
              onClick={() => setSelectedBlockId(block.id)}
            >
              <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0" />
              <span className="truncate flex-1">
                {block.type === 'cover' && '📘 Capa'}
                {block.type === 'chapter' && `📖 Cap. ${block.number ?? ''}: ${block.title ?? ''}`}
                {block.type === 'heading' && `H2: ${block.text ?? ''}`}
                {block.type === 'heading3' && `H3: ${block.text ?? ''}`}
                {block.type === 'paragraph' && `¶ ${(block.text ?? '').slice(0, 30)}...`}
                {block.type === 'list' && `• Lista (${(block.items ?? []).length} itens)`}
                {block.type === 'checklist' && `☑ Checklist`}
                {block.type === 'quote' && `❝ Citação`}
                {block.type === 'callout' && `⚠ ${block.label ?? 'Callout'}`}
                {block.type === 'image' && `🖼 Imagem`}
                {block.type === 'table' && `⊞ Tabela`}
                {block.type === 'divider' && `—— Divisor`}
                {block.type === 'pagebreak' && ` page break`}
                {block.type === 'cta' && `🎯 CTA`}
                {block.type === 'toc' && `📑 Sumário`}
              </span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }} className="p-0.5 hover:text-white" title="Mover acima"><ChevronUp className="h-3 w-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }} className="p-0.5 hover:text-white" title="Mover abaixo"><ChevronDown className="h-3 w-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="p-0.5 hover:text-white" title="Duplicar"><Copy className="h-3 w-3" /></button>
                {block.type !== 'cover' && (
                  <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-0.5 hover:text-red-400" title="Excluir"><Trash2 className="h-3 w-3" /></button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Block Button */}
        <div className="p-3 border-t border-neutral-800">
          <button
            onClick={() => setShowBlockPalette(!showBlockPalette)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Adicionar Bloco
          </button>
          {showBlockPalette && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {BLOCK_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => addBlock(bt.type)}
                  className="flex items-center gap-1.5 px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-300 hover:text-white transition-colors"
                >
                  <bt.icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{bt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Block Editor */}
      <div className="flex-1 overflow-y-auto bg-neutral-950">
        {selectedBlockId && ebook.content.find((b) => b.id === selectedBlockId) ? (
          <BlockEditor
            block={ebook.content.find((b) => b.id === selectedBlockId)!}
            onUpdate={(updates) => updateBlock(selectedBlockId, updates)}
            assets={assets}
            onUploadImage={handleUploadImage}
            onSelectAsset={(url, assetId) => updateBlock(selectedBlockId, { url, assetId })}
            theme={theme}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <LayoutTemplate className="h-12 w-12 text-neutral-700 mb-4" />
            <p className="text-neutral-500 text-lg font-medium">Selecione um bloco para editar</p>
            <p className="text-neutral-600 text-sm mt-2">ou adicione um novo bloco na lista à esquerda</p>
          </div>
        )}
      </div>

      {/* RIGHT: Preview + Settings */}
      <div className={`bg-neutral-900 border-l border-neutral-800 flex flex-col overflow-hidden transition-all ${showPreview ? 'w-[420px]' : 'w-12'}`}>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="p-3 border-b border-neutral-800 hover:bg-neutral-800 transition-colors flex items-center gap-2 text-neutral-400 hover:text-white"
        >
          {showPreview ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          {showPreview && <span className="text-xs font-medium">Preview</span>}
        </button>
        {showPreview && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Theme Selector */}
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Tema</label>
              <select
                value={ebook.themeId}
                onChange={(e) => {
                  const newTheme = e.target.value;
                  setEbook({ ...ebook, themeId: newTheme });
                  autosave(ebook.content, { themeId: newTheme });
                }}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-600"
              >
                {EBOOK_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Meta Fields */}
            <div className="space-y-2">
              <input
                type="text"
                value={ebook.subtitle ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setEbook({ ...ebook, subtitle: v });
                  autosave(ebook.content, { subtitle: v });
                }}
                placeholder="Subtítulo"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-brand-600"
              />
              <input
                type="text"
                value={ebook.author ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setEbook({ ...ebook, author: v });
                  autosave(ebook.content, { author: v });
                }}
                placeholder="Autor"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            {/* Preview */}
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Preview</label>
              <div
                className="rounded-lg border border-neutral-700 overflow-hidden"
                style={{ background: theme.previewBg }}
              >
                <EbookPreview content={ebook.content} theme={theme} coverConfig={ebook.coverConfig} />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {/* Export */}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Exportar PDF
              </button>
              {exportError && <p className="text-xs text-red-400">{exportError}</p>}

              {/* Mockup */}
              <div className="bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-neutral-400 mb-2 font-medium">Mockup de Frame</p>
                <div className="flex gap-1 mb-2">
                  {[
                    { id: 'book3d', icon: BookOpen, label: 'Livro 3D' },
                    { id: 'phone', icon: Smartphone, label: 'Celular' },
                    { id: 'notebook', icon: Monitor, label: 'Notebook' },
                    { id: 'frame', icon: Frame, label: 'Quadro' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setMockupFrame(f.id)}
                      className={`flex-1 p-2 rounded text-xs flex flex-col items-center gap-1 transition-colors ${
                        mockupFrame === f.id ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30' : 'bg-neutral-700 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <f.icon className="h-4 w-4" />
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGenerateMockup}
                  disabled={generatingMockup || assets.length === 0}
                  className="w-full py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {generatingMockup ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  Gerar Mockup
                </button>
                {assets.length === 0 && <p className="text-[10px] text-neutral-500 mt-1">Faça upload de uma imagem primeiro</p>}
              </div>

              {/* AI Image */}
              <div className="bg-neutral-800 rounded-lg p-3">
                <p className="text-xs text-neutral-400 mb-2 font-medium">Imagem por IA</p>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Descreva a imagem desejada..."
                  className="w-full bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-brand-600 mb-2"
                />
                <button
                  onClick={handleGenerateAI}
                  disabled={generatingImage || !aiPrompt.trim()}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {generatingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paintbrush className="h-3 w-3" />}
                  Gerar Imagem
                </button>
                <p className="text-[10px] text-neutral-500 mt-1">Requer OPENAI_API_KEY no Render</p>
              </div>

              {/* Assets Gallery */}
              <div>
                <button
                  onClick={() => setShowAssets(!showAssets)}
                  className="w-full flex items-center justify-between py-2 text-xs text-neutral-400 hover:text-white"
                >
                  <span>Galeria de Assets ({assets.length})</span>
                  {showAssets ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showAssets && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {assets.map((asset) => (
                      <div key={asset.id} className="relative group rounded overflow-hidden border border-neutral-700">
                        <img src={asset.url} alt="" className="w-full h-16 object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                          <button
                            onClick={() => {
                              if (selectedBlockId) {
                                updateBlock(selectedBlockId, { url: asset.url, assetId: asset.id });
                              }
                            }}
                            className="p-1 bg-brand-600 rounded text-white"
                            title="Usar no bloco"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1 bg-red-600 rounded text-white"
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-neutral-300 px-1 py-0.5 text-center">{asset.kind}</span>
                      </div>
                    ))}
                    <label className="flex flex-col items-center justify-center h-16 border border-dashed border-neutral-600 rounded cursor-pointer hover:border-brand-500 transition-colors">
                      <Upload className="h-4 w-4 text-neutral-500" />
                      <span className="text-[9px] text-neutral-500">Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file);
                      }} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Block Editor ───────────────────────────────────────────────── */

function BlockEditor({
  block,
  onUpdate,
  assets,
  onUploadImage,
  onSelectAsset,
  theme,
}: {
  block: EbookBlock;
  onUpdate: (updates: Partial<EbookBlock>) => void;
  assets: EbookAssetItem[];
  onUploadImage: (file: File) => void;
  onSelectAsset: (url: string, assetId: string) => void;
  theme: typeof EBOOK_THEMES[0];
}) {
  if (!block) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-neutral-500 uppercase tracking-wider">
          {block.type === 'cover' ? '📘 Capa' :
           block.type === 'chapter' ? `📖 Capítulo ${block.number ?? ''}` :
           block.type}
        </span>
      </div>

      {/* COVER */}
      {block.type === 'cover' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Título</label>
            <input
              type="text"
              value={block.title ?? ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white text-2xl font-bold outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Subtítulo</label>
            <input
              type="text"
              value={block.subtitle ?? ''}
              onChange={(e) => onUpdate({ subtitle: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Autor</label>
            <input
              type="text"
              value={block.author ?? ''}
              onChange={(e) => onUpdate({ author: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <ImagePicker
            assets={assets}
            currentUrl={block.imageUrl}
            onUpload={onUploadImage}
            onSelect={(url, id) => onUpdate({ imageUrl: url, assetId: id })}
            label="Imagem de fundo"
          />
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Gradiente de Fundo</label>
            <input
              type="text"
              value={block.gradient ?? ''}
              onChange={(e) => onUpdate({ gradient: e.target.value })}
              placeholder="linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
        </div>
      )}

      {/* CHAPTER */}
      {block.type === 'chapter' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-24">
              <label className="text-xs text-neutral-400 mb-1 block">Número</label>
              <input
                type="number"
                value={block.number ?? 1}
                onChange={(e) => onUpdate({ number: parseInt(e.target.value) || 1 })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white text-center text-2xl font-bold outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-neutral-400 mb-1 block">Título do Capítulo</label>
              <input
                type="text"
                value={block.title ?? ''}
                onChange={(e) => onUpdate({ title: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white text-xl font-bold outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* HEADING */}
      {(block.type === 'heading' || block.type === 'heading3') && (
        <input
          type="text"
          value={block.text ?? ''}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white text-xl font-bold outline-none focus:ring-2 focus:ring-brand-600"
          placeholder="Título da seção"
        />
      )}

      {/* PARAGRAPH */}
      {block.type === 'paragraph' && (
        <div className="space-y-3">
          <textarea
            value={block.text ?? ''}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={6}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand-600 resize-y leading-relaxed"
            placeholder="Escreva seu texto aqui..."
          />
          <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={block.dropCap ?? false}
              onChange={(e) => onUpdate({ dropCap: e.target.checked })}
              className="rounded border-neutral-600"
            />
            Drop cap (letra destacada no início)
          </label>
        </div>
      )}

      {/* LIST */}
      {block.type === 'list' && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={block.ordered ?? false}
              onChange={(e) => onUpdate({ ordered: e.target.checked })}
              className="rounded border-neutral-600"
            />
            Lista numerada
          </label>
          {(block.items ?? []).map((item: string, idx: number) => (
            <div key={idx} className="flex gap-2">
              <span className="text-neutral-600 text-sm mt-2 w-4">{block.ordered ? `${idx + 1}.` : '•'}</span>
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const newItems = [...(block.items ?? [])];
                  newItems[idx] = e.target.value;
                  onUpdate({ items: newItems });
                }}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-brand-600"
              />
              <button
                onClick={() => {
                  const newItems = (block.items ?? []).filter((_: string, i: number) => i !== idx);
                  onUpdate({ items: newItems });
                }}
                className="text-neutral-600 hover:text-red-400 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onUpdate({ items: [...(block.items ?? []), 'Novo item'] })}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Adicionar item
          </button>
        </div>
      )}

      {/* CHECKLIST */}
      {block.type === 'checklist' && (
        <div className="space-y-2">
          {(block.items ?? []).map((item: { text: string; checked: boolean }, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => {
                  const newItems = [...(block.items ?? [])];
                  newItems[idx] = { ...newItems[idx], checked: e.target.checked };
                  onUpdate({ items: newItems });
                }}
                className="rounded border-neutral-600"
              />
              <input
                type="text"
                value={item.text}
                onChange={(e) => {
                  const newItems = [...(block.items ?? [])];
                  newItems[idx] = { ...newItems[idx], text: e.target.value };
                  onUpdate({ items: newItems });
                }}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-brand-600"
              />
              <button
                onClick={() => {
                  const newItems = (block.items ?? []).filter((_: any, i: number) => i !== idx);
                  onUpdate({ items: newItems });
                }}
                className="text-neutral-600 hover:text-red-400 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onUpdate({ items: [...(block.items ?? []), { text: 'Nova tarefa', checked: false }] })}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Adicionar tarefa
          </button>
        </div>
      )}

      {/* QUOTE */}
      {block.type === 'quote' && (
        <div className="space-y-3">
          <textarea
            value={block.text ?? ''}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={3}
            className="w-full bg-neutral-900 border-l-4 border-brand-600 rounded-r-xl px-4 py-3 text-white italic outline-none focus:ring-2 focus:ring-brand-600 resize-y"
            placeholder="Citação..."
          />
          <input
            type="text"
            value={block.author ?? ''}
            onChange={(e) => onUpdate({ author: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="Autor (opcional)"
          />
        </div>
      )}

      {/* CALLOUT */}
      {block.type === 'callout' && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={block.label ?? ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-40 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white text-sm font-bold outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Dica"
            />
            <select
              value={block.variant ?? 'info'}
              onChange={(e) => onUpdate({ variant: e.target.value })}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="info">ℹ️ Info</option>
              <option value="warning">⚠️ Atenção</option>
              <option value="success">✅ Sucesso</option>
            </select>
          </div>
          <textarea
            value={block.text ?? ''}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={3}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand-600 resize-y"
            placeholder="Texto do callout..."
          />
        </div>
      )}

      {/* IMAGE */}
      {block.type === 'image' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Modo de diagramação</label>
            <div className="flex gap-2">
              {[
                { id: 'full-bleed', label: 'Full-bleed (sangra)' },
                { id: 'column', label: 'Largura da coluna' },
                { id: 'side', label: 'Meia-página lateral' },
                { id: 'gallery', label: 'Galeria 2×2' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => onUpdate({ layout: m.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    block.layout === m.id
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white border border-transparent'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <ImagePicker
            assets={assets}
            currentUrl={block.url}
            onUpload={onUploadImage}
            onSelect={(url, id) => onUpdate({ url, assetId: id })}
            label="Imagem"
          />
          <input
            type="text"
            value={block.caption ?? ''}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="Legenda (opcional)"
          />
        </div>
      )}

      {/* TABLE */}
      {block.type === 'table' && (
        <div className="space-y-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody>
                {(block.rows ?? []).map((row: string[], rowIdx: number) => (
                  <tr key={rowIdx}>
                    {row.map((cell: string, cellIdx: number) => (
                      <td key={cellIdx} className="border border-neutral-700 p-0">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => {
                            const newRows = [...(block.rows ?? [])];
                            newRows[rowIdx] = [...newRows[rowIdx]];
                            newRows[rowIdx][cellIdx] = e.target.value;
                            onUpdate({ rows: newRows });
                          }}
                          className="w-full bg-transparent px-2 py-1.5 text-white text-sm outline-none focus:bg-neutral-800"
                        />
                      </td>
                    ))}
                    <td className="p-1">
                      <button
                        onClick={() => {
                          const newRows = (block.rows ?? []).filter((_: any, i: number) => i !== rowIdx);
                          onUpdate({ rows: newRows });
                        }}
                        className="text-neutral-600 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => {
              const cols = (block.rows ?? [])[0]?.length ?? 2;
              onUpdate({ rows: [...(block.rows ?? []), new Array(cols).fill('')] });
            }}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Adicionar linha
          </button>
        </div>
      )}

      {/* CTA */}
      {block.type === 'cta' && (
        <div className="space-y-3">
          <textarea
            value={block.text ?? ''}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={2}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand-600 resize-y"
            placeholder="Texto do CTA..."
          />
          <div className="flex gap-3">
            <input
              type="text"
              value={block.url ?? ''}
              onChange={(e) => onUpdate({ url: e.target.value })}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="URL de destino"
            />
            <input
              type="text"
              value={block.label ?? ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-40 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="Texto do botão"
            />
          </div>
        </div>
      )}

      {/* DIVIDER / PAGEBREAK / TOC — no editor needed */}
      {(block.type === 'divider' || block.type === 'pagebreak' || block.type === 'toc') && (
        <div className="text-center py-12 text-neutral-600">
          <p className="text-sm">
            {block.type === 'divider' && '—— Divisor decorativo ——'}
            {block.type === 'pagebreak' && 'Reducers de página (quebra automática)'}
            {block.type === 'toc' && '📑 Sumário (gerado automaticamente a partir dos capítulos)'}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Image Picker ───────────────────────────────────────────────── */

function ImagePicker({
  assets,
  currentUrl,
  onUpload,
  onSelect,
  label,
}: {
  assets: EbookAssetItem[];
  currentUrl: string;
  onUpload: (file: File) => void;
  onSelect: (url: string, assetId: string) => void;
  label: string;
}) {
  const [showGallery, setShowGallery] = useState(false);

  return (
    <div>
      <label className="text-xs text-neutral-400 mb-1 block">{label}</label>
      {currentUrl && (
        <div className="mb-2 rounded-lg overflow-hidden border border-neutral-700">
          <img src={currentUrl} alt="" className="w-full h-32 object-cover" />
        </div>
      )}
      <div className="flex gap-2">
        <label className="flex-1 flex items-center justify-center gap-2 py-2 bg-neutral-800 hover:bg-neutral-700 border border-dashed border-neutral-600 rounded-lg cursor-pointer text-xs text-neutral-400 hover:text-white transition-colors">
          <Upload className="h-3 w-3" /> Upload
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }} />
        </label>
        {assets.length > 0 && (
          <button
            onClick={() => setShowGallery(!showGallery)}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <FileImage className="h-3 w-3" /> Galeria ({assets.length})
          </button>
        )}
      </div>
      {showGallery && (
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {assets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => {
                onSelect(asset.url, asset.id);
                setShowGallery(false);
              }}
              className="rounded overflow-hidden border border-neutral-700 hover:border-brand-500 transition-colors"
            >
              <img src={asset.url} alt="" className="w-full h-14 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Preview Component ──────────────────────────────────────────── */

function EbookPreview({
  content,
  theme,
  coverConfig,
}: {
  content: EbookBlock[];
  theme: typeof EBOOK_THEMES[number];
  coverConfig: any;
}) {
  return (
    <div className="p-4 space-y-3 text-xs" style={{ fontFamily: theme.bodyFont, color: theme.textColor }}>
      {content.slice(0, 15).map((block) => {
        if (block.type === 'cover') {
          return (
            <div key={block.id} className="rounded-lg overflow-hidden" style={{ background: block.gradient ?? coverConfig?.gradient ?? theme.coverGradient }}>
              <div className="p-6 text-center text-white">
                <p className="font-bold text-sm" style={{ fontFamily: theme.headingFont }}>{block.title}</p>
                {block.subtitle && <p className="text-[10px] mt-1 opacity-80">{block.subtitle}</p>}
                {block.author && <p className="text-[9px] mt-2 opacity-60">{block.author}</p>}
              </div>
            </div>
          );
        }
        if (block.type === 'chapter') {
          return (
            <div key={block.id} className="text-center py-3 border-t border-b" style={{ borderColor: theme.accentColor + '33' }}>
              <p className="text-lg font-bold opacity-20" style={{ color: theme.accentColor, fontFamily: theme.headingFont }}>{block.number}</p>
              <p className="font-bold text-xs" style={{ fontFamily: theme.headingFont }}>{block.title}</p>
            </div>
          );
        }
        if (block.type === 'heading' || block.type === 'heading3') {
          return <p key={block.id} className="font-bold mt-2" style={{ fontFamily: theme.headingFont }}>{block.text}</p>;
        }
        if (block.type === 'paragraph') {
          return <p key={block.id} className="leading-relaxed text-[10px]">{block.text}</p>;
        }
        if (block.type === 'quote') {
          return (
            <blockquote key={block.id} className="border-l-2 pl-2 italic text-[10px]" style={{ borderColor: theme.accentColor }}>
              {block.text}
            </blockquote>
          );
        }
        if (block.type === 'callout') {
          return (
            <div key={block.id} className="p-2 rounded text-[10px]" style={{ background: theme.accentBg, borderLeft: `3px solid ${theme.accentColor}` }}>
              <strong>{block.label}: </strong>{block.text}
            </div>
          );
        }
        if (block.type === 'image' && block.url) {
          return <img key={block.id} src={block.url} alt="" className="w-full rounded" />;
        }
        return null;
      })}
    </div>
  );
}

/* ─── E-book List Page ───────────────────────────────────────────── */

export function EbookListPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [ebooks, setEbooks] = useState<EbookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEbooks();
  }, []);

  async function fetchEbooks() {
    try {
      const res = await fetch('/api/ebooks', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setEbooks(data.data ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/ebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Novo E-book', themeId: 'editorial' }),
      });
      if (res.ok) {
        const data = await res.json();
        onOpen(data.data.id);
      }
    } catch { /* ignore */ }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este e-book?')) return;
    try {
      await fetch(`/api/ebooks/${id}`, { method: 'DELETE' });
      setEbooks((prev) => prev.filter((e) => e.id !== id));
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Meus E-books</h1>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Meus E-books</h1>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Criar E-book
        </button>
      </div>

      {ebooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <p className="text-xl font-semibold text-white mb-2">Nenhum e-book ainda</p>
          <p className="text-sm text-neutral-400 max-w-md mb-4">
            Crie e-books premium com diagramação profissional, temas editáveis e exportação em PDF de alta qualidade.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors"
          >
            Criar meu primeiro e-book
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ebooks.map((ebook) => {
            const defaultTheme = EBOOK_THEMES[0]!;
            const theme = EBOOK_THEMES.find((t) => t.id === ebook.themeId) ?? defaultTheme;
            const blocks = (ebook.content as any[]) ?? [];
            const pageCount = Math.max(1, Math.ceil(blocks.filter((b: any) => ['paragraph', 'heading', 'chapter'].includes(b.type)).length / 3));
            return (
              <div
                key={ebook.id}
                className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition-colors group cursor-pointer"
                onClick={() => onOpen(ebook.id)}
              >
                <div className="h-32 relative" style={{ background: theme.coverGradient }}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                    <p className="font-bold text-sm text-center" style={{ fontFamily: theme.headingFont }}>
                      {ebook.title}
                    </p>
                    {ebook.subtitle && <p className="text-[10px] opacity-80 mt-1 text-center">{ebook.subtitle}</p>}
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${ebook.status === 'ready' ? 'bg-green-500/20 text-green-400' : 'bg-neutral-700 text-neutral-300'}`}>
                      {ebook.status === 'ready' ? 'Pronto' : 'Rascunho'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-white text-sm truncate">{ebook.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
                    <span>{pageCount} pág.</span>
                    <span>{theme.name}</span>
                    <span>{new Date(ebook.updatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(ebook.id); }}
                    className="text-xs text-neutral-500 hover:text-red-400 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
