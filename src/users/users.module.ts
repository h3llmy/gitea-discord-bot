import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from '../shared/services/crypto.service.js';
import { UserRepoEntity } from './user-repo.entity.js';
import { UserEntity } from './user.entity.js';
import { UsersCommands } from './users.commands.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserRepoEntity])],
  providers: [UsersService, CryptoService, UsersCommands],
  exports: [UsersService],
})
export class UsersModule {}
