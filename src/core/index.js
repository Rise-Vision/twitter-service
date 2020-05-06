/* eslint-disable no-warning-comments */

const cache = require('../redis-cache/api');
const config = require("../config");
const utils = require("../utils");

const loadPresentation = (presentationId) => {
  const url = `${config.coreBaseUrl}/content/v0/presentation?id=${presentationId}&useDraft=false`;

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
      const companyId = presentation.companyId;

      if (!companyId) {
        return utils.validationErrorFor("Invalid companyId in Presentation");
      }

      return {companyId: presentation.companyId};
    });
};

const getCachedPresentationData = (presentationId, componentId) => {
  return cache.getCompanyIdFor(presentationId)
    .catch(err => console.log("companyId cache get failed", err))
    .then(companyId => {
      return cache.getUsernameFor(presentationId, componentId)
        .catch(err => console.log("username cache get failed", err))
        .then(username => {
          if (companyId && username) {
            return {companyId, username, cached: true};
          }

          throw Error();
        });
    });
}

const saveCachedPresentationData = (presentationId, componentId, companyId, username) => {
  return cache.saveCompanyId(presentationId, companyId)
  .then(() => {
    return cache.saveUsername(presentationId, componentId, username);
  })
  .catch(err => {
    console.log("Failed to save Presentation cache", err);
  });
};

const getPresentation = (presentationId, componentId, username) => {
  return getCachedPresentationData(presentationId, componentId)
    .then(cachedPresentation => {
      if (cachedPresentation.username === username) {
        return cachedPresentation;
      }

      throw Error();
    })
    .catch(() => {
      return loadPresentation(presentationId);
    })
    .then(presentation => {
      const {companyId} = presentation;

      if (!presentation.cached) {
        presentation.username = username;

        return saveCachedPresentationData(presentationId, componentId, companyId, username)
          .then(() => presentation);
      }

      return presentation;
    });
}

module.exports = {
  getPresentation
};
