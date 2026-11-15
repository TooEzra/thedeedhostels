import { createApp } from "./app";
import { config } from "./config";
import { connectDB } from "./db";

async function main() {
  config.authSecret; // fail fast if misconfigured
  await connectDB();
  const app = createApp();
  app.listen(config.port, () => console.log(`THE DEED HOSTELS API listening on http://localhost:${config.port}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
