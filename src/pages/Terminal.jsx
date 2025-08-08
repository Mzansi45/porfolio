import React, { useState, useRef, useEffect } from "react";
import { runCommand } from "../hooks/commands";
import icon from "../assets/cmd.png";
import "../pages/cmd.css";
import { marked } from "marked";
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm";
import { uploadNewResume } from "../hooks/firebase_commands";

const Terminal = () => {
    const [history, setHistory] = useState([""]);
    const [input, setInput] = useState("");
    const terminalRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    const [size, setSize] = useState({ width: 900, height: 500 });
    const [position, setPosition] = useState({ x: 100, y: 100 });

    const dragging = useRef(false);
    const resizing = useRef(false);
    const offset = useRef({ x: 0, y: 0 });
    const resizeDir = useRef(null);

    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isClosed, setIsClosed] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    const handleMinimize = () => setIsMinimized(true);

    const handleMaximizeRestore = () => {
        setIsMaximized(prev => !prev);
        setIsMinimized(false); // just in case it was minimized
    };

    const handleClose = () => setIsClosed(true);
    const fileInputRef = useRef(null);


    const handleCommand = (e) => {
        if (e.key === "Enter") {
            const cmd = input.trim();

            //if command starts with assistant, make a call to the assistant function and return the response
            if (cmd.startsWith("assistant")) {
                setHistory((prev) => [
                    ...prev,
                    `C:\\Users\\Thulani> ${cmd}`,
                    "Thinking",
                    ""
                ]);
                setInput("");

                makeCall(cmd.slice(9)).then((response) => {
                    setHistory((prev) => {
                        // Replace last "Thinking..." with actual response
                        const updated = [...prev];
                        updated[updated.length - 2] = response["response"];
                        return updated;
                    });
                }).catch((error) => {
                    console.error("Groq error:", error);
                    setHistory((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 2] = "<span style='color: orange;'>Sorry Assistant is not available at the moment. If problem persists, please try again later or view/download my resume using command <span style='color:yellow'>Resume</span>.</span>";
                        return updated;
                    });
                });
                return;
            }
            else if (cmd === "upload-secureresume") {
                try {
                    selectFile(e);

                    setHistory((prev) => [
                        ...prev,
                        `C:\\Users\\Thulani> ${cmd}`,
                        "Uploading resume",
                        ""
                    ]);
                    setInput("");
                } catch (error) {

                } finally {

                }


                return;
            }



            const output = runCommand(cmd);

            if (cmd === "clear" || cmd === "cls") {
                setHistory([""]);
            }


            setHistory((prev) => [
                ...prev,
                `C:\\Users\\Thulani> ${cmd}`,
                ...(Array.isArray(output) ? output : [output]),
                ""
            ]);
            setInput("");
        }
    };

    function handleFileUpload() {
        const file = fileInputRef.current.files[0];

        if (!file) return;

        // Check by extension since some browsers won't set file.type for .md
        const isMarkdown = file.name.toLowerCase().endsWith(".md") || file.type === "text/markdown";
        if (!isMarkdown) {
            alert("Please select a valid markdown (.md) file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const markdownContent = e.target.result;
            uploadNewResume(markdownContent); // Call your upload function
        };
        reader.readAsText(file);
    }


    function selectFile(e) {
        e.preventDefault();
        fileInputRef.current.click();
    }


    async function makeCall(prompt) {
        try {
            setIsThinking(true);
            const response = await fetch("https://us-central1-thulani-gulube.cloudfunctions.net/callGroq", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                    // Removed "Access-Control-Allow-Origin": "*" - this is a response header!
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (err) {
            console.error("Fetch failed:", err);
            throw err;
        } finally {
            setIsThinking(false);
        }
    };

    useEffect(() => {
        terminalRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);

    // Drag handlers
    const onPointerDown = (e) => {
        dragging.current = true;
        offset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
    };

    const onPointerMove = (e) => {
        if (dragging.current) {
            setPosition({
                x: e.clientX - offset.current.x,
                y: e.clientY - offset.current.y,
            });
        } else if (resizing.current) {
            const { width, height } = size;
            if (resizeDir.current.includes("r")) {
                setSize(prev => ({ ...prev, width: e.clientX - position.x }));
            }
            if (resizeDir.current.includes("b")) {
                setSize(prev => ({ ...prev, height: e.clientY - position.y }));
            }
        }
    };

    const onPointerUp = () => {
        dragging.current = false;
        resizing.current = false;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
    };

    const startResize = (e, direction) => {
        e.preventDefault();
        resizing.current = true;
        resizeDir.current = direction;
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
    };

    return (
        <div
            ref={containerRef}
            className="terminal-window"
            style={{
                position: "absolute",
                transform: `translate(${position.x}px, ${position.y}px)`,
                width: isMaximized ? "100vw" : size.width,
                height: isMinimized ? "40px" : isMaximized ? "100vh" : size.height,
                boxShadow: "0 0 12px rgba(0,0,0,0.6)",
                backgroundColor: "black",
                overflow: "hidden",
                borderRadius: "6px",
                transition: "all 0.1s ease"

            }}
            onClick={() => inputRef.current?.focus()}
        >
            {/* Title Bar */}
            <div
                className="d-flex justify-content-between align-items-center terminal-title-bar px-2 pt-2 bg-dark text-white"
                onPointerDown={onPointerDown}
                style={{ cursor: "grab", userSelect: "none" }}
            >
                <div className="d-flex align-items-center px-2 py-1 rounded-top" style={{ backgroundColor: "black" }}>
                    <img src={icon} alt="cmd" width="16" height="16" />
                    <span className="ms-2 small">C:\WINDOWS\system32\cmd.exe</span>
                </div>
                <div className="d-flex align-items-center gap-1">
                    <div className="d-flex align-items-center gap-1">
                        <span className="px-2 fs-4 mb-2" style={{ cursor: "pointer" }}>–</span>
                        <span className="px-2 fs-5 mb-1" style={{ cursor: "pointer" }} onClick={handleMaximizeRestore}>
                            {isMaximized ? "❐" : "◻"}
                        </span>
                        <span className="px-2 fs-4 mb-2" style={{ cursor: "pointer" }} >×</span>
                    </div>

                </div>
            </div>

            {/* Terminal Body */}
            <div
                className="terminal-body p-3 text-white text-start"
                style={{
                    backgroundColor: "#000",
                    height: size.height - 40, // Subtract title height
                    overflowY: "auto",
                    fontFamily: "monospace"
                }}
            >
                <div>Microsoft Windows [Version 10.0.22621.2134]</div>
                <div className="mb-3">(c) Microsoft Corporation. All rights reserved.</div>

                {history.map((line, idx) => (
                    line === "Thinking" ? (
                        <div key={idx} className="thinking-dots">Thinking</div>
                    ) : (
                        <div
                            key={idx}
                            className="mb-1"
                            dangerouslySetInnerHTML={{ __html: marked.parseInline(line) }}
                            style={{
                                color: line.startsWith("C:\\Users\\Thulani>") ? "white" : "lightgreen"
                            }}

                        />
                    )
                ))}



                {!isThinking && <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ whiteSpace: "pre" }}>C:\Users\Thulani&gt; </span>
                    <input
                        ref={inputRef}
                        className="bg-transparent border-0 text-warning terminal-input"
                        style={{
                            outline: "none",
                            fontFamily: "monospace",
                            flex: 1,
                            minWidth: "200px",
                        }}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleCommand}
                        autoFocus
                    />
                </div>}


                <div ref={terminalRef} />
            </div>

            {/* Resizers */}
            <div className="resizer resizer-br" onMouseDown={(e) => startResize(e, "br")} />
            <div className="resizer resizer-r" onMouseDown={(e) => startResize(e, "r")} />
            <div className="resizer resizer-b" onMouseDown={(e) => startResize(e, "b")} />

            {/*Invisible Input file */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileUpload}
            />
        </div>
    );
};

export default Terminal;
