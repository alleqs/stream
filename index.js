import express from "express";
import path from "path";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

console.log("process.env.PORT :>> ", process.env.PORT);
const port = process.env.PORT ?? 8000;
const __dirname = dirname(fileURLToPath(import.meta.url));
console.log("__dirname :>> ", __dirname);

const json = readFileSync("./urls.json");
const cams = JSON.parse(json);

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, "./public")));

if ((process.env.NODE_ENV = "development")) {
  app.get("/api", (_, res) =>
    res.sendFile(path.join(__dirname, "public", "index.html"))
  );
}

app.get("/api/stream/:cam", (req, res) => {
  const { cam } = req.params;
  console.log("cam :>> ", cam);
  // res.setHeader("content-type", "video/x-flv");
  // const stat = fs.statSync(filePath);
  // res.setHeader("content-length", stat.size);
  // const fileStream = fs.createReadStream(filePath);
  // fileStream.on("error", error => handleError(error, res));
  // fileStream.pipe(res)

  // res.setHeader("content-type", "video/x-flv");
  const url = cams[cam]?.url;
  if (!url) return res.end();

  res.contentType("video/mp4");
  const cmd = url.startsWith("rtsp")
    ? ffmpeg(url).inputOptions("-rtsp_transport tcp")
    : ffmpeg(url);
  cmd
    .format("matroska")
    .on("start", (commandLine) => {
      console.log("Spawned Ffmpeg with command: " + commandLine);
    })
    .on("error", (err, stdout, stderr) => {
      // console.log("error on cam", cam);
      console.error("error: " + err.message + "on cam " + cam);
      cmd.kill();
      return res.end();
    })
    .on("codecData", ({ format, video, video_details }) => {
      console.log("format :>> ", format);
      console.log("video :>> ", video);
      console.log("res :>> ", video_details.at(-5));
      console.log("fps :>> ", video_details.at(-4));
      console.log("");
    })
    .on("end", () => {
      console.log("end");
    });

  return cmd.pipe(res, { end: true });
});

app.get("/api/cams", (_, res) => {
  res.json({ camInfoArr: cams.map(({ url, ...rest }) => rest) });
});

app.get("/api/ping", (_, res) => res.send("pong !!"));

app.listen(port, () =>
  console.log(`Video stream app listening on port ${port}!`)
);
