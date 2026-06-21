import boltPkg from "@slack/bolt";
import { assignmentCard } from "./card.js";
import { dispatchRequest, type DispatchDeps } from "./dispatch.js";

const { Assistant } = boltPkg;

// `recallChannelId` is the community channel (#mutual-aid) whose history we recall from —
// the pane is the control surface, not the data source.
export function makeAssistant(deps: DispatchDeps, recallChannelId?: string) {
  return new Assistant({
    threadStarted: async ({ say, setSuggestedPrompts, saveThreadContext, logger }) => {
      try {
        await say("Hi — tell me who needs help and I'll find the right volunteer.");
        await saveThreadContext();
        await setSuggestedPrompts({
          title: "Try one of these:",
          prompts: [
            { title: "Dialysis ride", message: "Someone needs a ride to dialysis tomorrow morning." },
            { title: "Groceries", message: "A family needs groceries dropped off this week." },
          ],
        });
      } catch (e) {
        logger.error(e);
      }
    },
    userMessage: async ({ message, say, setTitle, setStatus }) => {
      if (!("text" in message) || !("thread_ts" in message) || !message.text || !message.thread_ts) return;
      try {
        await setTitle(message.text);
        const result = await dispatchRequest(
          deps,
          message.text,
          { channelId: recallChannelId },
          async (status) => { await setStatus({ status }); },
        );
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
