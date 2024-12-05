import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import crypto from "crypto"; // For hashing
import { namespaceWrapper } from "@_koii/namespace-wrapper";

// Fortnite API Configuration
const FORTNITE_API_BASE = "https://fortnite-api.com/v2";
const API_KEY = process.env.FORTNITE_API_KEY;

if (!API_KEY) {
  console.warn("FORTNITE_API_KEY is missing. Skipping Fortnite integration.");
}

// Fetch Player Stats by Username
const getPlayerStats = async (username) => {
  if (!API_KEY) throw new Error("Missing API Key for Fortnite API.");

  try {
    const statsResponse = await axios.get(`${FORTNITE_API_BASE}/stats/br/v2`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      params: { name: username },
    });

    if (statsResponse.data?.data) {
      return statsResponse.data.data;
    } else {
      throw new Error("No stats data found for the provided username.");
    }
  } catch (error) {
    console.error(`Error fetching stats for ${username}:`, error.response?.data || error.message);
    return null;
  }
};

// Fetch Players Usernames Dynamically
const fetchAccountId = async () => {
  try {
    const response = await axios.get(`${FORTNITE_API_BASE}/stats/br/v2/{accountId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (response.data?.data) {
      return response.data.data.map((player) => player.name); // Extract usernames
    } else {
      throw new Error("No account data found.");
    }
  } catch (error) {
    console.error("Error fetching accountId data:", error.response?.data || error.message);
    return [];
  }
};

// Preprocess Fortnite Stats
const preprocessFortniteStats = (stats) => ({
  gameName: "Fortnite",
  playerName: stats?.account?.name || "unknown",
  platform: stats?.platform || "unknown",
  overallStats: {
    kills: stats?.stats?.all?.overall?.kills || 0,
    matchesPlayed: stats?.stats?.all?.overall?.matches || 0,
    wins: stats?.stats?.all?.overall?.wins || 0,
    winRate: stats?.stats?.all?.overall?.winRate || 0,
  },
  modes: stats?.stats?.all?.modes || {},
  timestamp: new Date().toISOString(),
});

// Generate Hash for Deduplication
const hashData = (data) => crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");

// Deduplicate Data
const deduplicateData = (data) => {
  const seenHashes = new Set();
  return data.filter((item) => {
    const itemHash = hashData(item);
    if (seenHashes.has(itemHash)) {
      return false; // Skip duplicate
    }
    seenHashes.add(itemHash);
    return true;
  });
};

// Fetch Gameplay Data for Multiple Players
const fetchFortniteGameplayData = async (usernames) => {
  if (!API_KEY) {
    console.warn("Skipping gameplay data fetch due to missing API key.");
    return [];
  }

  try {
    const gameplayData = [];
    for (const username of usernames) {
      console.log(`Fetching stats for: ${username}`);
      const playerStats = await getPlayerStats(username);
      if (playerStats) {
        gameplayData.push(preprocessFortniteStats(playerStats));
      } else {
        console.warn(`No stats found for ${username}.`);
      }
    }
    return deduplicateData(gameplayData); // Deduplicate before returning
  } catch (error) {
    console.error("Error fetching Fortnite gameplay data:", error.message);
    return [];
  }
};

// Main Task Logic
export async function task(roundNumber) {
  try {
    console.log(`Executing SMART task for round ${roundNumber}...`);

    // Fetch usernames dynamically
    const usernames = await fetchAccountId();
    console.log(`Fetched usernames: ${usernames}`);

    if (!usernames.length) {
      console.warn("No usernames fetched. Skipping data fetch.");
      await namespaceWrapper.storeSet(`round_${roundNumber}_fortniteGameplay`, JSON.stringify([]));
      return;
    }

    // Fetch and preprocess gameplay data
    const gameplayData = await fetchFortniteGameplayData(usernames);

    if (gameplayData.length === 0) {
      console.warn("No gameplay data fetched. Storing an empty array.");
      await namespaceWrapper.storeSet(`round_${roundNumber}_fortniteGameplay`, JSON.stringify([]));
      return;
    }

    // Generate hash for entire dataset
    const gameplayHash = hashData(gameplayData);
    const existingHashes = JSON.parse(await namespaceWrapper.storeGet(`round_${roundNumber}_hashes`) || "[]");

    // Check for duplicates
    if (existingHashes.includes(gameplayHash)) {
      console.warn("Duplicate gameplay data detected. Skipping storage.");
      return;
    }

    // Store the data and update hash records
    const storageKey = `round_${roundNumber}_fortniteGameplay`;
    await namespaceWrapper.storeSet(storageKey, JSON.stringify(gameplayData));
    existingHashes.push(gameplayHash);
    await namespaceWrapper.storeSet(`round_${roundNumber}_hashes`, JSON.stringify(existingHashes));

    console.log("Fortnite gameplay data stored successfully:", gameplayData);
  } catch (error) {
    console.error("Error executing SMART task:", error.message);
  }
}
