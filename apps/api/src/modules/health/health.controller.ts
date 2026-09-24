import { Controller, Get } from '@nestjs/common';
import { db } from '@revora/db';
import { sql } from 'drizzle-orm';

@Controller('health')
export class HealthController {
  @Get()
  async check() {
    let dbStatus = 'ok';
    let dbLatencyMs = 0;

    try {
      const start = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatencyMs = Date.now() - start;
    } catch (error) {
      dbStatus = 'degraded';
    }

    return {
      status: 'ok',
      service: 'revora-api',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      uptime: process.uptime(),
    };
  }
}
