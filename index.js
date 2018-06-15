const Storage = require('@google-cloud/storage');
const Datastore = require('@google-cloud/datastore');
const primitive = require('primitive');

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
    const svg = await primitive({
      input: `data:${file.contentType};base64,${buffer.toString('base64')}`,
      numSteps: 8,
      shapeType: 'random',
    });
    console.log(svg);
  } catch (e) {
    console.error(e);
  }
};
