import { ToolDefinition } from "src/infrastructure/bedrock/bedrock.service";

/**
 * Analytics tools that the LLM can call to get live data from TimescaleDB.
 *
 * These are like REST API endpoints but for the LLM:
 * - The LLM sees the name, description, and input schema
 * - It decides WHEN to call which tool based on the user's question
 * - Our code executes the tool and feeds the result back
 */
export const ANALYTICS_TOOLS: ToolDefinition[] = [
  {
    name: "get_click_stats",
    description:
      "Get click statistics for a specific short URL. Returns total clicks, unique visitors, and recent click trend. Use this when the user asks about a specific link's performance.",
    inputSchema: {
      type: "object",
      properties: {
        short_code: {
          type: "string",
          description: "The short code of the URL (e.g., 'abc123')",
        },
        hours: {
          type: "number",
          description:
            "Number of hours to look back. Defaults to 24. Max 168 (7 days).",
        },
      },
      required: ["short_code"],
    },
  },
  {
    name: "get_trending_links",
    description:
      "Get the most popular/trending links sorted by click count. Use this when the user asks about trending, popular, top, or most-clicked links.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of top links to return. Defaults to 5. Max 20.",
        },
        hours: {
          type: "number",
          description:
            "Number of hours to look back. Defaults to 24. Max 168 (7 days).",
        },
      },
      required: [],
    },
  },
  {
    name: "get_geo_breakdown",
    description:
      "Get geographic breakdown of clicks by country. Can be filtered to a specific short URL. Use this when the user asks about geographic distribution, countries, or where clicks are coming from.",
    inputSchema: {
      type: "object",
      properties: {
        short_code: {
          type: "string",
          description:
            "Optional. Filter to a specific short URL. If omitted, returns global geo stats.",
        },
        hours: {
          type: "number",
          description:
            "Number of hours to look back. Defaults to 24. Max 168 (7 days).",
        },
      },
      required: [],
    },
  },
  {
    name: "get_traffic_pattern",
    description:
      "Get hourly traffic patterns showing clicks per hour. Use this when the user asks about traffic patterns, peak hours, busy times, or when clicks happen.",
    inputSchema: {
      type: "object",
      properties: {
        short_code: {
          type: "string",
          description:
            "Optional. Filter to a specific short URL. If omitted, returns global traffic pattern.",
        },
        hours: {
          type: "number",
          description:
            "Number of hours to look back. Defaults to 24. Max 168 (7 days).",
        },
      },
      required: [],
    },
  },
];
