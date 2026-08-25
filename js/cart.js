/* ============================================================
   SONDER — Cart (stored in the browser, per visitor)
   ============================================================ */

const CART_KEY = "sonder_cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(dish, price, qty) {
  const cart = getCart();
  const existing = cart.find((i) => i.dish === dish);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ dish, price, qty });
  }
  saveCart(cart);
}

function updateCartQty(index, qty) {
  const cart = getCart();
  if (qty <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].qty = qty;
  }
  saveCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.qty * i.price, 0);
}

function updateCartBadge() {
  const el = document.getElementById("cart-count");

  if (el) {
    const count = cartCount();
    el.textContent = count;
    el.style.display = count > 0 ? "inline-flex" : "none";
  }

  updateMobileCartBar();
}

function updateMobileCartBar() {
  const bar = document.getElementById("mobile-cart-bar");
  const countEl = document.getElementById("mobile-cart-count");
  const totalEl = document.getElementById("mobile-cart-total");

  if (!bar || !countEl || !totalEl) return;

  const count = cartCount();
  const total = cartTotal();

  if (count > 0) {
    countEl.textContent = `${count} ${count === 1 ? "item" : "items"}`;
    totalEl.textContent = `₹${total}`;
    bar.classList.add("visible");
    bar.setAttribute("aria-hidden", "false");
  } else {
    bar.classList.remove("visible");
    bar.setAttribute("aria-hidden", "true");
  }
}
