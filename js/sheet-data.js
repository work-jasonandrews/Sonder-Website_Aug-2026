/* ============================================================
   SONDER — Google Sheet data fetchers

   Menu:
   - Loaded directly from the Google Sheet CSV.

   Delivery dates / time slots:
   - Loaded through the Apps Script endpoint using JSONP.
   - This avoids browser CORS/CORB problems.
   ============================================================ */


/* ============================================================
   MENU
   ============================================================ */

async function fetchSheetTab(gid) {

  const url =
    sonderSheetCsvUrl(gid) +
    "&t=" +
    Date.now();

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Could not load sheet data");
  }

  const csvText = await res.text();

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data;
}


async function getMenu() {

  const rows =
    await fetchSheetTab(
      SONDER_CONFIG.TABS.MENU
    );

  return rows
    .filter(
      (r) =>
        (r.Available || "")
          .trim()
          .toUpperCase() === "Y"
    )
    .map((r) => ({
      dish: (r.Dish || "").trim(),
      description: (r.Description || "").trim(),
      price: Number(r.Price) || 0,
      portions: (r.Portions || "").trim(),
      stock:
        r.Stock === "" ||
        r.Stock === undefined
          ? null
          : Number(r.Stock),
      imageUrl: (r.ImageURL || "").trim(),
    }));
}


/* ============================================================
   DELIVERY DATES + TIME SLOTS
   ============================================================ */

/**
 * Load delivery dates from Apps Script.
 */
function getDeliveryDates() {

  return new Promise((resolve, reject) => {

    const callbackName =
      "sonderDates_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 100000);

    const script =
      document.createElement("script");

    const timeout =
      setTimeout(() => {

        cleanup();

        reject(
          new Error(
            "Timed out loading delivery dates"
          )
        );

      }, 10000);


    function cleanup() {

      clearTimeout(timeout);

      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }


    window[callbackName] =
      function (data) {

        cleanup();

        if (
          !data ||
          data.ok !== true ||
          !Array.isArray(data.dates)
        ) {
          reject(
            new Error(
              "Invalid delivery dates response"
            )
          );

          return;
        }

        resolve(data.dates);
      };


    script.onerror = function () {

      cleanup();

      reject(
        new Error(
          "Could not load delivery dates"
        )
      );
    };


    const url =
      SONDER_CONFIG.ORDERS_ENDPOINT +
      "?action=dates&callback=" +
      encodeURIComponent(callbackName) +
      "&t=" +
      Date.now();


    script.src = url;

    document.head.appendChild(script);
  });
}


/**
 * Load time slots from Apps Script.
 */
function getTimeSlots() {

  return new Promise((resolve, reject) => {

    const callbackName =
      "sonderSlots_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 100000);

    const script =
      document.createElement("script");

    const timeout =
      setTimeout(() => {

        cleanup();

        reject(
          new Error(
            "Timed out loading time slots"
          )
        );

      }, 10000);


    function cleanup() {

      clearTimeout(timeout);

      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }


    window[callbackName] =
      function (data) {

        cleanup();

        if (
          !data ||
          data.ok !== true ||
          !Array.isArray(data.slots)
        ) {
          reject(
            new Error(
              "Invalid time slots response"
            )
          );

          return;
        }

        resolve(data.slots);
      };


    script.onerror = function () {

      cleanup();

      reject(
        new Error(
          "Could not load time slots"
        )
      );
    };


    const url =
      SONDER_CONFIG.ORDERS_ENDPOINT +
      "?action=slots&callback=" +
      encodeURIComponent(callbackName) +
      "&t=" +
      Date.now();


    script.src = url;

    document.head.appendChild(script);
  });
}


/* ============================================================
   STOCK BADGES
   ============================================================ */

function stockBadge(stock) {

  if (stock === null) {
    return {
      label: "In stock",
      cls: "badge-instock",
    };
  }

  if (stock <= 0) {
    return {
      label: "Sold out for today",
      cls: "badge-soldout",
    };
  }

  if (stock <= 3) {
    return {
      label: `Only ${stock} left today`,
      cls: "badge-lowstock",
    };
  }

  return {
    label: "In stock",
    cls: "badge-instock",
  };
}
