import type {
  Athlete,
  CreateAthleteInput,
  DuplicateCheckInput,
  DuplicateCheckResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchAthletes(): Promise<Athlete[]> {
  const url = `${API_URL}/athletes`;
  console.log("[api] fetchAthletes →", url);
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function checkDuplicate(
  input: DuplicateCheckInput,
): Promise<DuplicateCheckResponse> {
  const res = await fetch(`${API_URL}/athletes/check-duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to check duplicate");
  return res.json();
}

export async function createAthlete(
  input: CreateAthleteInput,
): Promise<{
  athlete?: Athlete;
  error?: string;
  duplicateCheck?: DuplicateCheckResponse;
}> {
  const res = await fetch(`${API_URL}/athletes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (res.status === 409) {
    return {
      error: data.message || "Duplicate detected",
      duplicateCheck: data.duplicateCheck,
    };
  }

  if (!res.ok) {
    return { error: data.message || "Failed to create athlete" };
  }

  return { athlete: data };
}
