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
  const url = cams[cam][0];
  if (!url) return res.end();

  res.contentType("video/mp4");
  const cmd = url.startsWith("rtsp")
    ? ffmpeg(url).inputOptions("-rtsp_transport tcp")
    : ffmpeg(url);
  //   return (
  cmd
    .format("matroska")
    .on("start", (commandLine) => {
      console.log("Spawned Ffmpeg with command: " + commandLine);
    })
    .on("error", (err, stdout, stderr) => {
      console.log("error on cam", cam);
      console.error("error: " + err.message);
      return res.end();
    })
    .on("codecData", ({ format, video, video_details }) => {
      console.log("format :>> ", format);
      console.log("video :>> ", video);
      //   console.log("a :>> ", video_details);
      console.log("res :>> ", video_details.at(-5));
      console.log("fps :>> ", video_details.at(-4));
      console.log("");
      //   console.log("a :>> ", a);
    })
    //  .on("end", () => {
    //    console.log("end");
    //  })
    .pipe(res, { end: true });
  //   );
});

app.get("/api/cams", (_, res) => {
  res.json({ camDescrArr: cams.map(([_, descr, ar]) => [descr, ar]) });
});

app.get("/api/ping", (_, res) => res.send("pong !!"));

// app.get("/api/cams-amount", (_, res) => {
//   res.json({ camsAmount: cams.length });
// });

app.listen(port, () =>
  console.log(`Video stream app listening on port ${port}!`)
);

// function handleError(error, res){
//   console.log(`Error reading file ${filePath}.`);
//   console.log(error);
//   res.sendStatus(500);
// }

// const command =
//    ffmpeg('/media/leo/Repo/repo/python/yolov8_2/out.mp4')
//    .format('flv');
//   //  ffmpeg('rtsp://admin:123456@192.168.0.74/11')
//   //   .inputOptions('-rtsp_transport tcp')
//     // .format('matroska');

// command.on('start', function (commandLine) {
//    console.log('Spawned Ffmpeg with command: ' + commandLine);
//  })
//   .on('error', function (err, stdout, stderr) {
//    console.log('error: ' + err.message);
//    console.log('stdout: ' + stdout);
//    console.log('stderr: ' + stderr);
//  })
//  .on('end',  function () {
//     console.log('end');
//  });

// const ffstream = command.pipe();
// ffstream.on('data', chunk => {
//   console.log('ffmpeg chunk length: ' + chunk.length + ' bytes');
// });
