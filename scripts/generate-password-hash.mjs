#!/usr/bin/env node
/**
 * Shifa A Hayat — Secure Admin Password Hash Generator
 * 
 * Usage:
 *   node scripts/generate-password-hash.mjs "YourNewSecurePasswordHere"
 *   OR run interactively:
 *   node scripts/generate-password-hash.mjs
 */

import crypto from "node:crypto";
import readline from "node:readline";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function printInstructions(hash) {
  console.log("\n==================================================================");
  console.log("  Shifa A Hayat — Production Admin Password Hash Generated");
  console.log("==================================================================\n");
  console.log("Configure this in your hosting platform (Cloudflare Pages / Nitro / Lovable):");
  console.log("------------------------------------------------------------------");
  console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
  console.log("------------------------------------------------------------------\n");
  console.log("Recommended Production Environment Variables:");
  console.log("  ADMIN_EMAIL=\"inaytchaudhri@gmail.com\"");
  console.log(`  ADMIN_PASSWORD_HASH="${hash}"`);
  console.log(`  SESSION_SECRET="${crypto.randomBytes(32).toString("hex")}"\n`);
  console.log("SECURITY NOTICE:");
  console.log("  * Never commit this hash or any plaintext password to Git.");
  console.log("  * Do NOT use the 'VITE_' prefix (which would expose it to the browser).");
  console.log("  * Only set this in server-side secret settings on your deployment platform.\n");
}

const inputArg = process.argv[2];

if (inputArg) {
  if (inputArg.length < 10) {
    console.error("Error: Password must be at least 10 characters long.");
    process.exit(1);
  }
  const generatedHash = hashPassword(inputArg);
  printInstructions(generatedHash);
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter new secure admin password (min 10 characters): ", (pwd) => {
    const trimmed = (pwd || "").trim();
    if (trimmed.length < 10) {
      console.error("\nError: Password must be at least 10 characters long.");
      rl.close();
      process.exit(1);
    }
    const generatedHash = hashPassword(trimmed);
    printInstructions(generatedHash);
    rl.close();
  });
}
