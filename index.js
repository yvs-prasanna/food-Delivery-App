const express = require('express');
const app = express();
const port = 3000;
app.use(express.json());

app.get("/", async(req, res) => {
    console.log("Hello World");
    res.send("Hello World");
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});