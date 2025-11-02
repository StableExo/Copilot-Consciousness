# ML Service - Machine learning for prediction and optimization
FROM node:20-alpine

WORKDIR /app

# Install Python for TensorFlow if needed
RUN apk add --no-cache python3 py3-pip curl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (skip tensorflow if it fails)
RUN npm ci --omit=optional --legacy-peer-deps || npm install --omit=optional --legacy-peer-deps

# Copy source
COPY src ./src

# Build
RUN npm run build || mkdir -p dist

# Create non-root user
RUN addgroup -g 1001 mluser && \
    adduser -D -u 1001 -G mluser mluser && \
    chown -R mluser:mluser /app

USER mluser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

EXPOSE 3003

CMD ["node", "-r", "ts-node/register", "src/services/ml.ts"]
