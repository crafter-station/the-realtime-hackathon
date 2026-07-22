import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/video/index.ts");
Config.setChromiumOpenGlRenderer("angle");
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(16);
