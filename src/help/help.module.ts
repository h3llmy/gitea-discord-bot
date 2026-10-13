import { Module } from '@nestjs/common';
import { HelpCommands } from './help.commands.js';

@Module({
  providers: [HelpCommands],
})
export class HelpModule {}
