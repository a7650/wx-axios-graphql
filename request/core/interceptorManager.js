/*
 * @Author: zhang zhipeng
 * @Date: 2020-02-01 17:25:11
 * @Last Modified by:   zhang zhipeng
 * @Last Modified time: 2020-02-01 17:25:11
 */

export default class InterceptorManager {
	constructor() {
		this.interceptors = []
	}

	use(resolved, rejected) {
		this.interceptors.push({
			resolved,
			rejected
		})
		return this.interceptors.length - 1
	}

	forEach(fn) {
		this.interceptors.forEach(interceptor => {
			if (interceptor !== null) {
				fn(interceptor)
			}
		})
	}

	eject(id) {
		if (this.interceptors) {
			this.interceptors[id] = null
		}
	}
}
