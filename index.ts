import { Storage, Bucket } from '@google-cloud/storage';
import { Firestore } from '@google-cloud/firestore';
import sharp from 'sharp';
import primitive from 'primitive';
import SVGO from 'svgo';
import toSafeDataURI from 'mini-svg-data-uri';

const bucketName = process.env.BUCKET!;
const collection = process.env.COLLECTION!;
const thumbnailWidth = 256;
const thumbnailHeight = 256;

let bucket: Bucket, firestore: Firestore, svgOptimizer: SVGO;

/**
 * @param {!string} svg
 * @returns {Promise<string>}
 */
const optimize = async (svg: string): Promise<string> => {
  svgOptimizer = svgOptimizer || new SVGO({
    multipass: true,
    floatPrecision: 1,
  } as any);
  const { data } = await svgOptimizer.optimize(svg);
  return data;
};

/**
 * @param {!string} svg
 * @returns {string}
 */
const patchSVGGroup = (svg: string): string => {
  const gStartIndex = svg.match(/<path.*?>/)!.index! + svg.match(/<path.*?>/)![0].length;
  const gEndIndex = svg.match(/<\/svg>/)!.index;
  const svgG = `<g filter='url(#c)' fill-opacity='.5'>`;
  return `${svg.slice(0, gStartIndex)}${svgG}${svg.slice(gStartIndex, gEndIndex)}</g></svg>`;
};

/**
 * @param {!string} svg
 * @returns {string}
 */
const postProcess = (svg: string): string => {
  let blurStdDev = 12;
  let blurFilterId = 'b';
  let newSVG;

  if (svg.match(/<svg.*?><path.*?><g/) === null) {
    blurStdDev = 55;
    newSVG = patchSVGGroup(svg);
    blurFilterId = 'c';
  } else {
    newSVG = svg.replace(/(<g)/, `<g filter="url(#${blurFilterId})"`);
  }
  const filter = `<filter id="${blurFilterId}"><feGaussianBlur stdDeviation="${blurStdDev}"/></filter>`;
  const finalSVG = newSVG.replace(/(<svg)(.*?)(>)/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${thumbnailWidth} ${thumbnailHeight}">${filter}`);
  return toSafeDataURI(finalSVG);
};

/**
 * Triggered from a change to a Cloud Storage bucket.
 *
 * @param {!Object} file The Cloud Storage file.
 */
exports.generateThumbnail = async (file: FunctionData): Promise<void> => {
  bucket = bucket || new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  }).bucket(bucketName);
  firestore = firestore || new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });

  if (file.bucket !== bucketName) {
    return;
  }
  try {
    // We expect the file name to be the same as the ID of our project ID on Firestore
    const projectId = file.name.replace(/^.*[\\\/]/g, '').replace(/\.[^.]+$/g, '');
    console.log(`Generating thumbnail for '${projectId}'...`);
    const [buffer] = await bucket.file(file.name).download();
    const scaledBuffer = await sharp(buffer).resize(thumbnailWidth, thumbnailHeight).toBuffer();
    const model = await primitive({
      input: `data:${file.contentType};base64,${scaledBuffer.toString('base64')}`,
      numSteps: 8,
      shapeType: 'random',
    });
    const svg = model.toSVG();
    const optimizedSVG = await optimize(svg).then(postProcess);
    await firestore.collection(collection).doc(projectId).set({
      id: projectId,
      icon: `https://${bucketName}.storage.googleapis.com/${file.name}`,
      placeholder: optimizedSVG,
    });
  } catch (e) {
    console.error(e);
  }
};
