import React, { useRef, useState, useCallback, useEffect } from "react";
import { Check, ArrowLeft, Upload, LogOut } from "lucide-react";
import { uploadNewResume, uploadResumePDF, auth, signIn, signOutUser } from "../hooks/firebase_commands";
import { onAuthStateChanged } from "firebase/auth";
import "./portfolio.css";

export default function AdminUpload() {
    const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [signingIn, setSigningIn] = useState(false);

    const [mode, setMode] = useState("markdown");
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef();
    const pdfRef = useRef();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null));
        return unsub;
    }, []);

    async function handleSignIn(e) {
        e.preventDefault();
        setSigningIn(true);
        setAuthError("");
        try {
            await signIn(email, password);
        } catch (err) {
            const msg = err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found"
                ? "Invalid email or password."
                : "Sign-in failed. Try again.";
            setAuthError(msg);
        } finally {
            setSigningIn(false);
        }
    }

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer?.files?.[0];
        if (mode === "pdf") {
            if (f && f.type === "application/pdf") {
                setPdfFile(f);
            } else {
                setError("Please drop a .pdf file.");
            }
            return;
        }
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
        if (mode === "pdf") {
            if (!pdfFile) { setError("No PDF selected."); return; }
            setSaving(true);
            setError("");
            try {
                await uploadResumePDF(pdfFile);
                setDone(true);
            } catch (err) {
                setError("Upload failed: " + (err.message ?? "unknown error"));
            } finally {
                setSaving(false);
            }
            return;
        }
        if (!text.trim()) { setError("Nothing to save."); return; }
        setSaving(true);
        setError("");
        try {
            await uploadNewResume(text.trim());
            setDone(true);
        } catch (err) {
            setError("Upload failed: " + (err.message ?? "unknown error"));
        } finally {
            setSaving(false);
        }
    }

    /* ── Loading ── */
    if (user === undefined) {
        return <div className="min-h-screen bg-white flex items-center justify-center"><span className="text-[#ccc] text-xs">Loading…</span></div>;
    }

    /* ── Gate ── */
    if (!user) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4">
                <form onSubmit={handleSignIn} className="w-full max-w-xs">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#bbb] mb-6">Admin access</p>
                    <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setAuthError(""); }}
                        placeholder="Email"
                        autoComplete="username"
                        autoFocus
                        className="w-full text-sm text-[#333] bg-[#fafafa] border border-[#e0e0e0] focus:border-[#999] rounded px-3 py-2.5 outline-none transition mb-3"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setAuthError(""); }}
                        placeholder="Password"
                        autoComplete="current-password"
                        className={`w-full text-sm text-[#333] bg-[#fafafa] border rounded px-3 py-2.5 outline-none transition mb-3 ${
                            authError ? "border-red-400" : "border-[#e0e0e0] focus:border-[#999]"
                        }`}
                    />
                    {authError && <p className="text-red-400 text-xs mb-3">{authError}</p>}
                    <button type="submit" disabled={signingIn}
                        className="w-full bg-[#111] text-white text-xs font-semibold py-2.5 rounded hover:bg-black transition !border-0 !shadow-none disabled:opacity-50">
                        {signingIn ? "Signing in…" : "Sign in"}
                    </button>
                </form>
            </div>
        );
    }

    /* ── Upload UI ── */
    if (done) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-[#111] font-medium text-sm mb-2">Resume published.</p>
                    <a href="/#/resume" className="text-xs text-[#888] underline underline-offset-4 hover:text-[#333] transition">View resume →</a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white px-4 py-16">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#bbb]">Upload Resume</p>
                    <button onClick={signOutUser}
                        className="flex items-center gap-1 text-[#bbb] hover:text-[#555] transition !border-0 !bg-transparent !shadow-none text-xs">
                        <LogOut size={12} /> Sign out
                    </button>
                </div>

                {/* tabs */}
                <div className="flex border-b border-[#f0f0f0] mb-6">
                    {[["markdown", "Paste Markdown"], ["file", "Upload .md"], ["pdf", "Upload PDF"]].map(([m, label]) => (
                        <button key={m} onClick={() => setMode(m)}
                            className={`px-4 py-2.5 text-xs transition !border-0 !bg-transparent !shadow-none ${
                                mode === m
                                    ? "text-[#111] border-b-2 border-[#111] -mb-px"
                                    : "text-[#aaa] hover:text-[#555]"
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>

                {mode === "markdown" ? (
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={"# Thulani Gulube\n\n## Experience\n..."}
                        className="w-full h-72 bg-[#fafafa] text-[#333] text-xs font-mono rounded border border-[#e8e8e8] focus:border-[#999] p-3 outline-none resize-none transition"
                    />
                ) : mode === "file" ? (
                    <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        onClick={() => fileRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
                            dragging ? "border-[#999] bg-[#fafafa]" : "border-[#e8e8e8] hover:border-[#ccc]"
                        }`}
                    >
                        <p className="text-[#999] text-sm mb-1">Drag & drop your <code className="font-mono text-[#555]">.md</code> file here</p>
                        <p className="text-[#ccc] text-xs">or click to browse</p>
                        {file && <p className="flex items-center justify-center gap-1 text-[#555] text-xs mt-3"><Check size={11} /> {file.name}</p>}
                        <input ref={fileRef} type="file" accept=".md,.txt,text/markdown,text/plain" className="hidden" onChange={onFileChange} />
                    </div>
                ) : (
                    <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        onClick={() => pdfRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
                            dragging ? "border-[#999] bg-[#fafafa]" : "border-[#e8e8e8] hover:border-[#ccc]"
                        }`}
                    >
                        <p className="text-[#999] text-sm mb-1">Drag & drop your <code className="font-mono text-[#555]">.pdf</code> resume here</p>
                        <p className="text-[#ccc] text-xs">or click to browse</p>
                        {pdfFile && <p className="flex items-center justify-center gap-1 text-[#555] text-xs mt-3"><Check size={11} /> {pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)</p>}
                        <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }} />
                    </div>
                )}

                {text && mode !== "pdf" && (
                    <p className="text-[#ccc] text-xs mt-2">{text.split("\n").length} lines, {text.length} chars</p>
                )}
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

                <div className="flex justify-between items-center mt-6">
                    <a href="/#/portfolio" className="flex items-center gap-1 text-xs text-[#bbb] hover:text-[#555] transition"><ArrowLeft size={12} /> back</a>
                    <button
                        onClick={handleSave}
                        disabled={saving || (mode === "pdf" ? !pdfFile : !text.trim())}
                        className="bg-[#111] hover:bg-black disabled:opacity-30 text-white text-xs font-semibold px-6 py-2.5 rounded transition !border-0 !shadow-none"
                    >
                        {saving ? "Publishing…" : "Save & Publish"}
                    </button>
                </div>
            </div>
        </div>
    );
}
