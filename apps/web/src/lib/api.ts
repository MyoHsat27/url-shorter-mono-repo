const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface CreateUrlRequest {
  longUrl: string;
  userId?: string;
}

export interface CreateUrlResponse {
  success: boolean;
  data: {
    id: string;
    shortCode: string;
    longUrl: string;
    shortUrl: string;
    createdAt: string;
  };
  timestamp: string;
  path: string;
}

export interface ApiError {
  success: boolean;
  error: {
    message: string;
    code: string;
  };
}

export async function createShortUrl(
  data: CreateUrlRequest,
): Promise<CreateUrlResponse> {
  const response = await fetch(`${API_BASE_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error?.message || "Failed to create short URL");
  }

  return response.json() as Promise<CreateUrlResponse>;
}

export function getShortUrl(shortCode: string): string {
  return `${API_BASE_URL}/${shortCode}`;
}
