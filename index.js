import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import ejs from "ejs";
let ed = false;
let del = false;


let commentId = 0;
const comment = [];
const error = "No comment was entered, please enter a valid comment !";

const app = express();
const port = 3000;

app.use(express.static("public"));

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(bodyParser.urlencoded({extended: true}));

app.get("/", (req, res) => {
    res.render("index.ejs");
  });
  
  app.get("/about", (req, res) => {
    res.render("about.ejs");
   
  });

  app.get("/post", (req, res) => {
    if (comment.length == 0) {
        res.render("post.ejs");
    } else {
        res.render("post.ejs", {userComment: comment});
    }
    
   
  });

  app.get("/LinkedIn", (req, res) => {
    res.redirect("https://www.linkedin.com/in/abdelrahman-hesham-b81239167");
   
  });

  app.post("/submit", (req, res) => {
    if (req.body["textArea"].length == 0) {
        res.render("post.ejs", {userError: error,userComment: comment});
    } else {
    comment.push({ id: commentId++, text: req.body["textArea"] });
    res.render("post.ejs", {userComment: comment});
    }
  });

  // Edit route
app.post("/edit/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const newText = req.body.newText;
    const index = comment.findIndex(c => c.id === id);
    if (index !== -1) {
      comment[index].text = newText;
    }
    res.redirect("/post");
  });
  
  // Delete route
  app.post("/delete/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const index = comment.findIndex(c => c.id === id);
    if (index !== -1) {
      comment.splice(index, 1);
    }
    res.redirect("/post");
  });
  
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
  