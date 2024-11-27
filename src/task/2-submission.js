import crypto from "crypto"; // For hashing
import { namespaceWrapper } from "@_koii/namespace-wrapper";

// Generate Hash for Data
function hashData(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// Handle Submission
export async function submission(roundNumber) {
  try {
    console.log(`Submitting data for round ${roundNumber}`);

    // Retrieve stored data for the current round
    const gameData = await namespaceWrapper.storeGet(`round_${roundNumber}_fortniteleaderboard`);
    if (!gameData) {
      console.warn("No data available for submission.");
      return "{}";
    }

    // Generate hash for the current data
    const dataHash = hashData(gameData);

    // Retrieve previously submitted hashes
    const submittedHashes = JSON.parse(await namespaceWrapper.storeGet(`round_${roundNumber}_submittedHashes`) || "[]");

    // Check for duplicate submission
    if (submittedHashes.includes(dataHash)) {
      console.warn("Duplicate submission detected. Skipping.");
      return "{}"; // Skip submission
    }

    // Add the current data hash to the submitted hashes
    submittedHashes.push(dataHash);
    await namespaceWrapper.storeSet(`round_${roundNumber}_submittedHashes`, JSON.stringify(submittedHashes));

    console.log("Data submitted successfully:", gameData);
    return gameData; // Return valid data for submission
  } catch (error) {
    console.error("Submission error:", error);
    return "{}"; // Return empty object on error
  }
}
