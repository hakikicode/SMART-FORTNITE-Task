const namespaceWrapper = require('./namespaceWrapper');

async function distribution() {
  try {
    // Fetch the submission data (player scores, points, and tokens)
    const submissionData = await namespaceWrapper.getTaskSubmission();
    const playerScores = JSON.parse(submissionData);

    // Distribution logic: Allocate SMART Tokens based on gameplay
    const distributionList = {};

    for (const player in playerScores) {
      const tokensEarned = playerScores[player].smartTokensEarned;

      // Validate if the tokens earned are correctly calculated
      if (tokensEarned > 0) {
        // Add to the distribution list
        distributionList[player] = tokensEarned;
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
