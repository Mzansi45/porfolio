import React, { useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, Printer, Share2, ArrowLeft, X, Check } from "lucide-react";
import { uploadNewResume, getResume, getResumePdfUrl } from "../hooks/firebase_commands";

/* ── helpers ── */
function buildPrintStyles() {
    return `
        @page { size: A4; margin: 18mm 20mm; }
        * { box-sizing: border-box; }
        body { font-family: "Segoe UI", Arial, sans-serif; font-size: 13px; line-height: 1.65; color: #1a1a2e; }
        h1 { font-size: 1.7rem; font-weight: 700; margin-bottom: .25rem; }
        h2 { font-size: 1rem; font-weight: 600; border-bottom: 1.5px solid #d1d5db; padding-bottom: 4px; margin: 1.2rem 0 .5rem; }
        h3 { font-size: .9rem; font-weight: 600; margin: .8rem 0 .25rem; }
        p  { margin: .35rem 0; }
        ul { padding-left: 1.2rem; margin: .35rem 0; }
        li { margin-bottom: .2rem; }
        a  { color: #4f46e5; text-decoration: none; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0; }
        blockquote { border-left: 3px solid #d1d5db; margin: .5rem 0; padding-left: .75rem; color: #6b7280; }
        code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: .85em; }
        pre  { background: #1e293b; color: #e2e8f0; padding: .75rem; border-radius: 6px; overflow-x: auto; font-size: .8rem; }
    `;
}

/* ── Upload Modal ── */
function UploadModal({ onClose, onSuccess }) {
    const [mode, setMode] = useState("markdown"); // "markdown" | "file"
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef();

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer?.files?.[0];
        if (f && (f.type === "text/markdown" || f.name.endsWith(".md") || f.type === "text/plain")) {
            setFile(f);
            const reader = new FileReader();
            reader.onload = (ev) => setText(ev.target.result);
            reader.readAsText(f);
        } else {
            setError("Please drop a .md or .txt file.");
        }
    }, []);

    const onFileChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        const reader = new FileReader();
        reader.onload = (ev) => setText(ev.target.result);
        reader.readAsText(f);
    };

    async function handleSave() {
        if (!text.trim()) { setError("Nothing to save."); return; }
        setSaving(true);
        setError("");
        try {
            await uploadNewResume(text.trim());
            onSuccess();
        } catch (err) {
            setError("Upload failed: " + (err.message ?? "unknown error"));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                    <h2 className="text-slate-100 font-semibold text-sm">Upload Resume</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 flex items-center justify-center"><X size={16} /></button>
                </div>

                {/* tabs */}
                <div className="flex border-b border-slate-700 text-xs font-medium">
                    {["markdown", "file"].map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-5 py-2.5 capitalize transition ${mode === m ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
                        >
                            {m === "file" ? "Upload .md file" : "Paste Markdown"}
                        </button>
                    ))}
                </div>

                {/* body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {mode === "markdown" ? (
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="# Thulani Gulube&#10;&#10;## Experience&#10;..."
                            className="w-full h-64 bg-slate-800 text-slate-200 text-xs font-mono rounded-lg p-3 outline-none border border-slate-700 focus:border-indigo-500 resize-none transition"
                        />
                    ) : (
                        <div
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                            onClick={() => fileRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                                dragging ? "border-indigo-500 bg-indigo-950/30" : "border-slate-700 hover:border-slate-500"
                            }`}
                        >
                            <p className="text-slate-400 text-sm mb-1">Drag & drop your <code className="text-indigo-400">.md</code> file here</p>
                            <p className="text-slate-600 text-xs">or click to browse</p>
                            {file && <p className="text-green-400 text-xs mt-3 flex items-center justify-center gap-1"><Check size={12} /> {file.name}</p>}
                            <input ref={fileRef} type="file" accept=".md,.txt,text/markdown,text/plain" className="hidden" onChange={onFileChange} />
                        </div>
                    )}
                    {text && (
                        <p className="text-slate-500 text-xs">{text.split("\n").length} lines, {text.length} characters</p>
                    )}
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                </div>

                {/* footer */}
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-700">
                    <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200 transition px-4 py-2">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !text.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
                    >
                        {saving ? "Saving…" : "Save & Publish"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Main ── */
export default function ResumeView() {
    const [loading, setLoading] = useState(true);
    const [resumeMarkdown, setResumeMarkdown] = useState("");
    const [showUpload, setShowUpload] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const resumeRef = useRef();

    React.useEffect(() => {
        Promise.all([getResume(), getResumePdfUrl()])
            .then(([r, base64]) => {
                setResumeMarkdown(r?.data ?? "");
                if (base64) {
                    const blob = new Blob(
                        [Uint8Array.from(atob(base64), c => c.charCodeAt(0))],
                        { type: "application/pdf" }
                    );
                    setPdfUrl(URL.createObjectURL(blob));
                }
            })
            .catch(err => console.error("Resume fetch error:", err))
            .finally(() => setLoading(false));
    }, []);

    /* ── Print ── */
    const handlePrint = () => {
        const content = resumeRef.current;
        if (!content) return;
        const win = window.open("", "", "width=900,height=1200");
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Thulani Gulube – Resume</title><style>${buildPrintStyles()}</style></head><body>${content.innerHTML}</body></html>`);
        win.document.close();
        win.focus();
        win.print();
        win.close();
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: "Thulani Gulube – Resume", url: window.location.href });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard.");
            }
        } catch { /* user dismissed */ }
    };

    const handleUploadSuccess = () => {
        setShowUpload(false);
        setLoading(true);
        getResume()
            .then(r => setResumeMarkdown(r?.data ?? ""))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
                <div className="space-y-3 w-64">
                    {[90, 75, 85, 60].map((w, i) => (
                        <div key={i} className="h-2 bg-[#e8e8e8] rounded animate-pulse" style={{ width: `${w}%` }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f5f5] py-10 px-4 pb-20 text-left">
            {/* A4 resume */}
            <div
                ref={resumeRef}
                className="bg-white shadow-md mx-auto p-10"
                style={{ width: "794px", maxWidth: "100%", fontFamily: "Segoe UI, Arial, sans-serif", fontSize: "13px", lineHeight: 1.65, color: "#1a1a2e" }}
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h1: ({ children }) => <h1 style={{ fontSize: "1.7rem", fontWeight: 700, marginBottom: ".25rem", textAlign: "center" }}>{children}</h1>,
                        h2: ({ children }) => <h2 style={{ fontSize: "1rem", fontWeight: 600, borderBottom: "1.5px solid #d1d5db", paddingBottom: "4px", margin: "1.2rem 0 .5rem" }}>{children}</h2>,
                        h3: ({ children }) => <h3 style={{ fontSize: ".9rem", fontWeight: 600, margin: ".8rem 0 .25rem" }}>{children}</h3>,
                        p: ({ children }) => <p style={{ margin: ".35rem 0" }}>{children}</p>,
                        ul: ({ children }) => <ul style={{ paddingLeft: "1.2rem", margin: ".35rem 0" }}>{children}</ul>,
                        li: ({ children }) => <li style={{ marginBottom: ".2rem" }}>{children}</li>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: "#4f46e5", textDecoration: "none" }}>{children}</a>,
                        hr: () => <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "1rem 0" }} />,
                        blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid #d1d5db", margin: ".5rem 0", paddingLeft: ".75rem", color: "#6b7280" }}>{children}</blockquote>,
                        code: ({ inline, children }) => inline
                            ? <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: "3px", fontSize: ".85em" }}>{children}</code>
                            : <pre style={{ background: "#1e293b", color: "#e2e8f0", padding: ".75rem", borderRadius: "6px", overflowX: "auto", fontSize: ".8rem" }}><code>{children}</code></pre>,
                    }}
                >
                    {resumeMarkdown}
                </ReactMarkdown>
            </div>

            {/* Action bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-[#ebebeb] flex justify-center gap-2 px-4 py-3 z-30">
                {pdfUrl ? (
                    <a href={pdfUrl} download="Thulani_Gulube_Resume.pdf"
                        className="flex items-center gap-1.5 bg-[#111] hover:bg-black text-white text-xs font-medium px-4 py-2 rounded transition !border-0 !shadow-none">
                        <Download size={12} /> Download PDF
                    </a>
                ) : (
                    <button disabled className="flex items-center gap-1.5 bg-[#444] text-[#888] text-xs font-medium px-4 py-2 rounded cursor-not-allowed !border-0 !shadow-none" title="No PDF uploaded yet">
                        <Download size={12} /> Download PDF
                    </button>
                )}
                <button onClick={handlePrint} className="flex items-center gap-1.5 border border-[#e0e0e0] hover:border-[#bbb] text-[#555] hover:text-[#111] text-xs px-4 py-2 rounded transition">
                    <Printer size={12} /> Print
                </button>
                <button onClick={handleShare} className="flex items-center gap-1.5 border border-[#e0e0e0] hover:border-[#bbb] text-[#555] hover:text-[#111] text-xs px-4 py-2 rounded transition">
                    <Share2 size={12} /> Share
                </button>
                <a href="/#/portfolio" className="flex items-center gap-1.5 border border-[#e0e0e0] hover:border-[#bbb] text-[#aaa] hover:text-[#555] text-xs px-4 py-2 rounded transition">
                    <ArrowLeft size={12} /> Portfolio
                </a>
            </div>
        </div>
    );
}
