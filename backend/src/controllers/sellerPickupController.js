import asyncHandler from '../utils/asyncHandler.js';
import ShipRocketSetting from '../models/ShipRocketSetting.js';
import { ensureSellerPickup, getSellerPickupVerification } from '../services/sellerPickupService.js';
import { shiprocketToken } from '../services/shiprocketService.js';

export const checkSellerPickupVerification = asyncHandler(async (req, res) => {
  // Use the authenticated seller only; never accept a seller ID or address from the client.
  if (req.seller.approvalStatus !== 'approved') {
    res.status(409); throw new Error('Pickup verification is available after your seller account is approved');
  }
  const settings = await ShipRocketSetting.findOne({ singleton: 'shiprocket', isActive: true });
  if (!settings) { res.status(503); throw new Error('Shiprocket is not configured. Please contact admin.'); }
  try {
    const token = await shiprocketToken(settings);
    if (req.method === 'POST') await ensureSellerPickup(req.seller, token);
    res.json(await getSellerPickupVerification(req.seller, token));
  } catch (error) {
    res.status(502);
    throw error;
  }
});
