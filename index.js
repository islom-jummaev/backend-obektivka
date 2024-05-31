const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcrypt"); // Import bcrypt for password hashing

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static("uploads"));

axios.defaults.baseURL = process.env.BASE_URL;

const users = [
  { username: "Islom", password: "admin" },
  { username: "admin", password: "admin" },

];

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (user.password !== password) {
    return res.status(401).json({ message: "Invalid password" });
  }

  res.status(200).json({ message: "Login successful" });
});

// ======= UPLOAD =======
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, req.params.studentId + path.extname(file.originalname));
  },
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
});

const upload = multer({ storage: storage });

app.post(
  "/api/upload/doc/:studentId",
  upload.single("file"),
  async (req, res) => {
    try {
      if (req.file)
        return res.json({
          message: "Fayl yuklandi!",
          file_owner: req.params.studentId,
        });

      res.status(400).json({ message: "Fayl yuklanmadi!" });
    } catch (error) {
      res.status(500).json({ message: "Serverda xato bo'ldi!" });
    }
  }
);

// Fakultetlarni olish uchun so'rov
app.get("/api/facultets", (req, res) => {
  const lang = req.query.lang;

  axios
    .get(`department-list?_structure_type=11&l=${lang}.`, {
      headers: {
        Authorization: process.env.Authorization,
        accept: "application/json",
      },
    })
    .then((response) => {
      res.status(200).send({
        data: response.data.data.items,
        error: false,
      });
    })
    .catch((err) =>
      res.status(400).send({
        error: true,
        data: err,
      })
    );
});

// Guruhlar ro'yxatini olish uchun so'rov
app.get("/api/groups", (req, res) => {
  const faculty = req.query.faculty;
  const lang = req.query.lang;

  axios
    .get(`group-list?l=${lang}&_department=${faculty}&limit=200`, {
      headers: {
        Authorization: process.env.Authorization,
        accept: "application/json",
      },
    })
    .then((response) => {
      res.status(200).json({
        data: response.data.data.items,
        error: false,
      });
    })
    .catch((err) =>
      res.status(500).json({
        error: true,
        data: err,
      })
    );
});

// Talabalar ro'yxatini olish uchun so'rov
app.get("/api/student", async (req, res) => {
  const { faculty, group, search } = req.query;

  const qs = new URLSearchParams();
  if (faculty) qs.append("_faculty", faculty);
  if (group) qs.append("_group", group);
  if (search) qs.append("search", search);

  try {
    const response = await fetch(process.env.BASE_URL + "student-list?" + qs, {
      headers: {
        Authorization: process.env.Authorization,
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const json = await response.json();
      res.status(200).json({
        error: false,
        data: json.data.items,
      });
    } else {
      res
        .status(response.status)
        .json({ error: true, data: response.statusText });
    }
  } catch (error) {
    res.status(500).json({ error: true, data: error });
  }
});

// Jadval olish uchun so'rov
app.get("/api/schedule", (req, res) => {
  const faculty = req.query.faculty;
  const group = req.query.group;
  const lang = req.query.lang;
  const semester = req.query.semester;

  axios
    .get(
      `schedule-list?l=${lang}&_faculty=${faculty}&_group=${group}&_semester=${semester}&limit=200`,
      {
        headers: {
          Authorization: process.env.Authorization,
          accept: "application/json",
        },
      }
    )
    .then((response) => {
      if (response.data.data.items.length !== 0) {
        let week =
          response.data.data.items[response.data.data.items.length - 1][
            "_week"
          ];
        res.status(200).send({
          data: response.data.data.items.filter(
            (item) => item["_week"] === week
          ),
          error: false,
        });
      } else {
        res.status(200).send({
          data: [],
          error: false,
        });
      }
    })
    .catch((err) => {
      res.status(400).send({
        error: true,
        data: err,
      });
    });
});

app.use(async (req, res) => {
  res.status(404).json({ message: "Topilmadi." });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`app is running ${process.env.PORT}`));
