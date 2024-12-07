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

  const url = cams[cam]?.url;
  if (!url) return res.end();

  const options = {};

  let start;
  let end;

  const range = req.headers.range;
  if (range) {
    const bytesPrefix = "bytes=";
    if (range.startsWith(bytesPrefix)) {
      const bytesRange = range.substring(bytesPrefix.length);
      const parts = bytesRange.split("-");
      if (parts.length === 2) {
        const rangeStart = parts[0] && parts[0].trim();
        if (rangeStart && rangeStart.length > 0) {
          options.start = start = parseInt(rangeStart);
        }
        const rangeEnd = parts[1] && parts[1].trim();
        if (rangeEnd && rangeEnd.length > 0) {
          options.end = end = parseInt(rangeEnd);
        }
      }
    }
  }

  res.contentType("video/x-matroska");

  if (req.method === "HEAD") {
    res.statusCode = 200;
    res.setHeader("accept-ranges", "bytes");
    // res.setHeader("content-length", contentLength);
    res.end();
  } else {
    // let retrievedLength;
    // if (start !== undefined && end !== undefined) {
    //   retrievedLength = end + 1 - start;
    // } else if (start !== undefined) {
    //   retrievedLength = contentLength - start;
    // } else if (end !== undefined) {
    //   retrievedLength = end + 1;
    // } else {
    //   retrievedLength = contentLength;
    // }

    res.statusCode = start !== undefined || end !== undefined ? 206 : 200;

    // res.setHeader("content-length", retrievedLength);

    if (range !== undefined) {
      res.setHeader(
        "content-range",
        `bytes ${start || 0}-${end || contentLength - 1}/${contentLength}`
      );
      res.setHeader("accept-ranges", "bytes");
    }

    //   res.contentType("video/mp4");
    const cmd = url.startsWith("rtsp")
      ? ffmpeg(url).inputOptions("-rtsp_transport udp")
      : ffmpeg(url);
    cmd
      .format("matroska")
      .on("start", (commandLine) => {
        console.log("Spawned Ffmpeg with command: " + commandLine);
      })
      .on("error", (err, stdout, stderr) => {
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
  }
});

app.get("/api/cams", (_, res) => {
  res.json({ camInfoArr: cams.map(({ url, ...rest }) => rest) });
});

app.get("/api/ping", (_, res) => res.send("pong !!"));

app.listen(port, () =>
  console.log(`Video stream app listening on port ${port}!`)
);
