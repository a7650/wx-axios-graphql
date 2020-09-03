/*
 * @Author: zhang zhipeng
 * @Date: 2020-02-01 17:25:22
 * @Last Modified by:   zhang zhipeng
 * @Last Modified time: 2020-02-01 17:25:22
 */

import {
	isPlainObject,
	deepMerge
} from '../utils'

const strats = Object.create(null)

const defaultStratKeys = ['url', 'params', 'key']

const deepMergeStratKeys = ['headers']

defaultStratKeys.forEach(key => {
	strats[key] = defaultStrat
})

deepMergeStratKeys.forEach(key => {
	strats[key] = deepMergeStrat
})

function defaultStrat(val1, val2) {
	return typeof val2 !== 'undefined' ? val2 : val1
}

function deepMergeStrat(val1, val2) {
	if (isPlainObject(val2)) {
		return deepMerge(val1, val2)
	} else if (typeof val2 !== 'undefined') {
		return val2
	} else if (isPlainObject(val1)) {
		return deepMerge(val1)
	} else if (typeof val1 !== 'undefined') {
		return val1
	}
}

export default function mergeConfig(config1, config2 = {}) {
	const config = {}
	for (const key in config2) {
		mergeField(key)
	}

	for (const key in config1) {
		if (!config2[key]) {
			mergeField(key)
		}
	}

	function mergeField(key) {
		const strat = strats[key] || defaultStrat
		config[key] = strat(config1[key], config2[key])
	}
	return config
}
