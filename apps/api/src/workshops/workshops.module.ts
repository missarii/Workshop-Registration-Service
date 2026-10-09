import { Module } from '@nestjs/common';
import { WorkshopsController } from './workshops.controller';
import { WorkshopsService } from './workshops.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [WorkshopsController],
  providers: [WorkshopsService],
  exports: [WorkshopsService],
})
export class WorkshopsModule {}
