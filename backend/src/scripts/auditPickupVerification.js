import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import ShipRocketSetting from '../models/ShipRocketSetting.js';
import { shiprocketToken } from '../services/shiprocketService.js';
import { shiprocketRequest } from '../services/shiprocketTrackingService.js';
const dnsServer = process.argv.find((value) => value.startsWith('--dns-server='))?.split('=')[1];
if (dnsServer) { dns.setServers([dnsServer]); dns.promises.setServers([dnsServer]); }
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const settings = await ShipRocketSetting.findOne({ singleton: 'shiprocket', isActive: true });
  if (!settings) throw new Error('ShipRocket is not configured');
  const result = await shiprocketRequest(await shiprocketToken(settings), 'settings/company/pickup');
  for (const location of result.data?.shipping_address || result.shipping_address || []) {
    console.log(JSON.stringify({ alias: location.pickup_location, fields: Object.keys(location), verification: Object.fromEntries(Object.entries(location).filter(([key]) => /verif|status|active/i.test(key))) }));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
