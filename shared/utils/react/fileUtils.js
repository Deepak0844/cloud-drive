/**
 * Saves data as a file with the fileName
 * @param {String} fileName
 * @param {String} data
 * @returns {void}
 */
function saveFile(fileName = "", data = "") {
  const link = document.createElement("a");
  link.target = "_blank";
  link.download = fileName;
  link.href = URL.createObjectURL(data);
  link.click();
}

/**
 * Based on the imageType the data is stored with the fileName
 * @param {String} fileName
 * @param {String} imageType
 * @param {String} data
 * @returns {void}
 */
function saveImageFile(fileName = "", imageType = "", data = "") {
  const link = document.createElement("a");
  link.target = "_blank";
  link.download = fileName;
  link.href = URL.createObjectURL(new Blob([data], { type: `image/${imageType}` }));
  link.click();
}

/**
 * Based on the fileType the data is stored as excel / csv with the fileName
 * @param {String} fileType - SPREADSHEET / CSV
 * @param {String} fileName
 * @param {String} data
 * @returns {void}
 */
function saveFileAsExcelOrCsv(fileType = "", fileName = "", data = "") {
  const link = document.createElement("a");
  link.target = "_blank";
  link.download = fileName;
  link.href = URL.createObjectURL(
    new Blob([data], {
      type: fileType === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  );
  link.click();
}

/**
 * Select File from Local
 * @param {Boolean} isMultiSelect
 * @param {Array} fileExtensions
 * @returns
 */
function selectFile(isMultiSelect = false, fileExtensions = []) {
  return new Promise((resolve) => {
    function handleFileSelect(e) {
      const file = e.target.files;
      resolve(file);
    }

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = isMultiSelect;
    if (fileExtensions && fileExtensions.length) {
      input.accept = fileExtensions.join(",");
    }
    input.onchange = handleFileSelect;
    input.click();
  });
}

const FileUtils = {
  //
  saveFile,
  saveImageFile,
  saveFileAsExcelOrCsv,

  //
  selectFile,
};

export default FileUtils;
