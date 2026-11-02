import { body, route } from "../../../lib/route";
import { getSettings, saveSettings } from "../../../lib/settings";

export const GET = route(() => getSettings());

export const PATCH = route(async (request) => saveSettings(await body(request)));
