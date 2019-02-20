const Storage = require('@google-cloud/storage');
const Datastore = require('@google-cloud/datastore');
const sharp = require('sharp');
const primitive = require('primitive');
const SVGO = require('svgo');
const toSafeDataURI = require('mini-svg-data-uri');

const bucketName = process.env.BUCKET;
const kind = process.env.KIND;

let bucket, datastore, svgOptimizer;

/**
 * @param {!string} svg
 * @returns {Promise<string>}
 */
const optimize = (svg) => {
  svgOptimizer = svgOptimizer || new SVGO({
    multipass: true,
    floatPrecision: 1,
  });
  return svgOptimizer.optimize(svg).then(({ data }) => data);
};

/**
 * @param {!string} svg
 * @returns {string}
 */
const patchSVGGroup = (svg) => {
  const gStartIndex = svg.match(/<path.*?>/).index + svg.match(/<path.*?>/)[0].length;
  const gEndIndex = svg.match(/<\/svg>/).index;
  const svgG = `<g filter='url(#c)' fill-opacity='.5'>`;
  return `${svg.slice(0, gStartIndex)}${svgG}${svg.slice(gStartIndex, gEndIndex)}</g></svg>`;
};

/**
 * @param {!string} svg
 * @returns {string}
 */
const postProcess = (svg) => {
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
  const finalSVG = newSVG.replace(/(<svg)(.*?)(>)/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${filter}`);
  return toSafeDataURI(finalSVG);
};

/**
 * Triggered from a change to a Cloud Storage bucket.
 *
 * @param {!Object} file The Cloud Storage file.
 */
exports.generateThumbnail = async (file) => {
  bucket = bucket || new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  }).bucket(bucketName);
  datastore = datastore || new Datastore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });

  if (file.bucket !== bucketName) {
    return;
  }
  try {
    // We expect the file name to be the same as the ID of our project ID on Datastore
    const projectId = file.name.replace(/^.*[\\\/]/g, '').replace(/\.[^.]+$/g, '');
    console.log(`Generating thumbnail for '${projectId}'...`);
    const [buffer] = await bucket.file(file.name).download();
    const scaledBuffer = await sharp(buffer).resize(256, 256).toBuffer();
    const model = await primitive({
      input: `data:${file.contentType};base64,${scaledBuffer.toString('base64')}`,
      numSteps: 8,
      shapeType: 'random',
    });
    const svg = model.toSVG();
    const optimizedSVG = await optimize(svg).then(postProcess);
    const key = datastore.key([kind, projectId]);
    await datastore.save({
      key,
      data: [
        {
          name: 'id',
          value: projectId,
        },
        {
          name: 'icon',
          value: `https://${bucketName}.storage.googleapis.com/${file.name}`,
          excludeFromIndexes: true,
        },
        {
          name: 'placeholder',
          value: optimizedSVG,
          excludeFromIndexes: true,
        },
      ],
    });
  } catch (e) {
    console.error(e);
  }
};
