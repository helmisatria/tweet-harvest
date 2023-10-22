import { ENABLE_EXPONENTIAL_BACKOFF } from "../env";

// base timeout is 1 minute.
const baseTimeout = 60_000;

// maximum timeout is 10 minutes.
const maximumTimeout = 600_000;

// ratio of the exponent function.
// Set the ratio to 2 to achieve odd number of timeout multiplication
// e.g. baseTimeout, 3 * baseTimeout, 5 * baseTimeout, etc
const ratio = 2;

// calculateForRateLimit will return how long the apps should wait until try again
// when met a rate limit error.
// Attempt start with `0`
export const calculateForRateLimit = (attempt: number): number => {
    // return base timeout if disabled
    if (!ENABLE_EXPONENTIAL_BACKOFF) {
        return baseTimeout;
    }

    const timeout = ratio * attempt * baseTimeout + baseTimeout;

    // if timeout exceed maximum, return the maximum timeout
    return timeout > maximumTimeout
        ? maximumTimeout
        : timeout;
}
