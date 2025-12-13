"use client";

import { useState } from "react";

export default function TestBotpress() {
  const [message, setMessage] = useState("What does my order say about travel?");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/botpress-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse("Error: " + err);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Botpress API</h1>
      
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full border p-3 rounded mb-4"
        rows={3}
      />
      
      <button
        onClick={testAPI}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Testing..." : "Send to API"}
      </button>
      
      {response && (
        <pre className="mt-4 bg-gray-100 p-4 rounded overflow-auto text-sm">
          {response}
        </pre>
      )}
    </div>
  );
}