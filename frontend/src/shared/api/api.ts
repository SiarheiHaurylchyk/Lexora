import { env } from '../config/env';

import { api } from './api-legacy';
import {
  createApiClient,
  QueryInputType,
  RequestType,
} from './createApiClient';

export const $api = api;

const { mutation, query } = createApiClient(
  { baseURL: env.NEXT_PUBLIC_API_URL },
  { axiosInstance: api },
);

export { mutation, query, type QueryInputType, RequestType };
