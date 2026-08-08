import express from "express";
import { createCustomerTicket, createPartnerTicket, createSellerTicket, customerTicketReply, customerTickets, getAdminTicket, listAdminTickets, partnerTicketReply, partnerTickets, sellerTicketReply, sellerTickets, updateTicket } from "../controllers/supportController.js";
import { authorize, protect, protectCustomer, protectPartner, protectSeller } from "../middleware/authMiddleware.js";
const router = express.Router();
router.route("/customer").get(protectCustomer, customerTickets).post(protectCustomer, createCustomerTicket); router.post("/customer/:id/replies", protectCustomer, customerTicketReply);
router.route("/seller").get(protectSeller, sellerTickets).post(protectSeller, createSellerTicket); router.post("/seller/:id/replies", protectSeller, sellerTicketReply);
router.route("/partner").get(protectPartner, partnerTickets).post(protectPartner, createPartnerTicket); router.post("/partner/:id/replies", protectPartner, partnerTicketReply);
router.get("/admin", protect, authorize("Super Admin", "Team Leader", "Staff"), listAdminTickets); router.get("/admin/:id", protect, authorize("Super Admin", "Team Leader", "Staff"), getAdminTicket); router.patch("/admin/:id", protect, authorize("Super Admin", "Team Leader", "Staff"), updateTicket);
export default router;
