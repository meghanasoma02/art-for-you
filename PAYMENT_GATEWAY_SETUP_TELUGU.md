# Art For You – Real Online Payment Setup

## Current payment flow in this project

The current checkout uses the business PhonePe QR image and a customer-uploaded payment screenshot/UPI transaction reference. This is **manual QR payment**, not an automatic payment gateway:

1. Customer scans the QR and pays in their UPI app.
2. Customer submits the transaction reference and screenshot on the website.
3. Admin checks the actual credit in the business bank/UPI account and verifies or rejects it in Admin.
4. The same manual proof-and-verification approach is available for the separately requested delivery charge.

A screenshot or entered UPI reference alone is not proof that money reached the account. Always verify the credit in the merchant's bank/UPI app.

## How to enable automatic real payments

A payment gateway merchant account is required. Razorpay is one possible provider for an India-based store; another supported provider can be selected if preferred.

1. The business owner creates a merchant account with the provider and completes its current KYC/business verification and bank-account setup.
2. Use the provider's **Test Mode** first. Create API keys in its merchant dashboard.
3. Configure the keys as backend environment variables, never in React code, Git, screenshots, or a public ZIP:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
4. Backend must create a gateway order using the amount read from the database (in paise), not an amount trusted from the browser.
5. React opens the provider's checkout using the returned gateway order ID.
6. Backend verifies the returned payment signature using the secret key and stores the gateway payment ID/status. A verified webhook should also reconcile payment events.
7. Test success, failure, cancellation, duplicate callbacks, and webhook verification before switching to Live Mode.
8. After provider approval, configure Live Mode keys on the hosting server and use HTTPS.

## Two separate payments for this store

- **Product payment:** create a gateway payment for the full product total when the customer places the order.
- **Delivery payment:** after the admin finishes the item, uploads its photos, and enters the delivery charge, create a second gateway payment for that delivery amount.

Both payments must be independently verified by the backend before the admin can mark the order ready for dispatch. Do not mark an order paid based only on a browser success message.

## Important security notes

- Never send `RAZORPAY_KEY_SECRET` to the browser or commit it to source control.
- Never paste live API secrets into ChatGPT or a public repository.
- Do not use Live Mode until Test Mode and webhook verification have been tested.
- Gateway onboarding requirements and supported payment methods depend on the provider's current merchant approval and account configuration.

**Live gateway is not activated in this ZIP** because the store owner must first create/approve the merchant account and configure private API credentials. Until then, the existing QR/manual verification flow remains available.
