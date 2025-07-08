import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import GoogleStrategy from "passport-google-oauth2";
import env from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://qnbfhuadcagacrgwjwml.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();



app.get("/", (req, res) => {
    res.render("index.ejs");
  });
  
  app.get("/about", (req, res) => {
    res.render("about.ejs");
   
  });

  app.get("/post", async (req, res) => {
    const result = await db.query("SELECT * FROM comments");
    let comment = result.rows;
    
    if (comment.length === 0) {
        res.render("post.ejs");
    } else {
        res.render("post.ejs", {userComment: comment});
    }
    
   
  });

  app.get("/LinkedIn", (req, res) => {
    res.redirect("https://www.linkedin.com/in/abdelrahman-hesham-b81239167");
   
  });

  //Add new comment

  app.post("/submit", async (req, res) => {
   
   const newComment = req.body["textArea"];
   console.log(newComment);
    if (newComment.length === 0) {
        res.redirect("/post");
    } else {
    await db.query("INSERT INTO comments (comment) VALUES ($1)", [newComment]);
    res.redirect("/post");
    }
  });

  // Edit route
app.post("/edit/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const newText = req.body.editComment;
    const result = await db.query("UPDATE comments SET comment = $1 WHERE id = $2", [newText,id]);
    
    res.redirect("/post");
  });
  
  // Delete route
  app.post("/delete/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const result = await db.query("DELETE FROM comments WHERE id = $1", [id]);

    res.redirect("/post");
  });
  
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
  