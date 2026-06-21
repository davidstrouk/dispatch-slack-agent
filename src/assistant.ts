import boltPkg from "@slack/bolt";
import { assignmentCard } from "./card.js";
import { dispatchRequest, type DispatchDeps } from "./dispatch.js";

const { Assistant } = boltPkg;

// `recallChannelId` is the community channel (#mutual-aid) whose history we recall from —
// the pane is the control surface, not the data source.
export function makeAssistant(deps: DispatchDeps, recallChannelId?: string) {
  return new Assistant({
    threadStarted: async ({ say, setSuggestedPrompts, saveThreadContext }) => {
      await say("Hi — tell me who needs help and I'll find the right volunteer.");
      await saveThreadContext();
      await setSuggestedPrompts({
        title: "Try one of these:",
        prompts: [
          { title: "Dialysis ride", message: "Someone needs a ride to dialysis tomorrow morning." },
          { title: "Groceries", message: "A family needs groceries dropped off this week." },
        ],
      });
    },
    userMessage: async ({ message, say, setTitle, setStatus }) => {
      const m = message as any;
      if (!m.text || !m.thread_ts) return;
      await setTitle(m.text);
      await setStatus({ status: "Reading the request…" });
      try {
        const result = await dispatchRequest(deps, m.text, { channelId: recallChannelId });
        await setStatus({ status: `Need: ${result.need.need_type} · urgency ${result.need.urgency} — finding volunteers…` });
        await setStatus({ status: "Searching workspace history for who's helped before…" });
        if (!result.match) {
          await say(`I couldn't find an available volunteer for *${result.need.need_type}* right now.`);
          return;
        }
        await say(assignmentCard(result.need, result.match)); // status auto-clears when the card posts
      } catch (err) {
        await say("Something went wrong finding a volunteer — please try again.");
        throw err; // let Bolt log it
      }
    },
  });
}
