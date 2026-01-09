const http = require('http');

const url = 'http://localhost:3000/api/students?evaluation=dsa';

http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Status:", json.status);
            console.log("Total:", json.pagination?.total);
            if (json.data && json.data.length > 0) {
                console.log("First Student UID:", json.data[0].student_uid);
                console.log("Assessment Score Object:", JSON.stringify(json.data[0].evaluation_scores, null, 2));
            } else {
                console.log("No data returned");
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
            console.log("Raw data:", data.substring(0, 200));
        }
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
