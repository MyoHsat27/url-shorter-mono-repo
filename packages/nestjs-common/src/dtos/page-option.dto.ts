/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsInt, IsOptional, Min, Max, IsEnum, IsString } from "class-validator";
import { Type, Transform } from "class-transformer";
import { SortOrder } from "../enums";

export class PageOptionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
