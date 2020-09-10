/*
 * @Author: zhang zhipeng
 * @Date: 2020-02-01 17:24:44
 * @Last Modified by: zhang zhipeng
 * @Last Modified time: 2020-09-10 10:31:16
 */

import {
	deepMerge,
	extend
} from './utils'
import Request from './core/request'
import defaults from './defaults'
import CancelToken from './core/cancelToken'
import Mock from './core/Mock'
import graphQL from './core/graphQL'

function createInstance(config) {
	const context = new Request(config)
	const instance = Request.prototype.request.bind(context)
	extend(instance, context)
	return instance
}

const request = createInstance(defaults)

request.create = function (config) {
	return createInstance(deepMerge(defaults, config))
}

request.CancelToken = CancelToken
request.Mock = Mock
request.graphQL = graphQL

export default request
