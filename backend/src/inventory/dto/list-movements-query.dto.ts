import { IsOptional, IsUUID } from 'class-validator';

export class ListMovementsQueryDto {
  @IsOptional()
  @IsUUID()
  imeiUnitId?: string;
}
