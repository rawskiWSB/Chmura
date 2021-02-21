const express = require('express');
const app = express();

app.set("view engine", "ejs");
app.use("/static", express.static("public"));

// GET METHOD MAIN PAGE
app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.listen(process.env.PORT || 3000, () => console.log("Dzialam na 3000!"));
