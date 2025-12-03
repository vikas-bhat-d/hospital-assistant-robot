const faceapi = require('@vladmandic/face-api');
const { Canvas, Image, ImageData } = require('canvas');
const path = require('path');

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;

  const modelPath = path.join(__dirname, '../models');

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

  modelsLoaded = true;
}

async function getFaceEmbedding(buffer) {
  await loadModels();
  const img = await faceapi.bufferToImage(buffer);

  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return Array.from(detection.descriptor);
}

module.exports = { getFaceEmbedding, loadModels };
