import { Module } from '@nestjs/common';
import { TagService } from './services/tag.service';
import { TagController } from './controller/tag.controller';

@Module({
  providers: [TagService],
  controllers: [TagController],
  exports: [TagService],
})
export class TagModule {}
