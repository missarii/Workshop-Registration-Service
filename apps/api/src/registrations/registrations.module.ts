import { Module } from '@nestjs/common';
import { RegistrationsController, RegistrationsGlobalController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [RegistrationsController, RegistrationsGlobalController],
  providers: [RegistrationsService],
})
export class RegistrationsModule {}
