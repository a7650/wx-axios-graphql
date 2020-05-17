/*
 * @Author: zhang zhipeng 
 * @Date: 2020-04-15 10:29:40 
 * @Last Modified by: zhang zhipeng
 * @Last Modified time: 2020-05-15 13:35:17
 */
import Request from './request'
import { deepMerge } from '../utils'
import defaults from '../defaults'

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
        if (!query) {
            console.error(`${handleType}缺少${type}属性`)
            return Promise.reject()
        }
        let queryStatement = ""
        let isCustomQueryStatement
        if (typeof custom === "boolean") {
            isCustomQueryStatement = custom
        } else {
            isCustomQueryStatement = this.isCustomQueryStatement
        }
        if (isCustomQueryStatement) {
            queryStatement = query
        } else {
            let cacheKey = query + responseNode || ""
            if (cache[cacheKey]) {
                queryStatement = cache[cacheKey]
            } else {
                try {
                    let ast = parse(query, responseNode, type)
                    queryStatement = cache[cacheKey] = gencode(ast)
                } catch (err) {
                    cache[cacheKey] = ""
                    console.error(err)
                    return Promise.reject()
                }
            }
        }
        return this.client.post(this.config.url, { query: queryStatement, variables }, config)
    }
}
function parse(query, responseNode, type) {
    if (!responseNode) {
        responseNode = ""
    }
    if (typeof query !== "string" || typeof responseNode !== "string") {
        throw new Error(`query和responseNode属性应为string类型 ${query} ${responseNode}`)
    }
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
    result.responseNode = responseNode
    result.operationType = type
    return result
}

function gencode(ast) {
    let result = ""
    let { operationName, operationType, variables, responseNode } = ast
    let hasVariables = variables && variables.length > 0
    result += `${operationType} ${operationName}`
    if (hasVariables) {
        result += "("
        variables.forEach(({ key, type }, i) => {
            result += `${i === 0 ? "" : ","}$${key}:${type}`
        })
        result += `){${operationName}(`
        variables.forEach(({ key, type }, i) => {
            result += `${i === 0 ? "" : ","}${key}:$${key}`
        })
        result += ")"
        if (responseNode) {
            result += `{${responseNode}}`
        }
        result += "}"
    } else {
        if (responseNode) {
            result += `{${operationName}{${responseNode}}}`
        }
    }
    return result
}

export default graphQL