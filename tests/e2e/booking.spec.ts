import { expect, test } from "@playwright/test";

test.describe("mobile booking", () => {
  test("book in three taps, see the ticket, then cancel from the manage link", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    await page.goto("/");
    await page.getByRole("button", { name: "Book", exact: true }).first().click();

    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "How many of you?" })).toBeVisible();

    // Tap 1: party size 2 (auto-advances)
    await sheet.getByRole("button", { name: "2 guests" }).click();
    await expect(sheet.getByRole("heading", { name: "Pick a day and time" })).toBeVisible();
    await expect(page).toHaveURL(/step=time/);

    // Tap 2: a day a few days out that is open, then the first free time (auto-advances)
    const dates = sheet.getByRole("group", { name: "Choose a date" }).getByRole("button");
    await expect(dates.nth(5)).toBeVisible();
    const count = await dates.count();
    let picked = false;
    for (let i = 3; i < Math.min(count, 12) && !picked; i++) {
      const d = dates.nth(i);
      if ((await d.getAttribute("aria-disabled")) === "true") continue;
      await d.click();
      picked = true;
    }
    expect(picked).toBe(true);
    const free = sheet.getByRole("group", { name: /^(Lunch|Dinner)$/ }).locator('button:not([aria-disabled="true"])');
    await expect(free.first()).toBeVisible();
    await free.first().click();

    // Tap 3: details and confirm
    await expect(sheet.getByRole("heading", { name: "Check and confirm" })).toBeVisible();
    await sheet.getByLabel("Name").fill("Eve Tester");
    await sheet.getByLabel("Email").fill(email);
    await sheet.getByLabel("Phone").fill("07700 900456");
    await sheet.getByRole("button", { name: "Confirm booking" }).click();

    // The ticket prints out with a booking reference
    await expect(sheet.getByRole("heading", { name: "You are booked" })).toBeVisible();
    const ticket = sheet.getByRole("article");
    await expect(ticket).toContainText(/OLM-[A-Z2-9]{4}/);
    await expect(ticket).toContainText("Table for 2");

    // Manage link: GET never cancels, the cancel is an explicit confirmed action
    await sheet.getByRole("link", { name: "Manage this booking" }).click();
    await expect(page).toHaveURL(/\/booking\/OLM-[A-Z2-9]{4}\?t=/);
    await expect(page.getByRole("heading", { name: "Your booking" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your booking" })).toBeVisible(); // still confirmed after a reload

    await page.getByRole("button", { name: "Cancel booking" }).click();
    await page.getByRole("button", { name: "Yes, cancel booking" }).click();
    await expect(page.getByText("Booking cancelled")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "This booking is cancelled" })).toBeVisible();
  });

  test("a manage link with the wrong token shows nothing", async ({ page }) => {
    await page.goto("/booking/OLM-AAAA?t=not-a-real-token");
    await expect(page.getByRole("heading", { name: "We could not open that booking" })).toBeVisible();
  });

  test("the browser back button steps back through the sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Book", exact: true }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: "4 guests" }).click();
    await expect(sheet.getByRole("heading", { name: "Pick a day and time" })).toBeVisible();
    await page.goBack();
    await expect(sheet.getByRole("heading", { name: "How many of you?" })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("menu", () => {
  test("filter Vegan and leave out Tree nuts @desktop", async ({ page }) => {
    await page.goto("/menu");
    await expect(page.getByRole("heading", { name: "Marinara" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pork" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Vegan", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Marinara" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Raw and roasted vegetables, romesco" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Oak-roasted pork chop" })).toHaveCount(0);

    await page.getByRole("button", { name: "Leave out allergens" }).click();
    await page.getByRole("checkbox", { name: "Tree nuts" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Raw and roasted vegetables, romesco" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Marinara" })).toBeVisible();
  });

  test("filters report how many dishes match and can be cleared", async ({ page }) => {
    await page.goto("/menu");
    await page.getByRole("button", { name: "Vegan", exact: true }).click();
    await expect(page.getByText("8 dishes match.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(page.getByRole("heading", { name: "Oak-roasted pork chop" })).toBeVisible();
  });
});

test.describe("admin and api", () => {
  test("admin login page renders and /admin redirects when signed out", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("availability api validates input and never caches", async ({ request }) => {
    const bad = await request.get("/api/availability?date=nope&party=2");
    expect(bad.status()).toBe(400);
    const ok = await request.get("/api/availability?date=2030-01-01&party=2");
    expect(ok.status()).toBe(200);
    expect(ok.headers()["cache-control"]).toContain("no-store");
  });

  test("home page has restaurant structured data", async ({ page }) => {
    await page.goto("/");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const restaurant = blocks.map((b) => JSON.parse(b)).find((b) => b["@type"] === "Restaurant");
    expect(restaurant.acceptsReservations).toBe(true);
    expect(restaurant.openingHoursSpecification.length).toBeGreaterThan(5);
    expect(restaurant.potentialAction["@type"]).toBe("ReserveAction");
  });
});
