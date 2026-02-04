import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: "Filter by short code" })
  @IsOptional()
  @IsString()
  shortCode?: string;

  @ApiPropertyOptional({ description: "Start time (ISO string)" })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: "End time (ISO string)" })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: "Limit results", default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class HourlyStatsResponseDto {
  bucket: string;
  shortCode: string;
  country: string | null;
  clicks: number;
  uniqueVisitors: number;
}

export class TopLinksResponseDto {
  shortCode: string;
  clicks: number;
  uniqueVisitors: number;
}

export class TrafficByCountryResponseDto {
  country: string;
  clicks: number;
  uniqueVisitors: number;
}

export class TrafficByHourResponseDto {
  hour: number;
  clicks: number;
}

export class AnalyticsSummaryResponseDto {
  totalClicks: number;
  topLinks: TopLinksResponseDto[];
  trafficByCountry: TrafficByCountryResponseDto[];
  trafficByHour: TrafficByHourResponseDto[];
}
