import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/tenant/current-user.decorator';
import { TenantContext } from '../common/tenant/tenant-context';
import { AddKycDocumentDto } from './dto/add-kyc-document.dto';
import { ReviewKycCaseDto } from './dto/review-kyc-case.dto';
import { KycService } from './kyc.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('customers/:id/kyc-cases')
  async createCase(
    @Param('id', new ParseUUIDPipe()) customerId: string,
    @CurrentUser() user: TenantContext,
  ) {
    const kycCase = await this.kyc.createCase(user, customerId);
    return { data: kycCase };
  }

  @Post('kyc-cases/:id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async addDocument(
    @Param('id', new ParseUUIDPipe()) caseId: string,
    @Body() input: AddKycDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: TenantContext,
  ) {
    if (!file) {
      throw new BadRequestException('Multipart field "file" is required.');
    }

    const document = await this.kyc.addDocument(user, caseId, {
      type: input.type,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });
    return { data: document };
  }

  @Post('kyc-cases/:id/submit')
  async submit(
    @Param('id', new ParseUUIDPipe()) caseId: string,
    @CurrentUser() user: TenantContext,
  ) {
    const kycCase = await this.kyc.submit(user, caseId);
    return { data: kycCase };
  }

  @Post('kyc-cases/:id/ocr')
  async runOcr(
    @Param('id', new ParseUUIDPipe()) caseId: string,
    @CurrentUser() user: TenantContext,
  ) {
    const kycCase = await this.kyc.runOcr(user, caseId);
    return { data: kycCase };
  }

  @Get('kyc-cases/:id')
  async getCase(
    @Param('id', new ParseUUIDPipe()) caseId: string,
    @CurrentUser() user: TenantContext,
  ) {
    const kycCase = await this.kyc.getCase(user, caseId);
    return { data: kycCase };
  }

  @Post('kyc-cases/:id/review')
  async review(
    @Param('id', new ParseUUIDPipe()) caseId: string,
    @Body() input: ReviewKycCaseDto,
    @CurrentUser() user: TenantContext,
  ) {
    const kycCase = await this.kyc.review(user, caseId, input);
    return { data: kycCase };
  }
}
