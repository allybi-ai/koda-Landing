# Allybi — landing atual

Branch de publicação: `release/landing-current-20260929`.

Este pacote contém somente a versão atual do site e as dependências usadas por suas páginas. Foi exportado da versão local aprovada para uma branch de histórico independente. As branches anteriores permanecem intactas.

## Rodar

```sh
npm ci
npm test
npm run verify
npm start
```

Abra `http://localhost:8080`. Não há etapa de build: o servidor Node entrega HTML, CSS, JavaScript e SVG diretamente. O endpoint de contato exige esse servidor; hospedagem apenas estática não envia mensagens.

## Deploy e localização do webapp

Leia [o handoff completo](docs/DEPLOY-HANDOFF.md), incluindo os dois repositórios, configuração de SMTP, API do webapp, validações e limites do que foi verificado.

- Páginas: arquivos HTML na raiz.
- Estilos de página: `pages/`.
- Interações, ícones e fontes atuais: `assets/`.
- Formulário de contato: `server/contact.js` e `assets/contact-message.js`.
- Diagnóstico de tempo: `tempo*.html` e `assets/tools/tempo-*`.
- Configuração de exemplo, sem credenciais: `.env.example`.

As imagens e conversas de demonstração usam dados ilustrativos. Os botões dessas demonstrações não enviam mensagens reais.
