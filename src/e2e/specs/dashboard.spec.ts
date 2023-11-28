/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { test, expect } from "../fixtures/basePage.js";
import { DashboardPage } from "../pages/dashBoardPage.js";
import { checkAuthState } from "../utils/helpers.js";

// bypass login
test.use({ storageState: "./e2e/storageState.json" });
test.describe(`${process.env.E2E_TEST_ENV} - Breaches Dashboard - Headers`, () => {
  test.beforeEach(async ({ dashboardPage, page }) => {
    await dashboardPage.open();

    try {
      await checkAuthState(page);
    } catch {
      console.log("[E2E_LOG] - No fxa auth required, proceeding...");
    }
  });

  test("Verify that the site header is displayed correctly for signed in users", async ({
    dashboardPage,
  }) => {
    // link to testrail
    test.info().annotations.push({
      type: "testrail",
      description:
        "https://testrail.stage.mozaws.net/index.php?/cases/view/2301512",
    });

    await expect(dashboardPage.dashboardNavButton).toHaveAttribute(
      "href",
      "/redesign/user/dashboard",
    );
    await expect(dashboardPage.FAQsNavButton).toHaveAttribute(
      "href",
      "https://support.mozilla.org/kb/firefox-monitor-faq",
    );
  });

  test("Verify that the site header and navigation bar is displayed correctly", async ({
    dashboardPage,
  }) => {
    // link to testrail
    test.info().annotations.push({
      type: "testrail",
      description:
        "https://testrail.stage.mozaws.net/index.php?/cases/view/2301511",
    });

    // verify the navigation bar left side elements
    expect(await dashboardPage.fireFoxMonitorLogoImgButton.isVisible()).toBe(
      true,
    );
    expect(await dashboardPage.dashboardNavButton.isVisible()).toBe(true);
    expect(await dashboardPage.exposuresHeading.isVisible()).toBe(true);
    expect(await dashboardPage.FAQsNavButton.isVisible()).toBe(true);

    // verify the site header elements
    expect(await dashboardPage.actionNeededTab.isVisible()).toBe(true);
    expect(await dashboardPage.fixedTab.isVisible()).toBe(true);
  });
});

test.describe(`${process.env.E2E_TEST_ENV} - Breaches Dashboard - Headers - Outside of U.S.`, () => {
  test("Verify that the site header and navigation bar is displayed correctly", async ({
    context,
  }) => {
    // link to testrail
    test.info().annotations.push({
      type: "testrail",
      description:
        "https://testrail.stage.mozaws.net/index.php?/cases/view/2301511",
    });

    const page = await context.newPage();
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 55.9533, longitude: -3.1883 }); // Set location to Edinburgh

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.open();

    try {
      await checkAuthState(page);
    } catch {
      console.log("[E2E_LOG] - No fxa auth required, proceeding...");
    }

    // verify the site header elements
    expect(await dashboardPage.upgradeToPremium.isHidden()).toBe(true);
  });
});

test.describe(`${process.env.E2E_TEST_ENV} - Breaches Dashboard - Content`, () => {
  test.beforeEach(async ({ dashboardPage, page }) => {
    await dashboardPage.open();

    try {
      await checkAuthState(page);
    } catch {
      console.log("[E2E_LOG] - No fxa auth required, proceeding...");
    }
  });

  test("Verify that the exposure list contains action needed", async ({
    dashboardPage,
    page,
  }) => {
    // link to testrail
    test.info().annotations.push({
      type: "testrail",
      description:
        "https://testrail.stage.mozaws.net/index.php?/cases/view/2301533",
    });

    await expect(dashboardPage.exposuresHeading).toBeVisible();
    const listCount = await page
      .locator('//div[starts-with(@class, "StatusPill_pill")]')
      .count();

    // verify exposure list conatins only exposures that need to be fixed
    if (listCount > 0) {
      for (let i = 0; i < listCount; i++) {
        expect(
          await page
            .locator(
              `(//div[starts-with(@class, 'StatusPill_pill')])[${i + 1}]`,
            )
            .textContent(),
        ).toEqual("Action needed");
      }
    }
  });

  test("Verify that the exposure list contains only fixed and in progress cards", async ({
    dashboardPage,
    page,
  }) => {
    // link to testrail
    test.info().annotations.push({
      type: "testrail",
      description:
        "https://testrail.stage.mozaws.net/index.php?/cases/view/2301533",
    });

    await expect(dashboardPage.exposuresHeading).toBeVisible();
    await dashboardPage.fixedTab.click();

    // verify fixed or in-progress
    await expect(dashboardPage.fixedHeading).toBeVisible();

    // TODO: add stubb to fill in fixed/in-progress items
    const listCount = await page
      .locator('//div[starts-with(@class, "StatusPill_pill")]')
      .count();
    // verify exposure list conatins only exposures that need to be fixed
    if (listCount > 0) {
      for (let i = 0; i < listCount; i++) {
        await expect(
          page.locator(
            `(//div[starts-with(@class, "StatusPill_pill")])[${i + 1}]`,
          ),
        ).toHaveText(/In-progress|Fixed/);
      }
    }
  });
});
