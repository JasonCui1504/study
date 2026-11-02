import { addCards } from "../../../lib/card-store";
import { bad, body, id, route, str } from "../../../lib/route";

export const POST = route(async (request) => {
  const b = await body(request);
  if (!str(b.front)) throw bad("The front is required");
  const ids = await addCards(id(b.deck_id), [
    { front: str(b.front), back: str(b.back), extra: str(b.extra), topic_id: str(b.topic_id) || null, tags: str(b.tags) },
  ]);
  return Response.json({ ids }, { status: 201 });
});
