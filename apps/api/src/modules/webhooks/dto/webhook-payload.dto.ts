import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class InboundWebhookDto {
  @IsString()
  @IsNotEmpty()
  providerEventId: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsObject()
  @IsNotEmpty()
  sender: {
    name?: string;
    email?: string;
    phone?: string;
    socialId?: string;
  };

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsObject()
  formData?: Record<string, string>;

  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}
