/**
 * Discover every verifiable public Ashby board and store them enabled.
 * No company cap. Does not draft or submit.
 */
import { discoverAndStoreBoards } from "../src/pipeline/discover.js";
import "../src/db/client.js";

const stats = await discoverAndStoreBoards();
console.log(JSON.stringify(stats, null, 2));
