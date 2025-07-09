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
import { Pool } from "pg";
import flash from 'connect-flash';

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const db = new Pool({
  host: PGHOST,
  database: PGDATABASE,
  username: PGUSER,
  password: PGPASSWORD,
  port: 5432,
  ssl: {
    require: true,
  },
});

async function getPgVersion() {
  const client = await db.connect();
  try {
    const result = await client.query('SELECT version()');
    console.log(result.rows[0]);
  } finally {
    client.release();
  }
}
getPgVersion();



app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  })
);


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  res.locals.error = req.flash("error");
  next();
});

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.currentUser = req.user;
  next();
});

app.get("/", (req, res) => {
    res.render("index.ejs");
  });
  
  app.get("/about", (req, res) => {
    res.render("about.ejs");
   
  });

  app.get("/login", (req, res) => {
    res.render("login.ejs");
  });

  app.get("/signup", async (req,res)=> {
    res.render("signup.ejs")
  });

  app.get("/post", async (req, res) => {

    console.log(req.user);
  if (req.isAuthenticated()) {
    const result = await db.query("SELECT * FROM comments");
    let comment = result.rows;
    console.log(result);
    if (comment.length === 0) {
        res.render("post.ejs");
    } else {
        res.render("post.ejs", {userComment: comment});
    }
  } else {
    res.redirect("/login");
  }
  });


    
  app.get("/LinkedIn", (req, res) => {
    res.redirect("https://www.linkedin.com/in/abdelrahman-hesham-b81239167");
  });

  app.get("/logout",(req,res)=>{
    req.logout((err)=>{
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
  });

  app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
  })
  );
  
  app.get("/auth/google/secrets", passport.authenticate("google", {
    successRedirect: "/post",
    failureRedirect: "/login",
  })
  );

  
  app.post("/loging",
    passport.authenticate("local", {
        successRedirect: "/post",
        failureRedirect: "/login",
        failureFlash: true,
      })
  );

  app.post("/register", async (req,res)=> {
    const email = req.body.username;
    const password = req.body.password;
  
    try {
      const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
  
      if (checkResult.rows.length > 0) {
        req.redirect("/login");
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.error("Error hashing password:", err);
          } else {
            const result = await db.query(
              "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
              [email, hash]
            );
            const user = result.rows[0];
            req.login(user, (err) => {
              console.log("success");
              res.redirect("/post");
            });
          }
        });
      }
    } catch (err) {
      console.log(err);
    }
  });


  //Add new comment

  app.post("/submit", async (req, res) => {
   
   const newComment = req.body["textArea"];
   console.log(newComment);
    if (newComment.length === 0) {
        res.redirect("/post");
    } else {
    await db.query("INSERT INTO comments (comment, user_id) VALUES ($1, $2)", [newComment, req.user.id]);
    res.redirect("/post");
    }   
  });

  // Edit route
app.post("/edit/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const newText = req.body.editComment;
    const userId = req.user.id;

    const result = await db.query("UPDATE comments SET comment = $1 WHERE id = $2 AND user_id = $3", [newText,id, userId]);
    
    res.redirect("/post");
  });
  
  // Delete route
  app.post("/delete/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await db.query("DELETE FROM comments WHERE id = $1 AND user_id = $2", [id, userId]);

    res.redirect("/post");
  });

  passport.use("local",
    new Strategy(async function verify(username, password, cb) {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
        console.log(result.rows);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;
          bcrypt.compare(password, storedHashedPassword, (err, valid) => {
            if (err) {
              //Error with password check
              console.error("Error comparing passwords:", err);
              return cb(err);
            } else {
              if (valid) {
                //Passed password check
                return cb(null, user);
              } else {
                //Did not pass password check
                return cb(null, false, { message: "Incorrect password" });
              }
            }
          });
        } else {
          return cb(null, false, { message: "User not found" });
        }
      } catch (err) {
        console.log(err);
      }
    })
  );
  
  passport.use("google", new GoogleStrategy ({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === "production"
  ? "https://personal-blog-wwsz.onrender.com/auth/google/secrets"
  : "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  }, async (accessToken, refreshToken, profile, cb)=> {
    console.log(profile);
  
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [profile.email]);
  
      if (result.rows.length === 0) {
        const newUser = await db.query("INSERT INTO users (email,password) VALUES ($1,$2)", [profile.email, "google"]); 
        cb(null, newUser.rows[0]);
      } else {
        //Already existing user
      cb(null,result.rows[0]);
      }
    } catch {
      cb(err);
    }
  })
  );
  
  passport.serializeUser((user, cb) => {
    cb(null, user);
  });
  passport.deserializeUser((user, cb) => {
    cb(null, user);
  });
  
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
  
