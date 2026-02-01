import http from "http";

/* eslint-disable no-console */
console.log("Cloud Drive Server started! 🚀");

// Simple dummy server
const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Cloud Drive API is running\n");
});

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
/* eslint-enable no-console */
