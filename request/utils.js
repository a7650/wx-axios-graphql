/*
 * @Author: zhang zhipeng
 * @Date: 2020-02-01 17:26:36
 * @Last Modified by: zhang zhipeng
 * @Last Modified time: 2020-05-28 20:15:01
 */

const _toString = Object.prototype.toString

const typeClass = {
	date: '[object Date]',
	object: '[object Object]'
}

export function isDate(val) {
	return _toString.call(val) === typeClass['date']
}

export function isObject(val) {
	return val !== null && typeof val === 'object'
}

export function isPlainObject(val) {
	return _toString.call(val) === typeClass['object']
}

export function extend(_to, _from) {
	const requestAPI = ['request', 'get', 'delete', 'head', 'options', 'post', 'put', 'patch', '_requestMethodWithData', '_requestMethodWithoutData']
	for (const key in _from) {
		_to[key] = _from[key]
	}
	requestAPI.forEach(key => {
		_to[key] = _from[key]
	})
	return _to
}

export function deepMerge(...obj) {
	const result = {}
	obj.forEach(item => {
		if (!item) return
		Object.keys(item).forEach(key => {
			const val = item[key]
			if (isPlainObject(val)) {
				if (isPlainObject(result[key])) {
					result[key] = deepMerge(result[key], val)
				} else {
					result[key] = deepMerge(val)
				}
			} else {
				result[key] = val
			}
		})
	})
	return result
}

export function flattenHeaders(headers, method) {
	if (!headers) {
		return headers
	}
	headers = deepMerge(headers.common || {}, headers[method] || {}, headers)
	const methodsToDelete = ['delete', 'get', 'head', 'options', 'post', 'put', 'patch', 'common']
	methodsToDelete.forEach(method => {
		delete headers[method]
	})
	return headers
}

