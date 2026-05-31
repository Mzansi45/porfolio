/**
 * Parses a resume markdown string into structured data for the portfolio.
 * Handles the format used in Firestore (### sections, **bold** labels).
 */
export function parseResume(markdown) {
    if (!markdown) return {};

    // ── Contact fields via regex ──────────────────────────────────────────────
    const emailMatch = markdown.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch?.[0] ?? "";

    const phoneMatch = markdown.match(/\*\*Phone\*\*[:\s]*([^\n<]+)/i)
        ?? markdown.match(/Phone[:\s]+([+\d][\d\s\-().]{6,})/i);
    const phone = phoneMatch?.[1]?.trim() ?? "";

    const linkedinMatch = markdown.match(/\*\*LinkedIn\*\*[^\n]*\(?(https?:\/\/[^\s)\]]+linkedin[^\s)\]]+)\)?/i)
        ?? markdown.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)\]>]+/i);
    const linkedin = linkedinMatch?.[1] ?? linkedinMatch?.[0] ?? "";

    const githubMatch = markdown.match(/\*\*GitHub\*\*[^\n]*\(?(https?:\/\/[^\s)\]]+github[^\s)\]]+)\)?/i)
        ?? markdown.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)\]>]+/i);
    const github = githubMatch?.[1] ?? githubMatch?.[0] ?? "";

    const locationMatch = markdown.match(/\*\*Location\*\*[:\s]*([^\n]+)/i);
    const location = locationMatch?.[1]?.trim() ?? "";

    // ── Name from H1 ─────────────────────────────────────────────────────────
    const nameMatch = markdown.match(/^#\s+(.+)$/m);
    const name = nameMatch?.[1]?.replace(/[\u{1F300}-\u{1FFFF}]/gu, "").trim() ?? "";

    // ── Job title: bold line right after the H1 ───────────────────────────────
    const titleMatch = markdown.match(/^#\s+.+\n+\*\*([^*]+)\*\*/m);
    const jobTitle = titleMatch?.[1]?.trim() ?? "";

    // ── Sections: split on ### headings ───────────────────────────────────────
    const sections = {};
    const sectionRegex = /^###\s+(.+)$/gm;
    const sectionStarts = [];
    let match;
    while ((match = sectionRegex.exec(markdown)) !== null) {
        sectionStarts.push({ title: match[1].trim().toLowerCase(), index: match.index + match[0].length });
    }
    for (let i = 0; i < sectionStarts.length; i++) {
        const end = sectionStarts[i + 1]?.index - (sectionStarts[i + 1] ? sectionStarts[i + 1].title.length + 5 : 0)
            ?? markdown.length;
        sections[sectionStarts[i].title] = markdown.slice(sectionStarts[i].index, end).trim();
    }

    // ── Bio from Professional Summary ─────────────────────────────────────────
    const bioKey = Object.keys(sections).find(k => /summary|about|profile|overview/.test(k));
    const bio = bioKey
        ? sections[bioKey].replace(/\*\*/g, "").replace(/^[-*]\s*/gm, "").replace(/\n+/g, " ").trim()
        : "";

    // ── Availability ──────────────────────────────────────────────────────────
    const availMatch = markdown.match(/[Aa]vailable[^.\n!?]{5,}[.\n!?]/);
    const availability = availMatch?.[0]?.replace(/\n/, " ").trim() ?? "";

    // ── Skills ────────────────────────────────────────────────────────────────
    const skillKey = Object.keys(sections).find(k => /skill|technical/.test(k));
    const skills = [];
    if (skillKey) {
        const skillLines = sections[skillKey].split("\n");
        for (const line of skillLines) {
            // Pattern: **Category**: item1, item2
            const boldLabel = line.match(/^\*\*([^*]+)\*\*[:\s]+(.+)/);
            if (boldLabel) {
                const items = boldLabel[2].split(/[,;]/).map(s => s.replace(/\*\*/g, "").trim()).filter(Boolean);
                if (items.length) skills.push({ category: boldLabel[1].trim(), items });
                continue;
            }
            // Pattern: - item1, item2 (no category label — group under previous or "General")
            const listLine = line.match(/^[-*]\s+(.+)/);
            if (listLine) {
                const items = listLine[1].split(/[,;]/).map(s => s.replace(/\*\*/g, "").trim()).filter(Boolean);
                if (skills.length) {
                    skills[skills.length - 1].items.push(...items);
                } else {
                    skills.push({ category: "Skills", items });
                }
            }
        }
    }

    // ── Projects ──────────────────────────────────────────────────────────────
    const projKey = Object.keys(sections).find(k => /project/.test(k));
    const projects = [];
    if (projKey) {
        // Split on #### sub-headings or **Name** patterns
        const projBlocks = sections[projKey].split(/(?=####\s|^\*\*[^*\n]+\*\*)/m);
        for (const block of projBlocks) {
            if (!block.trim()) continue;
            const h4 = block.match(/^####\s+(.+)/m);
            const bold = block.match(/^\*\*([^*\n]+)\*\*/m);
            const projName = h4?.[1]?.trim() ?? bold?.[1]?.trim();
            if (!projName) continue;

            const urlMatch = block.match(/https?:\/\/\S+/);
            const link = urlMatch?.[0]?.replace(/[)>\]]+$/, "") ?? null;

            const techMatch = block.match(/(?:Tech|Technologies|Stack|Built with)[:\s]+([^\n]+)/i);
            const tech = techMatch
                ? techMatch[1].split(/[,;]/).map(t => t.replace(/\*\*/g, "").trim()).filter(Boolean)
                : [];

            const descLines = block
                .replace(/^####.+\n?/m, "")
                .replace(/^\*\*[^*]+\*\*[^\n]*\n?/, "")
                .replace(/(?:Tech|Technologies|Stack|Built with)[:\s]+[^\n]+\n?/gi, "")
                .split("\n")
                .map(l => l.replace(/^[-*]\s*/, "").replace(/\*\*/g, "").trim())
                .filter(l => l && !l.startsWith("http"));
            const description = descLines.slice(0, 2).join(" ").trim();

            projects.push({ name: projName, description, link, tech });
        }
    }

    return { name, jobTitle, bio, email, phone, linkedin, github, location, availability, skills, projects };
}
