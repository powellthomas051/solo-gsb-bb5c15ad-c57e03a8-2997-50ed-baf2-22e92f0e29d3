# 木工短料下料优化（Woodcut Optimizer）

供木工工作室使用的一维下料（Cutting Stock）网页工具：输入原料长度、锯缝宽度和各规格裁片的长度与数量，系统自动给出**用料根数最少**的裁切方案，并展示每根原料的裁片顺序、锯缝道数与余长，结果可直接在浏览器中打印。

- 后端：Node.js + Express（精确分支限界求解）
- 前端：原生 JavaScript（无框架）
- 限制：展开后**总裁片数 ≤ 12**
- 锯缝规则：**仅同根原料上相邻两片之间计一次锯缝**（一根裁 k 片，计 k−1 道锯缝）

## 快速启动（单条命令）

```bash
docker compose up --build
```

依赖（Express）会在容器启动时自动安装，无需预先执行 `npm install`。

## 访问地址

启动后在浏览器打开：

```
http://localhost:3000
```

## 配置

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` 环境变量 | `3000` | 容器内服务监听端口 |
| 端口映射 | `3000:3000` | 在 `docker-compose.yml` 的 `ports` 中修改，如改为 `"8080:3000"` 后访问 `http://localhost:8080` |

## 使用说明

1. 填写**原料长度**（mm）与**锯缝宽度**（mm，可为 0）。
2. 逐行填写各规格的**长度**与**数量**，可点击「＋ 添加规格」增加行。
3. 点击「开始计算」：
   - 输入非法（长度非正数、数量非正整数、总片数超过 12 等）会给出具体原因；
   - 某规格长度超过原料长度时，会明确指出该规格无法裁出。
4. 结果区展示：原料根数、裁片总数、总余料、利用率，以及每根原料的裁片顺序、锯缝道数、余长和比例示意图。
5. 点击「🖨 打印结果」即可打印（打印时自动隐藏输入区，仅保留方案）。

## 本地开发（不用 Docker）

```bash
npm install
npm start
# 访问 http://localhost:3000
```

## API

`POST /api/optimize`

```json
{
  "stockLength": 2440,
  "kerf": 3,
  "specs": [
    { "length": 800, "quantity": 2 },
    { "length": 600, "quantity": 3 }
  ]
}
```

成功返回 `{ "ok": true, "data": { "stockCount", "totalPieces", "totalWaste", "stocks": [...] } }`；校验失败返回 HTTP 400 与 `{ "ok": false, "error": "具体原因" }`。

## 项目结构

```
├── Dockerfile            # 镜像构建（依赖随容器启动安装）
├── docker-compose.yml    # 单条命令启动
├── package.json
├── server.js             # Express 服务与参数校验
├── src/solver.js         # 下料精确求解（分支限界）
└── public/               # 前端页面（原生 JS）
    ├── index.html
    ├── app.js
    └── style.css
```
