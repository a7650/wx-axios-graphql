/*
 * @Author: zhang zhipeng 
 * @Date: 2020-04-15 10:29:40 
 * @Last Modified by: zhang zhipeng
 * @Last Modified time: 2020-05-29 11:27:41
 */

import Request from './request'
import { deepMerge } from '../utils'
import defaults from '../defaults'
import { requestStart, requestEndError, requestEnd } from './logger'

let cache = {}

/**
 * Request的graphQL扩展
 */
class graphQL {
    constructor(config = {}) {
        this.client = new Request(deepMerge(defaults, config))
        this.config = config
        if (config.custom !== "undefined") {
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
        let type = "query"
        return this.dispatchRequest(data, config, type, 'query')
    }
    /**
     * @property {String} mutation mutation查询语句
     * @property {Object} variables 查询参数
     */
    mutate(data, config = {}) {
        let type = "mutation"
        data.query = data.mutation
        return this.dispatchRequest(data, config, type, 'mutate')
    }
    dispatchRequest(data, config, type, handleType) {
        let { query, variables = {}, responseNode, custom } = data
        if (!(query = formatQuery(query))) {
            return Promise.reject()
        }
        let queryStatement = ""
        let isCustomQueryStatement
        let variablesWithScoped = {}
        let ast = null
        if (typeof custom === "boolean") {
            isCustomQueryStatement = custom
        } else {
            isCustomQueryStatement = this.isCustomQueryStatement
        }
        if (isCustomQueryStatement) {
            queryStatement = query
        } else {
            let cacheKey = query.join("/") + responseNode || ""
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
                    cache[cacheKey] = ""
                    console.error(err)
                    return Promise.reject()
                }
            }
        }
        return this.client.post(this.config.url, { query: queryStatement, variables: variablesWithScoped }, config).then(
            res => {
                if (this.config.logger) {
                    requestEnd(ast, res)
                }
                return Promise.resolve(res)
            },
            err => {
                if (this.config.logger) {
                    requestEndError(ast, res)
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
        let ast = parseQuery(query, responseNode, type, variables, isOnlyQuery)
        // resultMap[ast.operationName] = ast
        resultArr.push(ast)
    })
    return resultArr
}

/**
 * @param {Object[]} ast query的ast
 */
function gencode(ast) {
    let result = ""
    let operationType = ast[0].operationType
    let operationName = ast.map(item => item.operationName).join("_")
    let variablesScoped = getVariablesScoped(ast)
    let variablesStatement = variablesScoped.length > 0 ? `(${variablesScoped.join(",")})` : ""
    result += `${operationType} ${operationName}${variablesStatement}{
        ${createMainStatement(ast)}
    }`
    function getVariablesScoped(ast) {
        let _v = []
        ast.forEach(item => {
            let { operationName, variables } = item
            _v.push(...variables.map(({ key, type }) => {
                return `$${operationName}_${key}:${type}`
            }))
        })
        return _v
    }
    function createMainStatement(ast) {
        let _s = ""
        ast.forEach(item => {
            let { operationName, variables, responseNode } = item
            let hasVariables = variables && variables.length > 0
            _s += operationName
            if (hasVariables) {
                let _vs = variables.map(({ key }) => `${key}:$${operationName}_${key}`).join(",")
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
        console.error(`${handleType}缺少${type}属性`)
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
    let contentReg = /\(([^)]*)\)/
    let result = {}
    let match = query.match(contentReg)
    if (!match) {
        query += "()"
        match = query.match(contentReg)
        if (!match) {
            throw new Error(`${query}语法错误`)
        }
    }
    let variablesStatement = match[1]
    let operationIdx = match["index"]
    let operationName = query.substr(0, operationIdx)
    if (!operationName) {
        throw new Error(`缺少操作名称: ${query}`)
    }
    result.operationName = operationName
    result.variables = []
    result.variablesMap = {}
    if (variablesStatement) {
        variablesStatement.split(",").forEach(item => {
            let [key, type] = item.split(":")
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
    result.responseNode = responseNode[operationName] || ""
    result.operationType = type
    return result
}

function getVariablesWithScoped(ast) {
    let result = {}
    if (ast && ast.length > 0) {
        ast.forEach(item => {
            let { operationName, variablesStore } = item
            Object.keys(variablesStore).forEach(key => {
                result[`${operationName}_${key}`] = variablesStore[key]
            })
        })
    }
    return result
}

export default graphQL