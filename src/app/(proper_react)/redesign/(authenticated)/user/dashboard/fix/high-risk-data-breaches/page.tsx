/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { getServerSession } from "next-auth";
import { getSubscriberBreaches } from "../../../../../../../functions/server/getUserBreaches";
import { getSubscriberEmails } from "../../../../../../../functions/server/getSubscriberEmails";
import { getGuidedExperienceBreaches } from "../../../../../../../functions/universal/guidedExperienceBreaches";
import { authOptions } from "../../../../../../../api/utils/auth";
import { redirect } from "next/navigation";
import { View } from "./View";

export default async function HighRiskDataBreaches() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.subscriber?.id) {
    return redirect("/");
  }
  const breaches = await getSubscriberBreaches(session.user);
  const subscriberEmails = await getSubscriberEmails(session.user);
  const guidedExperience = getGuidedExperienceBreaches(
    breaches,
    subscriberEmails
  );

  return <View breaches={guidedExperience} />;
}
