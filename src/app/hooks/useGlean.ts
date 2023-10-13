/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use client";

import { useEffect } from "react";
import Glean from "@mozilla/glean/web";
import * as pageEvents from "../../telemetry/generated/page";

// Custom hook that initializes Glean and returns the Glean objects required
// to record data.
export const useGlean = (channel: string, appEnv: string) => {
  // Initialize Glean only on the first render
  // of our custom hook.
  useEffect(() => {
    // Enable upload only if the user has not opted out of tracking.
    const uploadEnabled = navigator.doNotTrack !== "1";

    if (!channel) {
      throw new ErrorEvent("No channel provided for Glean");
    }

    if (!appEnv) {
      throw new ErrorEvent("No appEnv provided for Glean");
    }

    Glean.initialize("monitor.frontend", uploadEnabled, {
      // This will submit an events ping every time an event is recorded.
      maxEvents: 1,
      channel,
    });

    // Glean debugging options can be found here:
    // https://mozilla.github.io/glean/book/reference/debug/index.html
    if (appEnv && ["local", "heroku"].includes(appEnv)) {
      // Enable logging pings to the browser console.
      Glean.setLogPings(true);
      // Tag pings for the Debug Viewer
      // @see https://debug-ping-preview.firebaseapp.com/pings/fx-monitor-local-dev
      Glean.setDebugViewTag(`fx-monitor-${appEnv}-dev`);
    }
  }, [channel, appEnv]);

  // Return all generated Glean objects required for recording data.
  return {
    pageEvents,
  };
};
