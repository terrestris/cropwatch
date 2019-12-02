import Papa from 'papaparse';
import JsZip from 'jszip';

/**
 * Helper Class for file handling.
 *
 * @class
 */
export class FileHandling {

  static async parseCsv(file, config) {
    const parserConfig = {
      // dynamicTyping: true,
      header: true,
      trimHeaders: true,
      skipEmptyLines: true,
      ...config
    };

    return new Promise((resolve, reject) => {
      parserConfig.complete = (results, file) => {
        resolve(results, file);
      };
      parserConfig.error = (error, file) => {
        reject(error, file);
      };
      Papa.parse(file, parserConfig);
    });
  }

  static async validateImportFile(file, format = '', category = 'tractor') {
    const zipFile = await JsZip.loadAsync(file);
    const fileNames = Object.keys(zipFile.files);
    let hasRequiredFiles = {
      shp: false,
      dbf: false,
      shx: false,
      image: false
    };
    let valid = true;
    let message = '';
    const imageFormat = format.toLowerCase();

    if (category === 'tractor') {
      fileNames.forEach(fileName => {
        if(fileName.includes('/')){
          valid = false;
          message = 'Zip contains subfolders!';
        }
        if (fileName.endsWith('.shp')) {
          hasRequiredFiles.shp = true;
        }
        if (fileName.endsWith('.dbf')) {
          hasRequiredFiles.dbf = true;
        }
        if (fileName.endsWith('.shx')) {
          hasRequiredFiles.shx = true;
        }
        if (fileName.endsWith(`.${imageFormat}`)) {
          hasRequiredFiles.image = true;
        }
      });
      Object.keys(hasRequiredFiles).forEach(requiredKey => {
        const value = hasRequiredFiles[requiredKey];
        if (!value) {
          valid = false;
          const fileEnd = requiredKey === 'image' ? `.${imageFormat}` : requiredKey;
          message += `Zip doesn't contain any "${fileEnd}" file.`;
        }
      });
    } else {
      if (fileNames.length !== 1 || !fileNames[0].endsWith('tif')) {
        valid = false;
        message = 'Zip has to contain exactly one *.tif(f) file.';
      }
    }

    return {valid, message};

  }

}

export default FileHandling;
