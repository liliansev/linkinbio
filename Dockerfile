FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Le build régénère routeTree.gen.ts, que les tests et le typecheck lisent.
RUN pnpm build && pnpm typecheck && pnpm test

FROM node:24-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node deploy/server.mjs ./deploy/server.mjs
# La base SQLite : un volume nommé monté ici (voir deploy/compose.yaml).
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "deploy/server.mjs"]
