import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  async createTenant(@Body() dto: CreateTenantDto, @CurrentUser() user: { id?: string }) {
    return await this.tenantsService.createTenant(dto, user?.id);
  }

  @Get(':id')
  async getTenant(@Param('id') id: string) {
    return await this.tenantsService.getTenantById(id);
  }

  @Get('slug/:slug')
  async getTenantBySlug(@Param('slug') slug: string) {
    return await this.tenantsService.getTenantBySlug(slug);
  }
}
