import { namespaceWrapper } from "@_koii/namespace-wrapper";
import crypto from "crypto";

// Hashing function
const hashData = (data) => crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");

export async function audit(submission, roundNumber, submitterKey) {
  console.log(`Auditing submission for round ${roundNumber} from ${submitterKey}`);

  try {
    const storedData = await namespaceWrapper.storeGet(`round_${roundNumber}_fortniteleaderboard`);
    const storedHashes = JSON.parse(await namespaceWrapper.storeGet(`round_${roundNumber}_submittedHashes`) || "[]");

    if (!storedData) {
      console.warn("No stored data found for this round.");
      return false;
    }

    const parsedSubmission = JSON.parse(submission);
    const submissionHash = hashData(submission);

    // Check if the submitted data matches the stored data
    const isDuplicate = storedHashes.includes(submissionHash);
    const isValid = JSON.stringify(parsedSubmission) === storedData;

    // Log consolidated audit result
    const auditResult = isValid && !isDuplicate ? "Valid" : isDuplicate ? "Duplicate" : "Invalid";
    console.log(`Audit result: ${auditResult}`);

    return isValid && !isDuplicate;
  } catch (error) {
    console.error("Audit error:", error);
    return false;
  }
}
