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
  const url = cams[cam]?.url;

  if (!url) {
    res.status(404).send("Camera not found");
    return;
  }

  // Headers para compatibilidade com Safari
  res.setHeader("Content-Type", "video/mp4"); // Use um formato suportado como MP4
  res.setHeader("Transfer-Encoding", "chunked"); // Indica que é um fluxo contínuo
  res.setHeader("Accept-Ranges", "bytes");

  const cmd = url.startsWith("rtsp")
    ? ffmpeg(url)
        .inputOptions([
          "-rtsp_transport tcp",
          //   "-movflags frag_keyframe+empty_moov",
        ]) // TCP é mais estável para Safari
        .outputOptions(["-c copy", "-movflags frag_keyframe+empty_moov"])
    : ffmpeg(url);

  cmd
    .format("mp4") // MP4 para compatibilidade com Safari
    .videoCodec("libx264") // Codificação padrão para Safari
    .audioCodec("aac") // Codificação de áudio

    .on("start", (commandLine) => {
      console.log("Spawned Ffmpeg with command: " + commandLine);
    })
    .on("error", (err) => {
      console.error("Error with FFMPEG:", err.message);
      res.end();
    })
    .on("end", () => {
      console.log("Stream ended");
      res.end();
    });

  cmd.pipe(res, { end: true });
});

app.get("/api/cams", (_, res) => {
  res.json({ camInfoArr: cams.map(({ url, ...rest }) => rest) });
});

app.get("/api/ping", (_, res) => res.send("pong !!"));

app.listen(port, () =>
  console.log(`Video stream app listening on port ${port}!`)
);
