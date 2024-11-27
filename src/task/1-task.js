import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
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

    // Check if data is present
    if (statsResponse.data?.data) {
      return statsResponse.data.data;
    } else {
      throw new Error("No stats data found for the provided username.");
    }
  } catch (error) {
    console.error(`Error fetching stats for ${username}:`, error.response?.data || error.message);
    return null; // Return null for graceful handling
  }
};

// Fetch Players Username
const fetchAccountId = async () => {
  try {
    const response = await axios.get(`${FORTNITE_API_BASE}/stats/br/v2/{accountId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    // Extract usernames from the response
    if (response.data?.data) {
      return response.data.data.map((player) => player.name);
    } else {
      throw new Error("No account data found.");
    }
  } catch (error) {
    console.error("Error fetching accountId data:", error.response?.data || error.message);
    throw new Error("Unable to fetch accountId or account data.");
  }
};

// Preprocessing Fortnite Gameplay Data
const preprocessFortniteStats = (stats) => {
  return {
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
  };
};

// Fetch Fortnite Gameplay Data for Multiple Players
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
        const processedStats = preprocessFortniteStats(playerStats);
        gameplayData.push(processedStats);
      } else {
        console.warn(`No stats found for ${username}.`);
      }
    }

    return gameplayData;
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
      console.warn("No usernames fetched from accountId. Skipping data fetch.");
      await namespaceWrapper.storeSet(`round_${roundNumber}_fortniteGameplay`, JSON.stringify([]));
      return;
    }

    // Fetch and preprocess Fortnite gameplay data
    const gameplayData = await fetchFortniteGameplayData(usernames);

    if (gameplayData.length === 0) {
      console.warn("No gameplay data fetched. Storing an empty array.");
      await namespaceWrapper.storeSet(`round_${roundNumber}_fortniteGameplay`, JSON.stringify([]));
      return;
    }

    // Store the processed data
    const storageKey = `round_${roundNumber}_fortniteGameplay`;
    await namespaceWrapper.storeSet(storageKey, JSON.stringify(gameplayData));
    console.log("Fortnite gameplay data stored successfully:", gameplayData);
  } catch (error) {
    console.error("Error executing SMART task:", error.message);
  }
}
