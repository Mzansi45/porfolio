export function runCommand(cmd, currentDirectory = "C:\\Users\\Thulani") {
    const fullCommand = cmd.trim();
    const parts = fullCommand.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (command) {
        // Essential portfolio actions (quick access)
        case "resume":
        case "cv":
            window.open("/#/resume", "_blank");
            return [
                "Opening resume in new tab...",
                "Resume loaded successfully!"
            ];

        // Quick contact info
        case "contact":
            return [
                "  Email     thulanegulube@gmail.com",
                "  Phone     +27637251905",
                "  Location  Johannesburg, South Africa",
                "",
                "  Tip: 'assistant tell me more about Thulani' for detailed info"
            ];

        // Quick links
        case "links":
        case "social":
            return [
                "Quick Links:",
                "  GitHub    github.com/thulani-dev",
                "  LinkedIn  linkedin.com/in/thulani-gulube",
                "  Blog      thulani-dev.com/blog",
                "",
                "  Tip: 'assistant what are Thulani\'s recent projects?'"
            ];

        // Windows system commands (for authenticity)
        case "dir":
            const dirPath = args.length > 0 ? args.join(' ') : currentDirectory;
            return [
                ` Volume in drive C has no label.`,
                ` Directory of ${dirPath}`,
                "",
                `08/08/2025  09:15 AM    <DIR>          Projects`,
                `08/01/2025  04:15 PM           248,832 resume.pdf`,
                `07/25/2025  01:22 PM         1,024,000 portfolio.zip`,
                "               2 File(s)      1,272,832 bytes",
                "               1 Dir(s)   45,234,567,890 bytes free"
            ];

        case "cls":
        case "clear":
            return ["CLEAR_TERMINAL"];

        case "echo":
            const message = args.join(' ');
            if (!message) return ["ECHO is on."];
            return [message];

        case "date":
            return [`The current date is: ${new Date().toLocaleDateString()}`];

        case "time":
            return [`The current time is: ${new Date().toLocaleTimeString()}`];

        case "ver":
        case "version":
            return [
                "Microsoft Windows [Version 10.0.22621.2134]",
                "",
                "  Portfolio Terminal v3.0 - AI Enhanced",
                "  AI Assistant integration active"
            ];

        case "ipconfig":
            return [
                "Windows IP Configuration",
                "",
                "Ethernet adapter:",
                "   IPv4 Address. . . . . . . . . . . : 192.168.1.100",
                "   Default Gateway . . . . . . . . . : 192.168.1.1",
                "",
                "  Portfolio accessible worldwide!"
            ];

        // Help system - guide users to AI assistant
        case "help":
        case "?":
            return [
                "╔══════════════════════════════════════════════════════════════╗",
                "║                    PORTFOLIO TERMINAL HELP                  ║",
                "╚══════════════════════════════════════════════════════════════╝",
                "",
                "Quick Commands:",
                "   resume       Open my resume/CV",
                "   contact      Get contact information",
                "   links        View social media profiles",
                "",
                "AI Assistant (Recommended):",
                "   assistant <question>    Ask anything about me!",
                "",
                "Examples:",
                "   assistant tell me about your experience",
                "   assistant what projects have you worked on?",
                "   assistant what technologies do you use?",
                "   assistant tell me about your background",
                "",
                "System Commands:",
                "   dir, cls, date, time, ver, ipconfig",
                "",
                "  Tip: The AI assistant provides much richer responses",
                "    than static commands. Try asking it anything!"
            ];

        // Assistant command suggestions
        case "about":
        case "projects":
        case "skills":
        case "experience":
        case "background":
            return [
                `  For detailed information about '${command}', try:`,
                "",
                `   assistant tell me about Thulani's ${command}`,
                "",
                "The AI assistant can provide much more comprehensive",
                "and personalized responses than static commands.",
                "",
                "Or use quick commands: 'resume', 'contact', 'links'"
            ];

        case "exit":
        case "quit":
            return [
                "Thanks for visiting my portfolio!",
                "",
                "  Before you go, try asking the assistant:",
                "   assistant what makes Thulani unique as a developer?",
                "",
                "Hope to connect with you soon!"
            ];

        case "":
            return [""]; // Empty line

        // Fun easter eggs (keep it light)
        case "hello":
        case "hi":
            return [
                "Welcome to my interactive portfolio!",
                "",
                "  Try: 'assistant introduce yourself' for a personal greeting",
                "Or: 'help' to see what you can explore"
            ];

        case "coffee":
            return [
                "Error: Coffee machine not connected to terminal",
                "",
                "  Try: 'assistant how much coffee do you drink?'"
            ];

        // Default - guide to assistant
        default:
            // Check if it looks like a question or natural language
            if (fullCommand.includes('?') || fullCommand.includes('how') || fullCommand.includes('what') || 
                fullCommand.includes('tell') || fullCommand.includes('show') || fullCommand.length > 15) {
                return [
                    "  That sounds like a question for the AI assistant!",
                    "",
                    `Try: assistant ${fullCommand}`,
                    "",
                    "The assistant can provide detailed, personalized responses",
                    "about my background, projects, and experience."
                ];
            }
            
            return [
                `'${fullCommand}' is not recognized as an internal or external command.`,
                "",
                "  Try 'help' for available commands, or ask the assistant:",
                `   assistant ${fullCommand}`,
                "",
                "Quick commands: resume | contact | links | help"
            ];
    }
}