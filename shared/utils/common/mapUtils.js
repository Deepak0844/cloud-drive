/**
 * Function which converts array to Map
 * arrayObj ==> [{"id":1, "value":"value1"},{"id":2, "value":"value2"},{"id":3, "value":"value3"}]
 * objectKey ==> "id"
 * 
 * convertedMap ==> {
  '1': { id: 1, value: 'value1' },
  '2': { id: 2, value: 'value2' },
  '3': { id: 3, value: 'value3' }
}
 * @param {Object} arrayObj 
 * @param {Number} objectKey 
 * @returns 
 */
function convertArrayToMap(arrayObj = [], objectKey) {
  return arrayObj.reduce((acc, object) => {
    const objectKeyValue = object[objectKey];
    acc[objectKeyValue] = object;
    return acc;
  }, {});
}

/**
 * Converts an object map to an array of select options.
 * @param {Object} map - The input object .
 * @param {string} valueKey - The key to use as the value.
 * @param {string} labelKey - The key to use as the label.
 * @returns {Array} - Array of { value, label } objects.
 */
function getOptionsList(map = {}, valueKey = "", labelKey = "") {
  const items = Object.values(map);

  return items.map((item = {}) => ({
    value: item[valueKey] || "",
    label: item[labelKey] || "",
  }));
}

/**
 * To Convert from Array of Objects to Objects (key: array)
 * [{name: 'a'}, {name:'b'}] => {name: ['a', 'b']}
 * @param {Array} : Array of Object
 * @returns
 */
function getArrayMap(array = []) {
  const result = {};
  array.forEach((obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(value);
    }
  });
  return result;
}

const MapUtils = { convertArrayToMap, getOptionsList, getArrayMap };

export default MapUtils;
