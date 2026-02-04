import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AnalyticsRepository } from "../repositories/analytics.repository";
import {
  AnalyticsQueryDto,
  AnalyticsSummaryResponseDto,
  HourlyStatsResponseDto,
  TopLinksResponseDto,
  TrafficByCountryResponseDto,
  TrafficByHourResponseDto,
} from "../dto";

@ApiTags("Analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  @Get("summary")
  @ApiOperation({ summary: "Get analytics summary" })
  @ApiResponse({ status: 200, type: AnalyticsSummaryResponseDto })
  async getSummary(
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsSummaryResponseDto> {
    const startTime = query.startTime ? new Date(query.startTime) : undefined;
    const endTime = query.endTime ? new Date(query.endTime) : undefined;

    const [totalClicks, topLinks, trafficByCountry, trafficByHour] =
      await Promise.all([
        this.analyticsRepository.getTotalClicks(query.shortCode),
        this.analyticsRepository.getTopLinks(query.limit, startTime, endTime),
        this.analyticsRepository.getTrafficByCountry(startTime, endTime),
        this.analyticsRepository.getTrafficByHour(startTime, endTime),
      ]);

    return {
      totalClicks,
      topLinks,
      trafficByCountry,
      trafficByHour,
    };
  }

  @Get("hourly")
  @ApiOperation({ summary: "Get hourly statistics" })
  @ApiResponse({ status: 200, type: [HourlyStatsResponseDto] })
  async getHourlyStats(
    @Query() query: AnalyticsQueryDto,
  ): Promise<HourlyStatsResponseDto[]> {
    const startTime = query.startTime ? new Date(query.startTime) : undefined;
    const endTime = query.endTime ? new Date(query.endTime) : undefined;

    const stats = await this.analyticsRepository.getHourlyStats(
      query.shortCode,
      startTime,
      endTime,
    );

    return stats.map((s) => ({
      bucket: s.bucket.toISOString(),
      shortCode: s.shortCode,
      country: s.country,
      clicks: s.clicks,
      uniqueVisitors: s.uniqueVisitors,
    }));
  }

  @Get("top-links")
  @ApiOperation({ summary: "Get top performing links" })
  @ApiResponse({ status: 200, type: [TopLinksResponseDto] })
  async getTopLinks(
    @Query() query: AnalyticsQueryDto,
  ): Promise<TopLinksResponseDto[]> {
    const startTime = query.startTime ? new Date(query.startTime) : undefined;
    const endTime = query.endTime ? new Date(query.endTime) : undefined;

    return this.analyticsRepository.getTopLinks(
      query.limit,
      startTime,
      endTime,
    );
  }

  @Get("traffic-by-country")
  @ApiOperation({ summary: "Get traffic breakdown by country" })
  @ApiResponse({ status: 200, type: [TrafficByCountryResponseDto] })
  async getTrafficByCountry(
    @Query() query: AnalyticsQueryDto,
  ): Promise<TrafficByCountryResponseDto[]> {
    const startTime = query.startTime ? new Date(query.startTime) : undefined;
    const endTime = query.endTime ? new Date(query.endTime) : undefined;

    return this.analyticsRepository.getTrafficByCountry(startTime, endTime);
  }

  @Get("traffic-by-hour")
  @ApiOperation({ summary: "Get traffic breakdown by hour of day" })
  @ApiResponse({ status: 200, type: [TrafficByHourResponseDto] })
  async getTrafficByHour(
    @Query() query: AnalyticsQueryDto,
  ): Promise<TrafficByHourResponseDto[]> {
    const startTime = query.startTime ? new Date(query.startTime) : undefined;
    const endTime = query.endTime ? new Date(query.endTime) : undefined;

    return this.analyticsRepository.getTrafficByHour(startTime, endTime);
  }
}
