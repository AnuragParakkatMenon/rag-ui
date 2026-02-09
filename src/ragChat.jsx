import { useState, useRef, useEffect } from "react";

// Helper to convert File to base64
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

export default function RagChat() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const LANGUAGES = [
    { code: "english", label: "English" },
    { code: "hindi", label: "Hindi" },
    { code: "malayalam", label: "Malayalam" },
    { code: "tamil", label: "Tamil" },
    { code: "french", label: "French" },
  ];

  // Load cached files from localStorage on mount
  useEffect(() => {
    const storedFiles = JSON.parse(localStorage.getItem("cachedFiles") || "[]");
    setFiles(storedFiles);
  }, []);

  // Add file to cache
  const handleFile = async (file) => {
    if (!file) return;

    const base64 = await fileToBase64(file);
    const newFile = { name: file.name, base64 };

    setFiles((prev) => [...prev, newFile]);
    localStorage.setItem("cachedFiles", JSON.stringify([...files, newFile]));

    setMessages((prev) => [
      ...prev,
      { role: "bot", content: `📄 ${file.name} added to cache.` },
    ]);
  };

  // Delete file from cache
  const deleteFile = (index) => {
    setFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      localStorage.setItem("cachedFiles", JSON.stringify(newFiles));
      return newFiles;
    });
  };

  // Upload files to backend
  const uploadFilesToBackend = async () => {
    for (const f of files) {
      const blob = await (await fetch(f.base64)).blob();
      const fileObj = new File([blob], f.name);

      const formData = new FormData();
      formData.append("file", fileObj);

      try {
        const res = await fetch(
          "https://rag-api-production-4ec9.up.railway.app/ingest-pdf",
          { method: "POST", body: formData }
        );
        if (!res.ok) throw new Error("File upload failed");
        await res.json();
      } catch (err) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: `Failed to upload ${f.name}` },
        ]);
        return false;
      }
    }
    return true;
  };

  // Send query to RAG API
  const sendQuery = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery && files.length === 0) {
      alert("Please type a question or upload a PDF");
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmedQuery || "Ask something about uploaded PDFs" },
    ]);
    setQuery("");
    setLoading(true);

    // Upload files first
    const uploaded = await uploadFilesToBackend();
    if (!uploaded) {
      setLoading(false);
      return;
    }

    const questionString = `Respond in ${language}: ${
      trimmedQuery || "Summarize the uploaded PDFs"
    }`;

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
      setLoading(false);
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

          {/* File Upload & Cache */}
          <div
          
            className="border border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-base-300"
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile) handleFile(droppedFile);
            }}
          >
            <input
              type="file"
              hidden
              ref={fileInputRef}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {files.length > 0 ? (
              <div className="flex flex-col gap-1">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-base-300 p-2 rounded"
                  >
                    <span className="text-sm truncate">{f.name}</span>
                    <button
                      className="bg-red-500 hover:bg-red-700 text-white text-xs font-bold py-2 px-3 rounded"
                      onClick={() => deleteFile(i)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm opacity-70">
                Drag & drop a PDF here or click to upload
              </p>
            )}
          </div>


          {/* Chat Window */}
          <div className="flex flex-col gap-4 max-h-100 overflow-y-auto p-2 bg-base-200 rounded-lg">
            {messages.map((msg, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <span
                  className={`text-xs font-semibold ${
                    msg.role === "user" ? "text-blue-500 self-end" : "text-blue-600 self-start"
                  }`}
                >
                  {msg.role === "user" ? "User" : "Bot"}
                </span>
                <div
                  className={`p-3 rounded-xl shadow ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white rounded-3xl self-end"
                      : "bg-gray-300 text-black rounded-3xl self-start"
                  } max-w-[80%]`}
                >
                  {msg.content}
                </div>
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
              className="w-full border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendQuery()}
            />
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
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
