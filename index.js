const Storage = require('@google-cloud/storage');
const Datastore = require('@google-cloud/datastore');
const { generateSVG } = require('node-primitive/src/api');
const { Triangle, Ellipse, Rectangle, Polygon } = require('node-primitive/src/shape');

const bucketName = 'dabolus-bucket';
let bucket, datastore;

/**
 * Triggered from a change to a Cloud Storage bucket.
 *
 * @param {!Object} file The Cloud Storage file.
 * @param {!Object} context The context object for the event.
 */
exports.generateThumbnail = async (file, context) => {
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
    const svg = await generateSVG(buffer, {
      computeSize: 512,
      width: 512,
      height: 512,
      viewSize: 512,
      shapeTypes: [Triangle, Ellipse, Rectangle, Polygon],
      blur: 12,
      shapes: 8,
    });
    console.log(svg);
  } catch (e) {
    console.error(e);
  }
};
