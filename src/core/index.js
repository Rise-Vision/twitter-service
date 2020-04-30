/* eslint-disable no-warning-comments */

const cache = require('../redis-cache/api');
const blueprint = require('../blueprint')
const config = require("../config");
const utils = require("../utils");

const computeHash = (presentationId, componentId, username) => utils.hash(presentationId + componentId + username);

const loadPresentationWithoutDraft = (presentationId) => {
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
  const components = data.components || [];
  const component = components.find(comp => comp.id === componentId);
  const username = component ? component.username : null;

  return {companyId, username};
};

const processPresentation = (presentation, componentId) => {
  const {companyId, username} = extractPresentationData(presentation, componentId);

  if (!companyId) {
    return utils.validationErrorFor("Invalid companyId in Presentation");
  }

  if (!username) {
    return blueprint.load(presentation.productCode)
      .then(blueprintData => {
        const blueprintUsername = blueprint.extractUsername(blueprintData, componentId);

        if (!blueprintUsername) {
          return utils.validationErrorFor("Invalid username in Presentation");
        }

        return {companyId, username: blueprintUsername};
      });
  }

  return {companyId, username};
};

const getCachedPresentationDataWithoutHash = (presentationId, componentId) => {
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

const getPresentationWithoutHash = (presentationId, componentId, username) => {
  return getCachedPresentationDataWithoutHash(presentationId, componentId)
    .then(cachedPresentation => {
      if (cachedPresentation.username === username) {
        return cachedPresentation;
      }

      throw Error();
    })
    .catch(() => {
      return loadPresentationWithoutDraft(presentationId);
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
  getPresentation,
  getPresentationWithoutHash
};
