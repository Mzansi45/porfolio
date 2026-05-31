import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, ExternalLink, Code2, MapPin, X, Menu, ArrowUpRight, Send } from "lucide-react";
import { getResume } from "../hooks/firebase_commands";
import { parseResume } from "../hooks/parseResume";
import "./portfolio.css";

const CF_URL = "https://us-central1-thulani-gulube.cloudfunctions.net/callGroq";

const FALLBACK = {
    title: "Software Developer & Architect",
    location: "Johannesburg, South Africa",
    email: "thulanegulube@gmail.com",
    phone: "+27637251905",
    github: "https://github.com/thulani-dev",
    linkedin: "https://linkedin.com/in/thulani-gulube",
    name: "Thulani Gulube",
    availability: "Available for freelance, contract, and full-time roles.",
};

/* ── Ask PA widget ───────────────────────────────────────────── */
function AskPA() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: "assistant", text: "Hi, I'm Thulani's PA. Ask me anything about his experience or skills." }
    ]);
    const [input, setInput] = useState("");
    const [thinking, setThinking] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, open]);

    async function send() {
        const q = input.trim();
        if (!q || thinking) return;
        setInput("");
        // Capture history before state update; skip the initial greeting (index 0)
        const history = messages.slice(1).map(m => ({ role: m.role, content: m.text }));
        setMessages(prev => [...prev, { role: "user", text: q }]);
        setThinking(true);
        try {
            const res = await fetch(CF_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: q, history }),
            });
            const data = await res.json();
            const reply = data?.response ?? data?.reply ?? data?.message ?? "I couldn't get a response right now.";
            setMessages(prev => [...prev, { role: "assistant", text: reply }]);
        } catch {
            setMessages(prev => [...prev, { role: "assistant", text: "Network error — please try again." }]);
        } finally {
            setThinking(false);
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen(o => !o)}
                className="fixed right-6 z-50 flex items-center gap-2 bg-[#111] hover:bg-black text-white text-xs font-medium px-3.5 py-2 rounded-full shadow-lg transition-all !border-0"
                aria-label="Ask Personal Assistant"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
            >
                <span className="relative flex h-2 w-2">
                    <span className="pa-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Ask PA
            </button>

            {open && (
                <div className="fixed right-4 z-50 w-[calc(100vw-2rem)] sm:w-80 md:w-[22rem] bg-white border border-[#e0e0e0] rounded-2xl shadow-xl flex flex-col overflow-hidden"
                    style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f0]">
                        <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="text-xs font-medium text-[#333]">Thulani's PA</span>
                        </div>
                        <button onClick={() => setOpen(false)} className="text-[#bbb] hover:text-[#666] transition !border-0 !bg-transparent !shadow-none !p-0" aria-label="Close"><X size={14} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-64 bg-[#fafafa]">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[82%] text-xs px-3 py-2 rounded-xl leading-relaxed ${
                                    m.role === "user"
                                        ? "bg-[#111] text-white rounded-br-none"
                                        : "bg-white border border-[#ebebeb] text-[#444] rounded-bl-none"
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {thinking && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-[#ebebeb] text-[#bbb] text-xs px-3 py-2 rounded-xl rounded-bl-none">
                                    <span className="cursor-blink">▋</span>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="flex gap-2 p-3 border-t border-[#f0f0f0] bg-white">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && send()}
                            placeholder="Ask about experience, skills…"
                            className="flex-1 bg-[#f5f5f5] text-[#333] text-xs placeholder-[#bbb] rounded-lg px-3 py-2 outline-none border border-[#e8e8e8] focus:border-[#999] transition"
                        />
                        <button
                            onClick={send}
                            disabled={thinking || !input.trim()}
                            className="disabled:opacity-25 flex items-center justify-center rounded-lg transition !border-0 !shadow-none flex-shrink-0"
                            aria-label="Send"
                            style={{ background: "#111", color: "#fff", width: 32, height: 32, padding: 0, lineHeight: 1, minWidth: 0 }}
                        >
                            <Send size={14} color="#fff" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

/* ── Shared components ───────────────────────────────────────── */
function SectionLabel({ label }) {
    return (
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#bbb] mb-10">{label}</p>
    );
}

function ContactRow({ icon: Icon, label, value, href, external }) {
    return (
        <a
            href={href}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="flex items-center gap-4 py-3.5 border-b border-[#f0f0f0] hover:border-[#d0d0d0] transition group"
        >
            <span className="text-[#ccc] group-hover:text-[#999] transition flex-shrink-0"><Icon size={15} /></span>
            <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-[#bbb] group-hover:text-[#999] transition mb-0.5">{label}</div>
                <div className="text-sm text-[#555] group-hover:text-[#111] truncate transition">{value}</div>
            </div>
            <span className="text-[#ddd] group-hover:text-[#999] transition"><ArrowUpRight size={13} /></span>
        </a>
    );
}

function Skeleton() {
    return (
        <div className="space-y-3">
            {[85, 65, 50].map((w, i) => (
                <div key={i} className="h-2 bg-[#f0f0f0] rounded animate-pulse" style={{ width: `${w}%` }} />
            ))}
        </div>
    );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function Portfolio() {
    const [parsed, setParsed] = useState({});
    const [loading, setLoading] = useState(true);
    const [mobileNav, setMobileNav] = useState(false);

    useEffect(() => {
        getResume()
            .then(r => setParsed(parseResume(r?.data ?? "")))
            .catch(err => console.error("Portfolio fetch error:", err))
            .finally(() => setLoading(false));
    }, []);

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        setMobileNav(false);
    };

    const fullName    = parsed.name         || FALLBACK.name;
    const jobTitle    = parsed.jobTitle      || FALLBACK.title;
    const bio         = parsed.bio           || "";
    const email       = parsed.email         || FALLBACK.email;
    const phone       = parsed.phone         || FALLBACK.phone;
    const github      = parsed.github        || FALLBACK.github;
    const linkedin    = parsed.linkedin      || FALLBACK.linkedin;
    const location    = parsed.location      || FALLBACK.location;
    const availability= parsed.availability  || FALLBACK.availability;
    const skills      = parsed.skills        ?? [];
    const projects    = parsed.projects      ?? [];

    // Derive display text from URLs (strip protocol)
    const linkedinDisplay = linkedin.replace(/^https?:\/\//, "");
    const githubDisplay   = github.replace(/^https?:\/\//, "");

    const [form, setForm] = useState({ name: "", email: "", message: "" });
    const [formState, setFormState] = useState("idle"); // idle | sending | sent | error

    async function handleContact(e) {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
        setFormState("sending");
        try {
            const res = await fetch("https://us-central1-thulani-gulube.cloudfunctions.net/sendContactEmail", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("non-ok");
            setFormState("sent");
            setForm({ name: "", email: "", message: "" });
        } catch {
            setFormState("error");
        }
    }

    const navLinks = [
        { label: "About", id: "about" },
        { label: "Skills", id: "skills" },
        { label: "Projects", id: "projects" },
        { label: "Contact", id: "contact" },
    ];

    return (
        <div className="min-h-screen bg-white text-[#333] font-sans antialiased text-left">

            {/* ── Nav ── */}
            <header className="sticky top-0 z-40 border-b border-[#f0f0f0] bg-white/95 backdrop-blur">
                <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
                    <span className="text-[#111] font-semibold text-sm tracking-tight">{fullName}</span>
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map(n => (
                            <button key={n.id} onClick={() => scrollTo(n.id)}
                                className="text-[11px] uppercase tracking-[0.15em] text-[#aaa] hover:text-[#333] transition !border-0 !bg-transparent !shadow-none !p-0">
                                {n.label}
                            </button>
                        ))}
                        <a href="/#/resume" className="text-[11px] uppercase tracking-[0.15em] text-[#aaa] hover:text-[#333] transition">Resume</a>
                        <Link to="/" className="text-[11px] font-mono text-[#ccc] hover:text-[#888] transition">&gt;_ terminal</Link>
                    </nav>
                    <button className="md:hidden text-[#aaa] hover:text-[#333] !border-0 !bg-transparent !shadow-none !p-0" onClick={() => setMobileNav(v => !v)} aria-label="Menu">
                        {mobileNav ? <X size={16} /> : <Menu size={16} />}
                    </button>
                </div>
                {mobileNav && (
                    <div className="md:hidden border-t border-[#f0f0f0] bg-white px-6 py-5 flex flex-col gap-4">
                        {navLinks.map(n => (
                            <button key={n.id} onClick={() => scrollTo(n.id)}
                                className="text-xs uppercase tracking-widest text-[#aaa] hover:text-[#333] text-left transition !border-0 !bg-transparent !shadow-none !p-0">{n.label}</button>
                        ))}
                        <a href="/#/resume" className="text-xs uppercase tracking-widest text-[#aaa] hover:text-[#333] transition">Resume</a>
                    </div>
                )}
            </header>

            {/* ── Hero ── */}
            <section id="hero" className="max-w-4xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-28">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#111] tracking-tight leading-tight mb-3">
                    {fullName}
                </h1>
                <p className="text-sm text-[#aaa] mb-10">{jobTitle}</p>
                <div className="flex items-center gap-5 flex-wrap">
                    <button onClick={() => scrollTo("contact")}
                        className="bg-[#111] text-white text-xs font-semibold px-5 py-2.5 rounded hover:bg-black transition !border-0 !shadow-none">
                        Contact
                    </button>
                    <a href="/#/resume" className="text-xs text-[#999] hover:text-[#333] underline underline-offset-4 transition">
                        View Resume
                    </a>
                    <span className="hidden sm:block w-px h-3.5 bg-[#ebebeb]" />
                    <a href={github} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[#bbb] hover:text-[#555] transition"><Code2 size={13} /> GitHub</a>
                    <a href={linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[#bbb] hover:text-[#555] transition"><ExternalLink size={13} /> LinkedIn</a>
                </div>
                <p className="flex items-center gap-1.5 text-[#ddd] text-[11px] font-mono mt-10"><MapPin size={11} />{location}</p>
            </section>

            {/* ── About ── */}
            <section id="about" className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-[#f0f0f0]">
                <SectionLabel label="About" />
                {loading ? <Skeleton /> : (
                    <p className="text-[#777] leading-loose max-w-2xl text-sm">
                        {bio ?? "Back-end developer and systems architect based in Johannesburg. I design scalable APIs, data pipelines, and cloud-native services — then make them talk to beautiful frontends."}
                    </p>
                )}
            </section>

            {/* ── Skills ── */}
            <section id="skills" className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-[#f0f0f0]">
                <SectionLabel label="Skills" />
                {loading ? <Skeleton /> : skills.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#f0f0f0] border border-[#f0f0f0]">
                        {skills.map((skill, i) => (
                            <div key={i} className="bg-white p-5 hover:bg-[#fafafa] transition">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ccc] mb-4">{skill.category}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {skill.items.map((s, j) => (
                                        <span key={j} className="text-[#777] text-xs bg-[#f5f5f5] border border-[#ebebeb] px-2 py-0.5 rounded">
                                            {typeof s === "string" ? s : (s.name ?? String(s))}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-[#ccc] text-sm">No data.</p>}
            </section>

            {/* ── Projects ── */}
            <section id="projects" className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-[#f0f0f0]">
                <SectionLabel label="Projects" />
                {loading ? <Skeleton /> : projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#f0f0f0] border border-[#f0f0f0]">
                        {projects.map((p, i) => (
                            <div key={i} className="bg-white p-6 hover:bg-[#fafafa] transition flex flex-col gap-3 group">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-[#222] font-medium text-sm">{p.name}</h3>
                                    {p.link && (
                                        <a href={p.link} target="_blank" rel="noreferrer"
                                            className="text-[#ccc] group-hover:text-[#888] transition flex-shrink-0"><ArrowUpRight size={14} /></a>
                                    )}
                                </div>
                                {p.description && <p className="text-[#999] text-xs leading-relaxed flex-1">{p.description}</p>}
                                {p.tech?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-auto pt-1">
                                        {p.tech.map((t, j) => (
                                            <span key={j} className="text-[#aaa] text-[10px] border border-[#ebebeb] px-1.5 py-0.5 rounded">{t}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : <p className="text-[#ccc] text-sm">No data.</p>}
            </section>

            {/* ── Contact ── */}
            <section id="contact" className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-[#f0f0f0]">
                <SectionLabel label="Contact" />
                <p className="text-[#bbb] text-sm mb-6 max-w-sm leading-loose">
                    {availability}
                </p>

                {/* Contact form */}
                <form onSubmit={handleContact} className="w-full sm:max-w-sm mb-8 flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Your name"
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        required
                        className="w-full border border-[#e8e8e8] rounded-lg px-4 py-3 text-sm text-[#111] placeholder-[#ccc] focus:outline-none focus:border-[#aaa] transition !bg-white !shadow-none"
                    />
                    <input
                        type="email"
                        placeholder="Your email"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        required
                        className="w-full border border-[#e8e8e8] rounded-lg px-4 py-3 text-sm text-[#111] placeholder-[#ccc] focus:outline-none focus:border-[#aaa] transition !bg-white !shadow-none"
                    />
                    <textarea
                        placeholder="Your message"
                        rows={5}
                        value={form.message}
                        onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        required
                        className="w-full border border-[#e8e8e8] rounded-lg px-4 py-3 text-sm text-[#111] placeholder-[#ccc] focus:outline-none focus:border-[#aaa] transition resize-none !bg-white !shadow-none"
                    />
                    <button
                        type="submit"
                        disabled={formState === "sending"}
                        className="self-start bg-[#111] hover:bg-black !text-white disabled:opacity-40 px-6 py-2 rounded-lg text-sm font-medium transition !border-0 !shadow-none"
                        style={{ color: "#fff" }}
                    >
                        {formState === "sending" ? "Sending…" : "Send Message"}
                    </button>
                    {formState === "sent" && (
                        <p className="text-xs text-green-600">Message sent! I'll get back to you soon.</p>
                    )}
                    {formState === "error" && (
                        <p className="text-xs text-red-500">Failed to send — please email me directly.</p>
                    )}
                </form>

                <div className="w-full sm:max-w-sm border-t border-[#f0f0f0] pt-4">
                    <ContactRow icon={Mail} label="Email" value={email} href={`mailto:${email}`} />
                    <ContactRow icon={Phone} label="Phone" value={phone} href={`tel:${phone}`} />
                    <ContactRow icon={ExternalLink} label="LinkedIn" value={linkedinDisplay} href={linkedin} external />
                    <ContactRow icon={Code2} label="GitHub" value={githubDisplay} href={github} external />
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="max-w-4xl mx-auto px-4 sm:px-6 py-8 border-t border-[#f0f0f0] flex items-center justify-between">
                <span className="text-[#ddd] text-[11px]">{new Date().getFullYear()} · {fullName}</span>
                <Link to="/" className="hidden md:inline text-[11px] font-mono text-[#ccc] hover:text-[#888] transition">&gt;_ terminal</Link>
            </footer>

            <AskPA />
        </div>
    );
}
