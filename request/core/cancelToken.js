/*
 * @Author: zhang zhipeng 
 * @Date: 2020-02-01 17:24:49 
 * @Last Modified by: zhang zhipeng
 * @Last Modified time: 2020-05-17 16:52:55
 */

export default class CancelToken {
	constructor(executor) {
		let resolvePromise = null
		this.promise = new Promise(resolve => {
			resolvePromise = resolve
		})
		executor(message => {
			if (this.reason) return
			this.reason = message || 'canceled'
			resolvePromise(this.reason)
		})
	}
}
