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
import {
  Conflicts,
  ExpandWildcards,
  Indices,
  Routing,
  SearchType,
  Slices,
  WaitForActiveShards
} from '@_types/common'
import { float, long } from '@_types/Numeric'
import { QueryContainer } from '@_types/query_dsl/abstractions'
import { Operator } from '@_types/query_dsl/Operator'
import { SlicedScroll } from '@_types/SlicedScroll'
import { Duration } from '@_types/Time'

/**
 * Delete documents.
 *
 * Deletes documents that match the specified query.
 *
 * If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or alias:
 *
 * * `read`
 * * `delete` or `write`
 *
 * You can specify the query criteria in the request URI or the request body using the same syntax as the search API.
 * When you submit a delete by query request, Elasticsearch gets a snapshot of the data stream or index when it begins processing the request and deletes matching documents using internal versioning.
 * If a document changes between the time that the snapshot is taken and the delete operation is processed, it results in a version conflict and the delete operation fails.
 *
 * NOTE: Documents with a version equal to 0 cannot be deleted using delete by query because internal versioning does not support 0 as a valid version number.
 *
 * While processing a delete by query request, Elasticsearch performs multiple search requests sequentially to find all of the matching documents to delete.
 * A bulk delete request is performed for each batch of matching documents.
 * If a search or bulk request is rejected, the requests are retried up to 10 times, with exponential back off.
 * If the maximum retry limit is reached, processing halts and all failed requests are returned in the response.
 * Any delete requests that completed successfully still stick, they are not rolled back.
 *
 * You can opt to count version conflicts instead of halting and returning by setting `conflicts` to `proceed`.
 * Note that if you opt to count version conflicts the operation could attempt to delete more documents from the source than `max_docs` until it has successfully deleted `max_docs documents`, or it has gone through every document in the source query.
 *
 * **Throttling delete requests**
 *
 * To control the rate at which delete by query issues batches of delete operations, you can set `requests_per_second` to any positive decimal number.
 * This pads each batch with a wait time to throttle the rate.
 * Set `requests_per_second` to `-1` to disable throttling.
 *
 * Throttling uses a wait time between batches so that the internal scroll requests can be given a timeout that takes the request padding into account.
 * The padding time is the difference between the batch size divided by the `requests_per_second` and the time spent writing.
 * By default the batch size is `1000`, so if `requests_per_second` is set to `500`:
 *
 * ```
 * target_time = 1000 / 500 per second = 2 seconds
 * wait_time = target_time - write_time = 2 seconds - .5 seconds = 1.5 seconds
 * ```
 *
 * Since the batch is issued as a single `_bulk` request, large batch sizes cause Elasticsearch to create many requests and wait before starting the next set.
 * This is "bursty" instead of "smooth".
 *
 * **Slicing**
 *
 * Delete by query supports sliced scroll to parallelize the delete process.
 * This can improve efficiency and provide a convenient way to break the request down into smaller parts.
 *
 * Setting `slices` to `auto` lets Elasticsearch choose the number of slices to use.
 * This setting will use one slice per shard, up to a certain limit.
 * If there are multiple source data streams or indices, it will choose the number of slices based on the index or backing index with the smallest number of shards.
 * Adding slices to the delete by query operation creates sub-requests which means it has some quirks:
 *
 * * You can see these requests in the tasks APIs. These sub-requests are "child" tasks of the task for the request with slices.
 * * Fetching the status of the task for the request with slices only contains the status of completed slices.
 * * These sub-requests are individually addressable for things like cancellation and rethrottling.
 * * Rethrottling the request with `slices` will rethrottle the unfinished sub-request proportionally.
 * * Canceling the request with `slices` will cancel each sub-request.
 * * Due to the nature of `slices` each sub-request won't get a perfectly even portion of the documents. All documents will be addressed, but some slices may be larger than others. Expect larger slices to have a more even distribution.
 * * Parameters like `requests_per_second` and `max_docs` on a request with `slices` are distributed proportionally to each sub-request. Combine that with the earlier point about distribution being uneven and you should conclude that using `max_docs` with `slices` might not result in exactly `max_docs` documents being deleted.
 * * Each sub-request gets a slightly different snapshot of the source data stream or index though these are all taken at approximately the same time.
 *
 * If you're slicing manually or otherwise tuning automatic slicing, keep in mind that:
 *
 * * Query performance is most efficient when the number of slices is equal to the number of shards in the index or backing index. If that number is large (for example, 500), choose a lower number as too many `slices` hurts performance. Setting `slices` higher than the number of shards generally does not improve efficiency and adds overhead.
 * * Delete performance scales linearly across available resources with the number of slices.
 *
 * Whether query or delete performance dominates the runtime depends on the documents being reindexed and cluster resources.
 *
 * **Cancel a delete by query operation**
 *
 * Any delete by query can be canceled using the task cancel API. For example:
 *
 * ```
 * POST _tasks/r1A2WoRbTwKZ516z6NEs5A:36619/_cancel
 * ```
 *
 * The task ID can be found by using the get tasks API.
 *
 * Cancellation should happen quickly but might take a few seconds.
 * The get task status API will continue to list the delete by query task until this task checks that it has been cancelled and terminates itself.
 * @rest_spec_name delete_by_query
 * @availability stack since=5.0.0 stability=stable
 * @availability serverless stability=stable visibility=public
 * @index_privileges read,delete
 * @doc_tag document
 * @doc_id docs-delete-by-query
 */
export interface Request extends RequestBase {
  urls: [
    {
      path: '/{index}/_delete_by_query'
      methods: ['POST']
    }
  ]
  path_parts: {
    /**
     * A comma-separated list of data streams, indices, and aliases to search.
     * It supports wildcards (`*`).
     * To search all data streams or indices, omit this parameter or use `*` or `_all`.
     */
    index: Indices
  }
  query_parameters: {
    /**
     * If `false`, the request returns an error if any wildcard expression, index alias, or `_all` value targets only missing or closed indices.
     * This behavior applies even if the request targets other open indices.
     * For example, a request targeting `foo*,bar*` returns an error if an index starts with `foo` but no index starts with `bar`.
     * @server_default true
     */
    allow_no_indices?: boolean
    /**
     * Analyzer to use for the query string.
     * This parameter can be used only when the `q` query string parameter is specified.
     */
    analyzer?: string
    /**
     * If `true`, wildcard and prefix queries are analyzed.
     * This parameter can be used only when the `q` query string parameter is specified.
     * @server_default false
     */
    analyze_wildcard?: boolean
    /**
     * What to do if delete by query hits version conflicts: `abort` or `proceed`.
     * @server_default abort
     */
    conflicts?: Conflicts
    /**
     * The default operator for query string query: `AND` or `OR`.
     * This parameter can be used only when the `q` query string parameter is specified.
     * @server_default OR
     */
    default_operator?: Operator
    /**
     * The field to use as default where no field prefix is given in the query string.
     * This parameter can be used only when the `q` query string parameter is specified.
     */
    df?: string
    /**
     * The type of index that wildcard patterns can match.
     * If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams.
     * It supports comma-separated values, such as `open,hidden`.
     * @server_default open
     */
    expand_wildcards?: ExpandWildcards
    from?: long
    /**
     * If `false`, the request returns an error if it targets a missing or closed index.
     * @server_default false
     */
    ignore_unavailable?: boolean
    /**
     * If `true`, format-based query failures (such as providing text to a numeric field) in the query string will be ignored.
     * This parameter can be used only when the `q` query string parameter is specified.
     * @server_default false
     */
    lenient?: boolean
    /**
     * The maximum number of documents to process.
     * Defaults to all documents.
     * When set to a value less then or equal to `scroll_size`, a scroll will not be used to retrieve the results for the operation.
     */
    max_docs?: long
    /**
     * The node or shard the operation should be performed on.
     * It is random by default.
     */
    preference?: string
    /**
     * If `true`, Elasticsearch refreshes all shards involved in the delete by query after the request completes.
     * This is different than the delete API's `refresh` parameter, which causes just the shard that received the delete request to be refreshed.
     * Unlike the delete API, it does not support `wait_for`.
     * @server_default false
     */
    refresh?: boolean
    /**
     * If `true`, the request cache is used for this request.
     * Defaults to the index-level setting.
     */
    request_cache?: boolean
    /**
     * The throttle for this request in sub-requests per second.
     * @server_default -1
     */
    requests_per_second?: float
    /**
     * A custom value used to route operations to a specific shard.
     */
    routing?: Routing
    /**
     * A query in the Lucene query string syntax.
     */
    q?: string
    /**
     * The period to retain the search context for scrolling.
     * @ext_doc_id scroll-search-results
     */
    scroll?: Duration
    /**
     * The size of the scroll request that powers the operation.
     * @server_default 1000
     */
    scroll_size?: long
    /**
     * The explicit timeout for each search request.
     * It defaults to no timeout.
     */
    search_timeout?: Duration
    /**
     * The type of the search operation.
     * Available options include `query_then_fetch` and `dfs_query_then_fetch`.
     */
    search_type?: SearchType
    /**
     * The number of slices this task should be divided into.
     * @server_default 1
     */
    slices?: Slices
    /**
     * A comma-separated list of `<field>:<direction>` pairs.
     */
    sort?: string[]
    /**
     * The specific `tag` of the request for logging and statistical purposes.
     */
    stats?: string[]
    /**
     * The maximum number of documents to collect for each shard.
     * If a query reaches this limit, Elasticsearch terminates the query early.
     * Elasticsearch collects documents before sorting.
     *
     * Use with caution.
     * Elasticsearch applies this parameter to each shard handling the request.
     * When possible, let Elasticsearch perform early termination automatically.
     * Avoid specifying this parameter for requests that target data streams with backing indices across multiple data tiers.
     */
    terminate_after?: long
    /**
     * The period each deletion request waits for active shards.
     * @server_default 1m
     */
    timeout?: Duration
    /**
     * If `true`, returns the document version as part of a hit.
     */
    version?: boolean
    /**
     * The number of shard copies that must be active before proceeding with the operation.
     * Set to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`).
     * The `timeout` value controls how long each write request waits for unavailable shards to become available.
     * @server_default 1
     */
    wait_for_active_shards?: WaitForActiveShards
    /**
     * If `true`, the request blocks until the operation is complete.
     * If `false`, Elasticsearch performs some preflight checks, launches the request, and returns a task you can use to cancel or get the status of the task. Elasticsearch creates a record of this task as a document at `.tasks/task/${taskId}`. When you are done with a task, you should delete the task document so Elasticsearch can reclaim the space.
     * @server_default true
     */
    wait_for_completion?: boolean
  }
  body: {
    /**
     * The maximum number of documents to delete.
     */
    max_docs?: long
    /**
     * The documents to delete specified with Query DSL.
     */
    query?: QueryContainer
    /**
     * Slice the request manually using the provided slice ID and total number of slices.
     */
    slice?: SlicedScroll
  }
}
