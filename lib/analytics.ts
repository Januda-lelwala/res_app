import fs from "fs/promises";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "search-analytics.json");

interface SearchEntry {
  timestamp: string;
  query: string;
  resultCount: number;
}

export async function logSearch(query: string, resultCount: number): Promise<void> {
  try {
    let entries: SearchEntry[] = [];
    try {
      const existing = await fs.readFile(LOG_FILE, "utf-8");
      entries = JSON.parse(existing);
    } catch {
      // File doesn't exist yet — start fresh
    }

    entries.push({
      timestamp: new Date().toISOString(),
      query,
      resultCount,
    });

    await fs.writeFile(LOG_FILE, JSON.stringify(entries, null, 2));
  } catch (err) {
    console.error("Analytics log error:", err);
  }
}
