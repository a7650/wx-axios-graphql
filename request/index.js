/*
 * @Author: zhang zhipeng
 * @Date: 2020-02-01 17:24:44
 * @Last Modified by: zhang zhipeng
 * @Last Modified time: 2020-04-15 10:41:41
 */

import {
	deepMerge,
	extend
} from '@/common/request/utils.js'
import Request from '@/common/request/core/request.js'
import defaults from '@/common/request/defaults.js'
import CancelToken from '@/common/request/core/cancelToken.js'
import Mock from '@/common/request/core/Mock.js'
import graphQL from '@/common/request/core/graphQL.js'

function createInstance(config) {
	const context = new Request(config)
	const instance = Request.prototype.request.bind(context)
	extend(instance, context)
	return instance
}

const request = createInstance(defaults)

request.create = function(config) {
	return createInstance(deepMerge(defaults, config))
}

request.CancelToken = CancelToken
request.Mock = Mock
request.graphQL = graphQL

export default request
