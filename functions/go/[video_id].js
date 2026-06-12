import { goLinks } from "../_data/go-links.generated.mjs";
import { handleGoRequest } from "../../src/go-handler.mjs";

export function onRequest(context) {
  return handleGoRequest({ ...context, links: goLinks });
}
