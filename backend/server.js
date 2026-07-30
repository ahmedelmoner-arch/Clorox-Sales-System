const app = require("./app");
const { PORT } = require("./config/env");

app.listen(PORT, () => {
  console.log(`
====================================
🚀 Clorox Sales Server Started
🌐 http://localhost:${PORT}
====================================
`);
});