import { regeneratePlan } from "../../../lib/queries";
import { HttpError, route } from "../../../lib/route";

/** Rebuilds the study plan from today (see regeneratePlan). */
export const POST = route(async () => {
  try {
    return { tasks: await regeneratePlan() };
  } catch (err) {
    if (err instanceof Error && !(err instanceof HttpError) && /Settings|exam|study days/.test(err.message)) {
      throw new HttpError(400, err.message);
    }
    throw err;
  }
});
