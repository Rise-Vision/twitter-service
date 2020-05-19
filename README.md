# Rise Vision Twitter Service [![CircleCI](https://circleci.com/gh/Rise-Vision/twitter-service/tree/master.svg?style=svg)](https://circleci.com/gh/Rise-Vision/twitter-service/tree/master) [![Coverage Status](https://coveralls.io/repos/github/Rise-Vision/twitter-service/badge.svg?branch=master)](https://coveralls.io/github/Rise-Vision/twitter-service?branch=master)

## Introduction
The Rise Vision Twitter Service verifies user credentials and retrieves tweets of a given user.

### Environments
- **Production:** https://services.risevision.com/twitter/
- **Staging:** https://services-stage.risevision.com/twitter/

### Endpoints

#### verify-credentials 
- Expects one required query param `companyId`. 
- Retrieves Twitter credentials for the given company id from Oauth Token Provider GKE/Redis DB. See [oauth-token-provider](https://github.com/Rise-Vision/oauth-token-provider) for more details on its purpose. 
- Invokes Twitter API verification call to check if credentials are still valid. See Twitter API endpoint [account/verify_credentials](https://developer.twitter.com/en/docs/accounts-and-users/manage-account-settings/api-reference/get-account-verify_credentials) for more details. 
- Sends response with credentials verification outcome.

#### get-tweets-secure
- Expects required query params `presentationId`, `componentId` and an encrypted `username`. Accepts further optional param `count`.
- Retrieves `companyId` from Core with given `presentationId`.
- Verifies credentials via `verify-credentials` endpoint.
- Decrypts given username value
- Checks for cached data and sends response, or if no cached data or it has expired, requests 100 tweets from Twitter API starting from last valid requested tweet id. See Twitter API endpoint [statuses/user_timeline](https://developer.twitter.com/en/docs/tweets/timelines/api-reference/get-statuses-user_timeline) for more details on retrieving tweets.
- Applies custom formatting to tweet data
- Saves the tweets in cache, and sets expiration of 4 hours.
- Sends response with tweets, ensuring to include `Cache-control` header that sets `max-age` with expiration date. Only sends the number of tweets specified from `count` query param, otherwise defaults on sending 25 tweets. 

## Built With
- [npm](https://www.npmjs.org)
- [NodeJS](https://nodejs.org/en/)
- [ExpressJS](https://expressjs.com/)
- [Redis](https://redis.js.org/)
- [Twitter](https://www.npmjs.com/package/twitter)
- [JSEncrypt](https://www.npmjs.com/package/jsencrypt)

## Development

### Local Development

Clone this repo and change into this project directory.

Execute the following commands in Terminal:

```
npm install
```

### Run Local
Due to the necessity of verifying credentials of a company and subsequent dependence on Oauth Token Provider GKE Redis DB, running locally and testing either endpoint is not possible. 

However, you can simply test that the server starts up correctly. You will need to have a Redis server installed and running before running the Twitter Service. See this [article](https://tableplus.com/blog/2018/10/how-to-start-stop-restart-redis.html) for help on start/stopping a local redis server.

Then you can start the server with the following in Terminal:
```
npm run dev
```

After that you can see it running under http://localhost:8080/twitter/

### Testing
Execute the following command in Terminal to run tests:

```
npm run test
```

## Submitting Issues
If you encounter problems or find defects we really want to hear about them. If you could take the time to add them as issues to this Repository it would be most appreciated. When reporting issues please use the following format where applicable:

**Reproduction Steps**

1. did this
2. then that
3. followed by this (screenshots / video captures always help)

**Expected Results**

What you expected to happen.

**Actual Results**

What actually happened. (screenshots / video captures always help)

## Contributing
All contributions are greatly appreciated and welcome! If you would first like to sound out your contribution ideas please post your thoughts to our [community](http://community.risevision.com), otherwise submit a pull request and we will do our best to incorporate it

### Suggested Contributions
- *we need this*
- *and we need that*
- *we could really use this*
- *and if we don't already have it (see above), we could use i18n Language Support*

## Resources
If you have any questions or problems please don't hesitate to join our lively and responsive community at http://community.risevision.com.

If you are looking for user documentation on Rise Vision please see http://www.risevision.com/help/users/

If you would like more information on developing applications for Rise Vision please visit http://www.risevision.com/help/developers/.

**Facilitator**

[Stuart Lees](https://github.com/stulees "Stuart Lees")
