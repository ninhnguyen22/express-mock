export const isFunction = (functionToCheck) => {
  const getType = {};
  return (
    functionToCheck &&
    getType.toString.call(functionToCheck) === '[object Function]'
  );
};

export const isObject = (objectToCheck) => {
  return (
    objectToCheck &&
    Object.prototype.toString.call(objectToCheck) === '[object Object]'
  );
};

export const isArray = (arrayToCheck) => {
  return (
    arrayToCheck &&
    Object.prototype.toString.call(arrayToCheck) === '[object Array]'
  );
};

export const isString = (stringToCheck) => {
  return (
    stringToCheck &&
    Object.prototype.toString.call(stringToCheck) === '[object String]'
  );
};