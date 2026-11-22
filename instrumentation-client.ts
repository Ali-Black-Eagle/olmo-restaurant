import { initBotId } from "botid/client/core";

// Server Actions POST to the page they are called from, so every page that can open
// the booking sheet is protected. BotID only does anything on Vercel; locally it is inert.
initBotId({
  protect: [
    { path: "/", method: "POST" },
    { path: "/book", method: "POST" },
    { path: "/menu", method: "POST" },
    { path: "/visit", method: "POST" },
    { path: "/booking/*", method: "POST" },
  ],
});
