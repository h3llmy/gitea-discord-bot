import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntentsBitField } from 'discord.js';
import { NecordModule } from 'necord';
import { AppUpdate } from './app.update.js';
import { GiteaModule } from './gitea/gitea.module.js';
import { HelpModule } from './help/help.module.js';
import { ReportModule } from './report/report.module.js';
import { UsersModule } from './users/users.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { UserEntity } from './users/user.entity.js';
import { UserRepoEntity } from './users/user-repo.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3' as const,
        database: config.get<string>('DB_PATH') ?? 'data/bot.sqlite',
        entities: [UserEntity, UserRepoEntity],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    NecordModule.forRootAsync({
      useFactory: () => ({
        token: process.env.DISCORD_TOKEN ?? '',
        intents: [IntentsBitField.Flags.Guilds],
      }),
    }),
    GiteaModule,
    HelpModule,
    ReportModule,
    UsersModule,
    ScheduleModule.forRoot(),
  ],
  providers: [AppUpdate],
})
export class AppModule {}
