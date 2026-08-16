# NexusToons Clean

Extensão privada/local para Brave ou Chromium que atua diretamente em `https://nexustoons.com/` e oculta elementos publicitários conhecidos sem clonar, alojar, descarregar, redistribuir ou intermediar conteúdo do NexusToons.

## O que faz

- Injeta um content script apenas em `nexustoons.com` e `www.nexustoons.com`.
- Oculta artefactos de publicidade com sinais fortes, como `ins.adsbygoogle`, atributos `data-ad-*` e iframes de redes de anúncios conhecidas.
- Observa alterações dinâmicas do DOM com `MutationObserver` e aplica limpeza com debounce leve.
- Mantém uma whitelist de áreas sensíveis: leitor, imagens de capítulos, navegação, menus, login, pesquisa, perfil, favoritos, biblioteca e links de manga/capítulo.
- Permite ligar/desligar o cleaner, aplicar imediatamente na aba atual e ativar debug opcional no console.

## Instalação no Brave

1. Abre `brave://extensions/`.
2. Ativa **Developer mode**.
3. Clica **Load unpacked**.
4. Seleciona a pasta `nexustoons-clean`.
5. Abre ou recarrega `https://nexustoons.com/`.
6. Usa o popup da extensão para alternar **Cleaner ON/OFF**, clicar **Apply** ou ativar **Debug mode**.

## Arquitetura

- `manifest.json`: Manifest V3 com permissões mínimas (`storage` e `activeTab`) e content script limitado ao NexusToons.
- `content.js`: motor de deteção/ocultação, whitelist, debug e `MutationObserver`.
- `content.css`: classes CSS usadas para ocultar elementos já classificados como publicidade pelo script.
- `popup.html` / `popup.js`: interface simples para estado ON/OFF, Apply e Debug mode.
- `icons/`: ícones PNG locais para instalação unpacked.

## Elementos publicitários detetados

A extensão deteta e oculta, de forma conservadora:

- Elementos com `data-ad-client`, `data-ad-slot` ou `data-ad-format`.
- `ins.adsbygoogle`.
- Iframes de domínios de anúncios conhecidos: `googlesyndication.com`, `googleads.g.doubleclick.net`, `doubleclick.net`, `adservice.google.*`, `popads.net`, `propellerads.com` e `exoclick.com`.
- Elementos com `aria-label="Advertisement"`.
- Containers explícitos com nomes como `advertisement`, `adsbygoogle`, `google-ad`, `banner-ad`, `ad-container`, `ad-wrapper`, `publicidade`, `anuncio` ou `sponsor`, desde que não estejam dentro da whitelist.

## Limitações conhecidas

A inspeção direta do DOM a partir deste ambiente foi bloqueada pelo túnel/proxy remoto com HTTP 403. Por isso, a extensão está pronta para uso local e usa seletores seguros de redes/artefactos publicitários, mas não inclui seletores proprietários específicos do frontend atual do NexusToons que só possam ser confirmados numa sessão real do browser.

## Como atualizar seletores

1. Instala a extensão e ativa **Debug mode** no popup.
2. Abre a homepage, pesquisa, página de manga, login e leitor.
3. Inspeciona anúncios/pop-ups com DevTools.
4. Copia apenas seletores com sinais fortes e sem risco para leitor/login/navegação.
5. Adiciona-os a `SITE_SELECTORS` em `content.js` com um comentário explicando o motivo.
6. Se um elemento legítimo for ocultado, adiciona uma regra à whitelist `SAFE_SELECTOR`.
7. Recarrega a extensão em `brave://extensions/` e testa novamente.

## HTML/DOM útil para refinamento futuro

Para tornar a extensão 100% baseada no DOM real, fornece excertos HTML de:

- Um anúncio na homepage.
- Um anúncio numa página de manga.
- Um anúncio no leitor/capítulo.
- Qualquer popup publicitário.
- As áreas legítimas próximas ao leitor, login e navegação para validar a whitelist.
