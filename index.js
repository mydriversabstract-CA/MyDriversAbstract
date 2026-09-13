/**
 * Ontario Licence Check: one offline tool that validates the format of an
 * Ontario driver's licence number and decodes the birth date it encodes.
 */
import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { checkLicence, describeCheck } from "./licence.js";

export default definePluginEntry({
  id: "ontario-licence-check",
  name: "Ontario Licence Check",
  description: "Validates Ontario driver's licence numbers and decodes the birth date they encode.",
  register(api) {
    api.registerTool({
      name: "ontario_licence_check",
      description:
        "Check whether a string is a correctly formatted Ontario (Canada) driver's licence number and decode the birth date and sex marker encoded in its last six digits. Format check only: it cannot confirm that the licence exists or is valid. Runs offline with no network calls.",
      parameters: Type.Object({
        licence: Type.String({
          description: "The licence number as printed on the card, with or without dashes or spaces, e.g. S1234-56789-00514",
        }),
      }),
      async execute(_id, params) {
        const result = checkLicence(params.licence);
        return {
          content: [{ type: "text", text: describeCheck(result) }],
          details: result,
        };
      },
    });
  },
});
