import { health } from './app';

const port = Number(process.env.PORT ?? 3000);
const report = health();

console.log(`[resume-api] placeholder started on port ${port} (${report.status})`);
