# Site — Mizayana Oliveira · Serviços Contábeis

Site estático (HTML + CSS + JS puro, sem build) pronto para o **Netlify Drop**.

## Como publicar
1. Acesse https://app.netlify.com/drop
2. Arraste **a pasta `site-mizayana` inteira** (ou descompacte o `.zip` e arraste a pasta).
3. Pronto. Para receber as solicitações do formulário:
   - No painel do site: **Forms → Enable form detection**.
   - Faça o deploy de novo (arraste a pasta outra vez) para o Netlify detectar o formulário `solicitacao`.
   - Em **Forms → Form notifications**, adicione um e-mail para receber cada solicitação.

Mesmo sem o Netlify Forms ativo, o cliente nunca fica sem resposta: se o envio falhar,
o site oferece abrir o WhatsApp com o resumo pronto.

## Estrutura
```
index.html            Página principal
obrigado.html         Página de confirmação (fallback sem JavaScript)
404.html              Página de erro
design-system.html    Guia da identidade visual (não indexado)
assets/css/style.css  Design system (tokens + componentes)
assets/js/main.js     Menu, animações e formulário em etapas
assets/img/           Fotos, monograma, ícones e imagem de compartilhamento
_headers              Cache e cabeçalhos de segurança do Netlify
```

## Onde editar
- **Telefones / WhatsApp:** procure `5574999531947` e `5574991245219` no `index.html` e no `main.js`.
- **Instagram:** procure `mizayaneoliveira`.
- **Cores e fontes:** variáveis no topo do `style.css`.
- **Link direto para um serviço no formulário:** `seusite.netlify.app/?servico=abertura#contato`
  (valores: `abertura`, `regularizacao`, `orientacao`, `contratos`, `documentos`, `inss_obras`, `docs_obras`).
