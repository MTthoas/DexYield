import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

app.listen(3001, () => {
  console.log("API listening on http://localhost:3001");
});
