import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { WabaEntity } from './entities/waba.entity';
import { LineEntity } from './entities/line.entity';
import { AnalyticsEntity } from './entities/analytics.entity';
import { ScheduledRedirectEntity } from './entities/scheduled-redirect.entity';
import { TemplateEntity } from './entities/template.entity';
import { TemplateAnalyticsEntity } from './entities/template-analytics.entity';

config({ path: 'apps/api/.env' });

const useSsl =
  (process.env.DB_BACKOFFICE_SSL ?? 'true').toString().toLowerCase() !== 'false';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_BACKOFFICE_HOST,
  port: parseInt(process.env.DB_BACKOFFICE_PORT || '5432'),
  username: process.env.DB_BACKOFFICE_USERNAME,
  password: process.env.DB_BACKOFFICE_PASSWORD,
  database: process.env.DB_BACKOFFICE_DATABASE,
  entities: [
    WabaEntity,
    LineEntity,
    AnalyticsEntity,
    ScheduledRedirectEntity,
    TemplateEntity,
    TemplateAnalyticsEntity,
  ],
  migrations: ['apps/api/src/database/db-backoffice/migrations/*.ts'],
  synchronize: false,
  ssl: useSsl,
  ...(useSsl && {
    extra: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
  }),
});
