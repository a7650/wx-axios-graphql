/*
 * @Author: zhang zhipeng 
 * @Date: 2020-02-01 17:25:00 
 * @Last Modified by: zhang zhipeng
 * @Last Modified time: 2020-04-16 15:12:39
 */

import { flattenHeaders } from '../utils'

export default function dispatchRequest(config) {
	procressConfig(config)
	return uniRequest(config).then(res => {
		return transformResponse(res, config)
	})
}

function procressConfig(config) {
	config.headers = transformHeaders(config)
	config.url = transformURL(config.baseURL, config.url)
	config.method = (config.method || 'GET').toUpperCase()
}

function transformURL(baseURL = '', url) {
	return baseURL + url
}

function transformHeaders(config) {
	let headers = flattenHeaders(config.headers, config.method)
	let { auth, authKey, authURL, url } = config
	if (authURL.exclusive && authURL.exclusive.includes(url)) {
		return headers
	}
	if (authURL.inclusive && !authURL.inclusive.includes(url)) {
		return headers
	}
	if (auth &&
		authKey &&
		typeof authKey === "string" &&
		headers[authKey] === undefined &&
		headers[authKey.toLowerCase()] === undefined) {
		let authType = typeof config.auth
		let authStr = ''
		if (authType === 'string') {
			authStr = auth
		} else if (authType === 'function') {
			authStr = auth()
		}
		if (authStr && typeof authStr === 'string') {
			headers[authKey] = authStr
		}
	}
	return headers
}

function transformResponse(res, config) {
	res.config = config
	return res
}

function uniRequest(config) {
	return new Promise((resolve, reject) => {
		let {
			url,
			method,
			data,
			timeout,
			headers: header,
			dataType = 'json',
			responseType = 'text',
			cancelToken
		} = config
		let requestTask = uni.request({
			url,
			method,
			data,
			header,
			timeout,
			dataType,
			responseType,
			success: res => resolve(res),
			fail: err => reject(err),
			complete: () => { }
		});
		if (cancelToken) {
			cancelToken.promise.then(reason => {
				reject(reason)
				requestTask.abort()
			})
		}
	})
}
