/* eslint-disable no-warning-comments */

const cache = require('../redis-cache/api');

const config = require("../config");
const utils = require("../utils");

const computeHash = (presentationId, componentId, username) => utils.hash(presentationId + componentId + username);

const loadPresentation = (presentationId, componentId, useDraft) => {
  const url = `${config.coreBaseUrl}/content/v0/presentation?id=${presentationId}&useDraft=${useDraft}`;

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
  })
  .then(presentation => {
    return processPresentation(presentation, componentId);
  });
};

const extractPresentationData = (presentation, componentId) => {
  const companyId = presentation.companyId;
  const data = JSON.parse(presentation.templateAttributeData || "{}");
  // TODO: account for empty {} by loading template blueprint
  const components = data.components || [];
  const component = components.find(comp => comp.id === componentId);
  const username = component ? component.username : null;
  const hash = computeHash(presentation.id, componentId, username);

  return {companyId, username, hash};
};

const processPresentation = (presentation, componentId) => {
  const {companyId, username} = extractPresentationData(presentation, componentId);

  if (!companyId) {
    return utils.validationErrorFor("Invalid companyId in Presentation");
  }

  if (!username) {
    return utils.validationErrorFor("Invalid username in Presentation");
  }

  return {companyId, username};
};

const getCachedPresentationData = (presentationId, componentId) => {
  return cache.getCompanyIdFor(presentationId)
  .catch(err => console.log("companyId cache get failed", err))
  .then(companyId => {
    return cache.getUsernameFor(presentationId, componentId)
    .catch(err => console.log("username cache get failed", err))
    .then(username => {
      if (companyId && username) {
        const hash = computeHash(presentationId, componentId, username);

        return {companyId, username, hash, cached: true};
      }

      throw Error();
    });
  });
};

const saveCachedPresentationData = (presentationId, componentId, companyId, username) => {
  return cache.saveCompanyId(presentationId, companyId)
  .then(() => {
    return cache.saveUsername(presentationId, componentId, username);
  })
  .catch(err => {
    console.log("Failed to save Presentation cache", err);
  });
};

const getPresentation = (presentationId, componentId, userHash, useDraft) => {
  return getCachedPresentationData(presentationId, componentId, userHash)
  .then(cachedPresentation => {
    if (cachedPresentation.hash === userHash) {
      return cachedPresentation;
    }

    throw Error();
  })
  .catch(() => {
    return loadPresentation(presentationId, componentId, useDraft);
  })
  .then(presentation => {
    const {companyId, username} = presentation;

    if (!presentation.cached) {
      return saveCachedPresentationData(presentationId, componentId, companyId, username)
      .then(() => presentation);
    }

    return presentation;
  });
};

module.exports = {
  getPresentation
};
