/*
 * @Author: zhang zhipeng
 * @Date: 2020-04-15 10:29:40
 * @Last Modified by: zhang zhipeng
 * @Last Modified time: 2020-09-10 10:31:33
 */

import Request from './request'
import { deepMerge } from '../utils'
import defaults from '../defaults'
import { requestStart, requestEndError, requestEnd } from './logger'

const cache = {}

/**
 * Request的graphQL扩展
 */
class graphQL {
    constructor(config = {}) {
        this.client = new Request(deepMerge(defaults, config))
        this.config = config
        if (config.custom !== 'undefined') {
            this.isCustomQueryStatement = !!config.custom
        } else {
            this.isCustomQueryStatement = false
        }
    }
    /**
     * @property {String} query query查询语句
     * @property {Object} variables 查询参数
     */
    query(data, config = {}) {
        const type = 'query'
        return this.dispatchRequest(data, config, type, 'query')
    }
    /**
     * @property {String} mutation mutation查询语句
     * @property {Object} variables 查询参数
     */
    mutate(data, config = {}) {
        const type = 'mutation'
        data.query = data.mutation
        return this.dispatchRequest(data, config, type, 'mutate')
    }
    dispatchRequest(data, config, type, handleType) {
        let { query, variables = {}, responseNode, custom } = data
        if (!(query = formatQuery(query))) {
            return Promise.reject()
        }
        let queryStatement = ''
        let isCustomQueryStatement
        let variablesWithScoped = {}
        let ast = null
        if (typeof custom === 'boolean') {
            isCustomQueryStatement = custom
        } else {
            isCustomQueryStatement = this.isCustomQueryStatement
        }
        if (isCustomQueryStatement) {
            queryStatement = query
        } else {
            const cacheKey = query.join('/') + responseNode || ''
            if (cache[cacheKey]) {
                queryStatement = cache[cacheKey]
            } else {
                try {
                    ast = parse(query, responseNode, type, variables)
                    // queryStatement = cache[cacheKey] = gencode(ast)
                    queryStatement = gencode(ast)
                    variablesWithScoped = getVariablesWithScoped(ast)
                    if (this.config.logger) {
                        requestStart(ast, variablesWithScoped)
                    }
                } catch (err) {
                    cache[cacheKey] = ''
                    console.error(err)
                    return Promise.reject()
                }
            }
        }
        config = Object.assign({}, config, {
            isGql: true,
            gql: ast
        })
        return this.client.post(this.config.url, { query: queryStatement, variables: variablesWithScoped }, config).then(
            res => {
                if (this.config.logger) {
                    requestEnd(ast, res)
                }
                return Promise.resolve(res)
            },
            err => {
                if (this.config.logger) {
                    requestEndError(ast, err)
                }
                return Promise.reject(err)
            }
        )
    }
}

function parse(queries, responseNode, type, variables) {
    if (!responseNode) {
        responseNode = {}
    }
    const isOnlyQuery = queries.length === 1
    // const resultMap = {}
    const resultArr = []
    queries.forEach(query => {
        const ast = parseQuery(query, responseNode, type, variables, isOnlyQuery)
        // resultMap[ast.operationName] = ast
        resultArr.push(ast)
    })
    return resultArr
}

/**
 * @param {Object[]} ast query的ast
 */
function gencode(ast) {
    let result = ''
    const operationType = ast[0].operationType
    const operationName = ast.map(item => item.operationName).join('_')
    const variablesScoped = getVariablesScoped(ast)
    const variablesStatement = variablesScoped.length > 0 ? `(${variablesScoped.join(',')})` : ''
    result += `${operationType} ${operationName}${variablesStatement}{
        ${createMainStatement(ast)}
    }`
    function getVariablesScoped(ast) {
        const _v = []
        ast.forEach(item => {
            const { operationName, variables } = item
            _v.push(...variables.map(({ key, type }) => {
                return `$${operationName}_${key}:${type}`
            }))
        })
        return _v
    }
    function createMainStatement(ast) {
        let _s = ''
        ast.forEach(item => {
            const { operationName, variables, responseNode } = item
            const hasVariables = variables && variables.length > 0
            _s += operationName
            if (hasVariables) {
                const _vs = variables.map(({ key }) => `${key}:$${operationName}_${key}`).join(',')
                _s += `(${_vs})`
            }
            if (responseNode) {
                _s += `{${responseNode}}`
            }
            _s += `↵`
        })
        return _s
    }
    return result
}

/**
 *
 * @param {String|String[]} query
 */
function formatQuery(query) {
    if (!query) {
        return false
    }
    if (typeof query === 'string') {
        return [query]
    }
    if (Array.isArray(query)) {
        if (query.some(item => typeof item !== 'string')) {
            console.error(`query为数组时需要是 "string[]" 类型`)
            return false
        }
        return query
    }
    console.error('query只支持 string 和 string[] 类型')
    return false
}

/**
 *
 * @param {String} query query语句
 * @param {String | Object} responseNode 返回节点声明
 * @param {String}} type 操作类型
 * @param {Object} variables 变量
 */
function parseQuery(query, responseNode, type, variables, isOnlyQuery) {
    query = query.trim()
    const contentReg = /\(([^)]*)\)/
    const result = {}
    let match = query.match(contentReg)
    if (!match) {
        query += '()'
        match = query.match(contentReg)
        if (!match) {
            throw new Error(`${query}语法错误`)
        }
    }
    const variablesStatement = match[1]
    const operationIdx = match['index']
    const operationName = query.substr(0, operationIdx)
    if (!operationName) {
        throw new Error(`缺少操作名称: ${query}`)
    }
    result.operationName = operationName
    result.variables = []
    result.variablesMap = {}
    if (variablesStatement) {
        variablesStatement.split(',').forEach(item => {
            let [key, type] = item.split(':')
            key = key.trim()
            type = type.trim()
            if (!type) {
                throw new Error(`变量"${key}"缺少类型: ${query}`)
            }
            result.variables.push({ key, type })
            result.variablesMap[key] = type
        })
    }
    if (typeof responseNode === 'string') {
        responseNode = { [operationName]: responseNode }
    }
    result.variablesStore = isOnlyQuery ? variables : (variables[operationName] || {})
    result.responseNode = responseNode[operationName] || ''
    result.operationType = type
    return result
}

function getVariablesWithScoped(ast) {
    const result = {}
    if (ast && ast.length > 0) {
        ast.forEach(item => {
            const { operationName, variablesStore } = item
            Object.keys(variablesStore).forEach(key => {
                result[`${operationName}_${key}`] = variablesStore[key]
            })
        })
    }
    return result
}

export default graphQL
