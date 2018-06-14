const Storage = require('@google-cloud/storage');
const Datastore = require('@google-cloud/datastore');

let storage, datastore;

/**
 * Triggered from a change to a Cloud Storage bucket.
 *
 * @param {!Object} file The Cloud Storage file.
 * @param {!Object} context The context object for the event.
 */
exports.generateThumbnail = async (file, context) => {
  storage = storage || new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });
  datastore = datastore || new Datastore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });

  try {
    // We expect the file name to be the same as the ID of our project ID on Datastore
    const projectId = file.name.replace(/^.*[\\\/]/g, '').replace(/\.[^.]+$/g, '');
    // const [buffer] = await file.download();
    console.log(`Generating thumbnail for '${projectId}'...`);
    console.log('File: ', file, '\nClass: ', file.constructor.name);
    // TODO: generate the thumbnail using sqip or node-primitive
  } catch (e) {
    console.error(e);
  }
};
