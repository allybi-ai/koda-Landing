# Handoff de publicação — Allybi

Data: 29/09/2026. Este handoff separa o site institucional do aplicativo. O envio ao GitHub foi solicitado; nenhum deploy, alteração de DNS ou configuração de credenciais foi realizado.

## 1. Onde está cada entrega

| Entrega | Repositório | Branch | Diretório de execução |
| --- | --- | --- | --- |
| Webapp | [allybi-ai/Allybi-Final-Version](https://github.com/allybi-ai/Allybi-Final-Version/tree/round2/riv-frontend) | `round2/riv-frontend` | `frontend/` |
| Landing page | [allybi-ai/koda-Landing](https://github.com/allybi-ai/koda-Landing/tree/release/landing-current-20260929) | `release/landing-current-20260929` | raiz |

**Webapp:** commit `98bef022ebeb5d1dc7bca0daf46eb6cd9d9cc14a`. Atualiza espaçamento e sombras dos painéis, alinhamento da conversa/compositor, aparência das mensagens e contraste das pastas. Os quatro arquivos alterados estão em `frontend/src/components/chat/` e `frontend/src/components/workspace/`. A base anterior da branch, `7abe46215d1c80a9a48f141c1760e913265685df`, foi preservada.

**Landing:** nova branch independente, sem importar a árvore ou o histórico antigo. Configure o serviço para construir essa branch diretamente; não faça merge de históricos não relacionados apenas para publicar. `main` e `pricing-refactor` não foram substituídas.

Para executar o deploy, é necessário acesso de leitura aos dois repositórios, acesso ao provedor de hospedagem/DNS e às credenciais SMTP. Nenhuma permissão ou credencial nova foi criada nesta entrega.

## 2. Conteúdo do landing

- Home, Como funciona, Segurança, Preços, Sobre e Contato atuais.
- Tempo perdido: entrada, questionário e resultado da versão atual, centrada na reflexão pessoal.
- Diagnóstico do fluxo e Metodologia, ainda oferecidos pela navegação atual.
- Termos e Política de privacidade, mantidos para continuidade jurídica do site.
- FAQ atual na home, em `/#faq`; `/faq.html` redireciona para essa seção.
- Somente os ícones, fontes e arquivos de interação usados por essas páginas, incluindo dependências dos exemplos de integração.

Ficaram fora: páginas antigas de casos de uso e de integrações, FAQ antigo, coleções de ícones sem uso, screenshots de auditoria, backups, documentos de trabalho, arquivos `.env`, dependências instaladas e saídas de build. O controlador antigo de casos de uso e o auxiliar de QA do navegador foram removidos. As traduções foram reduzidas às chaves usadas pelas páginas incluídas.

## 3. Publicar o landing

### Obter e validar

```sh
git clone --single-branch --branch release/landing-current-20260929 https://github.com/allybi-ai/koda-Landing.git allybi-landing
cd allybi-landing
npm ci
npm test
npm run verify
npm start
```

Validação local em Node `24.10.0`. A aplicação declara Node `>=20`; o Dockerfile fornecido usa Node 20. O site não depende de um bundler nem gera uma pasta `dist`. O comando de início é `npm start`, a raiz do serviço é a raiz do repositório, e a porta padrão é `8080` (variável `PORT`).

### Hospedagem

Use um serviço que execute Node ou o Dockerfile da raiz. Um deploy somente de arquivos estáticos perde o endpoint de contato.

```sh
docker build -t allybi-landing:20260929 .
docker run --rm -p 8080:8080 --env-file /caminho/privado/allybi-landing.env allybi-landing:20260929
```

O arquivo de ambiente fica fora do repositório. Para publicar por plataforma, cadastre as mesmas variáveis nas configurações protegidas do serviço. O processo não carrega `.env` automaticamente; `--env-file` ou a plataforma deve fornecê-las.

Configure HTTPS, o domínio e um health check `GET /` (HTTP 200). Preserve o cabeçalho `Host` original no proxy, pois ele define idioma e valida a origem do formulário. O domínio brasileiro previsto é `allybi.com.br`, com `www` tratado de forma consistente pelo provedor. Os CTAs abrem `app.allybi.com.br`; o aplicativo deve continuar em serviço separado.

Existe mapeamento de domínio para `allybi.co`, mas os textos novos são prioritariamente em português. Não considerar a experiência inglesa completamente traduzida sem revisão específica.

### Contato: envio para info@allybi.com.br

O navegador envia `POST /api/contact`; o servidor entrega a mensagem por SMTP. A pessoa não precisa abrir um cliente de e-mail.

| Variável | Valor necessário |
| --- | --- |
| `CONTACT_SMTP_HOST` | Host do provedor SMTP |
| `CONTACT_SMTP_PORT` | `587` com STARTTLS ou `465` com TLS direto |
| `CONTACT_SMTP_USER` | Usuário do provedor |
| `CONTACT_SMTP_PASS` | Credencial SMTP, armazenada como segredo |
| `CONTACT_FROM` | Remetente verificado/autorizado nesse provedor |
| `PORT` | Porta HTTP do serviço; padrão `8080` |

O destinatário é fixo: `info@allybi.com.br`. O endereço informado no formulário vira `Reply-To`. Configure o remetente e a autenticação do domínio conforme o provedor SMTP. Sem SMTP configurado, a aplicação responde indisponível, sem fingir que enviou. Nenhuma credencial foi incluída, e entrega real à caixa de entrada não foi testada nesta publicação.

O endpoint tem validação, honeypot, limite de corpo, checagem de origem e limitação de frequência em memória. Atrás de proxy, essa limitação usa o IP da conexão; em múltiplas instâncias não é compartilhada. Dimensione a proteção de borda do provedor de acordo com o tráfego.

## 4. Publicar o frontend do webapp

```sh
git clone --single-branch --branch round2/riv-frontend https://github.com/allybi-ai/Allybi-Final-Version.git allybi-webapp
cd allybi-webapp/frontend
npm ci --legacy-peer-deps
npm run build
```

Publique a pasta `frontend/build` em um servidor de SPA com fallback para `/index.html`. O projeto usa Create React App; as variáveis `REACT_APP_*` são incorporadas na compilação. Não coloque senhas, tokens administrativos nem credenciais SMTP nelas.

Alternativa com o Dockerfile existente:

```sh
# Execute dentro de frontend/
docker build -t allybi-webapp:20260929 .
docker run --rm -p 8082:8080 allybi-webapp:20260929
```

Esse container serve o frontend via Nginx na porta 8080. Ele **não inclui um backend nem configura o proxy da API**.

### API e sessão: ponto obrigatório antes de trocar produção

Nos domínios reconhecidos, incluindo `app.allybi.com.br` e `app.allybi.co`, `src/services/runtimeConfig.js` escolhe a própria origem para API e WebSocket. Nesses domínios, definir apenas `REACT_APP_API_URL` não muda esse comportamento.

A infraestrutura precisa encaminhar `/api/*` para o backend compatível e `/socket.io/*` para o transporte de WebSocket, preservando cookies e upgrades. Streaming não deve ser armazenado em buffer pelo proxy. Fora dos hosts reconhecidos, `REACT_APP_API_URL` e `REACT_APP_WS_URL` permitem endereços explícitos; nesse caso também é preciso acertar CORS e cookies no backend.

Para desenvolvimento local, `src/setupProxy.js` encaminha API e Socket.IO para `http://localhost:5000`, ou para `REACT_APP_PROXY_TARGET` quando definido. O endpoint de chat padrão é `/api/chat/stream`. O bridge Stage 10 só é ativado com `REACT_APP_STAGE10_BRIDGE=1` e depende das capacidades oferecidas pela API; não ativá-lo por suposição.

**A branch contém um frontend compilável, mas o full stack limpo ainda não está homologado.** `ROUND2-BASELINE.md` e `frontend/round2-handoff/README.md` registram que `compat-api/` ficou fora da consolidação. O novo `backend/` é um core TypeScript, exige Node `>=24` e não oferece aqui um comando de servidor HTTP ou Dockerfile de produção pronto. Não é suficiente rodar o build desse core para atender às rotas esperadas pelo frontend.

Para atualizar apenas a interface de um ambiente existente, preserve o backend compatível e o roteamento já em uso, e valide a nova interface em staging. Para um deploy do zero com o backend limpo, falta o responsável pelo backend confirmar/entregar o host HTTP, autenticação, persistência, ingestão, provedores, armazenamento e o contrato de streaming/sessão. As branches separadas de IA e ingestão não foram mescladas nesta entrega.

O responsável pelo backend pode validar o core com:

```sh
cd backend
npm ci
npm run verify
```

Isso valida o core; não inicia o produto completo.

## 5. Validações e passagem para produção

Executado nesta entrega:

- Instalação limpa do frontend com `npm ci --legacy-peer-deps` e compilação de produção em Node 24.10.0, concluídas; a compilação mantém avisos do projeto. Nenhum `.env` local foi necessário para essa verificação.
- Imagem Docker do landing construída e iniciada com sucesso. Home, preços, tempo e contato responderam 200; arquivo privado respondeu 404; contato sem SMTP retornou 503. Nenhum e-mail real foi enviado.
- Landing: 21 testes aprovados, incluindo cálculo do diagnóstico, validação/entrega simulada do contato e bloqueio de arquivos privados.
- Verificação das dependências locais e exclusão das páginas aposentadas.
- As 15 páginas HTML incluídas responderam HTTP 200 no servidor do pacote exportado.
- Navegador: home, preços, segurança, contato e tempo carregaram sem imagens quebradas ou erros de console nas verificações realizadas; os sete exemplos de integração foram acionados e carregaram seus recursos.
- FAQ antigo redireciona para a home. Página antiga de integrações e caso de uso removido respondem 404. Configuração do pacote e código do servidor não ficam acessíveis via HTTP.

Antes da virada, validar no domínio de staging: formulário com SMTP real e recebimento na caixa; navegação e diagnóstico; login do app; upload e leitura; resposta com fonte; confirmação de envio e persistência após recarregar; streaming e reconexão. O teste de entrega SMTP e a homologação full stack são etapas ainda pendentes, não resultados presumidos.

Registre o SHA publicado com `git rev-parse HEAD`. Promova o mesmo artefato validado em staging. Para rollback, restaure a revisão anterior no provedor; não faça reset ou force-push das branches compartilhadas.

## 6. Cópias locais desta entrega

- Landing limpo: `/Users/alvarocamasmie/Projects/allybi-landing-release-20260929`.
- Webapp usado para publicação: `/Users/alvarocamasmie/Projects/allybi-webapp-publish-20260929`.
- As pastas originais de trabalho permanecem preservadas. Para deploy, use os repositórios e branches acima; não copie a pasta histórica do landing inteira.
