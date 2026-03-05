/**
 * Options for API get/post/put/del that extend RequestInit with retry and timeout.
 */
export interface ApiRequestOptions extends RequestInit {
  retries?: number;
  timeout?: number;
}
