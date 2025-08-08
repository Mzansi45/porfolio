import React, { useRef, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint, faShareAlt, faDownload } from "@fortawesome/free-solid-svg-icons";
import html2pdf from 'html2pdf.js';
import { uploadNewResume, getResume } from "../hooks/firebase_commands";




export default function ResumeView() {
    const [loading, setLoading] = useState(false);
    const resumeRef = useRef();

    const [resumeMarkdown, setResumeMarkdown] = useState("");

    //use effect to get resume
    React.useEffect(() => {
        const fetchResume = async () => {
            setLoading(true);
            const resume = await getResume();
            setResumeMarkdown(resume.data);
            setLoading(false);
        };
        fetchResume();
    }, [resumeMarkdown]);

    const handlePrint = () => {
        const content = resumeRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'width=800,height=1100');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Resume</title>
                    <style>
                        @page {
                            size: A4;
                            margin: 20mm;
                        }
                        body {
                            font-family: Arial, sans-serif;
                            font-size: 14px;
                            line-height: 1.6;
                            color: #212529;
                        }
                        h1, h2, h3 {
                            color: #212529;
                        }
                        a {
                            color: #0d6efd;
                            text-decoration: none;
                        }
                        hr {
                            margin: 24px 0;
                        }
                        ul {
                            padding-left: 20px;
                        }
                        blockquote {
                            border-left: 4px solid #ccc;
                            padding-left: 10px;
                            margin-left: 0;
                            color: #555;
                        }
                        code {
                            background-color: #f1f1f1;
                            padding: 2px 4px;
                            border-radius: 4px;
                        }
                        pre {
                            background-color: #333;
                            color: #fff;
                            padding: 10px;
                            border-radius: 4px;
                            overflow-x: auto;
                        }
                    </style>
                </head>
                <body>${content.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };


    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: "Thulani Gulube Resume",
                text: "Check out my resume",
                url: window.location.href,
            });
        } else {
            alert("Sharing not supported in this browser.");
        }
    };

    const handleDownloadPDF = () => {
        const content = resumeRef.current;
        if (!content) return;

        const opt = {
            margin: [0.5, 0.5, 0.5, 0.5], // top, left, bottom, right (in inches)
            filename: 'Thulani_Gulube_Resume.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true }, // higher scale = better quality
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(content).save();
    };

    /*const makeCall = (prompt) => {
        const encodedPrompt = encodeURIComponent(prompt);
        const url = `https://script.google.com/macros/s/AKfycbxkEKh8EHbhDcJSqYDukQXk-uiJaP_s6cJR5IMlt5EQYPu1SHdPzOzBu-h0JT2YCeAzHw/exec?prompt=${encodedPrompt}`;

        fetch(url, {
            method: "GET" // Or POST with no headers/body if your script handles it
        })
            .then(res => res.json())
            .then(data => console.log(data))
            .catch(err => console.error(err));
    };*/

    const makeCall = async (prompt) => {
        try {
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
            console.log(data);
            return data;
        } catch (err) {
            console.error("Fetch failed:", err);
            throw err;
        }
    };






    const resumeDiv = () => {
        return (
            <div
                ref={resumeRef}
                className="bg-white shadow p-5 text-start"
                style={{
                    width: "210mm", // A4 width
                    minHeight: "297mm", // A4 height
                    fontFamily: "Arial, sans-serif",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    color: "#212529",
                    padding: "20mm",
                    boxSizing: "border-box",

                    alignItems: "center",
                    justifyContent: "center",

                    width: " 794px",       /* A4 width in pixels at 96dpi */
                    maxWidth: "100%",
                    margin: "0 auto",
                    padding: "32px",
                    boxSizing: "border - box",
                    backgroundColor: "white",

                }
                }
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h1: (props) => <h1 className="text-center fw-bold display-5 mb-4" {...props} />,
                        h2: (props) => <h2 className="text-primary border-bottom pb-1 mb-3 mt-4" {...props} />,
                        h3: (props) => <h3 className="fw-semibold mt-3 mb-2" {...props} />,
                        p: (props) => <p className="mb-2" {...props} />,
                        ul: (props) => <ul className="mb-3 ps-4" {...props} />,
                        li: (props) => <li className="mb-1" {...props} />,
                        a: (props) => (
                            <a {...props} className="text-decoration-none text-primary" target="_blank" rel="noreferrer" />
                        ),
                        hr: () => <hr className="my-4" />,
                        blockquote: (props) => (
                            <blockquote className="blockquote ps-3 border-start border-3 border-secondary" {...props} />
                        ),
                        code: ({ inline, className, children, ...props }) =>
                            inline ? (
                                <code className="bg-light px-1 rounded" {...props}>
                                    {children}
                                </code>
                            ) : (
                                <pre className={`bg-dark text-light p-3 rounded ${className}`} {...props}>
                                    <code>{children}</code>
                                </pre>
                            ),
                    }}
                >
                    {resumeMarkdown}
                </ReactMarkdown>
            </div >
        );
    }

    return (
        <div className="d-flex justify-content-center py-5 bg-light">
            <div>
                {resumeDiv()}
            </div>

            {/* Floating Buttons */}
            <div className="fixed-bottom d-flex justify-content-end mb-3 me-4">
                <button className="btn btn-primary me-2" onClick={handleDownloadPDF()}>
                    <FontAwesomeIcon icon={faDownload} /> Download PDF
                </button>
                <button className="btn btn-primary me-2" onClick={handlePrint}>
                    <FontAwesomeIcon icon={faPrint} /> Print
                </button>
                <button className="btn btn-secondary" onClick={handleShare}>
                    <FontAwesomeIcon icon={faShareAlt} /> Share
                </button>

            </div>
        </div>
    );
}

