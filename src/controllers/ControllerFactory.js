/* eslint-disable */

const factory = {
  mappings: {},
  register(obj) {
    this.mappings[obj.name] = obj;
  },
  find(key) {
    return this.mappings[key];
  },
};

export default factory;
