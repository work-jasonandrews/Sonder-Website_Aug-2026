/* ============================================================
   SONDER — SITE CONFIG
   This is the ONLY file you (or whoever sets this up) ever
   need to edit with real values. Everything else runs off
   the Google Sheet and this file.
   ============================================================ */

const SONDER_CONFIG = {
  // Your Google Sheet's ID — the long string in the sheet's URL
  // between /d/ and /edit, e.g.
  // https://docs.google.com/spreadsheets/d/1AbCxyz.../edit  ->  "1AbCxyz..."
  SHEET_ID: "1hQ9gY2XKe81qxXw_8jB8sN83oOcmZiIPEAtubeLt0-s",

  // gid (tab ID) for each tab in the sheet. Find these by clicking each
  // tab and reading the number after "gid=" in the browser URL bar.
  TABS: {
    MENU: "842234015",             // "Menu" tab gid, this one is required
    SLOTS: "36268616",    // "TimeSlots" tab gid, this one is required
    DATES: "1441094830",    // "DeliveryDates" tab gid, this one is required
    // DeliveryZones is no longer used by the site (delivery is now
    // charged on actuals, paid to the delivery partner directly).
    // You can leave that tab in your sheet or delete it, either is fine.
  },

  // Your Apps Script Web App URL (from Deploy > New deployment).
  // Ends in /exec
  ORDERS_ENDPOINT: "https://script.google.com/macros/s/AKfycbxlnmnRY17LGBL-UC4PpIKnYuqWwOce0_S7EuiEtZLLSTFtrwtiHmxGiT2K5ssMEmSL3Q/exec",

  // Razorpay Key ID (public, safe to expose in front-end code).
  // Use the "rzp_test_..." key while testing, switch to "rzp_live_..." when ready.
  RAZORPAY_KEY_ID: "rzp_live_TTayuwzEnZUQZI",

  // Shown on receipts / checkout
  BUSINESS_NAME: "Sonder",
  BUSINESS_EMAIL: "Jason@sonder.co.in",
  BUSINESS_PHONE: "+91-9538680557",
};

// ---- internal helper: builds a CSV export URL for a given tab ----
function sonderSheetCsvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SONDER_CONFIG.SHEET_ID}/export?format=csv&gid=${gid}`;
}
