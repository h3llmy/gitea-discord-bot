import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GiteaService } from './gitea.service.js';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => {
        const baseUrl = config.getOrThrow<string>('GITEA_BASE_URL');
        return {
          timeout: 10000,
          baseURL: baseUrl.replace(/\/$/, '') + '/api/v1',
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [GiteaService],
  exports: [GiteaService],
})
export class GiteaModule {}
