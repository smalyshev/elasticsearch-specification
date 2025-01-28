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

/**
 * Clear trained model deployment cache.
 * Cache will be cleared on all nodes where the trained model is assigned.
 * A trained model deployment may have an inference cache enabled.
 * As requests are handled by each allocated node, their responses may be cached on that individual node.
 * Calling this API clears the caches without restarting the deployment.
 * @rest_spec_name ml.clear_trained_model_deployment_cache
 * @availability stack since=8.5.0 stability=stable
 * @availability serverless stability=stable visibility=private
 * @cluster_privileges manage_ml
 * @doc_id clear-trained-model
 * @doc_tag ml trained model
 */
export interface Request extends RequestBase {
  urls: [
    {
      path: '/_ml/trained_models/{model_id}/deployment/cache/_clear'
      methods: ['POST']
    }
  ]
  path_parts: {
    /**
     * The unique identifier of the trained model.
     */
    model_id: Id
  }
}
