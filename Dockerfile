FROM node:20-alpine

WORKDIR /app

# 仅拷贝运行所需文件；依赖在容器启动时安装
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public

ENV PORT=3000
EXPOSE 3000

# 容器启动时安装依赖并启动服务
CMD ["sh", "-c", "npm install --omit=dev --no-audit --no-fund && node server.js"]
