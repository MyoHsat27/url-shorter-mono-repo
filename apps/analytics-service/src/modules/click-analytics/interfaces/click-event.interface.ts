export interface ClickEvent {
  shortCode: string;
  longUrl?: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  referer?: string;
}
