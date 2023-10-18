import { database } from "./lib/database.js";

const subreddits = new Set();

database.forEach(item => {
  subreddits.add(item.subreddit);
})

debugger;