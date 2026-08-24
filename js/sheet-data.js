/* ============================================================
   SONDER — Google Sheet data fetchers
   Reads live data from the published Google Sheet, no backend needed.
   ============================================================ */

async function fetchSheetTab(gid) {
  const url = sonderSheetCsvUrl(gid) + "&t=" + Date.now(); // cache-bust
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load sheet data");
  const csvText = await res.text();
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  return parsed.data;
}

async function getMenu() {
  const rows = await fetchSheetTab(SONDER_CONFIG.TABS.MENU);
  return rows
    .filter((r) => (r.Available || "").trim().toUpperCase() === "Y")
    .map((r) => ({
      dish: (r.Dish || "").trim(),
      description: (r.Description || "").trim(),
      price: Number(r.Price) || 0,
      portions: (r.Portions || "").trim(),
      stock: r.Stock === "" || r.Stock === undefined ? null : Number(r.Stock),
      imageUrl: (r.ImageURL || "").trim(),
    }));
}

async function getDeliveryZones() {
  const rows = await fetchSheetTab(SONDER_CONFIG.TABS.DELIVERY);
  return rows
    .filter((r) => (r.Pincode || "").trim())
    .map((r) => ({
      pincode: (r.Pincode || "").trim(),
      area: (r.Area || "").trim(),
      band: (r.Band || "").trim(),
      fee: Number(r.Fee) || 0,
      serviceable: (r.Serviceable || "Y").trim().toUpperCase() !== "N",
    }));
}

async function getTimeSlots() {
  const rows = await fetchSheetTab(SONDER_CONFIG.TABS.SLOTS);
  return rows
    .filter((r) => (r.Active || "").trim().toUpperCase() === "Y")
    .map((r) => (r.Slot || "").trim())
    .filter(Boolean);
}

function stockBadge(stock) {
  if (stock === null) return { label: "In stock", cls: "badge-instock" };
  if (stock <= 0) return { label: "Sold out for today", cls: "badge-soldout" };
  if (stock <= 3) return { label: `Only ${stock} left today`, cls: "badge-lowstock" };
  return { label: "In stock", cls: "badge-instock" };
}
