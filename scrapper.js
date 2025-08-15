const express = require("express");
const puppeteer = require("puppeteer");
const app = express();
const port = 3000;

app.get("/", async (req, res) => {
  const iciciData = await getICICIOffers();
  const axisData = await getAxisBankOffers();

  let html = `
    <html>
    <head>
      <title>Bank Offers</title>
      <style>
        table { border-collapse: collapse; width: 100%; margin-bottom: 50px; }
        th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
        th { background-color: #f4f4f4; }
        img { max-width: 150px; }
        h1 { text-align: center; }
      </style>
    </head>
    <body>
      <h1>ICICI Bank Offers</h1>
      ${generateTable(
        iciciData,
        ["Image", "Title", "Description", "Payment Modes", "Views", "Days Left", "Offer Page", "Category Link", "Partner Link"],
        (offer) => `
          <td><img src="${offer.img}" /></td>
          <td>${offer.title}</td>
          <td>${offer.description}</td>
          <td>${offer.paymentModes}</td>
          <td>${offer.views}</td>
          <td>${offer.daysLeft}</td>
          <td><a href="${offer.offerPageLink}" target="_blank">View</a></td>
          <td><a href="${offer.categoryLink}" target="_blank">Category</a></td>
          <td><a href="${offer.partnerLink}" target="_blank">Partner</a></td>
        `
      )}

      <h1>Axis Bank Offers</h1>
      ${generateTable(
        axisData,
        ["Image", "Title", "Description", "Expiry", "Offer Page"],
        (offer) => `
          <td><img src="${offer.img}" /></td>
          <td>${offer.title}</td>
          <td>${offer.description}</td>
          <td>${offer.expiry}</td>
          <td><a href="${offer.offerPageLink}" target="_blank">View</a></td>
        `
      )}
    </body>
    </html>
  `;

  res.send(html);
});
function generateTable(data, headers, rowBuilder) {
  let table = `<table><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
  data.forEach(offer => {
    table += `<tr>${rowBuilder(offer)}</tr>`;
  });
  table += `</table>`;
  return table;
}
async function getICICIOffers() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();
    await page.goto("https://www.icicibank.com/offers", { waitUntil: "networkidle2" });
    await page.waitForSelector(".offer-card");

    return await page.evaluate(() => {
      const cards = document.querySelectorAll(".offer-card");
      return Array.from(cards).map(card => {
        const imgElem = card.querySelector(".offer-card-media img");
        const img = imgElem
          ? imgElem.src.startsWith("/")
            ? "https://www.icicibank.com" + imgElem.getAttribute("src")
            : imgElem.src
          : "";
        const title = card.querySelector(".title h2")?.innerText.trim() || "";
        const description = card.querySelector(".description p")?.innerText.trim() || "";
        const paymentModes = Array.from(card.querySelectorAll(".offer-paymode-list li"))
          .map(li => li.innerText.trim()).join(", ");
        const views = card.querySelector(".num-viewer")?.innerText.trim() || "";
        const daysLeft = card.querySelector(".remaining-time-v2")?.innerText.trim() || "";
        const offerPageLink = card.querySelector(".title a")?.href || "";
        const categoryLink = card.querySelector(".offer-card-cta-2 a")?.href || "";
        const partnerLink = card.querySelector(".offer-disclaimer-link")?.href || "";

        return { img, title, description, paymentModes, views, daysLeft, offerPageLink, categoryLink, partnerLink };
      });
    });
  } finally {
    await browser?.close();
  }
}
async function getAxisBankOffers() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();
    await page.goto("https://www.axisbank.com/grab-deals/online-offers", { waitUntil: "networkidle2" });
    await page.waitForSelector("#ulGrabDeals .tmainListing");
    await autoScroll(page);

    return await page.evaluate(() => {
      const cards = document.querySelectorAll("#ulGrabDeals .tmainListing");
      return Array.from(cards).map(card => {
        const imgElem = card.querySelector(".travelImgwrap img");
        const img = imgElem
          ? imgElem.src.startsWith("/")
            ? "https://www.axisbank.com" + imgElem.getAttribute("src")
            : imgElem.src
          : "";
        const title = card.querySelector(".tofferHeader h4")?.innerText.trim() || "";
        const description = card.querySelector(".travelContentwrap p")?.innerText.trim() || "";
        const expiry = card.querySelector(".travelexpires")?.innerText.trim() || "";
        const offerPageLink = card.querySelector(".travelTnc")?.href
          ? "https://www.axisbank.com" + card.querySelector(".travelTnc").getAttribute("href")
          : "";
        return { img, title, description, expiry, offerPageLink };
      });
    });
  } finally {
    await browser?.close();
  }
}
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
//   getAxisBankOffers()
//     .then((data) => {
//       console.log("Product data fetched successfully:", data);
//     })
//     .catch((err) => {
//       console.error("Error fetching product data:", err);
//     });
});
module.exports = app;
