

const useAssistant = async (prompt) => {
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

export { useAssistant };