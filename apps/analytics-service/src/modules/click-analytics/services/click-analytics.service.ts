/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { Pool } from "pg";
import * as geoip from "geoip-lite";
import { TIMESCALE_POOL } from "src/infrastructure/timescale/timescale.module";
import { ClickEvent } from "../interfaces/click-event.interface";

interface GeoLocation {
  country: string | null;
  city: string | null;
}

@Injectable()
export class ClickAnalyticsService {
  private readonly logger = new Logger(ClickAnalyticsService.name);

  constructor(
    @Inject(TIMESCALE_POOL)
    @Optional()
    private readonly pool: Pool | null,
  ) {}

  async recordClick(event: ClickEvent): Promise<void> {
    // Lookup geolocation from IP
    const geo = this.lookupGeoLocation(event.ipAddress);
    const deviceType = this.detectDeviceType(event.userAgent);

    this.logger.debug(`${JSON.stringify(event)}`);
    this.logger.debug(`${JSON.stringify(geo)}`);
    if (!this.pool) {
      this.logger.log(
        `[MOCK] Click recorded: ${JSON.stringify({
          shortCode: event.shortCode,
          timestamp: event.timestamp,
          country: geo.country,
          city: geo.city,
          deviceType,
        })}`,
      );
      return;
    }

    try {
      const query = `
        INSERT INTO click_events (time, short_code, long_url, user_agent, ip_address, country, city, referer, device_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await this.pool.query(query, [
        new Date(event.timestamp),
        event.shortCode,
        event.longUrl || null,
        event.userAgent,
        event.ipAddress,
        geo.country,
        geo.city,
        event.referer || null,
        deviceType,
      ]);

      this.logger.debug(
        `Recorded click for ${event.shortCode} from ${geo.country || "unknown"}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record click: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  private lookupGeoLocation(ipAddress?: string): GeoLocation {
    if (!ipAddress) {
      return { country: null, city: null };
    }

    // remove IPv6 prefix if present
    let cleanIp = ipAddress;
    if (cleanIp.startsWith("::ffff:")) {
      cleanIp = cleanIp.substring(7);
    }

    // skip private/local IPs
    if (
      cleanIp.startsWith("192.168.") ||
      cleanIp.startsWith("10.") ||
      cleanIp.startsWith("172.") ||
      cleanIp === "127.0.0.1" ||
      cleanIp === "localhost"
    ) {
      return { country: null, city: null };
    }

    try {
      const geo = geoip.lookup(cleanIp);
      if (geo) {
        return {
          country: geo.country || null,
          city: geo.city || null,
        };
      }
    } catch (error) {
      this.logger.warn(`GeoIP lookup failed for ${cleanIp}`);
    }

    return { country: null, city: null };
  }

  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) return "unknown";
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android")) return "mobile";
    if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
    return "desktop";
  }
}
