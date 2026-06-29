"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/config`, {
    method: "GET",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}
