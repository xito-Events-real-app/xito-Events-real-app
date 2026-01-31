
Goal
- In Finance Manager, prevent adding (and editing) any payment if the client’s “Final Fixed Quotation” (Column AD) is not locked/saved.
- Ensure this rule is enforced both in the UI and in the backend function so it cannot be bypassed from any screen.

What’s happening now (why it “isn’t fixed”)
- The earlier fix only enforced “final quotation required” in the BOOKED status flow dialog (AdvancePaymentDialog).
- Finance Manager uses a different payment UI (finance/PaymentDrawer + PaymentHistorySheet) which currently does not check whether final quotation exists; it just calls addPayment(), and the backend accepts it even when finalQuotationAmount is 0.

Implementation changes (high level)
1) Frontend (Finance Manager)
- Block opening/saving payments when final quotation is missing.
- Show a clear “Final quotation not fixed” message so it’s obvious why the button is disabled.

2) Frontend (Booked Clients payment drawer)
- Align messaging/guarding so the user gets the same clear message (even though the booked drawer already effectively blocks by remainingBalance=0).

3) Backend (google-sheets function)
- Add hard validation in addPayment and updatePayment so payment writes are rejected if final quotation is missing in the BOOKED CLIENTS sheet.
- Prefer reading the final quotation directly from the sheet row (Column AD) so the backend never trusts a possibly-stale/incorrect finalQuotationAmount sent from the UI.

Files we will update
Frontend
- src/components/finance/PaymentDrawer.tsx
- src/components/finance/PaymentHistorySheet.tsx
- src/components/finance/FinanceClientCard.tsx
- src/components/booked/PaymentDrawer.tsx (consistency / better error message)

Backend
- supabase/functions/google-sheets/index.ts (addPayment + updatePaymentEntry validation)

Detailed steps

A) Finance: PaymentDrawer must require final quotation
Changes in src/components/finance/PaymentDrawer.tsx
- Add a boolean:
  - hasFinalQuotation = finalQuotationAmount > 0
- UI:
  - If !hasFinalQuotation, show a visible warning panel at the top of the drawer explaining:
    - “Final quotation is not fixed. Please lock the final quotation first (ADVANCE PENDING) before recording payment.”
  - Disable the “Add Payment” button when !hasFinalQuotation.
- Safety check in handleSubmit:
  - Before calling addPayment(), if !hasFinalQuotation:
    - toast.error("Final quotation not fixed. Please set final quotation first.")
    - return
This ensures even if the button state is bypassed, the function still won’t proceed.

B) Finance: PaymentHistorySheet must block “Add Payment” and “Save Changes” when quote is missing
Changes in src/components/finance/PaymentHistorySheet.tsx
- Compute quotationAmount already exists.
- Add:
  - hasFinalQuotation = quotationAmount > 0
- Disable “Add Payment” button:
  - disabled={!hasFinalQuotation}
  - If disabled, show a small explanatory text under the button or a banner near the top.
- Editing protection:
  - Disable opening edit mode (Edit icon button) OR allow opening but disable “Save Changes” with an explanatory message.
  - Also add a guard inside handleEditPaymentSubmit:
    - if (!hasFinalQuotation) { toast.error(...); return; }

C) Finance: FinanceClientCard should not open the drawer if quotation is missing
Changes in src/components/finance/FinanceClientCard.tsx
- It currently calculates quotationAmount from client.finalQuotation (0 when missing).
- Update the “Add Payment” (+) button:
  - If quotationAmount <= 0:
    - visually disabled (opacity/cursor-not-allowed)
    - onClick shows a toast explaining final quotation must be fixed first
    - do not open the drawer
This prevents the user from even getting into the payment form for invalid clients.

D) Booked Clients: make the “missing quotation” message explicit
Changes in src/components/booked/PaymentDrawer.tsx
- This drawer already blocks payment if remainingBalance is 0, but it produces confusing validation (“exceeds remaining balance of NPR 0”).
- Add:
  - hasFinalQuotation = finalQuotationAmount > 0
- If !hasFinalQuotation:
  - show a clear banner message
  - disable the submit button immediately (and skip amount validation messaging)

E) Backend: hard reject payment writes when final quotation is missing
Changes in supabase/functions/google-sheets/index.ts

E1) addPayment()
- After the code determines actualRowNumber in BOOKED CLIENTS:
  - Read Column AD from BOOKED CLIENTS for that row:
    - range: 'BOOKED CLIENTS'!AD{actualRowNumber}
  - Parse final quotation amount from that cell using a robust regex:
    - Prefer matching “NPR <digits,commas>”
  - If parsedAmount <= 0:
    - throw new Error("Final quotation not fixed for this client. Please lock final quotation before recording payment.")
- Use parsedAmount as the finalQuotationAmount for remaining calculation (instead of trusting the client-sent finalQuotationAmount).

E2) updatePaymentEntry()
- Similarly, before recalculating remaining:
  - Verify final quotation exists on the BOOKED CLIENTS row (Column AD)
  - If missing => throw an error and do not update payments

Why backend validation is required
- Without this, any screen (current or future) that calls addPayment/updatePayment can still write invalid data.
- This also prevents edge cases where UI state is stale or a user bypasses disabled buttons.

Testing checklist (end-to-end)
1) Finance Manager: client with missing final quotation
- Attempt to add payment from:
  - FinanceClientCard (+) button
  - PaymentHistorySheet “Add Payment”
  - PaymentHistorySheet edit “Save Changes”
- Expected: all blocked with clear message; no sheet updates occur.

2) Finance Manager: client with valid final quotation
- Add payment normally
- Expected: payment is recorded and remaining payment is correct.

3) Regression: Booking flow (Client Detail / Dashboard / Desktop row)
- Ensure booking + payment still works when final quotation exists.
- Ensure “final quotation missing” still blocks booking payment as intended.

Notes / edge cases handled
- If final quotation exists in the sheet but the Finance list is stale, the UI may still block because it only knows what it loaded. In that case the user can hit the existing Finance “Refresh/Resync” buttons to pull the latest data before adding payment. The backend will also be correct once UI refreshes.
- Backend parsing will accept both “PREMIUM: NPR 75,000/-” and similar common variations as long as “NPR <amount>” is present.

Scope control
- This plan focuses on Finance Manager + payment editing and backend enforcement. If you want, we can add a follow-up improvement: a small “Fix Final Quotation” action for already-booked clients that were moved without a final quotation, so you can lock the quotation without leaving Finance.
