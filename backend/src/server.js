import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { ensureUploadDirectory, getUploadRoot } from "./controllers/uploadController.js";
import { synchronizeAllResellerEarnings } from "./controllers/resellerController.js";

const PORT = process.env.PORT || 5001;

Promise.all([connectDB(), ensureUploadDirectory()]).then(() => {
  const syncResellerWallets = () => synchronizeAllResellerEarnings().catch((error) => console.error(`Reseller wallet sync failed: ${error.message}`));
  syncResellerWallets();
  setInterval(syncResellerWallets, 15 * 60 * 1000).unref();
  app.listen(PORT, () => {
    console.log(`Admin API running on port ${PORT}`);
    console.log(`Image uploads directory: ${getUploadRoot()}`);
  });
}).catch((error) => {
  console.error(`Backend startup failed: ${error.message}`);
  process.exit(1);
});
