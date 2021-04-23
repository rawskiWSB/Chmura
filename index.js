const express = require('express');
const app = express();
const http = require('http');
const path = require("path");
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const MongoClient = require('mongodb').MongoClient;
const config = require('config');
const usersDb = require("./models/RssDb");
const mongoose = require("mongoose");
const Parser = require('rss-parser')
const mjml2html = require('mjml')
// const API_KEY = "";
// const DOMAIN = "";
const mailgun = require('mailgun-js')({apiKey: API_KEY, domain: DOMAIN});

app.use("/static", express.static("public"));

app.use(bodyParser.urlencoded({extended: false}));
//app.use(express.static(path.join(__dirname,'./public')));
app.set('public', path.join(__dirname, 'public'));
app.set('view engine', 'ejs');


//CONNECT TO DATABASE
mongoose.set("useFindAndModify", false);

mongoose.connect('mongodb+srv://yoda:yoda@cluster0.g2qbi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', { useNewUrlParser: true }, () => {
    console.log("Polaczony z db!");
    app.listen(process.env.PORT || 8000, () => console.log("Dzialam na 8000!"));
});

// GET METHOD MAIN PAGE
app.get("/", (req, res) => {
    res.render("index.ejs");
});
//GET METHOD LOGIN PAGE
app.get("/logowanie", (req, res) => {
    res.render("logowanie.ejs");
});

//GET METHOD REGISTER PAGE
app.get("/rejestracja", (req, res) => {
    res.render("rejestracja.ejs");
});

//REJESTRACJA W MONGODB

app.post('/register', async (req, res) => {
    try{
        var em = req.body.email;

        var tet = await usersDb.findOne({email: em}, function (err, docs) {});

        if (!tet) {

            let hashPassword = await bcrypt.hash(req.body.password, 10);

            const emp = new usersDb(
                {
                    d: Date.now(),
                    username: req.body.username,
                    email: req.body.email,
                    password: hashPassword
                });
            await emp.save();

            res.send("<div align ='center'><h2>Rejestracja powiodła się</h2></div><br><br><div align='center'><a href='./logowanie'>logowanie</a></div><br><br><div align='center'><a href='./rejestracja'>Rejestracja nowego użytkowanika</a></div>");
        }else {
            res.send("<div align ='center'><h2>Adres e-mail znajduje się już w bazie danych.<br/>Proszę podać inny adres</h2></div><br><br><div align='center'><a href='./rejestracja'>Ponowna rejestracja</a></div>");
        }
    }catch{
        res.send("500 - błąd po stronie serwera");
    }
});

//LOGOWANIE Z MONGODB
app.post('/login', async (req, res) => {
    try{
        let em = req.body.email;

        let tet = await usersDb.findOne({email: em}, function (err, docs) {});

        if (tet) {

            let submittedPass = req.body.password;
            let storedPass = tet.password;

            const passwordMatch = await bcrypt.compare(submittedPass, storedPass);
            if (passwordMatch) {
                let usrname = tet.username;
                //res.send(`<div align ='center'><h2>Logowanie powiodło się! </h2></div><br><br><br><div align ='center'><h3>Witaj ${usrname}</h3></div><br><br><div align='center'><a href='./logowanie'>Wyloguj</a></div>`);
                res.render('user.ejs', {det: tet})
            } else {
                res.send("<div align ='center'><h2>Błędny e-mail lub hasło.</h2></div><br><br><div align ='center'><a href='./logowanie'>Zaloguj ponownie</a></div>");
            }
        }
        else {

            let fakePass = `$2b$$10$ifgfgfgfgfgfgfggfgfgfggggfgfgfga`;
            await bcrypt.compare(req.body.password, fakePass);

            res.send("<div align ='center'><h2>Błędny e-mail lub hasło.</h2></div><br><br><div align ='center'><a href='./logowanie'>Zaloguj ponownie</a></div>");
        }
    } catch{
        res.send("500 - Wewnętrzny błąd serwera");
    }
});

//ODNAJDYWANIE UZYTKOWNIKA PO MAILU I DODAWANIE ADRESU RSS BEZ SPRAWDZANIA POPRAWNOSCI
app.post('/rss', async (req, res) => {
    try{
        const em = req.body.email;
        usersDb.findOneAndUpdate({email: em}, {rss: req.body.rss}, err => {
            if (err) return res.send(500, err);
        });
        let tet = await usersDb.findOne({email: em}, function (err, docs) {});
        res.render('user.ejs', {det: tet})
    } catch{
        res.send("500 - Wewnętrzny błąd serwera");
    }
});

//RSS PARSER

app.post("/send", async (req, res) => {
    try{
        let parser = new Parser();
        const em = req.body.email;
        let tet = await usersDb.findOne({email: em}, function (err, docs) {
        });

//RSS DLA JEDNEGO RECORDU
        let feed = await parser.parseURL(tet.rss);
        //console.log(feed.title);
        res.render('user.ejs', {det: tet})
        sender(tet.email, feed.items)
    } catch{
        res.send("500 - Wewnętrzny błąd serwera");
    }
});

//PRZYGOTOWANIE MAILA
function sender(mailAdress, msg) {
    mailAdress = 'spamowiskoxbox@gmail.com';
    let sub = "Test mail RSS"

    //PRZYGOTOWANIE WIADOMOSCI
    let sum = ""
    let rs = ""
    let start="`<mjml><mj-body>`"
    let end = "`</mjml></mj-body>`"

    msg.map(item => {
        rs = rs + '<mj-divider border-color="#F45E43"></mj-divider>' +
            '<mj-text font-size="20px" color="#F45E43" font-family="helvetica">' + item.title + ' - ' + item.link + '</mj-text>'
    })
    sum = mjml2html(start + rs + end)

    var data = {
        from: 'rss@test.pl',
        to: mailAdress,
        subject: sub,
        text: "Witaj",
        html: sum.html
    };

    mailgun.messages().send(data, function (error, body) {
        console.log(body);
    });
}