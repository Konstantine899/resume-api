---
description: Start backend development server.
---

1. `docker compose up -d db`
2. `npm run prisma:generate`
3. `npx prisma migrate deploy` when needed
4. `npm run build`
5. `node dist/main.js`
6. `curl.exe -fsS http://127.0.0.1:3000/health/live`
7. `Invoke-RestMethod http://127.0.0.1:3000/health/ready`
