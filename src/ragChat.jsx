import { useState, useRef } from "react";

export default function RagChat() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const LANGUAGES = [
    { code: "english", label: "English" },
    { code: "hindi", label: "Hindi" },
    { code: "malayalam", label: "Malayalam" },
    { code: "tamil", label: "Tamil" },
    { code: "french", label: "French" },
  ];

  const handleFile = (f) => f && setFile(f);

  // Upload PDF
  const uploadFile = async () => {
    if (!file) return true;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        "https://rag-api-production-4ec9.up.railway.app/ingest-pdf",
        { method: "POST", body: formData }
      );
      if (!res.ok) throw new Error("File upload failed");
      await res.json();
      return true;
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "File upload failed." },
      ]);
      return false;
    }
  };

  // Send query
  const sendQuery = async () => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery && !file) {
    alert("Please type a question or upload a PDF");
    return;
  }

  // Add user message immediately
  setMessages((prev) => [
    ...prev,
    { role: "user", content: trimmedQuery || "Ask something about the uploaded PDF" },
  ]);

  setLoading(true);
  setQuery(""); // reset input immediately

  // Upload file first if exists
  const uploaded = await uploadFile();
  if (!uploaded) {
    setLoading(false);
    return;
  }

  const questionString = `Respond in ${language}: ${trimmedQuery || "Summarize the uploaded PDF"}`;

  try {
    const res = await fetch(
      "https://rag-api-production-4ec9.up.railway.app/query",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionString }),
      }
    );

    if (!res.ok) throw new Error("Query failed");

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: "bot", content: data.answer || "No response from API" },
    ]);
  } catch (err) {
    console.error(err);
    setMessages((prev) => [
      ...prev,
      { role: "bot", content: "Something went wrong while fetching response." },
    ]);
  } finally {
    setLoading(false); // enable input/button again
    setFile(null);      // reset file if any
  }
};


  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-3xl shadow-2xl bg-base-100 rounded-xl overflow-hidden">
        <div className="card-body p-6 flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-center">RAG Chat Assistant</h2>

          {/* Language Selector */}
          <div className="flex gap-2 items-center">
            <span className="text-sm opacity-70">Language:</span>
            <select
              className="select select-bordered select-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div
            className="border border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-base-300"
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              hidden
              ref={fileInputRef}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {file ? (
              <p className="text-sm">📄 {file.name}</p>
            ) : (
              <p className="text-sm opacity-70">
                Drag & drop a PDF here or click to upload
              </p>
            )}
          </div>

          {/* Chat Window */}
          <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto p-2 bg-base-200 rounded-lg">
            {messages.map((msg, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <span
                  className={`text-xs font-semibold ${
                    msg.role === "user" ? "text-primary" : "text-secondary"
                  }`}
                >
                  {msg.role === "user" ? "User" : "Bot"}
                </span>
                <div
                  className={`p-3 rounded-xl shadow ${
                    msg.role === "user"
                      ? "bg-primary text-primary-content self-end"
                      : "bg-secondary text-secondary-content self-start"
                  } max-w-[80%]`}
                >
                  {msg.content}
                </div>
                {msg.sources?.length > 0 && (
                  <div className="text-xs opacity-60 mt-1">
                    Sources: {msg.sources.join(", ")}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-secondary">Bot</span>
                <div className="p-3 rounded-xl shadow bg-secondary text-secondary-content w-fit">
                  <span className="loading loading-dots loading-sm"></span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Type your question..."
              className="input input-bordered w-full"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendQuery()}
            />
            <button
              className="btn btn-primary"
              onClick={sendQuery}
              disabled={loading}
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
