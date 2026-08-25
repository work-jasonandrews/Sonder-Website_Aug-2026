/* ============================================================
   SONDER — Checkout logic (cart-based, no delivery fee lookup)
   ============================================================ */

const els = {
  loadError: document.getElementById("load-error"),
  emptyCart: document.getElementById("empty-cart"),
  form: document.getElementById("order-form"),
  cartItems: document.getElementById("cart-items"),
  summaryRows: document.getElementById("summary-rows"),
  sumTotal: document.getElementById("sum-total"),
  slot: document.getElementById("slot"),
  date: document.getElementById("date"),
  payBtn: document.getElementById("pay-btn"),
   
   let menuStock = {};

async function loadMenuStock() {
  try {
    const dishes = await getMenu();

    menuStock = {};

    dishes.forEach((dish) => {
      menuStock[dish.dish] = dish.stock;
    });
  } catch (e) {
    console.warn("Could not load menu stock:", e);
    menuStock = {};
  }
}


function renderCart() {
  const cart = getCart();
  if (!cart.length) {
    els.emptyCart.classList.remove("hidden");
    els.form.classList.add("hidden");
    return;
  }
  els.emptyCart.classList.add("hidden");
  els.form.classList.remove("hidden");

  els.cartItems.innerHTML = cart
    .map(
      (item, i) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--beige-line);">
        <div>
          <div style="font-family:var(--font-display); font-size:1.1rem;">${item.dish}</div>
          <div class="muted" style="font-size:0.85rem;">₹${item.price} each</div>
        </div>
        <div style="display:flex; align-items:center; gap:14px;">
          <select onchange="handleQtyChange(${i}, this.value)" style="width:64px;">
  ${Array.from(
    { length: Math.max(menuStock[item.dish] || 1, item.qty) },
    (_, n) => n + 1
  )
    .map(
      (n) =>
        `<option value="${n}" ${n === item.qty ? "selected" : ""}>${n}</option>`
    )
    .join("")}
</select>
          <span style="min-width:56px; text-align:right;">₹${item.price * item.qty}</span>
          <button type="button" onclick="handleRemove(${i})" style="background:none; border:none; color:#8a3b3b; cursor:pointer; font-size:0.85rem;">Remove</button>
        </div>
      </div>`
    )
    .join("");

  els.summaryRows.innerHTML = cart
    .map((item) => `<div class="summary-row"><span>${item.dish} x${item.qty}</span><span>₹${item.price * item.qty}</span></div>`)
    .join("");

  els.sumTotal.textContent = `₹${cartTotal()}`;
}

function handleQtyChange(index, qty) {
  updateCartQty(index, Number(qty));
  renderCart();
}

function handleRemove(index) {
  removeFromCart(index);
  renderCart();
}

async function loadSlots() {
  try {
    const slots = await getTimeSlots();
    els.slot.innerHTML = slots.length
      ? `<option value="">Choose a slot</option>` + slots.map((s) => `<option>${s}</option>`).join("")
      : `<option value="">No slots configured yet</option>`;
  } catch (e) {
    els.slot.innerHTML = `<option value="">Couldn't load slots, please refresh</option>`;
  }
}

async function loadDates() {
  try {
    const dates = await getDeliveryDates();
    els.date.innerHTML = dates.length
      ? `<option value="">Choose a date</option>` + dates.map((d) => `<option>${d}</option>`).join("")
      : `<option value="">No dates configured yet</option>`;
  } catch (e) {
    els.date.innerHTML = `<option value="">Couldn't load dates, please refresh</option>`;
  }
}

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const cart = getCart();
  if (!cart.length) return;

  els.payBtn.disabled = true;
  els.payBtn.innerHTML = `<span class="spinner"></span> Preparing order…`;

  const itemsSummary = cart.map((i) => `${i.dish} x${i.qty}`).join(", ");
  const order = {
    items: itemsSummary,
    total: cartTotal(),
    name: document.getElementById("name").value.trim(),
    contact: document.getElementById("contact").value.trim(),
    email: document.getElementById("email").value.trim(),
    altContact: document.getElementById("altcontact").value.trim(),
    address: document.getElementById("address").value.trim(),
    landmark: document.getElementById("landmark").value.trim(),
    date: els.date.value,
    slot: els.slot.value,
    instructions: document.getElementById("instructions").value.trim(),
    orderId: "SON-" + Date.now(),
  };

  try {
    await logOrder({ ...order, status: "Pending" });
  } catch (err) {
    console.warn("Order logging failed, continuing to payment:", err);
  }

  openRazorpay(order);
});

function logOrder(order) {
  const url = new URL(SONDER_CONFIG.ORDERS_ENDPOINT);
  Object.entries(order).forEach(([k, v]) => url.searchParams.set(k, v));
  return fetch(url.toString(), { method: "GET", mode: "no-cors" });
}

function openRazorpay(order) {
  const options = {
    key: SONDER_CONFIG.RAZORPAY_KEY_ID,
    amount: order.total * 100,
    currency: "INR",
    name: SONDER_CONFIG.BUSINESS_NAME,
    description: order.items,
    prefill: { name: order.name, email: order.email, contact: order.contact },
    notes: { order_id: order.orderId },
    handler: async function (response) {
      try {
        await logOrder({ ...order, status: "Paid", paymentId: response.razorpay_payment_id });
      } catch (err) {
        console.warn("Failed to log paid status:", err);
      }
      clearCart();
      const q = new URLSearchParams({
        order: order.orderId,
        items: order.items,
        total: order.total,
        date: order.date,
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

(async function initCheckout() {
  await loadMenuStock();
  renderCart();
  loadSlots();
  loadDates();
})();
