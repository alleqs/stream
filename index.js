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
  app.get("/stm", (_, res) =>
    res.sendFile(path.join(__dirname, "public", "index.html"))
  );
}

app.get("/stm/stream/:cam", (req, res) => {
  const { cam } = req.params;
  const url = cams[cam]?.url;
  if (!url) {
    res.status(404).send("Camera not found");
    return;
  }

  // Headers para compatibilidade com Safari
  //   res.contentType("video/x-matroska");
  res.setHeader("Content-Type", "video/x-matroska"); // Use um formato suportado como MP4
  res.setHeader("Transfer-Encoding", "chunked"); // Indica que é um fluxo contínuo
  res.setHeader("Accept-Ranges", "bytes");
  //   res.contentType("video/x-matroska");

  const cmd = url.startsWith("rtsp")
    ? //  ? ffmpeg(url).inputOptions("-rtsp_transport udp")
      ffmpeg(url).inputOptions("-rtsp_transport udp")
    : ffmpeg(url);
  cmd
    //  .format("matroska")
    .format("matroska") // MP4 para compatibilidade com Safari
    //  .videoCodec("libx264") // Codificação padrão para Safari
    //  .audioCodec("aac") // Codificação de áudio
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
      console.log("res. :>> ", video_details.at(-5));
      console.log("fps :>> ", video_details.at(-4));
      console.log("");
    })
    .on("end", () => {
      console.log("end");
      return res.end();
    });

  return cmd.pipe(res, { end: true });
});

app.get("/stm/cams", (_, res) => {
  res.json({ camInfoArr: cams.map(({ url, ...rest }) => rest) });
});

app.get("/stm/ping", (_, res) => res.send("pong !!"));

app.listen(port, () =>
  console.log(`Video stream app listening on port ${port}!`)
);
