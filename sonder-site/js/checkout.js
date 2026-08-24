/* ============================================================
   SONDER — Checkout logic
   ============================================================ */

const params = new URLSearchParams(window.location.search);
const dishName = params.get("dish") || "Today's dish";
const dishPrice = Number(params.get("price")) || 0;

let deliveryZones = [];
let currentFee = null;
let currentZoneServiceable = null;

const els = {
  form: document.getElementById("order-form"),
  slot: document.getElementById("slot"),
  qty: document.getElementById("qty"),
  pincode: document.getElementById("pincode"),
  sumDishName: document.getElementById("sum-dish-name"),
  sumDishPrice: document.getElementById("sum-dish-price"),
  sumQty: document.getElementById("sum-qty"),
  sumDelivery: document.getElementById("sum-delivery"),
  sumTotal: document.getElementById("sum-total"),
  zoneMsg: document.getElementById("zone-msg"),
  payBtn: document.getElementById("pay-btn"),
  loadError: document.getElementById("load-error"),
};

els.sumDishName.textContent = dishName;
els.sumDishPrice.textContent = `₹${dishPrice}`;

function updateTotals() {
  const qty = Number(els.qty.value) || 1;
  els.sumQty.textContent = qty;
  const subtotal = dishPrice * qty;
  const fee = currentFee === null ? 0 : currentFee;
  const total = subtotal + fee;
  els.sumTotal.textContent = `₹${total}`;
  const readyForPayment = currentFee !== null && currentZoneServiceable && dishPrice > 0;
  els.payBtn.disabled = !readyForPayment;
}

function lookupDelivery() {
  const pin = els.pincode.value.trim();
  if (pin.length < 4) {
    currentFee = null;
    currentZoneServiceable = null;
    els.sumDelivery.textContent = "Enter pincode";
    els.zoneMsg.textContent = "";
    updateTotals();
    return;
  }
  const zone = deliveryZones.find((z) => z.pincode === pin);
  if (!zone) {
    currentFee = null;
    currentZoneServiceable = null;
    els.sumDelivery.textContent = "Not sure yet";
    els.zoneMsg.textContent = "We couldn't match that pincode — write to us at hello@sonder.co.in to check delivery.";
    updateTotals();
    return;
  }
  if (!zone.serviceable) {
    currentFee = null;
    currentZoneServiceable = false;
    els.sumDelivery.textContent = "Not serviceable";
    els.zoneMsg.textContent = `Sorry, we don't currently deliver to ${zone.area || "this area"}.`;
    updateTotals();
    return;
  }
  currentFee = zone.fee;
  currentZoneServiceable = true;
  els.sumDelivery.textContent = `₹${zone.fee}`;
  els.zoneMsg.textContent = `Delivering to ${zone.area || "your area"} (Zone ${zone.band}).`;
  updateTotals();
}

async function init() {
  try {
    const [zones, slots] = await Promise.all([getDeliveryZones(), getTimeSlots()]);
    deliveryZones = zones;
    els.slot.innerHTML = slots.length
      ? `<option value="">Choose a slot</option>` + slots.map((s) => `<option>${s}</option>`).join("")
      : `<option value="">No slots configured yet</option>`;
  } catch (e) {
    els.loadError.textContent = "Couldn't load delivery zones or time slots. Please refresh the page.";
    els.loadError.classList.remove("hidden");
  }
  updateTotals();
}

els.pincode.addEventListener("input", lookupDelivery);
els.qty.addEventListener("change", updateTotals);

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (els.payBtn.disabled) return;

  els.payBtn.disabled = true;
  els.payBtn.innerHTML = `<span class="spinner"></span> Preparing order…`;

  const order = {
    dish: dishName,
    price: dishPrice,
    qty: Number(els.qty.value) || 1,
    deliveryFee: currentFee,
    total: dishPrice * (Number(els.qty.value) || 1) + currentFee,
    name: document.getElementById("name").value.trim(),
    contact: document.getElementById("contact").value.trim(),
    email: document.getElementById("email").value.trim(),
    altContact: document.getElementById("altcontact").value.trim(),
    address: document.getElementById("address").value.trim(),
    landmark: document.getElementById("landmark").value.trim(),
    pincode: els.pincode.value.trim(),
    slot: els.slot.value,
    instructions: document.getElementById("instructions").value.trim(),
    orderId: "SON-" + Date.now(),
  };

  // Log the order as "Pending" in the Orders sheet before payment
  try {
    await logOrder({ ...order, status: "Pending" });
  } catch (err) {
    // Non-fatal — proceed to payment even if logging hiccups, but warn.
    console.warn("Order logging failed, continuing to payment:", err);
  }

  openRazorpay(order);
});

function logOrder(order) {
  const url = new URL(SONDER_CONFIG.ORDERS_ENDPOINT);
  Object.entries(order).forEach(([k, v]) => url.searchParams.set(k, v));
  // no-cors: we can't read the response, but Apps Script still receives and logs it
  return fetch(url.toString(), { method: "GET", mode: "no-cors" });
}

function openRazorpay(order) {
  const options = {
    key: SONDER_CONFIG.RAZORPAY_KEY_ID,
    amount: order.total * 100, // paise
    currency: "INR",
    name: SONDER_CONFIG.BUSINESS_NAME,
    description: `${order.dish} x${order.qty}`,
    prefill: { name: order.name, email: order.email, contact: order.contact },
    notes: { order_id: order.orderId, pincode: order.pincode },
    handler: async function (response) {
      try {
        await logOrder({ ...order, status: "Paid", paymentId: response.razorpay_payment_id });
      } catch (err) {
        console.warn("Failed to log paid status:", err);
      }
      const q = new URLSearchParams({
        order: order.orderId,
        dish: order.dish,
        total: order.total,
        slot: order.slot,
        email: order.email,
      });
      window.location.href = "thankyou.html?" + q.toString();
    },
    modal: {
      ondismiss: function () {
        els.payBtn.disabled = false;
        els.payBtn.textContent = "Pay & place order";
      },
    },
    theme: { color: "#2f4a3c" },
  };
  const rzp = new Razorpay(options);
  rzp.on("payment.failed", function () {
    els.loadError.textContent = "Payment didn't go through. Please try again.";
    els.loadError.classList.remove("hidden");
    els.payBtn.disabled = false;
    els.payBtn.textContent = "Pay & place order";
  });
  rzp.open();
}

init();
