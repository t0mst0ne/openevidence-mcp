import "dotenv/config";
import { ensureConfigDirs, resolveConfig } from "../src/config.js";
import { OpenEvidenceClient, extractAnswerText } from "../src/openevidence-client.js";

async function main() {
  const config = resolveConfig();
  ensureConfigDirs(config);
  const client = new OpenEvidenceClient(config);

  try {
    await client.init();
    
    const auth = await client.getAuthStatus();
    if (!auth.authenticated) {
      throw new Error(`Not authenticated. Status=${auth.statusCode}. Please re-authenticate.`);
    }

    console.log("Asking OpenEvidence with question: 'acute ischemic stroke thrombolytic treatment update from 2025 ~ 2026'");
    
    // Send the query
    const res = await client.ask({
      question: "acute ischemic stroke thrombolytic treatment update from 2025 ~ 2026",
      articleType: "Ask OpenEvidence Light with citations",
    });
    
    const articleId = res.id as string;
    if (!articleId) {
        console.error("No article ID returned:", res);
        return;
    }
    console.log(`OpenEvidence returned article ID: ${articleId}`);
    console.log("Waiting for completion...");
    
    const article = await client.waitForArticle(articleId, {
      timeoutMs: 180 * 1000, // wait up to 3 minutes
    });
    
    console.log("\n====== EXTRACTED ANSWER ======\n");
    const text = extractAnswerText(article);
    if (!text) {
        console.log("Could not extract answer text from the article. Raw output:", article);
    } else {
        console.log(text);
    }
    console.log("\n==============================\n");
    
    // We can also print artifacts or references if needed
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`[ask_query] failed: ${message}\n`);
  process.exit(1);
});
