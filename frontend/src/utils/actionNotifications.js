import { showToast } from "./toast.js";

// These requests prepare another action or run automatically; they are not saves.
const silentActions = new Set([
  "saveCustomerCart", "createRazorpayCheckoutOrder", "createPayuCheckout",
  "createPartnerRegistrationOrder", "createMyPartnerPaymentOrder", "createSellerImpersonation"
]);
const messages = {
  updateResellerBank: "Bank details verified and saved successfully.",
  partnerUpdateBank: "Bank details saved successfully.", sellerUpdateBank: "Bank details saved successfully.",
  partnerUpdateProfile: "Profile updated successfully.", sellerUpdateProfile: "Profile updated successfully.",
  partnerChangePassword: "Password changed successfully.", sellerChangePassword: "Password changed successfully.",
  partnerChangePackage: "Package updated successfully.", adminChangePartnerPackage: "Partner package updated successfully.",
  partnerUploadKyc: "KYC document submitted successfully.", sellerUploadKyc: "KYC document submitted successfully.",
  partnerRequestWithdrawal: "Withdrawal request submitted successfully.",
  requestSellerWithdrawal: "Withdrawal request submitted successfully.", requestResellerWithdrawal: "Withdrawal request submitted successfully.",
  requestCustomerItemReturn: "Return request submitted successfully.",
  createStorefrontOrder: "Order placed successfully.", createResellerLink: "Product sharing link created successfully.",
  customerRegister: "Account created successfully.", resellerRegister: "Reseller registration submitted successfully.",
  resellerQuickRegister: "Reseller registration submitted successfully.", sellerRegister: "Seller registration submitted successfully.", partnerRegister: "Partner registration submitted successfully.",
  submitContactMessage: "Your message has been sent successfully.", subscribeNewsletter: "You have subscribed successfully.",
  sendTestEmail: "Test email sent successfully.",
  replyCustomerTicket: "Reply sent successfully.", replySellerTicket: "Reply sent successfully.", replyPartnerTicket: "Reply sent successfully.",
  createCustomerTicket: "Support ticket created successfully.", createSellerTicket: "Support ticket created successfully.", createPartnerTicket: "Support ticket created successfully.",
  updateTicket: "Support ticket updated successfully.",
  assignWork: "Work assigned successfully.", endWorkAssignment: "Work assignment ended successfully.",
  moveStaffTeam: "Staff team updated successfully.", relieveStaff: "Staff member released successfully.",
  toggleSellerProduct: "Product availability updated successfully.", moderateReview: "Review updated successfully.",
  approveSeller: "Seller approved successfully.", rejectSeller: "Seller rejection saved successfully.",
  approveSellerProduct: "Product approved successfully.", rejectSellerProduct: "Product rejection saved successfully.",
  reviewSellerKyc: "KYC review saved successfully.", reviewPartnerKyc: "KYC review saved successfully.", reviewReseller: "Reseller review saved successfully.",
  approvePartnerPayment: "Payment review saved successfully.",
  processWithdrawal: "Withdrawal updated successfully.", processSellerWithdrawal: "Withdrawal updated successfully.", processResellerWithdrawal: "Withdrawal updated successfully.",
  paySellerWithdrawal: "Payout request submitted. Check the withdrawal status for confirmation.", payResellerWithdrawal: "Payout request submitted. Check the withdrawal status for confirmation.",
  refundOrder: "Refund request submitted successfully.", closeOrderItemReturn: "Return and refund details saved successfully.",
  collectSellerBalance: "Balance collection recorded successfully.", settleSellerOrderItem: "Order settlement processed successfully.",
  resetSellerPassword: "Password reset successfully.", resetPartnerPassword: "Password reset successfully.", resetResellerPassword: "Password reset successfully.",
  uploadImage: "Image uploaded successfully.", uploadVideo: "Video uploaded successfully.", uploadDocument: "Document uploaded successfully.", uploadSellerRegistrationDocument: "GST certificate uploaded successfully.",
  syncShipRocket: "Shipping details synchronized successfully.", syncSellerShipRocket: "Shipping details synchronized successfully.",
  issueCredit: "Store credit added successfully."
};

export function actionSuccessMessage(operation) {
  if (silentActions.has(operation)) return "";
  if (messages[operation]) return messages[operation];
  const match = /^(create|update|save|delete|generate)([A-Z].*)$/.exec(operation);
  if (!match) return "";
  const [, action, resource] = match;
  const label = resource.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/By Admin$/, "details").replace(/Ship Rocket/g, "Shiprocket").toLowerCase();
  const verb = { create: "created", update: "updated", save: "saved", delete: "deleted", generate: "generated" }[action];
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${verb} successfully.`;
}

export function withActionNotifications(api) {
  return Object.fromEntries(Object.entries(api).map(([operation, action]) => {
    const message = actionSuccessMessage(operation);
    if (!message || typeof action !== "function") return [operation, action];
    return [operation, async (...args) => {
      try {
        const result = await action(...args);
        if (result?.success === false || result?.ok === false) {
          showToast(result.message || "The action could not be completed. Please try again.", "error");
        } else {
          showToast(message);
        }
        return result;
      } catch (error) {
        showToast(error.message || "The action could not be completed. Please try again.", "error");
        throw error;
      }
    }];
  }));
}
