const express = require("express");
const app = express();
const multer = require("multer");
const fs  = require("fs");
const fsExtra = require("fs-extra");
const path = require("path");

app.use(express.static("uploads"));
app.use(express.static("exports"));
app.use(express.static("static"));

// multer uploading
let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + "/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// python script
const runPy = function () {
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");
    const py = spawn("python", ["main.py"]);

    py.stdout.on("data", function (data) {
      console.log("data from py: ", data);
      resolve(data.toString("utf-8"));
    });

    py.stderr.on("data", function (data) {
      console.log("error from py: ", data);
      reject(data.toString("utf-8"));
    });
  });
};

// remove files not in .xlsx format
const rmNotXlsxFiles = function (dir) {
  return new Promise((resolve, reject) => {
    const files = fs.readdirSync(__dirname + "/uploads");

    files.forEach((file) => {
      if (!file.endsWith(".xlsx")) {
        const filePath = path.join(__dirname + "/uploads", file);

        if (fs.lstatSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    });

    transferFiles(dir);

    resolve(true);
    reject(false);
  });
};

// transfer files from uploads folder to queuefiles folder
const transferFiles = (dir) => {
  const srcDirPath = __dirname + "/uploads";

  const destDirPath = __dirname + "/queuefiles";

  const files = fs.readdirSync(destDirPath);

  files.forEach((file) => {
    if (file) {
      const filePath = path.join(destDirPath, file);

      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
  });

  fs.readdirSync(srcDirPath).forEach((filename) => {
    const srcFilePath = path.join(srcDirPath, filename);
    const destFilePath = path.join(destDirPath, filename);

    fsExtra
      .copy(srcFilePath, destFilePath)
      .then(() => {
        fs.unlinkSync(srcFilePath);
      })
      .catch((err) => console.error(`Error moving ${filename}:`, err));
  });
}

// delete files in a folder
const delFiles = (fname) => {
  return new Promise((resolve, reject) => {
    const files = fs.readdirSync(__dirname + fname);
  
    files.forEach((file) => {
      const filePath = path.join(__dirname + fname, file);
  
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    });

    resolve(true);
    reject(false);
  })
}


// get routes
app.get("/", (req, res) => {
  try {
    res.sendFile(__dirname + "/static/index.html");
  } catch (err) {
    console.log(err);
  }
});

app.get("/providefiles", (req, res) => {
  try {
    res.sendFile(__dirname + "/static/provide_files.html");
  } catch (err) {
    console.log(err);
  }
});

app.get('/filescompiled', async (req, res) => {
  try {
    await rmNotXlsxFiles();
    res.sendFile(__dirname + "/static/yfam.html");
  } catch (err) {
    console.log(err);
  }
})

app.get("/mergesuccessful", (req, res) => {
  try {
    res.sendFile(__dirname + "/static/merge_successful.html");
  } catch (err) {
    console.log(err);
  }
});

app.get("/mergeunsuccessful", (req, res) => {
  try {
    res.sendFile(__dirname + "/static/merge_unsuccessful.html");
  } catch (err) {
    console.log(err);
  }
});

app.get("/downloadmerged", (req, res) => {
  try {
    const uploadFilesArray = fs.readdirSync(__dirname + "/exports");

    if (uploadFilesArray.length === 0) {
      return res.sendFile(__dirname + "/static/noexports.html");
    }

    const filePath = path.resolve(
      __dirname + "/exports/merged.csv"
    );
    res.download(filePath);
  } catch (err) {
    console.log(err);
  }
});
app.get("/downloadinvalid", (req, res) => {
  try {

    const uploadFilesArray = fs.readdirSync(__dirname + "/exports");

    if (uploadFilesArray.length === 0) {
      return res.sendFile(__dirname + "/static/noexports.html");
    }

    const filePath = path.resolve(
      __dirname + "/exports/invalid.csv"
    );
    res.download(filePath);
  } catch (err) {
    console.log(err);
  }
});
app.get("/downloadtemplatefile", (req, res) => {
  try {
    const filePath = path.resolve(
      __dirname + "/maintable/template.xlsx"
    );
    res.download(filePath);
  } catch (err) {
    console.log(err);
  }
});

// post routes
app.post("/compile", upload.array("files", 100), async (req, res) => {
  try {
    res.redirect('/filescompiled');
  } catch (e) {
    console.error("Error during script execution ", e.stack);
  }
}, (err, req, res, next) => {
    console.error(err);
    res.sendFile(__dirname + '/static/uoutohf.html');
});

app.post("/compare", async (req, res) => {
  try {
    const uploadFilesArray = fs.readdirSync(__dirname + "/queuefiles");

    if (uploadFilesArray.length === 0) {
      return res.redirect("/providefiles");
    } else {
      await delFiles("/exports");
      await runPy();

      const exportFilesArray = fs.readdirSync(__dirname + "/exports");

      if (exportFilesArray.includes("invalid.csv")) {
        res.redirect("/mergeunsuccessful");
      } else {
        res.redirect("/mergesuccessful");
      }

      res.redirect("/");
    }
  } catch (e) {
    console.log(e);
  }
});


app.post("/clearuploads", async (req, res) => {
  try {
    await delFiles('/queuefiles');

    res.redirect('/');
  } catch (err) {
    console.log(err);
  }
});
app.post("/clearexports", async (req, res) => {
  try {
    await delFiles("/exports");

    res.redirect('/');
  } catch (err) {
    console.log(err);
  }
});

// no
app.all("*", function (req, res) {
  res.sendFile(__dirname + "/static/404.html");
});

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log("running on PORT 8000");
});
