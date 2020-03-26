const config = require("../config");
const utils = require("../utils");

const loadPresentation = presentationId => {
  const url = `${config.coreBaseUrl}/content/v0/presentation?id=${presentationId}`;

  return utils.fetch(url)
  .then(resp => {
    if (resp.ok) {
      return resp.json();
    }

    throw Error(resp.statusText);
  })
  .then(resp => {
    if (resp.items && resp.items.length > 0) {
      return resp.items[0];
    }

    throw Error("Invalid response");
  });
};

const getPresentation = (presentationId, componentId) => {
  return loadPresentation(presentationId)
  .then(presentation => {
    const companyId = presentation.companyId;
    const data = JSON.parse(presentation.templateAttributeData || "{}");
    const components = data.components || [];
    const component = components.find(comp => comp.id === componentId);
    const username = component ? component.username : null;

    if (!companyId) {
      return utils.validationErrorFor("Invalid companyId in Presentation");
    }

    if (!username) {
      return utils.validationErrorFor("Invalid username in Presentation");
    }

    return {companyId, username};
  });
};

module.exports = {
  getPresentation
};
