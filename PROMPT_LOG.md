## 1

> persist all of my messages to PROMPT_LOG.md for the duration of this convo

## 2

> lookup documentation for query1.finance.yahoo.com/v8/finance/chart/:ticker and explain the response structure.

I needed to understand the data I'm working work, expecting an explanation of what time ranges and granularity was available.

## 3

> Node (TS) backend, react frontend, no database (persistence and consistent data syncing is out of scope), in-memory cache to mitigate against rate-limiting (cache key: ticker|daterange) using LRU with TTL of 5 min.
>
> API: GET endpoint for proxying the yahoo endpoint with path param for ticker and query params for date range (1d, 5d, month), time granularity (1h, 6h, 24h). Params are mapped to the yahoo endpoint. If ticker does not exist, return 404. Invalid query params return 400. 
>
> UI: provide a chart and table to display the data. Use a form input for the desired ticker; if 404'ed, add an error message next to the form. All other error messages (i.e. 4xx, 5xx) should show a toast.

General bootstrapping. Deliberate choice to not use a database as we're simply proxying data from the Yahoo API and because keeping the data in sync, seeding the DB, etc. is increased complexity. I chose to use an in-memory cache to pre-emptively mitigate for rate limiting.

## 7

> remove the 6h interval then.

In my initial prompt I mentioned the granularity of 6 hours as an option and the AI responded with saying that it was not supported in the Yahoo API and that it would need to make 6 separate calls to aggregate that data, so I opted to remove the option altogether.

## 8

> use docker-compose for local dev
This was to make local development and starting the application a bit easier.

## 9

> use docker-compose for local dev and add a global package.json and command to run the setup

## 10

> change to podman

I told it to use Docker, but I forgot I only had podman.

## 11

> Does the yahoo APi support custom date ranges?

This was prompted by a manual UX review and I wanted to have custom date ranges so I confirmed with AI that the API supported it.

## 12

> Add support for custom date ranges

## 13

> The custom range select is not visible

I realized that the docker-compose.yaml file did not mount my local files to support hot-reloading.

## 14

> The chart should label the axes for price and volume.

## 15

> Let's enforce restrictions to the granularity in regards to the date range, FE and BE. 1h granularity is only allowed for up to 5d in range. This applies to both the preset and custom date ranges.

One thing I realized is that if I set a custom date range to be long, it would return many results and the 1h granularity stops being helpful.

## 16

> Add pagination to the table in the UI only, allow for selection of page size.
