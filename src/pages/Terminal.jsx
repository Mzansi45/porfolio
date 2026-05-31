import React, { useState, useRef, useEffect } from "react";
import { runCommand } from "../hooks/commands";
import icon from "../assets/cmd.png";
import "../pages/cmd.css";
import { uploadNewResume } from "../hooks/firebase_commands";

/* ── helpers ──────────────────────────────────────────────── */
function getLineClass(line) {
    if (!line || line === "") return "line-output";
    if (line.startsWith("C:\\Users\\Thulani>")) return "line-prompt";
    // HTML lines (assistant responses with tags) — render raw, default colour
    if (line.includes("<span") || line.includes("<br")) return "line-output";
    const l = line.toLowerCase();
    if (
        l.includes("error") || l.includes("not found") || l.includes("not recognized") ||
        l.includes("access denied") || l.includes("failed")
    ) return "line-error";
    if (l.includes("success") || l.includes("[ok]") || l.includes("done")) return "line-green";
    if (l.includes("warning") || l.includes("[warn]")) return "line-warning";
    if (
        l.startsWith("microsoft windows") || l.includes("(c) microsoft") ||
        l.includes("portfolio terminal") || l.includes("quick links") ||
        l.includes("  email") || l.includes("  phone") || l.includes("  location") ||
        l.startsWith(" volume") || l.startsWith(" directory") ||
        l.includes("  tip:") || l.includes("  for detailed") ||
        l.includes("  that sounds") || l.includes("  try ")
    ) return "line-info";
    return "line-output";
}

function TaskbarClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return (
        <div className="taskbar-clock">
            <div>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div>{now.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" })}</div>
        </div>
    );
}

/* SVG icons matching Windows 11 chrome */
const MinimizeIcon = () => (
    <svg viewBox="0 0 10 1" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{width:10,height:10}}>
        <rect width="10" height="1"/>
    </svg>
);
const MaximizeIcon = () => (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" xmlns="http://www.w3.org/2000/svg" style={{width:10,height:10}}>
        <rect x="0.5" y="0.5" width="9" height="9"/>
    </svg>
);
const RestoreIcon = () => (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" xmlns="http://www.w3.org/2000/svg" style={{width:10,height:10}}>
        <rect x="2.5" y="0.5" width="7" height="7"/>
        <polyline points="0.5,2.5 0.5,9.5 7.5,9.5" strokeLinejoin="round"/>
    </svg>
);
const CloseIcon = () => (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg" style={{width:10,height:10}}>
        <line x1="0.5" y1="0.5" x2="9.5" y2="9.5"/>
        <line x1="9.5" y1="0.5" x2="0.5" y2="9.5"/>
    </svg>
);

/* ── main component ───────────────────────────────────────── */
const Terminal = () => {
    const [history, setHistory] = useState([]);
    const [input, setInput] = useState("");
    const terminalRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);

    const [size, setSize] = useState({ width: 900, height: 520 });
    const [position, setPosition] = useState({ x: 60, y: 40 });
    const dragging = useRef(false);
    const resizing = useRef(false);
    const offset = useRef({ x: 0, y: 0 });
    const resizeDir = useRef(null);
    const startSize = useRef(null);
    const startPos = useRef(null);
    const startPointer = useRef(null);

    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isClosed, setIsClosed] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    /* command history navigation */
    const cmdHistory = useRef([]);
    const cmdHistoryIdx = useRef(-1);

    const handleMinimize = (e) => { e.stopPropagation(); setIsMinimized(true); };
    const handleMaximizeRestore = (e) => {
        e.stopPropagation();
        setIsMaximized(p => !p);
        setIsMinimized(false);
    };
    const handleClose = (e) => { e.stopPropagation(); setIsClosed(true); };
    const handleRestoreFromTaskbar = () => { setIsMinimized(false); inputRef.current?.focus(); };

    /* ── command handler ──────────────────────────────────── */
    const handleCommand = (e) => {
        if (e.key === "ArrowUp") {
            e.preventDefault();
            const newIdx = Math.min(cmdHistoryIdx.current + 1, cmdHistory.current.length - 1);
            cmdHistoryIdx.current = newIdx;
            if (newIdx >= 0) setInput(cmdHistory.current[cmdHistory.current.length - 1 - newIdx]);
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            const newIdx = Math.max(cmdHistoryIdx.current - 1, -1);
            cmdHistoryIdx.current = newIdx;
            setInput(newIdx === -1 ? "" : cmdHistory.current[cmdHistory.current.length - 1 - newIdx]);
            return;
        }
        if (e.key !== "Enter") return;

        const cmd = input.trim();
        if (!cmd) return;

        cmdHistory.current.push(cmd);
        cmdHistoryIdx.current = -1;

        if (cmd.startsWith("assistant")) {
            setHistory(prev => [...prev, `C:\\Users\\Thulani> ${cmd}`, "__THINKING__", ""]);
            setInput("");
            makeCall(cmd.slice(9).trim()).then(response => {
                setHistory(prev => {
                    const updated = [...prev];
                    const thinkIdx = updated.lastIndexOf("__THINKING__");
                    if (thinkIdx !== -1) updated[thinkIdx] = response["response"];
                    return updated;
                });
            }).catch(() => {
                setHistory(prev => {
                    const updated = [...prev];
                    const thinkIdx = updated.lastIndexOf("__THINKING__");
                    if (thinkIdx !== -1)
                        updated[thinkIdx] = "<span style='color:#f9f1a5'>Sorry, the assistant is unavailable right now. Try the <span style='color:#60cdff'>resume</span> command to view my CV.</span>";
                    return updated;
                });
            });
            return;
        }

        if (cmd === "upload-secureresume") {
            selectFile(e);
            setHistory(prev => [...prev, `C:\\Users\\Thulani> ${cmd}`, "Uploading resume...", ""]);
            setInput("");
            return;
        }

        if (cmd === "clear" || cmd === "cls") {
            setHistory([]);
            setInput("");
            return;
        }

        const output = runCommand(cmd);
        setHistory(prev => [
            ...prev,
            `C:\\Users\\Thulani> ${cmd}`,
            ...(Array.isArray(output) ? output : [output]),
            ""
        ]);
        setInput("");
    };

    /* ── file upload ──────────────────────────────────────── */
    function handleFileUpload() {
        const file = fileInputRef.current?.files[0];
        if (!file) return;
        const isMarkdown = file.name.toLowerCase().endsWith(".md") || file.type === "text/markdown";
        if (!isMarkdown) { alert("Please select a valid markdown (.md) file."); return; }
        const reader = new FileReader();
        reader.onload = (ev) => uploadNewResume(ev.target.result);
        reader.readAsText(file);
    }
    function selectFile(e) { e.preventDefault(); fileInputRef.current?.click(); }

    /* ── AI call ──────────────────────────────────────────── */
    async function makeCall(prompt) {
        setIsThinking(true);
        try {
            const res = await fetch("https://us-central1-thulani-gulube.cloudfunctions.net/callGroq", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } finally {
            setIsThinking(false);
        }
    }

    /* ── scroll to bottom ─────────────────────────────────── */
    useEffect(() => {
        terminalRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);

    /* ── drag ─────────────────────────────────────────────── */
    const onPointerDown = (e) => {
        if (isMaximized) return;
        dragging.current = true;
        offset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
    };

    /* ── resize ───────────────────────────────────────────── */
    const startResize = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        resizing.current = true;
        resizeDir.current = direction;
        startSize.current = { ...size };
        startPos.current = { ...position };
        startPointer.current = { x: e.clientX, y: e.clientY };
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
    };

    const onPointerMove = (e) => {
        if (dragging.current) {
            setPosition({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
        } else if (resizing.current) {
            const dx = e.clientX - startPointer.current.x;
            const dy = e.clientY - startPointer.current.y;
            const dir = resizeDir.current;
            let newW = startSize.current.width;
            let newH = startSize.current.height;
            let newX = startPos.current.x;
            let newY = startPos.current.y;

            if (dir.includes("r")) newW = Math.max(400, startSize.current.width + dx);
            if (dir.includes("b")) newH = Math.max(200, startSize.current.height + dy);
            if (dir.includes("l")) {
                newW = Math.max(400, startSize.current.width - dx);
                newX = startPos.current.x + (startSize.current.width - newW);
            }
            if (dir.includes("t")) {
                newH = Math.max(200, startSize.current.height - dy);
                newY = startPos.current.y + (startSize.current.height - newH);
            }
            setSize({ width: newW, height: newH });
            if (dir.includes("l") || dir.includes("t")) setPosition({ x: newX, y: newY });
        }
    };

    const onPointerUp = () => {
        dragging.current = false;
        resizing.current = false;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
    };

    /* ── mobile guard ─────────────────────────────────────── */
    if (typeof window !== "undefined" && window.innerWidth < 768) {
        return (
            <div style={{
                minHeight: "100vh", backgroundColor: "#000", color: "#ccc",
                fontFamily: "monospace", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "1rem",
                padding: "2rem", textAlign: "center",
            }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <path d="M8 21h8M12 17v4"/>
                </svg>
                <p style={{ color: "#fff", fontSize: "0.9rem", margin: 0 }}>Terminal is only available on desktop.</p>
                <p style={{ color: "#555", fontSize: "0.75rem", margin: 0 }}>A keyboard and mouse are required.</p>
                <a href="/#/portfolio" style={{ marginTop: "0.5rem", color: "#10b981", fontSize: "0.8rem", textDecoration: "none" }}>
                    ← Back to portfolio
                </a>
            </div>
        );
    }

    if (isClosed) {
        return (
            <div className="win-desktop" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#ccc", fontFamily: "'Segoe UI', sans-serif", textAlign: "center" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "1rem" }}>
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <path d="M8 21h8M12 17v4"/>
                    </svg>
                    <p style={{ margin: 0 }}>Terminal closed.</p>
                    <a href="/#/portfolio" style={{ color: "#60cdff", fontSize: "0.85rem" }}>← View portfolio</a>
                </div>
                <div className="win-taskbar"><TaskbarClock /></div>
            </div>
        );
    }

    /* ── compute window styles ────────────────────────────── */
    const windowStyle = isMaximized
        ? { position: "fixed", inset: 0, width: "100vw", height: "calc(100vh - 48px)" }
        : {
            position: "absolute",
            left: position.x,
            top: position.y,
            width: size.width,
            height: isMinimized ? 32 : size.height,
        };

    return (
        <div className="win-desktop" onClick={() => inputRef.current?.focus()}>
            {/* Floating window */}
            <div
                ref={containerRef}
                className={`win-window${isMaximized ? " maximized" : ""}`}
                style={{ ...windowStyle, zIndex: 100 }}
            >
                {/* Title bar */}
                <div className="win-titlebar" onPointerDown={onPointerDown}>
                    <img src={icon} alt="cmd" className="win-titlebar-icon" />
                    <span className="win-titlebar-title">C:\Windows\System32\cmd.exe</span>
                    <div className="win-controls">
                        <button className="win-btn" onClick={handleMinimize} title="Minimize">
                            <MinimizeIcon />
                        </button>
                        <button className="win-btn" onClick={handleMaximizeRestore} title={isMaximized ? "Restore" : "Maximize"}>
                            {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
                        </button>
                        <button className="win-btn close-btn" onClick={handleClose} title="Close">
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                {/* Tab bar — only visible when not minimized */}
                {!isMinimized && (
                    <div className="win-tabbar">
                        <button className="win-tab active">
                            <img src={icon} alt="" />
                            Command Prompt
                        </button>

                    </div>
                )}

                {/* Terminal body */}
                {!isMinimized && (
                    <div
                        className="win-terminal-body"
                        style={{ height: isMaximized ? "calc(100vh - 48px - 32px - 36px)" : size.height - 32 - 36 }}
                        onClick={() => inputRef.current?.focus()}
                    >
                        {/* Boot banner */}
                        <div className="line-info">Microsoft Windows [Version 10.0.22621.2134]</div>
                        <div className="line-info" style={{ marginBottom: 8 }}>(c) Microsoft Corporation. All rights reserved.</div>
                        <div className="line-output" style={{ marginBottom: 8 }}>
                            Type <span style={{color:"#60cdff"}}>help</span> for a list of commands.
                            Use <span style={{color:"#60cdff"}}>assistant &lt;question&gt;</span> to ask the AI.
                        </div>

                        {/* History */}
                        {history.map((line, idx) => {
                            if (line === "__THINKING__") {
                                return <div key={idx} className="thinking-dots" />;
                            }
                            return (
                                <div
                                    key={idx}
                                    className={getLineClass(line)}
                                    dangerouslySetInnerHTML={{ __html: line === "" ? "&nbsp;" : line }}
                                    style={{ minHeight: "1.5em" }}
                                />
                            );
                        })}

                        {/* Live prompt */}
                        <div className="win-prompt-row">
                            <span className="win-prompt-path">C:\Users\Thulani</span>
                            <span className="win-prompt-arrow">&gt;&nbsp;</span>
                            <input
                                ref={inputRef}
                                className="win-input"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleCommand}
                                autoFocus
                                spellCheck={false}
                                autoComplete="off"
                                autoCorrect="off"
                                disabled={isThinking}
                                style={isThinking ? { color: "#666" } : {}}
                            />
                        </div>

                        <div ref={terminalRef} />
                    </div>
                )}

                {/* Resize handles — all edges + corner */}
                {!isMaximized && !isMinimized && (
                    <>
                        <div className="resizer resizer-r"  onPointerDown={(e) => startResize(e, "r")} />
                        <div className="resizer resizer-b"  onPointerDown={(e) => startResize(e, "b")} />
                        <div className="resizer resizer-l"  onPointerDown={(e) => startResize(e, "l")} />
                        <div className="resizer resizer-t"  onPointerDown={(e) => startResize(e, "t")} />
                        <div className="resizer resizer-br" onPointerDown={(e) => startResize(e, "br")} />
                    </>
                )}

                {/* Hidden file input */}
                <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
            </div>

            {/* Windows 11 Taskbar */}
            <div className="win-taskbar">
                <div
                    className={`taskbar-app${!isMinimized ? " active" : ""}`}
                    onClick={handleRestoreFromTaskbar}
                    title="Command Prompt"
                >
                    <img src={icon} alt="cmd" width="20" height="20" />
                </div>
                <a
                    href="/#/portfolio"
                    className="taskbar-app"
                    title="View Portfolio (GUI)"
                    style={{ textDecoration: "none", color: "#ccc" }}
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="16" height="13" rx="1.5"/>
                        <path d="M2 7h16"/>
                        <circle cx="4.5" cy="5" r="0.7" fill="currentColor" stroke="none"/>
                        <circle cx="7" cy="5" r="0.7" fill="currentColor" stroke="none"/>
                        <circle cx="9.5" cy="5" r="0.7" fill="currentColor" stroke="none"/>
                    </svg>
                </a>
                <TaskbarClock />
            </div>


        </div>
    );
};

export default Terminal;
