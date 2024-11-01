const namespaceWrapper = require('./namespaceWrapper');
const axios = require('axios');

// Truflation API setup
const TRUFLATION_API_URL = 'https://api.truflation.com/inflation'; // Replace with the actual endpoint
const TRUFLATION_API_KEY = 'YOUR_TRUFLATION_API_KEY'; // Replace with your Truflation API key

async function fetchInflationRate() {
  try {
    const response = await axios.get(TRUFLATION_API_URL, {
      headers: {
        'Authorization': `Bearer ${TRUFLATION_API_KEY}`
      }
    });
    const inflationData = response.data;
    return inflationData.inflation_rate; // Adjust according to the response structure
  } catch (error) {
    console.error('Error fetching inflation data:', error);
    return null;
  }
}

async function distribution() {
  try {
    // Fetch the submission data (player scores, points, and tokens)
    const submissionData = await namespaceWrapper.getTaskSubmission();
    const playerScores = JSON.parse(submissionData);

    // Fetch the current inflation rate from Truflation
    const inflationRate = await fetchInflationRate();

    // Ensure inflation rate is valid before proceeding
    if (inflationRate === null) {
      console.error('Invalid inflation data; distribution aborted.');
      return {};
    }

    // Distribution logic: Allocate SMART Tokens based on gameplay and inflation rate
    const distributionList = {};

    for (const player in playerScores) {
      const tokensEarned = playerScores[player].smartTokensEarned;

      // Adjust token distribution based on inflation rate (example logic)
      let adjustedTokens = tokensEarned;
      if (inflationRate > 5) { // Threshold for high inflation; adjust as needed
        adjustedTokens = Math.floor(tokensEarned * 0.9); // Decrease reward by 10%
      }

      // Validate if the tokens earned are correctly calculated and non-zero
      if (adjustedTokens > 0) {
        // Add to the distribution list
        distributionList[player] = adjustedTokens;
      }
    }

    // Validate distribution before submitting
    await namespaceWrapper.validateDistributionList(distributionList);

    // Return the distribution list for final submission
    return distributionList;
  } catch (error) {
    console.error("Error during distribution:", error);
  }
}

module.exports = { distribution };
