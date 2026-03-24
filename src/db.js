import Dexie from "dexie";

export const db = new Dexie("KhontaLocalDB");

// Define basic table schema
db.version(1).stores({
  test_sync: "++id, text, timestamp"
});
