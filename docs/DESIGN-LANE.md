# Design lane (read before changing this repo)

This branch is what runs on allybi.com.br. The full guide — what you may change, the exact release
commands and Pedro's approval — is in allybi-ai/Allybi-Final-Version, branch
`zuck/design-cutover-20260929`, file `deploy/DESIGN-LANE.md`.

Short version for this repo: change pages, styles, images, fonts, animations and translations freely.
Never change `server.js`, `server/`, `deploy/`, `language-switcher.js`, `package*.json` or `Dockerfile`;
no inline scripts, `on…=` handlers, forms or iframes in pages. Before pushing:
`npm test && npm run verify && node --test deploy/publication.test.mjs`.
