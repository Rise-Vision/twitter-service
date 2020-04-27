const config = require("../config");
const utils = require("../utils");

const load = (productCode) => {
  const url = config.coreBlueprintUrl.replace('PRODUCT_CODE', productCode);

  return utils.fetch(url)
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      }

      throw Error(resp.statusText);
    })
    .then(blueprint => {
      return blueprint;
    });
}

const extractUsername = (blueprint, componentId) => {
  const components = blueprint.components || [];
  const component = components.find(comp => comp.id === componentId);
  const attributes = component.attributes || "{}";

  return attributes.username ? attributes.username.value : null;
}

module.exports = {
  extractUsername,
  load
};
