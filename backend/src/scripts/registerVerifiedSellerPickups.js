import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'node:dns';
import Seller from '../models/Seller.js';
import ShipRocketSetting from '../models/ShipRocketSetting.js';
import { ensureSellerPickup } from '../services/sellerPickupService.js';
import { shiprocketToken } from '../services/shiprocketService.js';

const apply = process.argv.includes('--apply');
const dnsServer = process.argv.find((value) => value.startsWith('--dns-server='))?.split('=')[1];
if (dnsServer) { dns.setServers([dnsServer]); dns.promises.setServers([dnsServer]); }
try {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const sellers = await Seller.find({ approvalStatus: 'approved', status: 'active' }).sort({ sellerNumber: 1 });
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', verifiedActiveSellers: sellers.length }));
  if (apply && sellers.length) {
    const settings = await ShipRocketSetting.findOne({ singleton: 'shiprocket', isActive: true });
    if (!settings) throw new Error('Enable ShipRocket and configure API credentials in admin settings first');
    const token = await shiprocketToken(settings);
    let succeeded = 0;
    let failed = 0;
    for (const seller of sellers) {
      try {
        const result = await ensureSellerPickup(seller, token);
        succeeded += 1;
        console.log(JSON.stringify({ seller: seller.sellerNumber, status: result.existing ? 'already_registered' : 'registered', pickupAlias: result.alias }));
      } catch (error) {
        failed += 1;
        console.error(JSON.stringify({ seller: seller.sellerNumber, status: 'failed', message: error.message }));
        // Account-level permission failures affect every seller; avoid repeating writes.
        if ([401, 403].includes(error.statusCode)) break;
      }
    }
    console.log(JSON.stringify({ succeeded, failed, unprocessed: sellers.length - succeeded - failed }));
    if (failed) process.exitCode = 1;
  } else {
    for (const seller of sellers) console.log(JSON.stringify({ seller: seller.sellerNumber, status: 'eligible' }));
  }
} catch (error) {
  console.error(`Pickup registration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
