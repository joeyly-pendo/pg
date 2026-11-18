export class TickerNotFoundError extends Error {
  constructor(ticker: string) {
    super(`Ticker not found: ${ticker}`);
  }
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
