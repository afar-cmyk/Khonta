// src/App.jsx
import { createSignal, createEffect, onMount } from "solid-js";
import { Motion } from "@motionone/solid";
import { TextField, Button } from "@kobalte/core";
import { db } from "./db";
import "./App.css";

// Configure with your Cloudflare worker URL. For local testing, use Wrangler dev.
const WORKER_URL = "http://localhost:8787";

export default function App() {
  const [testString, setTestString] = createSignal("");
  const [syncKey, setSyncKey] = createSignal("");
  const [records, setRecords] = createSignal([]);
  const [status, setStatus] = createSignal("");

  const loadLocalData = async () => {
    const data = await db.test_sync.toArray();
    setRecords(data);
  };

  onMount(() => {
    loadLocalData();
    const savedKey = localStorage.getItem("khonta_sync_key");
    if (savedKey) setSyncKey(savedKey);
  });

  const handleSaveLocal = async () => {
    if (!testString().trim()) return;
    await db.test_sync.add({
      text: testString(),
      timestamp: Date.now(),
    });
    setTestString("");
    await loadLocalData();
    setStatus("Saved to local DB");
  };

  const generateSyncKey = () => {
    const uuid = crypto.randomUUID();
    setSyncKey(uuid);
    localStorage.setItem("khonta_sync_key", uuid);
    setStatus("Sync Key generated and saved locally");
  };

  const handlePushToCloud = async () => {
    if (!syncKey()) {
      setStatus("Missing Sync Key!");
      return;
    }
    const currentData = await db.test_sync.toArray();
    
    setStatus("Pushing to Cloud...");
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Sync-Key": syncKey(),
        },
        body: JSON.stringify(currentData),
      });
      if (res.ok) {
        setStatus("Pushed to Cloud successfully!");
      } else {
        setStatus(`Failed: ${res.statusText}`);
      }
    } catch (err) {
      console.error(err);
      setStatus("Error pushing to Cloud (Is worker running?)");
    }
  };

  const handlePullFromCloud = async () => {
    if (!syncKey()) {
      setStatus("Missing Sync Key!");
      return;
    }
    
    setStatus("Pulling from Cloud...");
    try {
      const res = await fetch(WORKER_URL, {
        method: "GET",
        headers: {
          "Sync-Key": syncKey()
        },
      });
      if (res.ok) {
        const { data } = await res.json();
        if (data && Array.isArray(data)) {
          // Replace local data with cloud data
          await db.test_sync.clear();
          await db.test_sync.bulkAdd(data);
          await loadLocalData();
          setStatus("Pulled from Cloud successfully!");
        } else {
          setStatus("No data found in Cloud for this Sync Key");
        }
      } else {
        setStatus(`Failed: ${res.statusText}`);
      }
    } catch (err) {
      console.error(err);
      setStatus("Error pulling from Cloud (Is worker running?)");
    }
  };

  return (
    <div class="app-container">
      <Motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, easing: "ease-out" }}
      >
        <h1>Khonta Canvas</h1>
        <p style={{ color: "white" }}>Phase 1: Proof of Infrastructure</p>
      </Motion.div>

      <div class="status-msg">{status()}</div>

      <div class="card">
        <h2>Local Database Tester (Dexie)</h2>
        <TextField.Root class="text-field" value={testString()} onChange={setTestString}>
          <TextField.Label class="text-field-label">Test String</TextField.Label>
          <TextField.Input class="text-field-input" placeholder="Type something to save locally..." />
        </TextField.Root>
        <Button.Root class="btn" onClick={handleSaveLocal}>
          Save Locally
        </Button.Root>
      </div>

      <div class="card">
        <h2>Cloud Sync Setup</h2>
        <div class="sync-key-display">
          <span>{syncKey() || "No key generated"}</span>
        </div>
        <Button.Root class="btn" onClick={generateSyncKey}>
          Generate Random Sync Key
        </Button.Root>
      </div>

      <div class="card">
        <h2>Cloudflare Worker Sync Tester</h2>
        <div style={{ display: "flex", gap: "1rem", "flex-wrap": "wrap", "justify-content": "center" }}>
          <Button.Root class="btn" onClick={handlePushToCloud}>
            Push Data to Cloud
          </Button.Root>
          <Button.Root class="btn" onClick={handlePullFromCloud}>
            Pull Data from Cloud
          </Button.Root>
        </div>
      </div>

      <div class="data-preview">
        <h2>Local Dexie Data Preview</h2>
        {records().length === 0 ? (
          <p style={{ color: "#888" }}>No data in local database.</p>
        ) : (
          <ul>
            {records().map((r) => (
              <li>
                <span style={{ color: "#aaa", "font-size": "0.8em" }}>
                  [{new Date(r.timestamp).toLocaleTimeString()}]
                </span>{" "}
                {r.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
