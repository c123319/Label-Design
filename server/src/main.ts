import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { execFileSync } from 'child_process';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // 启动前应用 migration，保证表结构最新。
  // - 生产：prisma migrate deploy（仅应用已生成的迁移）
  // - 若用 DATABASE_URL=file:... 且 dev.db 不存在，migrate deploy 会自动建库建表
  try {
    // cwd 应为 server/（package.json scripts 保证）；migrations 在 server/prisma/
    execFileSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['prisma', 'migrate', 'deploy'],
      { stdio: 'inherit', cwd: process.cwd() },
    );
    logger.log('Database migrations applied');
  } catch (err) {
    logger.error(
      `Migration failed: ${err instanceof Error ? err.message : err}. Server will still start, but DB operations may fail.`,
    );
  }

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();

  await app.listen(3000);
  logger.log('Server running on http://localhost:3000');
}

bootstrap();
