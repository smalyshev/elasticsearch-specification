/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { RequestBase } from '@_types/Base'
import { Id } from '@_types/common'
import { integer } from '@_types/Numeric'

/**
 * Get data frame analytics job configuration info.
 * You can get information for multiple data frame analytics jobs in a single
 * API request by using a comma-separated list of data frame analytics jobs or a
 * wildcard expression.
 * @rest_spec_name ml.get_data_frame_analytics
 * @availability stack since=7.3.0 stability=stable
 * @availability serverless stability=stable visibility=public
 * @cluster_privileges monitor_ml
 * @doc_tag ml data frame
 */
export interface Request extends RequestBase {
  path_parts: {
    /**
     * Identifier for the data frame analytics job. If you do not specify this
     * option, the API returns information for the first hundred data frame
     * analytics jobs.
     */
    id?: Id
  }
  query_parameters: {
    /**
     * Specifies what to do when the request:
     *
     * 1. Contains wildcard expressions and there are no data frame analytics
     * jobs that match.
     * 2. Contains the `_all` string or no identifiers and there are no matches.
     * 3. Contains wildcard expressions and there are only partial matches.
     *
     * The default value returns an empty data_frame_analytics array when there
     * are no matches and the subset of results when there are partial matches.
     * If this parameter is `false`, the request returns a 404 status code when
     * there are no matches or only partial matches.
     * @server_default true
     */
    allow_no_match?: boolean
    /**
     * Skips the specified number of data frame analytics jobs.
     * @server_default 0
     */
    from?: integer
    /**
     * Specifies the maximum number of data frame analytics jobs to obtain.
     * @server_default 100
     */
    size?: integer
    /**
     * Indicates if certain fields should be removed from the configuration on
     * retrieval. This allows the configuration to be in an acceptable format to
     * be retrieved and then added to another cluster.
     * @server_default false
     */
    exclude_generated?: boolean
  }
}
