# Build client (VITE_API_URL empty = same-origin /api in production)
FROM node:20-bookworm AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Build server
FROM node:20-bookworm AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ ./
RUN npx prisma generate && npm run build

# Run
FROM node:20-bookworm-slim
WORKDIR /app/server
ENV NODE_ENV=production
ENV CLIENT_DIST=/app/client/dist
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/prisma ./prisma
COPY --from=client-build /app/client/dist /app/client/dist
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
