/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { logger } from "../../../../../functions/server/logging";
import { isAdmin, authOptions } from "../../../../utils/auth";
import {
  deleteSubscriber,
  getOnerepProfileId,
  getSubscribersByHashes,
} from "../../../../../../db/tables/subscribers";
import {
  activateAndOptoutProfile,
  deactivateProfile,
} from "../../../../../functions/server/onerep";
import { captureException } from "@sentry/node";
import { deleteProfileDetails } from "../../../../../../db/tables/onerep_profiles";
import {
  deleteScanResultsForProfile,
  deleteScansForProfile,
} from "../../../../../../db/tables/onerep_scans";

/**
 * Look up a subscriber based on SHA1 hash of their email address.
 *
 * This requires admin privileges, and doesn't return any PII directly, just user state and IDs.
 *
 * @param req
 * @param root0
 * @param root0.params
 * @param root0.params.primarySha1
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { primarySha1: string } },
) {
  const session = await getServerSession(authOptions);
  if (isAdmin(session?.user?.email || "")) {
    // Signed in as admin
    try {
      if (!params.primarySha1) {
        return NextResponse.json({ success: false }, { status: 400 });
      }

      const primarySha1 = params.primarySha1;
      const subscriber = (await getSubscribersByHashes([primarySha1]))[0];
      return NextResponse.json({
        subscriberId: subscriber.id,
        onerepProfileId: subscriber.onerep_profile_id,
        createdAt: subscriber.created_at,
        updatedAt: subscriber.updated_at,
        signupLanguage: subscriber.signup_language,
        all_emails_to_primary: subscriber.all_emails_to_primary,
      });
    } catch (e) {
      logger.error(e);
      return NextResponse.json({ success: false }, { status: 500 });
    }
  } else {
    // Not signed in as admin
    return NextResponse.json({ success: false }, { status: 401 });
  }
}

/**
 * Change user state based on subscriber ID.
 *
 * Multiple actions may be specified in one request:
 * {
 *   "actions":[
 *     "subscribe",
 *     "unsubscribe",
 *     "delete_onerep_profile",
 *     "delete_onerep_scans",
 *     "delete_onerep_scan_results",
 *     "delete_subscriber"
 *   ]
 * }
 *
 * Actions will be processed in the order specified.
 *
 * NOTE: this will only carry out the server actions that should happen - client
 * state (such as the badge) depends on the FxA `subscriptions` claim in the JWT.
 *
 * @param req
 * @param root0
 * @param root0.params
 * @param root0.params.primarySha1
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { primarySha1: string } },
) {
  const session = await getServerSession(authOptions);
  if (isAdmin(session?.user?.email || "")) {
    // Signed in as admin
    try {
      const primarySha1 = params.primarySha1;
      if (!params.primarySha1) {
        return NextResponse.json({ success: false }, { status: 400 });
      }

      const body = await req.json();
      const actions = body.actions;

      if (!primarySha1) {
        return NextResponse.json({ success: false }, { status: 400 });
      }

      const subscriber = (await getSubscribersByHashes([primarySha1]))[0];
      const result = await getOnerepProfileId(subscriber.id);
      const onerepProfileId = result?.[0]?.["onerep_profile_id"] as number;

      logger.debug("admin_subscription_change", JSON.stringify(result));

      for (const action of actions) {
        switch (action) {
          case "subscribe": {
            // activate and opt out profiles
            await activateAndOptoutProfile(onerepProfileId);
            logger.info("force_user_subscribe", {
              onerepProfileId,
              primarySha1,
            });
            break;
          }
          case "unsubscribe": {
            await deactivateProfile(onerepProfileId);
            logger.info("force_user_unsubscribe", {
              onerepProfileId,
              primarySha1,
            });
            break;
          }
          case "delete_onerep_profile": {
            await deleteProfileDetails(onerepProfileId);
            logger.info("delete_onerep_profile", {
              onerepProfileId,
              primarySha1,
            });
            break;
          }
          case "delete_onerep_scans": {
            await deleteScansForProfile(onerepProfileId);
            logger.info("delete_onerep_scans", {
              onerepProfileId,
              primarySha1,
            });
            break;
          }
          case "delete_onrep_scan_results": {
            await deleteScanResultsForProfile(onerepProfileId);
            logger.info("delete_onerep_scan_results", {
              onerepProfileId,
              primarySha1,
            });
            break;
          }
          case "delete_subscriber": {
            await deleteSubscriber(subscriber);
            logger.info("delete_subscriber", {
              onerepProfileId,
              primarySha1,
            });
            break;
          }
          default: {
            logger.error("Unknown action:", action);
            return NextResponse.json({ success: false }, { status: 500 });
          }
        }
      }
    } catch (ex) {
      captureException(ex);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } else {
    // Not signed in as admin
    return NextResponse.json({ success: false }, { status: 401 });
  }
}
