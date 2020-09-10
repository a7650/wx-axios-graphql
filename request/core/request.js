/*
 * @Author: zhang zhipeng
 * @Date: 2020-02-01 17:25:29
 * @Last Modified by: zhang zhipeng
 * @Last Modified time: 2020-09-10 10:32:11
 */

import mergeConfig from './mergeConfig'
import dispatchRequest from './dispatchRequest'
import InterceptorManager from './interceptorManager'

export default class Request {
	constructor(config) {
		this.defaults = config
		this.interceptors = {
			request: new InterceptorManager(),
			response: new InterceptorManager()
		}
	}

	request(url, config = {}) {
		if (typeof url === 'string') {
			config.url = url
		} else {
			config = url
		}
		const originConfig = config
		config = mergeConfig(this.defaults, config)
		config.originConfig = originConfig
		const promiseChain = [{
			resolved: dispatchRequest,
			rejected: undefined
		}]
		this.interceptors.request.forEach(interceptor => promiseChain.unshift(interceptor))
		this.interceptors.response.forEach(interceptor => promiseChain.push(interceptor))
		let promise = Promise.resolve(config)
		while (promiseChain.length) {
			const {
				resolved,
				rejected
			} = promiseChain.shift()
			promise = promise.then(resolved, rejected)
		}
		return promise
	}

	get(url, config) {
		return this._requestMethodWithoutData('get', url, config)
	}

	delete(url, config) {
		return this._requestMethodWithoutData('delete', url, config)
	}

	head(url, config) {
		return this._requestMethodWithoutData('head', url, config)
	}

	options(url, config) {
		return this._requestMethodWithoutData('options', url, config)
	}

	post(url, data, config) {
		return this._requestMethodWithData('post', url, data, config)
	}

	put(url, data, config) {
		return this._requestMethodWithData('put', url, data, config)
	}

	patch(url, data, config) {
		return this._requestMethodWithData('patch', url, data, config)
	}

	_requestMethodWithoutData(method, url, config) {
		return this.request(
			Object.assign(config || {}, {
				method,
				url
			})
		)
	}

	_requestMethodWithData(method, url, data, config) {
		return this.request(
			Object.assign(config || {}, {
				method,
				url,
				data
			})
		)
	}
}
